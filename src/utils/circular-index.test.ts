import { describe, expect, it } from 'vitest';

import {
  isWrapRoleTransition,
  signedCircularDistance,
  sliderOrderFromDistance,
  sliderRoleFromDistance,
  wrapIndex,
} from './circular-index';

describe('wrapIndex', () => {
  it.each([
    { index: 0, length: 5, expected: 0 },
    { index: 4, length: 5, expected: 4 },
    { index: 5, length: 5, expected: 0 },
    { index: 6, length: 5, expected: 1 },
    { index: -1, length: 5, expected: 4 },
    { index: -6, length: 5, expected: 4 },
  ])('wraps $index into 0..$length as $expected', ({ index, length, expected }) => {
    expect(wrapIndex(index, length)).toBe(expected);
  });

  it.each([0, -2])('returns 0 for an empty or invalid length %i', (length) => {
    expect(wrapIndex(3, length)).toBe(0);
  });
});

describe('signedCircularDistance', () => {
  it.each([
    { name: 'the featured card itself', index: 0, featured: 0, expected: 0 },
    { name: 'the next card', index: 1, featured: 0, expected: 1 },
    { name: 'the previous card across the start', index: 6, featured: 0, expected: -1 },
    { name: 'a card past the halfway point', index: 4, featured: 0, expected: -3 },
    { name: 'a card just before the halfway point', index: 3, featured: 0, expected: 3 },
    { name: 'the next card across the end', index: 0, featured: 6, expected: 1 },
  ])('takes the shorter way round for $name (7 cards)', ({ index, featured, expected }) => {
    expect(signedCircularDistance(index, featured, 7)).toBe(expected);
  });

  it('keeps an exact half-way distance on its own side (6 cards)', () => {
    expect(signedCircularDistance(3, 0, 6)).toBe(3);
    expect(signedCircularDistance(0, 3, 6)).toBe(-3);
  });

  it('returns 0 for an empty slider', () => {
    expect(signedCircularDistance(2, 1, 0)).toBe(0);
  });
});

describe('sliderRoleFromDistance', () => {
  it.each([
    { distance: 0, expected: 'featured' },
    { distance: 1, expected: 'secondary' },
    { distance: -1, expected: 'secondary' },
    { distance: 2, expected: 'peek' },
    { distance: -2, expected: 'peek' },
    { distance: 3, expected: 'hidden' },
    { distance: -5, expected: 'hidden' },
  ])('gives distance $distance the $expected role', ({ distance, expected }) => {
    expect(sliderRoleFromDistance(distance)).toBe(expected);
  });
});

describe('sliderOrderFromDistance', () => {
  it.each([
    { distance: -5, expected: 0 },
    { distance: -3, expected: 0 },
    { distance: -2, expected: 1 },
    { distance: -1, expected: 2 },
    { distance: 0, expected: 3 },
    { distance: 1, expected: 4 },
    { distance: 2, expected: 5 },
    { distance: 3, expected: 6 },
    { distance: 9, expected: 6 },
  ])('places distance $distance at flex order $expected', ({ distance, expected }) => {
    expect(sliderOrderFromDistance(distance)).toBe(expected);
  });
});

describe('isWrapRoleTransition', () => {
  it.each([
    { name: 'a hidden card jumping from right to left', previous: 3, next: -3 },
    { name: 'a hidden card jumping from left to right', previous: -3, next: 3 },
    { name: 'a peek card jumping sides', previous: 2, next: -2 },
  ])('detects $name as a wrap', ({ previous, next }) => {
    expect(isWrapRoleTransition(previous, next)).toBe(true);
  });

  it.each([
    { name: 'moving into the featured slot', previous: 1, next: 0 },
    { name: 'jumping from far right into the featured slot', previous: 3, next: 0 },
    { name: 'leaving the featured slot', previous: 0, next: -1 },
    { name: 'leaving the featured slot far to the left', previous: 0, next: -3 },
    { name: 'crossing the center by one step each side', previous: 1, next: -1 },
    { name: 'moving along the same side', previous: 3, next: 2 },
  ])('does not treat $name as a wrap', ({ previous, next }) => {
    expect(isWrapRoleTransition(previous, next)).toBe(false);
  });
});
