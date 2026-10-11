import { describe, expect, it } from 'vitest';

import { getVisiblePageNumbers } from './get-visible-page-numbers';

describe('getVisiblePageNumbers', () => {
  it.each([
    { name: 'zero pages', current: 1, total: 0, max: 5 },
    { name: 'a negative page count', current: 1, total: -1, max: 5 },
    { name: 'zero visible slots', current: 1, total: 5, max: 0 },
  ])('returns no pages for $name', ({ current, total, max }) => {
    expect(getVisiblePageNumbers(current, total, max)).toEqual([]);
  });

  it.each([
    { name: 'a single page', current: 1, total: 1, max: 5, expected: [1] },
    { name: 'fewer pages than slots', current: 2, total: 3, max: 5, expected: [1, 2, 3] },
    {
      name: 'exactly as many pages as slots',
      current: 5,
      total: 5,
      max: 5,
      expected: [1, 2, 3, 4, 5],
    },
  ])('shows every page for $name', ({ current, total, max, expected }) => {
    expect(getVisiblePageNumbers(current, total, max)).toEqual(expected);
  });

  it.each([
    { name: 'the first page', current: 1, expected: [1, 2, 3, 4, 5] },
    { name: 'the second page', current: 2, expected: [1, 2, 3, 4, 5] },
    { name: 'a middle page', current: 5, expected: [3, 4, 5, 6, 7] },
    { name: 'the second-to-last page', current: 9, expected: [6, 7, 8, 9, 10] },
    { name: 'the last page', current: 10, expected: [6, 7, 8, 9, 10] },
  ])('slides a 5-page window over 10 pages on $name', ({ current, expected }) => {
    expect(getVisiblePageNumbers(current, 10, 5)).toEqual(expected);
  });

  it('puts the current page left of center in an even window', () => {
    expect(getVisiblePageNumbers(5, 10, 4)).toEqual([4, 5, 6, 7]);
  });

  it.each([
    { name: 'below the first page', current: 0, expected: [1, 2, 3, 4, 5] },
    { name: 'past the last page', current: 99, expected: [6, 7, 8, 9, 10] },
    { name: 'a fractional page', current: 2.7, expected: [1, 2, 3, 4, 5] },
  ])('clamps a current page $name', ({ current, expected }) => {
    expect(getVisiblePageNumbers(current, 10, 5)).toEqual(expected);
  });

  it('always returns a contiguous in-range window that contains the current page', () => {
    for (let total = 1; total <= 12; total += 1) {
      for (let max = 1; max <= 7; max += 1) {
        for (let current = 1; current <= total; current += 1) {
          const pages = getVisiblePageNumbers(current, total, max);
          const expectedLength = Math.min(max, total);
          const first = pages[0] ?? 0;

          expect(pages).toContain(current);
          expect(pages).toEqual(
            Array.from({ length: expectedLength }, (_, index) => first + index),
          );
          expect(first).toBeGreaterThanOrEqual(1);
          expect(first + expectedLength - 1).toBeLessThanOrEqual(total);
        }
      }
    }
  });
});
