import { APP_PAGE, ROUTES, type AppPage, type RoutablePage } from './app-page';

const PAGE_BY_SEGMENT = new Map<string, RoutablePage>(
  (Object.keys(ROUTES) as RoutablePage[]).flatMap((page) => {
    const { path, aliases = [] } = ROUTES[page];
    return [path, ...aliases].map((segment) => [segment, page] as const);
  }),
);

function trimSlashes(value: string): string {
  return value.replaceAll(/^\/+|\/+$/g, '');
}

function safeDecode(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export function resolvePageFromPath(pathname: string): AppPage {
  const base = import.meta.env.BASE_URL;
  const normalizedPath = pathname.endsWith('/') ? pathname : `${pathname}/`;

  if (!normalizedPath.startsWith(base)) {
    return APP_PAGE.notFound;
  }

  const decoded = safeDecode(trimSlashes(normalizedPath.slice(base.length)));

  if (decoded === undefined) {
    return APP_PAGE.notFound;
  }

  return PAGE_BY_SEGMENT.get(decoded) ?? APP_PAGE.notFound;
}

export function hrefForPage(page: RoutablePage): string {
  return `${import.meta.env.BASE_URL}${ROUTES[page].path}`;
}
