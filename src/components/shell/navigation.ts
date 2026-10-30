import type { IconName } from '../ui/icon';

export type NavigationItem = { label: string; href: string; icon: IconName; description: string };
export const navigation: readonly NavigationItem[] = [
  { label: 'Overview', href: '/overview', icon: 'overview', description: 'Your content operation at a glance.' },
  { label: 'Create Post', href: '/create-post', icon: 'plus', description: 'A space for your next good idea.' },
  { label: 'Calendar', href: '/calendar', icon: 'calendar', description: 'Make room for a consistent brand presence.' },
  { label: 'Posts', href: '/content', icon: 'content', description: 'Every idea, draft, and platform variation.' },
  { label: 'Media', href: '/media', icon: 'media', description: 'A home for your campaign visuals.' },
  { label: 'Approvals', href: '/approvals', icon: 'check', description: 'A thoughtful second look before the world sees it.' },
  { label: 'Analytics', href: '/analytics', icon: 'analytics', description: 'Understand your content operation.' },
  { label: 'Connections', href: '/connections', icon: 'link', description: 'Your channels, together in one place.' },
  { label: 'Brand Brain', href: '/brand-brain', icon: 'spark', description: 'The voice and facts that make your brand yours.' },
  { label: 'Team', href: '/team', icon: 'team', description: 'Good work is a team effort.' },
  { label: 'Activity', href: '/activity', icon: 'activity', description: 'A clear view of what happened.' },
  { label: 'Settings', href: '/settings', icon: 'settings', description: 'Make this space work for your team.' },
];
