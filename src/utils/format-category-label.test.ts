import { describe, expect, it } from 'vitest';

import { formatCategoryLabel } from './format-category-label';

describe('formatCategoryLabel', () => {
  it.each([
    { value: 'strategy', expected: 'Strategy' },
    { value: 'a', expected: 'A' },
    { value: 'Puzzle', expected: 'Puzzle' },
  ])('capitalizes $value as $expected', ({ value, expected }) => {
    expect(formatCategoryLabel(value)).toBe(expected);
  });

  it('returns an empty string for an empty category', () => {
    expect(formatCategoryLabel('')).toBe('');
  });
});
