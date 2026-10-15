// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TeamPanel } from '../../src/features/team/team-panel';
import { InvitationForm } from '../../src/features/team/invitation-form';
import { AppShell } from '../../src/components/shell/app-shell';
import { navigation } from '../../src/components/shell/navigation';
vi.mock('next/navigation', () => ({ usePathname: () => '/overview' }));
describe('accessible team surfaces', () => {
  it('uses labeled invite fields and suppresses self administration', () => {
    render(<TeamPanel initialMembers={[{ id: '550e8400-e29b-41d4-a716-446655440000', displayName: 'Owner', email: 'owner@example.test', role: 'OWNER', status: 'active', mfaEnabled: true, activeSessions: 1 }]} selfId="550e8400-e29b-41d4-a716-446655440000" />);
    expect(screen.getByRole('form', { name: 'Invite member' })).toBeInTheDocument();
    expect(screen.getByLabelText('Initial role')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable account' })).not.toBeInTheDocument();
    expect(screen.getByText(/MFA enabled/)).toBeInTheDocument();
  });
  it('invitation requires a bearer and uses a password-manager-compatible field', () => {
    render(<InvitationForm />);
    expect(screen.getByRole('form', { name: 'Accept invitation' })).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toHaveAttribute('autoComplete', 'new-password');
    expect(screen.getByRole('button', { name: 'Accept invitation' })).toBeDisabled();
  });
  it('renders only server-selected navigation, including in mobile drawer', () => {
    render(<AppShell items={navigation.filter((item) => ['/overview','/calendar','/content','/analytics'].includes(item.href))} showDesignSystem={false}><h1>Workspace</h1></AppShell>);
    expect(screen.queryByRole('link', { name: 'Team' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Design system/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Calendar' })).toBeInTheDocument();
  });
});
