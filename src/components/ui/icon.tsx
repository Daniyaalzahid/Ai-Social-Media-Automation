import type { SVGProps } from 'react';

export type IconName = 'overview' | 'plus' | 'calendar' | 'content' | 'media' | 'check' | 'analytics' | 'link' | 'spark' | 'asterisk' | 'team' | 'activity' | 'settings' | 'arrow' | 'menu' | 'close' | 'collapse' | 'search' | 'alert' | 'clock' | 'logout';
const paths: Record<IconName, string> = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  plus: 'M12 5v14 M5 12h14',
  calendar: 'M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M3 9h18 M8 2v4 M16 2v4 M8 13h2 M14 13h2 M8 17h2',
  content: 'M6 3h12v18H6z M9 7h6 M9 11h6 M9 15h4',
  media: 'M3 4h18v16H3z M3 16l5-5 4 4 3-3 6 6 M16 8h.01',
  check: 'm5 12 4 4L19 6',
  analytics: 'M4 20V11 M10 20V5 M16 20V9 M22 20H2',
  link: 'm9 15 6-6 M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0 M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
  spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z',
  asterisk: 'M12 2v20 M2 12h20 M5 5l14 14 M19 5 5 19',
  team: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M19 14a4 4 0 0 1 3 4v3 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M17 3a4 4 0 0 1 0 8',
  activity: 'M2 12h5l3-8 4 16 3-8h5',
  settings: 'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  arrow: 'M5 12h14 m-6-6 6 6-6 6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'm6 6 12 12 M18 6 6 18',
  collapse: 'M3 4h18v16H3z M9 4v16 m7-12-4 4 4 4',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z m5 12 6 6',
  alert: 'm12 3 10 18H2L12 3Z M12 9v5 M12 17h.01',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z M12 6v6l4 2',
  logout: 'M9 3H3v18h6 M9 12h12 m-5-5 5 5-5 5',
};

export function Icon({ name, className, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg {...props} className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}
