'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconButton } from './button';
import { Icon } from './icon';

export function Dialog({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) {
      dialog.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { dialog.close(); document.body.style.overflow = previous; };
    }
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="dialog" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined} onCancel={(event) => { event.preventDefault(); onClose(); }} onKeyDown={(event) => {
    if (event.key !== 'Tab') return;
    const candidates = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button, input, textarea, select, summary, [tabindex]'));
    const focusable = candidates.filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }}><header className="dialog-header"><h2 id={`${id}-title`}>{title}</h2><IconButton label="Close dialog" onClick={onClose}><Icon name="close" /></IconButton></header>{description && <p id={`${id}-description`} className="muted">{description}</p>}<div className="dialog-content">{children}</div></dialog>;
}
