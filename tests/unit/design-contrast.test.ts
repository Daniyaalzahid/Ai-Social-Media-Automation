import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokens = new Map([...readFileSync('src/styles/tokens.css', 'utf8').matchAll(/(--[\w-]+):\s*(#[\da-f]{6})/gi)].map((match) => [match[1], match[2]]));
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((position) => parseInt(hex.slice(position, position + 2), 16) / 255);
  const linear = channels.map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return (linear[0] ?? 0) * .2126 + (linear[1] ?? 0) * .7152 + (linear[2] ?? 0) * .0722;
}
describe('design token accessibility contrast', () => {
  it.each([
    ['--text', '--bg'], ['--text', '--surface'], ['--muted', '--bg'], ['--muted', '--surface'],
    ['--surface', '--brand-primary'], ['--brand-primary', '--brand-soft'],
    ['--muted', '--surface-soft'], ['--success', '--success-soft'],
    ['--warning', '--warning-soft'], ['--danger', '--danger-soft'], ['--accent-blue', '--blue-soft'],
  ])('%s on %s meets WCAG AA normal-text contrast', (foreground, background) => {
    const a = tokens.get(foreground); const b = tokens.get(background);
    expect(a).toBeDefined(); expect(b).toBeDefined();
    if (!a || !b) throw new Error('Missing color token');
    const light = Math.max(luminance(a), luminance(b));
    const dark = Math.min(luminance(a), luminance(b));
    expect((light + .05) / (dark + .05)).toBeGreaterThanOrEqual(4.5);
  });
});
