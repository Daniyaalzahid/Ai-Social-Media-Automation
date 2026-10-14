import type { ComponentProps } from 'react';
import { classes } from '../../lib/classes';

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return <section {...props} className={classes('card', className)} />;
}
