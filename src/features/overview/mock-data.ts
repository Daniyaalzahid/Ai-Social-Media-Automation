import type { BadgeTone, StatusLabel } from '../../components/ui/badge';
import type { IconName } from '../../components/ui/icon';

/** Presentation fixtures only. No live account, publishing, analytics, or AI data. */
export const sampleMetrics: readonly { label: string; value: string; note: string; icon: IconName; tone: BadgeTone }[] = [
  { label: 'Scheduled today', value: '08', note: 'Across your channels', icon: 'calendar', tone: 'neutral' },
  { label: 'Awaiting approval', value: '03', note: 'Ready to review', icon: 'clock', tone: 'warning' },
  { label: 'Published', value: '24', note: 'This week', icon: 'check', tone: 'success' },
  { label: 'Needs attention', value: '02', note: 'Review publishing issues', icon: 'alert', tone: 'danger' },
];
export const samplePosts: readonly { title: string; category: string; channel: string; initials: string; time: string; status: StatusLabel; tone: BadgeTone; art: string }[] = [
  { title: 'A cooler kind of everyday', category: 'Home comfort · Summer edit', channel: 'Instagram', initials: 'IG', time: '10:30 AM', status: 'Scheduled', tone: 'blue', art: 'cool' },
  { title: 'Small upgrades. Big difference.', category: 'Kitchen essentials', channel: 'Facebook', initials: 'f', time: '12:00 PM', status: 'Scheduled', tone: 'blue', art: 'warm' },
  { title: 'A home that works for you', category: 'Brand story', channel: 'LinkedIn', initials: 'in', time: '03:00 PM', status: 'In review', tone: 'warning', art: 'ink' },
];
export const sampleActivity = [
  { initials: 'AR', name: 'Ayesha', action: 'sent a draft for review', detail: 'A home that works for you', time: '12 minutes ago', tone: 'warm' },
  { initials: 'HA', name: 'Hamza', action: 'approved a post', detail: 'Small upgrades. Big difference.', time: '35 minutes ago', tone: 'blue' },
  { initials: 'AR', name: 'Ayesha', action: 'updated a draft', detail: 'A cooler kind of everyday', time: '1 hour ago', tone: 'warm' },
] as const;
