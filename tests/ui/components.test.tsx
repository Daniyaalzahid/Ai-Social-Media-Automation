// @vitest-environment jsdom
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Badge, StatusBadge } from '../../src/components/ui/badge';
import { Button, IconButton } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';
import { Checkbox, Input, Select, Textarea } from '../../src/components/ui/fields';
import { Dialog } from '../../src/components/ui/dialog';
import { Tabs } from '../../src/components/ui/tabs';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/ui/states';
import { PageHeader } from '../../src/components/ui/page-header';

describe('accessible UI building blocks', () => {
  it.each(['Draft', 'In review', 'Approved', 'Scheduled', 'Published', 'Needs attention', 'Failed'] as const)('renders %s with text and a decorative status symbol', (status) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByText(status);
    expect(badge).toHaveClass('status-badge');
    expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
  it('renders semantic buttons, a named icon control, card, and readable badge', () => {
    render(<Card aria-label="Preview card"><Button disabled>Unavailable</Button><IconButton label="Open menu">+</IconButton><Badge tone="success">Approved</Badge></Card>);
    expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('region', { name: 'Preview card' })).toBeInTheDocument();
    expect(screen.getByText('Approved')).toHaveClass('badge--success');
  });
  it('associates labels, hints, and errors with native form controls', async () => {
    const user = userEvent.setup();
    render(<><Input id="title" label="Title" hint="For your team" /><Textarea id="brief" label="Brief" /><Select id="language" label="Language"><option>English</option><option>Urdu</option></Select><Checkbox id="confirm" label="Preview preference" /><Input id="invalid" label="Invalid field" error="Please correct this." /></>);
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveAccessibleDescription('For your team');
    expect(screen.getByRole('textbox', { name: 'Invalid field' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox', { name: 'Invalid field' })).toHaveAccessibleDescription('Please correct this.');
    await user.type(screen.getByRole('textbox', { name: 'Brief' }), 'A sample idea');
    expect(screen.getByRole('textbox', { name: 'Brief' })).toHaveValue('A sample idea');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'Urdu');
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('Urdu');
    await user.click(screen.getByRole('checkbox', { name: 'Preview preference' }));
    expect(screen.getByRole('checkbox', { name: 'Preview preference' })).toBeChecked();
  });
  it('renders a single page heading and meaningful state announcements', () => {
    render(<><PageHeader title="Media" description="Your visual library" /><EmptyState title="Nothing here yet" description="Add an idea later." /><LoadingState label="Loading preview" /><ErrorState title="Offline" description="Try again later." /></>);
    expect(screen.getByRole('heading', { level: 1, name: 'Media' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading preview');
    expect(screen.getByRole('alert')).toHaveTextContent('Offline');
    expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
  });
  it('supports tab keyboard navigation, wrapping, and labeled panels', async () => {
    const user = userEvent.setup();
    render(<Tabs label="States" items={[{ id: 'one', label: 'First', content: 'First panel' }, { id: 'two', label: 'Second', content: 'Second panel' }]} />);
    await user.click(screen.getByRole('tab', { name: 'First' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Second' })).toHaveTextContent('Second panel');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'First' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'First' })).toHaveFocus();
  });
  it('opens/closes a labeled dialog and restores scroll state', async () => {
    const user = userEvent.setup();
    function Preview() {
      const [open, setOpen] = useState(false);
      return <><Button onClick={() => setOpen(true)}>Open</Button><Dialog open={open} onClose={() => setOpen(false)} title="Preview dialog" description="Nothing saved">Dialog contents</Dialog></>;
    }
    render(<Preview />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog', { name: 'Preview dialog' })).toHaveAccessibleDescription('Nothing saved');
    expect(document.body.style.overflow).toBe('hidden');
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });
});
