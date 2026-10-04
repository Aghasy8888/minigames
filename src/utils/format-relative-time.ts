const MINUTE_SECONDS = 60;
const HOUR_MINUTES = 60;
const DAY_HOURS = 24;
const WEEK_DAYS = 7;
const MAX_WEEKS = 3;
const YEAR_MONTHS = 12;

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
}

/** Whole calendar months from `from` to `to` (UTC), e.g. Jan 31 → Feb 28 = 0, Jan 15 → Feb 15 = 1. */
function calendarMonthsBetween(from: Date, to: Date): number {
  const months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * YEAR_MONTHS +
    (to.getUTCMonth() - from.getUTCMonth());

  const fromOffset = from.getTime() - Date.UTC(from.getUTCFullYear(), from.getUTCMonth());
  const toOffset = to.getTime() - Date.UTC(to.getUTCFullYear(), to.getUTCMonth());

  return toOffset < fromOffset ? months - 1 : months;
}

/**
 * Formats a past ISO date relative to `now`: "just now", "5 min ago", "1 hour ago", "6 days ago",
 * "3 weeks ago", "11 months ago", "2 years ago". Future dates read "just now"; invalid ones "".
 */
export function formatRelativeTime(isoDate: string, now: Date = new Date()): string {
  const then = new Date(isoDate);

  if (Number.isNaN(then.getTime())) {
    return '';
  }

  const seconds = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));
  if (seconds < MINUTE_SECONDS) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / MINUTE_SECONDS);
  if (minutes < HOUR_MINUTES) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / HOUR_MINUTES);
  if (hours < DAY_HOURS) {
    return plural(hours, 'hour');
  }

  const days = Math.floor(hours / DAY_HOURS);
  if (days < WEEK_DAYS) {
    return plural(days, 'day');
  }

  const weeks = Math.floor(days / WEEK_DAYS);
  if (weeks <= MAX_WEEKS) {
    return plural(weeks, 'week');
  }

  const months = Math.max(1, calendarMonthsBetween(then, now));
  if (months < YEAR_MONTHS) {
    return plural(months, 'month');
  }

  return plural(Math.floor(months / YEAR_MONTHS), 'year');
}
