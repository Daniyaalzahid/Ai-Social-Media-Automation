'use client';

import { useState } from 'react';
import { StatusBadge, type StatusLabel } from '../../components/ui/badge';
import { Button, IconButton } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Dialog } from '../../components/ui/dialog';
import { Checkbox, Input, Select, Textarea } from '../../components/ui/fields';
import { Icon } from '../../components/ui/icon';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/states';
import { Tabs } from '../../components/ui/tabs';

export function ComponentShowcase() {
  const [dialogOpen, setDialogOpen] = useState(false);
  return <><div className="ui-kit-grid"><Card className="ui-kit-card"><h2>Buttons & controls</h2><div className="component-row"><Button onClick={() => setDialogOpen(true)}>Open dialog <Icon name="arrow" /></Button><Button variant="secondary" onClick={() => setDialogOpen(true)}>Secondary</Button><Button variant="ghost" onClick={() => setDialogOpen(true)}>Ghost</Button><Button disabled>Disabled</Button><IconButton label="Open preview dialog" onClick={() => setDialogOpen(true)}><Icon name="plus" /></IconButton></div></Card><Card className="ui-kit-card"><h2>Labels with meaning</h2><div className="component-row">{(['Draft', 'In review', 'Approved', 'Scheduled', 'Published', 'Needs attention', 'Failed'] as const satisfies readonly StatusLabel[]).map((status) => <StatusBadge key={status} status={status} />)}</div></Card><Card className="ui-kit-card"><h2>Form foundations</h2><form className="component-stack" aria-label="Component preview form" onSubmit={(event) => event.preventDefault()}><Input id="sample-title" label="Internal title" placeholder="Give your idea a name" hint="A label for your team, not your audience." /><Textarea id="sample-brief" label="Campaign brief" placeholder="What’s the story?" /><Select id="sample-language" label="Language" defaultValue="English"><option>English</option><option>Urdu</option><option>Roman Urdu</option><option>Mixed</option></Select><Checkbox id="sample-checkbox" label="Show this preference in the preview" /><Input id="sample-error" label="Example invalid field" error="Please add a title." /></form></Card><Card className="ui-kit-card"><h2>Tabs & states</h2><Tabs label="Component states" items={[{ id: 'empty', label: 'Empty', content: <EmptyState title="A fresh canvas." description="There’s room here for your next idea." /> }, { id: 'loading', label: 'Loading', content: <LoadingState label="Loading preview" /> }, { id: 'error', label: 'Error', content: <ErrorState title="We couldn’t load this." description="Check your connection and try again." /> }]} /></Card></div><Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="A little room to focus." description="This is a dialog preview. Nothing is saved or sent."><p>One clear decision. An accessible space to make it.</p><div className="component-row dialog-actions"><Button onClick={() => setDialogOpen(false)}>Got it</Button><Button variant="secondary" onClick={() => setDialogOpen(false)}>Close preview</Button></div></Dialog></>;
}
