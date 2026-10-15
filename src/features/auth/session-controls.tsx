'use client';
import { useEffect, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { authRequest } from './transport';
export function SessionControls() {
  const lastTouch = useRef(0);
  useEffect(() => {
    function touch(event: Event) {
      if (!event.isTrusted || Date.now() - lastTouch.current < 60000) return;
      lastTouch.current = Date.now();
      void authRequest({ action: 'activity' }).catch(() => { /* Route boundary handles expired access. */ });
    }
    document.addEventListener('click', touch); document.addEventListener('keydown', touch);
    return () => { document.removeEventListener('click', touch); document.removeEventListener('keydown', touch); };
  }, []);
  return <Button variant="ghost" onClick={() => { void authRequest({ action: 'logout' }).then((result) => { if (result.ok) window.location.assign('/login'); }).catch(() => { /* Safe retry through the existing button. */ }); }}>Sign out</Button>;
}
