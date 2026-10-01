import { renderHomePage } from '../pages/home/home-page';
import { renderLibraryPage } from '../pages/library/library-page';
import { renderNotFoundPage } from '../pages/not-found/not-found-page';
import { subscribeNavigation, syncPageFromLocation, type AppPage } from '../store/navigation-store';
import { APP_PAGE } from '../utils/app-page';

export type { AppPage } from '../store/navigation-store';
export { getCurrentPage, navigate, subscribeNavigation } from '../store/navigation-store';

const { library, notFound } = APP_PAGE;

export function startRouter(outlet: HTMLElement): void {
  const render = (page: AppPage): void => {
    switch (page) {
      case library: {
        renderLibraryPage(outlet);
        break;
      }
      case notFound: {
        renderNotFoundPage(outlet);
        break;
      }
      default: {
        renderHomePage(outlet);
      }
    }
  };

  globalThis.addEventListener('popstate', syncPageFromLocation);
  subscribeNavigation(render);
}
