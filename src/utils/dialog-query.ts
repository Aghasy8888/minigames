export const GAME_PARAM = 'game';
export const AUTH_PARAM = 'auth';

type DialogParameter = typeof GAME_PARAM | typeof AUTH_PARAM;

const OTHER_DIALOG_PARAM: Record<DialogParameter, DialogParameter> = {
  [GAME_PARAM]: AUTH_PARAM,
  [AUTH_PARAM]: GAME_PARAM,
};

/** Current path + query with one dialog param set or removed; setting it drops the other so only one dialog param exists. */
export function hrefWithDialogParameter(name: DialogParameter, value?: string): string {
  const { pathname, search, hash } = globalThis.location;
  const searchParameters = new URLSearchParams(search);

  if (value === undefined) {
    searchParameters.delete(name);
  } else {
    searchParameters.set(name, value);
    searchParameters.delete(OTHER_DIALOG_PARAM[name]);
  }

  const serialized = searchParameters.toString();
  return `${pathname}${serialized === '' ? '' : `?${serialized}`}${hash}`;
}
