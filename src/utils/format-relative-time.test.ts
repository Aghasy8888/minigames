import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatRelativeTime } from './format-relative-time';

const NOW = new Date('2026-10-11T12:00:00.000Z');
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function ago(milliseconds: number): string {
  return new Date(NOW.getTime() - milliseconds).toISOString();
}

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { name: 'the same instant', iso: ago(0), expected: 'just now' },
    { name: '59 seconds', iso: ago(59 * SECOND), expected: 'just now' },
    { name: '1 minute', iso: ago(MINUTE), expected: '1 min ago' },
    { name: '59 minutes 59 seconds', iso: ago(HOUR - SECOND), expected: '59 min ago' },
    { name: '1 hour', iso: ago(HOUR), expected: '1 hour ago' },
    { name: '2 hours', iso: ago(2 * HOUR), expected: '2 hours ago' },
    { name: '23 hours 59 minutes', iso: ago(DAY - MINUTE), expected: '23 hours ago' },
    { name: '1 day', iso: ago(DAY), expected: '1 day ago' },
    { name: '6 days 23 hours', iso: ago(7 * DAY - HOUR), expected: '6 days ago' },
    { name: '7 days', iso: ago(7 * DAY), expected: '1 week ago' },
    { name: '14 days', iso: ago(14 * DAY), expected: '2 weeks ago' },
    { name: '27 days', iso: ago(27 * DAY), expected: '3 weeks ago' },
    { name: '28 days', iso: ago(28 * DAY), expected: '1 month ago' },
  ])('formats $name ago as "$expected"', ({ iso, expected }) => {
    expect(formatRelativeTime(iso, NOW)).toBe(expected);
  });

  it.each([
    { name: 'one calendar month', iso: '2026-09-11T12:00:00.000Z', expected: '1 month ago' },
    {
      name: 'a day short of two calendar months',
      iso: '2026-08-12T12:00:00.000Z',
      expected: '1 month ago',
    },
    { name: 'two calendar months', iso: '2026-08-11T12:00:00.000Z', expected: '2 months ago' },
    { name: 'eleven calendar months', iso: '2025-11-11T12:00:00.000Z', expected: '11 months ago' },
    { name: 'a day short of a year', iso: '2025-10-12T12:00:00.000Z', expected: '11 months ago' },
    { name: 'one year', iso: '2025-10-11T12:00:00.000Z', expected: '1 year ago' },
    { name: 'a day short of two years', iso: '2024-10-12T12:00:00.000Z', expected: '1 year ago' },
    { name: 'two years', iso: '2024-10-11T12:00:00.000Z', expected: '2 years ago' },
  ])('counts whole calendar months for $name', ({ iso, expected }) => {
    expect(formatRelativeTime(iso, NOW)).toBe(expected);
  });

  it('reads at least "1 month ago" when a 28-day gap spans a short month', () => {
    expect(
      formatRelativeTime('2026-01-31T00:00:00.000Z', new Date('2026-02-28T00:00:00.000Z')),
    ).toBe('1 month ago');
  });

  it('compares instants, not local wall-clock times, for dates with an offset', () => {
    expect(formatRelativeTime('2026-10-11T15:59:00+04:00', NOW)).toBe('1 min ago');
  });

  it('reads a future date as "just now"', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() + HOUR).toISOString(), NOW)).toBe('just now');
  });

  it.each([
    { name: 'an empty string', iso: '' },
    { name: 'a non-date string', iso: 'yesterday' },
  ])('returns an empty string for $name', ({ iso }) => {
    expect(formatRelativeTime(iso, NOW)).toBe('');
  });

  it('measures from the current time when no "now" is given', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    expect(formatRelativeTime(ago(5 * MINUTE))).toBe('5 min ago');
  });
});
