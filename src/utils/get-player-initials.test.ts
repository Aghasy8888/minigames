import { describe, expect, it } from 'vitest';

import { getNameInitial, getPlayerInitials } from './get-player-initials';

describe('getNameInitial', () => {
  it.each([
    { name: 'a capitalized name', value: 'ForestDweller', expected: 'F' },
    { name: 'a lowercase name', value: 'bob', expected: 'B' },
    { name: 'leading spaces', value: '  bob', expected: 'B' },
    { name: 'leading tabs and newlines', value: '\n\tbob', expected: 'B' },
    { name: 'an accented letter', value: 'élodie', expected: 'É' },
    { name: 'a Cyrillic letter', value: 'жора', expected: 'Ж' },
    { name: 'a digit', value: '42club', expected: '4' },
  ])('returns the uppercased first character for $name', ({ value, expected }) => {
    expect(getNameInitial(value)).toBe(expected);
  });

  it('keeps an emoji whole instead of returning half of it', () => {
    expect(getNameInitial('😀bob')).toBe('😀');
  });

  it.each([
    { name: 'an empty name', value: '' },
    { name: 'a whitespace-only name', value: ' '.repeat(3) },
  ])('returns an empty string for $name', ({ value }) => {
    expect(getNameInitial(value)).toBe('');
  });
});

describe('getPlayerInitials', () => {
  it.each([
    { name: 'underscore segments', value: 'Alex_Pro99', expected: 'AP' },
    { name: 'lowercase underscore segments', value: 'alex_pro', expected: 'AP' },
    { name: 'camelCase words', value: 'MatchMaster', expected: 'MM' },
    { name: 'camelCase before an underscore', value: 'CozyGamer_x', expected: 'CG' },
    { name: 'an acronym before a word', value: 'XMLParser', expected: 'XP' },
    { name: 'space-separated words', value: 'john doe', expected: 'JD' },
  ])('takes one letter from each of the first two words for $name', ({ value, expected }) => {
    expect(getPlayerInitials(value)).toBe(expected);
  });

  it.each([
    { name: 'a single lowercase word', value: 'alex', expected: 'AL' },
    { name: 'a single acronym', value: 'ABC', expected: 'AB' },
    { name: 'a word followed by digits', value: 'player42', expected: 'PL' },
    { name: 'digits followed by a word', value: '42player', expected: '42' },
    { name: 'a single character', value: 'x', expected: 'X' },
  ])('uses the first two characters for $name', ({ value, expected }) => {
    expect(getPlayerInitials(value)).toBe(expected);
  });

  it('returns an empty string for an empty name', () => {
    expect(getPlayerInitials('')).toBe('');
  });
});
