export type AppPage = 'home' | 'library';

type NavigationListener = (page: AppPage) => void;

let currentPage: AppPage = 'home';
const listeners = new Set<NavigationListener>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener(currentPage);
  }
}

export function getCurrentPage(): AppPage {
  return currentPage;
}

export function subscribeNavigation(listener: NavigationListener): () => void {
  listeners.add(listener);
  listener(currentPage);

  return () => {
    listeners.delete(listener);
  };
}

export function navigate(page: AppPage): void {
  if (page === currentPage) {
    return;
  }

  currentPage = page;
  notifyListeners();
}
