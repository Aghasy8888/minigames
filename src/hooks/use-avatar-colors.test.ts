import { describe, expect, it, vi } from 'vitest';

import { useAvatarColors } from './use-avatar-colors';

const COLORS = ['coral', 'mint', 'sky'] as const;

describe('useAvatarColors', () => {
  it.each([
    { name: 'the lowest random value', random: 0, color: 'coral' },
    { name: 'a middle random value', random: 0.5, color: 'mint' },
    { name: 'the highest random value', random: 0.999, color: 'sky' },
  ])('picks a color from $name', ({ random, color }) => {
    vi.spyOn(Math, 'random').mockReturnValue(random);

    expect(useAvatarColors(COLORS)('comment-1')).toBe(color);
  });

  it('keeps the first color for a comment it has already seen', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const pick = useAvatarColors(COLORS);
    pick('comment-1');

    random.mockReturnValue(0.999);

    expect(pick('comment-1')).toBe('coral');
    expect(pick('comment-2')).toBe('sky');
  });

  it('gives each picker its own assignments', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    useAvatarColors(COLORS)('comment-1');

    random.mockReturnValue(0.5);

    expect(useAvatarColors(COLORS)('comment-1')).toBe('mint');
  });
});
