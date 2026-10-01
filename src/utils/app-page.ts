export const APP_PAGE = {
  home: 'home',
  library: 'library',
  notFound: 'not-found',
} as const;

export type AppPage = (typeof APP_PAGE)[keyof typeof APP_PAGE];

export type RoutablePage = Exclude<AppPage, typeof APP_PAGE.notFound>;
