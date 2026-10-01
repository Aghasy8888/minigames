import { APP_PAGE, type AppPage, type RoutablePage } from './app-page';
import { HOME_HREF, LIBRARY_HREF, ROUTE_SEGMENT } from './home-href';

const { home, library, notFound } = APP_PAGE;

const PAGE_BY_SEGMENT: Readonly<Record<string, RoutablePage>> = {
  [ROUTE_SEGMENT.root]: home,
  [ROUTE_SEGMENT.home]: home,
  [ROUTE_SEGMENT.library]: library,
};

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
    return notFound;
  }

  const decoded = safeDecode(trimSlashes(normalizedPath.slice(base.length)));

  if (decoded === undefined || !Object.hasOwn(PAGE_BY_SEGMENT, decoded)) {
    return notFound;
  }

  return PAGE_BY_SEGMENT[decoded];
}

export function pathForPage(page: RoutablePage): string {
  return page === library ? LIBRARY_HREF : HOME_HREF;
}
