/** Placeholder total until Library cards own real pagination. */
export const TOTAL_PAGES = 8;

/** Keep in sync with $breakpoints 'tablet-sm' in tokens.scss (735px). */
export const PAGINATION_TABLET_SM_MEDIA_QUERY = '(min-width: 735px)' as const;

export const PAGINATION_MAX_VISIBLE_MOBILE = 3;
export const PAGINATION_MAX_VISIBLE_TABLET_UP = 4;

export const PAGINATION_NAV_ARIA_LABEL = 'Pagination';
export const PAGINATION_PREV_ARIA_LABEL = 'Previous page';
export const PAGINATION_NEXT_ARIA_LABEL = 'Next page';

export function getPageButtonAriaLabel(page: number): string {
  return `Page ${page}`;
}
