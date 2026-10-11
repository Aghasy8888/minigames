import { describe, expect, it } from 'vitest';

import { formatScore } from './format-score';

describe('formatScore', () => {
  it.each([
    { value: 0, expected: '0' },
    { value: 999, expected: '999' },
    { value: 94_250, expected: '94,250' },
    { value: 1_234_567, expected: '1,234,567' },
  ])('formats $value as $expected with en-US separators', ({ value, expected }) => {
    expect(formatScore(value)).toBe(expected);
  });
});
