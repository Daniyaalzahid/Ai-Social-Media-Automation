import { afterAll } from 'vitest';
import { acquireDatabaseTestLease } from '../helpers/database-test-lease';

// A per-worker connection outlives every test in the file. An interrupted runner
// cannot silently overlap another invocation while its worker still owns fixtures.
const lease = await acquireDatabaseTestLease(process.env);
// Vitest afterAll hooks run in reverse registration order: file teardown first.
afterAll(() => lease.close());
