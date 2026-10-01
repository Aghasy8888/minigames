export const ROUTE_SEGMENT = {
  root: '',
  home: 'home',
  library: 'library',
} as const;

/** Vite base path: '/' in dev, '/minigames/' in production builds. */
export const HOME_HREF = import.meta.env.BASE_URL;

export const LIBRARY_HREF = `${import.meta.env.BASE_URL}${ROUTE_SEGMENT.library}`;
