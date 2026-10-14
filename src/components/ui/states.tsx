import type { ReactNode } from 'react';
import { Icon, type IconName } from './icon';

export function EmptyState({ title, description, icon = 'spark', action }: { title: string; description: string; icon?: IconName; action?: ReactNode }) {
  return <div className="empty-state"><span className="state-icon"><Icon name={icon} /></span><h2>{title}</h2><p>{description}</p>{action}</div>;
}
export function LoadingState({ label = 'Loading your workspace' }: { label?: string }) {
  return <div className="loading-state" role="status"><span className="loading-indicator" aria-hidden="true" /><span>{label}</span></div>;
}
export function ErrorState({ title = 'Something went wrong', description = 'Please try again in a moment.', action }: { title?: string; description?: string; action?: ReactNode }) {
  return <section className="error-state" role="alert"><span className="state-icon"><Icon name="alert" /></span><h2>{title}</h2><p>{description}</p>{action}</section>;
}
