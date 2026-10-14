import type { ComponentProps } from 'react';
import { classes } from '../../lib/classes';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function buttonClass(variant: Variant = 'primary', className?: string): string {
  return classes('button', `button--${variant}`, className);
}
export function Button({ variant = 'primary', className, type = 'button', ...props }: ComponentProps<'button'> & { variant?: Variant }) {
  return <button {...props} type={type} className={buttonClass(variant, className)} />;
}
export function IconButton({ label, className, type = 'button', ...props }: Omit<ComponentProps<'button'>, 'aria-label'> & { label: string }) {
  return <button {...props} type={type} aria-label={label} title={label} className={classes('icon-button', className)} />;
}
