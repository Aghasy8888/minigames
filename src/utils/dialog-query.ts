export const GAME_PARAM = 'game';
export const AUTH_PARAM = 'auth';

type DialogParameter = typeof GAME_PARAM | typeof AUTH_PARAM;

/**
 * Current path + query with one dialog param set or removed. Setting `game` drops `auth`; setting
 * `auth` keeps `game` (Auth over Game Details). Removing one param always keeps the other.
 */
export function hrefWithDialogParameter(name: DialogParameter, value?: string): string {
  const { pathname, search, hash } = globalThis.location;
  const searchParameters = new URLSearchParams(search);

  if (value === undefined) {
    searchParameters.delete(name);
  } else {
    searchParameters.set(name, value);

    if (name === GAME_PARAM) {
      searchParameters.delete(AUTH_PARAM);
    }
  }

  const serialized = searchParameters.toString();
  return `${pathname}${serialized === '' ? '' : `?${serialized}`}${hash}`;
}
