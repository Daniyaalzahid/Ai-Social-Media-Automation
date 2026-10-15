# Phase 2C clock-anomaly closure

Scope: the two previously unexplained failures only, above committed base
`d21d05662367e64a5f6e475ffab2f1cf72a53e98`. No production behavior, UI,
policies, dependencies or migrations changed. No commit/push or Phase 2D.

## Classification and authoritative evidence

Both failures are **B: deterministic test defects**, caused by overlapping test
executions sharing the destructive `bsa_test_recovery` schema. This was database
fixture interference, not shared JavaScript fake time. `maxWorkers: 1` and
`fileParallelism: false` serialized files within one invocation, but could not
serialize independently launched invocations. A prior stalled diagnostic execution
continued using connection 10 while later executions used connections 11 and 15.
The evidence establishes overlapping execution contexts; original OS process IDs
and the precise reason interruption failed to terminate the earlier worker were
not retained and are not invented here.

The closed isolated MySQL `binlog.000012` was decoded offline, in memory. Only
allowlisted timestamps, operation/table, log positions, connection numbers and
pseudonymous row labels were extracted. No token/hash, password/hash, email,
encryption material, raw SQL values or binlog dump was copied into the checkout.
No additional server logging was enabled. Original log SHA-256:
`7f4170356845be7384b76028c18d544ea6e5bd59fd01588398827c600299a8f4`.

Event wall times below are Asia/Karachi on 2026-10-15. Database field timestamps
are UTC. Test base `1800000000000` is `2027-01-15T08:00:00.000Z`.

| Historical failure | Expected and observed | Authoritative evidence |
| --- | --- | --- |
| `tests/database/access-review.test.ts` / `exact session and recent-auth timestamp boundaries` / `touch throttle is exact and activity cannot extend absolute deadline` (before parameterization into 20 trials) | Expected activity `1800000060000`; unscoped assertion returned `1800000000000` | At 11:49:33, connection 10 inserted competing session A at log position 421814 and revoked it at 424042, retaining activity 08:00:00.000. Connection 11 inserted intended session B at 428392 and **successfully touched B to 08:01:00.000 at 430620**. At that point the table contained exactly A and B. The test selected only `last_activity_at` without a session predicate and read A. B's idle expiry advanced correctly from 10:00 to 10:01; absolute expiry remained January 22 08:00. |
| Same touch test, focused rerun; `login()` threw `Synthetic session fixture failed` before the touch assertions | Expected authenticated synthetic VIEWER session. Saved output records only the fixture error, not the returned object. Missing proof produces safe RESTART in the code and in deterministic reproduction. | At 11:51:14, connection 15 inserted user C at 1004689 (real DB created_at 06:51:14.180) and proof C at 1006353. Proof created_at was test base, expiry 08:05, consumed/revoked NULL. **Connection 10 deleted that still-valid proof at 1011124**, then user C at 1014285. Connection 15 never inserted a session. |

The complete original SELECT/clock-query results were not logged historically.
The first operation's effective now is evidenced by its successful stored activity
08:01; the second fixture's declared clock was test base. Row-level mutation
history, saved failure descriptions and deterministic forced interleavings establish
the causal chains without pretending missing raw test output exists.

Both tests were individually sequential. The overlap was between invocations.
The historical clock was a module-private number read by a Kysely result plugin
for exactly `SELECT CURRENT_TIMESTAMP(3) AS now`. It was not Date monkey-patching,
Node fake timers or browser time. Underlying MySQL/default timestamps and SQL
cleanup predicates still used real server time; the selected result alone was
substituted. Node's real test timeout was involved in the earlier stalled execution's
lifetime, not in expiry arithmetic or Argon2 timer simulation.

## Time sources in the actual implementation

`new Date(existingEpoch + duration)` below constructs a timestamp from an explicit
input; it does not read the JavaScript wall clock. Production has no injected clock
or fake timers. MySQL `CURRENT_TIMESTAMP(3)` is statement time, not a transaction-wide
frozen start timestamp. Driver serialization and every connection's SQL time zone
are UTC. REPEATABLE READ is unchanged.

| Operation | Actual authoritative time / persistence |
| --- | --- |
| Password proof issuance/consumption/revocation | MySQL CURRENT_TIMESTAMP(3); created/expiry/consumed/revoked explicitly supplied from that clock |
| Session issuance | SQL clock after current identity/proof reads; created/activity/authenticated and role-specific idle/absolute explicitly derived from it |
| Session validation, idle/absolute expiry | Fresh SQL clock after user/role/factor/session locks; compare against persisted SQL-derived timestamps and current-role durations |
| Activity touch | Same SQL clock; persisted activity plus SQL-now-derived idle deadline capped by absolute/current-role absolute bounds |
| Rotation | Current session validated with SQL clock; hash changes, lifetime preserved; bound proofs revoked with SQL time |
| Logout/specific/all revocation | SQL clock or validated transaction's SQL clock; explicit revoked_at |
| MFA enrollment/expiry | Proof's SQL-derived expiry, SQL clock for pending/confirmed/replay state; no active factor before proof completion |
| TOTP verification | Explicit epoch from SQL now, floored to seconds; otplib receives it, never its default wall clock |
| Recovery use/replacement | Used/revoked/created times from transaction SQL clock; codes themselves have single-use/revocation state, no independent time expiry |
| Recent-auth proof | SQL now + 300000 ms, explicit created_at/expiry; session validation and consumption use SQL time |
| Anonymous CSRF state | Server Node Date.now(), signed timestamp with ten-minute lifetime; independent pre-authentication state, confers no authenticated access |
| Flow/session CSRF | HMAC binding has no independent timestamp; dependent mutations validate proof/session lifecycle using SQL time |
| Audit/security event creation | Database CURRENT_TIMESTAMP(3) defaults at each insert; no expiry decision reads those event timestamps |
| User creation/ordinary updated_at | Database defaults, explicit SQL timestamps in access mutations; Phase 2B rehash metadata updated_at uses Node new Date(), not an authentication-expiry input |
| Cookies | API serializes the authoritative SQL-derived deadline; browser cookie expiry is additional client behavior, never sufficient authorization |
| Browser activity throttle | Browser Date.now() decides whether to request an explicit touch; server independently validates/touches using SQL time |
| Capacity/acquisition/test timeouts | Real Node timers; historical SQL-result clock injection does not fake them |

## Every relevant time comparison

| Left source | Operator | Right source / purpose |
| --- | --- | --- |
| Persisted session idle_expires_at (SQL-derived) | `>` | Current SQL now; equality expires |
| Persisted session absolute_expires_at (SQL-derived) | `>` | Current SQL now; equality expires |
| Current SQL now epoch | `<` | Persisted SQL created_at + current-role absolute duration |
| Current SQL now epoch | `<` | Persisted SQL last_activity_at + current-role idle duration |
| Session mfa_verified_at (SQL-derived) | `>=` | Factor confirmed_at (SQL-derived) |
| SQL now minus persisted SQL last_activity_at | `>= 60000` | Activity touch threshold |
| SQL now + idle duration | `min` | Stored absolute expiry and created_at + current-role absolute duration |
| Returned cookie deadline | `min` | Stored idle/absolute plus current-role activity/creation limits |
| Proof expires_at (SQL-derived) | `<=` rejects | Current SQL now; applies password and recent-auth proofs |
| Pending enrollment expiry (proof's SQL-derived expiry) | `<=` rejects | Current SQL now |
| SQL now minus recent-proof created_at | `> 300000` rejects | Auxiliary age guard; expiry guard already rejects exactly at 300000 |
| Accepted TOTP step from explicit SQL epoch | `>` | Stored last accepted SQL-epoch step; grace/future policy unchanged |
| Rate row expires_at / blocked_until (SQL-derived) | `<=` resets / `>` blocks | SQL now in admission; cleanup also compares against MySQL CURRENT_TIMESTAMP |
| Signed anonymous timestamp (Node-derived) | `<= now` and age `<600000` | Node Date.now(); independent from SQL session/proof authority |
| Browser wall now minus last browser touch request | `>=60000` | Browser clock only; server does not trust this result |

There is no critical session/proof/enrollment expiry comparison between Node wall
clock and MySQL now. The old result-plugin tests intentionally mixed substituted
security clock results with real event/default/cleanup times; those event/user
metadata timestamps are not session-expiry inputs. Rate rows are reset before each
case. Historical row evidence identifies fixture interference, not that artificial
metadata difference, as the cause of these two failures.

## Deterministic regressions and harness-only repair

Before repository changes, an ignored temporary diagnostic reproduced both exact
interleavings through the real access service and two isolated MySQL pools:

1. A competing revoked session retains base activity; intended session touches to
   base+60000. The historical unscoped read returns base while an owned read returns
   base+60000.
2. Another execution performs the same destructive fixture cleanup after a valid
   unconsumed proof is created. Continuation returns RESTART and creates no session.

No random stress loop or 100-green-run inference was needed.

Repair: original activity assertions and fixture mutation now use their exact
session ID. Database Vitest setup acquires a worker-owned MySQL GET_LOCK with zero
wait before test modules can use shared schemas. Its separate bounded one-connection
pool preserves the production/test-operation pools' reviewed sizes. Another invocation
fails before fixture destruction, including direct Vitest execution; no queue,
retry, sleep or isolation/timeout relaxation. Test-file teardown runs before lease
release under Vitest's reverse afterAll registration order. Connection closure also
releases advisory ownership. Production startup, grants and services are unchanged.
Separate-process tests prove contention rejection and acquisition after finally release.
The lease does not serialize the security operations under test: independent-pool
concurrency inside the owning fixture remains enabled and unchanged.

The new boundary suite pins a connection and uses test-only `SET timestamp` so
actual MySQL CURRENT_TIMESTAMP/defaults/predicates share the same controlled clock,
including millisecond precision. Every override resets to `SET timestamp = 0` in
finally before pool release. Separate connections retain independent clocks.
Date-only Node simulation in skew tests is restored in finally; real timers are
never faked. afterEach asserts no fake timer mode remains. A forced throwing-work
regression proves restoration of both SQL clock and JavaScript Date.

## Boundary, promotion and skew results

Existing role cases exercise idle/absolute expiry at T-1, T and T+1 ms for all five
roles: privileged 30m/24h, other roles 2h/7d. Equality is expired. Actual-MySQL-clock
cases additionally cover the 60s activity threshold, password-proof 5m expiry and
recent-auth 5m expiry at -1/0/+1 ms. T-1 activity does not touch; T and T+1 do.

Viewer sessions with active MFA are promoted to Owner and Marketing Admin.
Idle and absolute deadline tests are independent: returned deadlines are capped
at the newly authoritative role limits, and validation rejects at those deadlines.
The first absolute-test fixture mistakenly set activity beyond its old stored idle
expiry; MySQL's existing CHECK correctly rejected it. The corrected synthetic
fixture keeps stored timestamps internally valid while isolating the current-role
absolute bound. No production constraint or timeout was changed.

With Node Date deliberately -120000 and +120000 ms relative to controlled actual
MySQL time: issuance remains SQL-dated, idle -1 stays valid, idle equality denies,
expired interaction cannot resurrect access, activity cannot exceed absolute expiry,
and recent-auth equality denies. Anonymous CSRF follows its separately signed
Node-clock ten-minute lifetime as designed. SQL time advances monotonically within
each skew scenario. This experiment does not certify backward jumps of the
authoritative MySQL clock; clock synchronization remains a deployment gate.

The prior unresolved-clock qualification is closed by the historical mutation
evidence and deterministic fixture-interference regressions, not by later green
runs. Hostinger deployment gates remain unchanged.

## Final verification and repository state

- Pre-repair forced-interleaving diagnostics: 3 passed, including both historical
  mechanisms and SQL-result/Date independence.
- New targeted clock suite: 20 passed after correcting the two invalid synthetic
  absolute-boundary fixture rows described above.
- Selected existing exact-boundary cases: 10 passed, 53 unrelated cases excluded
  in that focused invocation only. The final full run excludes none.
- Strengthened persisted-touch skew cases: 2 passed, 18 other new cases excluded
  in that focused invocation only; all 20 pass in the full suite.
- Final unit/UI: **217 passed**, 14 files.
- Final isolated MySQL: **285 passed**, 10 files, no skipped cases. Includes all
  original cleanup/aggregate concurrency regressions and the new worker-lease tests.
- Final Chromium/browser: **40 passed**, zero retries.
- npm ci, lint, strict typecheck, production build, secret scan, npm audit,
  npm ls --all and git diff --check: passed; audit has zero vulnerabilities.
- All five manifest checksums match; 0000–0003 match committed HEAD exactly;
  0004 and its manifest entry match the pre-closure fingerprint.
- Exactly seven reviewable files changed during closure: this record, the prior
  adversarial review's qualification, database Vitest configuration, the scoped
  activity assertions, the new clock suite, worker setup and the test-lease helper.
- Every production source, dependency file and migration matches the pre-closure
  fingerprint. No new environment names or credentials were introduced.
- HEAD remains `d21d05662367e64a5f6e475ffab2f1cf72a53e98` on main. Nothing staged,
  committed or pushed. Phase 2D has not started.

The initial unresolved qualification is closed as a demonstrated fixture-isolation
failure. Hostinger readiness and exceptional clock rollback are not certified by
this local test review; existing deployment gates remain.
