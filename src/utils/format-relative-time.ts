const MINUTE_SECONDS = 60;
const HOUR_SECONDS = 60 * MINUTE_SECONDS;
const DAY_SECONDS = 24 * HOUR_SECONDS;
const WEEK_SECONDS = 7 * DAY_SECONDS;
const MONTH_SECONDS = 30 * DAY_SECONDS;
const YEAR_SECONDS = 365 * DAY_SECONDS;

const RELATIVE_UNITS: ReadonlyArray<{
  unit: Intl.RelativeTimeFormatUnit;
  seconds: number;
  limit: number;
}> = [
  { unit: 'minute', seconds: MINUTE_SECONDS, limit: HOUR_SECONDS },
  { unit: 'hour', seconds: HOUR_SECONDS, limit: DAY_SECONDS },
  { unit: 'day', seconds: DAY_SECONDS, limit: WEEK_SECONDS },
  { unit: 'week', seconds: WEEK_SECONDS, limit: MONTH_SECONDS },
  { unit: 'month', seconds: MONTH_SECONDS, limit: YEAR_SECONDS },
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

/** Formats a past ISO date relative to `now` (e.g. "2 days ago", "1 week ago"). */
export function formatRelativeTime(isoDate: string, now: Date = new Date()): string {
  const elapsed = Math.max(0, (now.getTime() - new Date(isoDate).getTime()) / 1000);

  for (const { unit, seconds, limit } of RELATIVE_UNITS) {
    if (elapsed < limit) {
      return relativeTimeFormatter.format(-Math.floor(elapsed / seconds), unit);
    }
  }

  return relativeTimeFormatter.format(-Math.floor(elapsed / YEAR_SECONDS), 'year');
}
