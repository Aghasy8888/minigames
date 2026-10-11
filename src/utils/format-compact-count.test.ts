import { describe, expect, it } from 'vitest';

import { formatCompactCount } from './format-compact-count';

describe('formatCompactCount', () => {
  it.each([
    { value: 0, expected: '0' },
    { value: 999, expected: '999' },
  ])('keeps $value below a thousand as is', ({ value, expected }) => {
    expect(formatCompactCount(value)).toBe(expected);
  });

  it.each([
    { value: 1000, expected: '1K' },
    { value: 1099, expected: '1K' },
    { value: 1100, expected: '1.1K' },
    { value: 28_750, expected: '28.7K' },
    { value: 54_200, expected: '54.2K' },
    { value: 999_999, expected: '999.9K' },
  ])('formats $value as $expected, rounding down to one decimal', ({ value, expected }) => {
    expect(formatCompactCount(value)).toBe(expected);
  });
});
