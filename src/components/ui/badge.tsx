import type { ComponentProps } from 'react';
import { classes } from '../../lib/classes';
import { Icon, type IconName } from './icon';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'blue';
export function Badge({ tone = 'neutral', className, ...props }: ComponentProps<'span'> & { tone?: BadgeTone }) {
  return <span {...props} className={classes('badge', `badge--${tone}`, className)} />;
}

export type StatusLabel = 'Draft' | 'In review' | 'Approved' | 'Scheduled' | 'Published' | 'Needs attention' | 'Failed';
const statusAppearance: Record<StatusLabel, { tone: BadgeTone; icon: IconName }> = {
  Draft: { tone: 'neutral', icon: 'content' },
  'In review': { tone: 'warning', icon: 'clock' },
  Approved: { tone: 'success', icon: 'check' },
  Scheduled: { tone: 'blue', icon: 'calendar' },
  Published: { tone: 'success', icon: 'arrow' },
  'Needs attention': { tone: 'danger', icon: 'alert' },
  Failed: { tone: 'danger', icon: 'close' },
};
/** Visual vocabulary only; does not implement workflow transitions. */
export function StatusBadge({ status }: { status: StatusLabel }) {
  const appearance = statusAppearance[status];
  return <Badge tone={appearance.tone} className="status-badge"><Icon name={appearance.icon} />{status}</Badge>;
}
