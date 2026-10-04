import { GAME_PARAM, hrefWithDialogParameter } from './dialog-query';

const GAME_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseGameQuery(search: string): { slug?: string; isCanonical: boolean } {
  const raw = new URLSearchParams(search).get(GAME_PARAM);

  if (raw === null) {
    return { isCanonical: true };
  }

  return GAME_SLUG_PATTERN.test(raw) ? { slug: raw, isCanonical: true } : { isCanonical: false };
}

export function hrefWithGame(slug?: string): string {
  return hrefWithDialogParameter(GAME_PARAM, slug);
}
