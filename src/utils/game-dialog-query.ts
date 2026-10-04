export const GAME_PARAM = 'game';
const AUTH_PARAM = 'auth';

const GAME_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseGameQuery(search: string): { slug?: string; isCanonical: boolean } {
  const raw = new URLSearchParams(search).get(GAME_PARAM);

  if (raw === null) {
    return { isCanonical: true };
  }

  return GAME_SLUG_PATTERN.test(raw) ? { slug: raw, isCanonical: true } : { isCanonical: false };
}

/** Current path + query with `game` set or removed; `auth` is dropped so only one dialog param exists. */
export function hrefWithGame(slug?: string): string {
  const { pathname, search, hash } = globalThis.location;
  const searchParameters = new URLSearchParams(search);

  if (slug === undefined) {
    searchParameters.delete(GAME_PARAM);
  } else {
    searchParameters.set(GAME_PARAM, slug);
    searchParameters.delete(AUTH_PARAM);
  }

  const serialized = searchParameters.toString();
  return `${pathname}${serialized === '' ? '' : `?${serialized}`}${hash}`;
}
