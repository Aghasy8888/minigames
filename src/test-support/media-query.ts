import { vi } from 'vitest';

export type FakeMediaQuery = EventTarget & { matches: boolean; media: string };

/**
 * happy-dom's window has a fixed desktop width; this stubs `matchMedia` with one query whose
 * `matches` the test flips through `change`.
 */
export function stubMediaQuery(matches: boolean): {
  mediaQuery: FakeMediaQuery;
  requestedQueries: string[];
  change: (nextMatches: boolean) => void;
} {
  const requestedQueries: string[] = [];
  const mediaQuery: FakeMediaQuery = Object.assign(new EventTarget(), { matches, media: '' });

  vi.stubGlobal('matchMedia', (query: string) => {
    requestedQueries.push(query);
    mediaQuery.media = query;
    return mediaQuery;
  });

  return {
    mediaQuery,
    requestedQueries,
    change(nextMatches) {
      mediaQuery.matches = nextMatches;
      mediaQuery.dispatchEvent(Object.assign(new Event('change'), { matches: nextMatches }));
    },
  };
}
