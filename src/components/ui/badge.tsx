import type { ComponentProps } from 'react';
import { classes } from '../../lib/classes';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'blue';
export function Badge({ tone = 'neutral', className, ...props }: ComponentProps<'span'> & { tone?: BadgeTone }) {
  return <span {...props} className={classes('badge', `badge--${tone}`, className)} />;
}
