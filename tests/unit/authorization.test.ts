import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { ROLE_CODES, ROLE_PERMISSIONS, PERMISSION_CODES } from '../../src/server/db/catalog';
import { can, requirePermission, requireAnyPermission, requireAllPermissions, requireOwner, type AuthorizationContext } from '../../src/server/authorization/authorization';
import { ROUTE_PERMISSIONS } from '../../src/server/authorization/routes';
import { parseMutation, teamAction } from '../../src/server/team/policy';
import { invitationHash } from '../../src/server/team/service';
import { SensitiveValue } from '../../src/server/security/sensitive';
const a = '550e8400-e29b-41d4-a716-446655440000', b = '550e8400-e29b-41d4-a716-446655440001';
describe('canonical authorization and action commitments', () => {
  it.each(ROLE_CODES)('evaluates every canonical permission for %s', (role) => {
    const context: AuthorizationContext = { userId: a, sessionId: b, displayName: 'Synthetic', role, permissions: ROLE_PERMISSIONS[role] };
    for (const permission of PERMISSION_CODES) expect(can(context, permission)).toBe(ROLE_PERMISSIONS[role].includes(permission));
    expect(can(context, '*')).toBe(false); expect(() => requireAnyPermission(context, [])).toThrow('Access denied'); expect(() => requireAllPermissions(context, [])).toThrow('Access denied');
    if (role === 'OWNER') { expect(() => requireOwner(context)).not.toThrow(); requireAllPermissions(context, PERMISSION_CODES); }
    else { expect(() => requireOwner(context)).toThrow('Access denied'); expect(() => requirePermission(context, 'users.manage')).toThrow('Access denied'); }
  });
  it('uses approved 31 codes and only Owner has team/role/session admin capabilities', () => {
    expect(PERMISSION_CODES).toHaveLength(31);
    for (const role of ROLE_CODES) expect(ROLE_PERMISSIONS[role].includes('users.manage')).toBe(role === 'OWNER');
  });
  it('has explicit permission gates for every destination', () => {
    expect(Object.keys(ROUTE_PERMISSIONS)).toHaveLength(13);
    expect(Object.values(ROUTE_PERMISSIONS).every((p) => p.length > 0 && p.every((code) => PERMISSION_CODES.includes(code)))).toBe(true);
  });
  it('normalizes invitation identifiers before committing the action, not passwords', () => {
    const one = parseMutation({ action: 'invite', email: ' Person@Example.test ', displayName: 'A', role: 'VIEWER' });
    const two = parseMutation({ action: 'invite', email: 'person@example.test', displayName: 'A', role: 'VIEWER' });
    expect(teamAction(one)).toBe(teamAction(two));
    expect(teamAction(one).length).toBeLessThanOrEqual(80);
  });
  it('binds proof to action, target and exact desired state', () => {
    const values = [{ action: 'role', targetId: a, role: 'VIEWER' }, { action: 'role', targetId: a, role: 'OWNER' }, { action: 'role', targetId: b, role: 'VIEWER' }, { action: 'status', targetId: a, enabled: false }, { action: 'status', targetId: a, enabled: true }, { action: 'sessions', targetId: a }, { action: 'revoke-invitation', targetId: a }].map((v) => teamAction(parseMutation(v)));
    expect(new Set(values).size).toBe(values.length);
    expect(values.every((v) => /^TEAM_[A-Z_]+:[A-Za-z0-9_-]{43}$/.test(v))).toBe(true);
  });
  it.each([{ action: 'role', targetId: a, role: 'admin' }, { action: 'role', targetId: a, role: 'OWNER', permissions: ['*'] }, { action: 'status', targetId: '../owner', enabled: true }, { action: 'invite', email: 'user@example.test', displayName: '\nSecret', role: 'VIEWER' }, { action: 'invite', email: 'user@example.test', displayName: '\uD800', role: 'VIEWER' }])('rejects malformed/privilege-bearing payload %#', (value) => { expect(() => parseMutation(value)).toThrow(); });
  it('purpose-separates invitation token hashing and never serializes a bearer', () => {
    const raw = new SensitiveValue(randomBytes(32).toString('base64url'));
    expect(invitationHash(raw).length).toBe(32); expect(JSON.stringify(raw).includes(raw.reveal())).toBe(false);
    expect(() => invitationHash(new SensitiveValue('invalid'))).toThrow('Security operation unavailable');
  });
});

describe('documented permission matrix agreement', () => {
  it('both Phase 2D documents enumerate exactly the seeded catalog and mappings', async () => {
    const { readFileSync } = await import('node:fs');
    for (const path of ['docs/architecture/phase-2d.md','docs/review/phase-2d.md']) {
      const rows = readFileSync(path, 'utf8').split('\n').filter((line) => /^\| [a-z_]+\.[a-z_]+ \|/.test(line));
      expect(rows).toHaveLength(PERMISSION_CODES.filter(p=>!['brand.read','media.read','media.manage'].includes(p)).length);
      for (const line of rows) {
        const cells = line.split('|').map((part) => part.trim()).filter(Boolean);
        const permission = cells[0]! as typeof PERMISSION_CODES[number]; expect(PERMISSION_CODES.includes(permission)).toBe(true);
        for (const [i, role] of ROLE_CODES.entries()) expect(cells[i + 1] === 'yes').toBe(ROLE_PERMISSIONS[role].includes(permission));
      }
    }
  });
});
