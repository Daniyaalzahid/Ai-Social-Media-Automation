import type { ComponentProps } from 'react';

export const platformNames: Record<string, string> = { FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', YOUTUBE: 'YouTube', LINKEDIN: 'LinkedIn' };
const marks: Record<string, string> = { FACEBOOK: 'f', INSTAGRAM: 'ig', TIKTOK: 'tk', YOUTUBE: 'yt', LINKEDIN: 'in' };

export function PlatformChoice({ platform, ...props }: Omit<ComponentProps<'input'>, 'type' | 'aria-label'> & { platform: string }) {
  return <label className="platform-choice"><span className="platform-mark" aria-hidden="true">{marks[platform]}</span><span>{platformNames[platform] ?? platform}</span><input {...props} type="checkbox" aria-label={platform} /></label>;
}
