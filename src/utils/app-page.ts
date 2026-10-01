export const APP_PAGE = {
  home: 'home',
  library: 'library',
  notFound: 'not-found',
} as const;

export type AppPage = (typeof APP_PAGE)[keyof typeof APP_PAGE];

export type RoutablePage = Exclude<AppPage, typeof APP_PAGE.notFound>;

export interface RouteDefinition {
  /** Path segment after the base URL ('' = root). */
  readonly path: string;
  /** Extra segments that resolve to the same page (e.g. 'home' for '/'). */
  readonly aliases?: readonly string[];
}

/** Single source of truth for routable pages — every RoutablePage must have an entry. */
export const ROUTES: Readonly<Record<RoutablePage, RouteDefinition>> = {
  [APP_PAGE.home]: { path: '', aliases: ['home'] },
  [APP_PAGE.library]: { path: 'library' },
};
