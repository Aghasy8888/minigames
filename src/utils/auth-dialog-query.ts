import { AUTH_PARAM, GAME_PARAM, hrefWithDialogParameter } from './dialog-query';

export const AUTH_DIALOG_MODE = {
  login: 'login',
  register: 'register',
} as const;

export type AuthDialogMode = (typeof AUTH_DIALOG_MODE)[keyof typeof AUTH_DIALOG_MODE];

const AUTH_DIALOG_MODES = new Set<string>(Object.values(AUTH_DIALOG_MODE));

function isAuthDialogMode(value: string): value is AuthDialogMode {
  return AUTH_DIALOG_MODES.has(value);
}

/** An unknown mode, or `auth` next to `game`, is not canonical: `game` wins and `auth` is dropped. */
export function parseAuthQuery(search: string): { mode?: AuthDialogMode; isCanonical: boolean } {
  const searchParameters = new URLSearchParams(search);
  const raw = searchParameters.get(AUTH_PARAM);

  if (raw === null) {
    return { isCanonical: true };
  }

  if (!isAuthDialogMode(raw) || searchParameters.has(GAME_PARAM)) {
    return { isCanonical: false };
  }

  return { mode: raw, isCanonical: true };
}

export function hrefWithAuth(mode?: AuthDialogMode): string {
  return hrefWithDialogParameter(AUTH_PARAM, mode);
}
