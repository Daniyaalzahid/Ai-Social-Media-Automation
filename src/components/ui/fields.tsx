import type { ComponentProps, ReactNode } from 'react';
import { classes } from '../../lib/classes';

type FieldProps = { id: string; label: string; hint?: string; error?: string };
function description(id: string, hint?: string, error?: string, existing?: string) {
  return classes(existing, hint && `${id}-hint`, error && `${id}-error`) || undefined;
}
function Field({ id, label, hint, error, children }: FieldProps & { children: ReactNode }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{children}{hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}{error && <p className="field-error" id={`${id}-error`}>{error}</p>}</div>;
}
export function Input({ id, label, hint, error, className, ...props }: ComponentProps<'input'> & FieldProps) {
  return <Field id={id} label={label} {...(hint ? { hint } : {})} {...(error ? { error } : {})}><input {...props} id={id} className={classes('input', className)} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={description(id, hint, error, props['aria-describedby'])} /></Field>;
}
export function Textarea({ id, label, hint, error, className, ...props }: ComponentProps<'textarea'> & FieldProps) {
  return <Field id={id} label={label} {...(hint ? { hint } : {})} {...(error ? { error } : {})}><textarea {...props} id={id} className={classes('input', 'textarea', className)} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={description(id, hint, error, props['aria-describedby'])} /></Field>;
}
export function Select({ id, label, hint, error, className, ...props }: ComponentProps<'select'> & FieldProps) {
  return <Field id={id} label={label} {...(hint ? { hint } : {})} {...(error ? { error } : {})}><select {...props} id={id} className={classes('input', 'select', className)} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={description(id, hint, error, props['aria-describedby'])} /></Field>;
}
export function Checkbox({ id, label, className, ...props }: Omit<ComponentProps<'input'>, 'type'> & { id: string; label: string }) {
  return <label className={classes('checkbox', className)} htmlFor={id}><input {...props} id={id} type="checkbox" /><span>{label}</span></label>;
}

// Semantic group shared by the manual composer and AI generator. Disabled
// fieldsets retain their native form behavior; presentation never gates access.
export function FormSection({ title, step, description, children, className, ...props }: ComponentProps<'fieldset'> & { title: string; step?: string; description?: string }) {
  return <fieldset {...props} className={classes('form-section', className)}><legend>{step && <span className="section-step" aria-hidden="true">{step}</span>}{title}</legend>{description && <p className="section-description">{description}</p>}<div className="form-section-body">{children}</div></fieldset>;
}
