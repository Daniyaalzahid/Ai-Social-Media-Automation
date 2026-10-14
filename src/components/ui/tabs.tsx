'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { classes } from '../../lib/classes';

export type TabItem = { id: string; label: string; content: ReactNode };
export function Tabs({ label, items }: { label: string; items: readonly TabItem[] }) {
  const prefix = useId();
  const [active, setActive] = useState(items[0]?.id);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className="tabs"><div className="tab-list" role="tablist" aria-label={label}>{items.map((item, index) => <button key={item.id} id={`${prefix}-tab-${item.id}`} className={classes('tab', active === item.id && 'tab--active')} type="button" role="tab" aria-selected={active === item.id} aria-controls={`${prefix}-panel-${item.id}`} tabIndex={active === item.id ? 0 : -1} ref={(node) => { buttons.current[index] = node; }} onClick={() => setActive(item.id)} onKeyDown={(event) => {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    event.preventDefault();
    const nextItem = items[next];
    if (nextItem) { setActive(nextItem.id); buttons.current[next]?.focus(); }
  }}>{item.label}</button>)}</div>{items.map((item) => <div key={item.id} id={`${prefix}-panel-${item.id}`} role="tabpanel" aria-labelledby={`${prefix}-tab-${item.id}`} hidden={active !== item.id} tabIndex={0} className="tab-panel">{item.content}</div>)}</div>;
}
