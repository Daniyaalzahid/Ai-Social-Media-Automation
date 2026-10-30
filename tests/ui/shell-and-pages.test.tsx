// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from '../../src/components/shell/app-shell';
import { navigation } from '../../src/components/shell/navigation';
import { LoginForm } from '../../src/features/auth/login-form';
import { Overview } from '../../src/features/overview/overview';
import { StatusPage } from '../../src/components/status-page';

vi.mock('next/navigation', () => ({ usePathname: () => '/overview' }));

describe('workspace shell and presentation pages', () => {
  it('keeps all destinations, groups advanced tools and marks the current route', async () => {
    render(<AppShell><h1>Overview preview</h1></AppShell>);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav.querySelectorAll(':scope > a')).toHaveLength(4);
    expect(nav.querySelector('details')).not.toHaveAttribute('open');
    await userEvent.click(within(nav).getByText('More'));
    expect(within(nav).getAllByRole('link')).toHaveLength(12);
    expect(navigation.map((item) => item.label)).toEqual(['Overview', 'Create Post', 'Calendar', 'Posts', 'Media', 'Approvals', 'Analytics', 'Connections', 'Brand Brain', 'Team', 'Activity', 'Settings']);
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('searchbox', { name: 'Search workspace' })).toBeDisabled();
  });
  it('collapses the desktop sidebar without losing link accessible names', async () => {
    const user = userEvent.setup();
    render(<AppShell><h1>Preview</h1></AppShell>);
    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Brand Brain' })).toHaveAttribute('href', '/brand-brain');
    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toHaveAttribute('aria-expanded', 'true');
  });
  it('opens and closes the mobile navigation dialog', async () => {
    const user = userEvent.setup();
    render(<AppShell><h1>Preview</h1></AppShell>);
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const dialog = screen.getByRole('dialog', { name: 'Bismillah Social AI' });
    expect(within(dialog).getAllByRole('link')).toHaveLength(13);
    expect(dialog.querySelector('details')).not.toHaveAttribute('open');
    await user.click(within(dialog).getByText('More'));
    expect(within(dialog).getAllByRole('link')).toHaveLength(13);
    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('labels functional sign-in fields without changing the editorial screen', () => {
    render(<LoginForm />);
    expect(screen.getByRole('form', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Work email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Work email')).not.toBeDisabled();
    expect(screen.getByLabelText('Password')).toHaveAttribute('autoComplete', 'current-password');
    expect(screen.getByLabelText('Password')).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sign in' })).not.toBeDisabled();
    expect(screen.getByRole('link', { name: /Back to home/ })).toHaveAttribute('href', '/');
  });
  it('shows scoped real post counts without invented activity or scheduled delivery', () => {
    render(<Overview posts={{items:[],cursor:null}} />);
    for(const title of ['Published','Drafts','Failed','Awaiting review','Recent Posts'])expect(screen.getByRole('heading',{name:title})).toBeInTheDocument();
    expect(screen.getByText(/Scheduling is not available/)).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Create Post'})).toHaveAttribute('href','/create-post');
    expect(screen.queryByText(/illustrative/)).not.toBeInTheDocument();
  });
  it('does not present withheld publishing metrics as zero',()=>{
    render(<Overview canSeePublishing={false} posts={{items:[],cursor:null}}/>);
    expect(screen.getAllByText('—')).toHaveLength(2);
  });
  it.each(['403', '404', '500', 'OFFLINE'])('renders the %s error state with a recovery link', (code) => {
    render(<StatusPage code={code} title="Safe error" description="A sanitized description." />);
    expect(screen.getByRole('heading', { name: 'Safe error' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to overview' })).toHaveAttribute('href', '/overview');
  });
});
