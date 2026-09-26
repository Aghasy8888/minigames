import { renderHomePage } from '../pages/home/home-page';
import { renderLibraryPage } from '../pages/library/library-page';
import { subscribeNavigation, type AppPage } from '../store/navigation-store';

export type { AppPage } from '../store/navigation-store';
export { getCurrentPage, navigate, subscribeNavigation } from '../store/navigation-store';

export function startRouter(outlet: HTMLElement): void {
  const render = (page: AppPage): void => {
    if (page === 'library') {
      renderLibraryPage(outlet);
      return;
    }

    renderHomePage(outlet);
  };

  subscribeNavigation(render);
}
