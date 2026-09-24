import { createPageTitle } from '../../features/page-title';
import './library-page.scss';

export function renderLibraryPage(container: HTMLElement): void {
  container.className = 'library-page';
  container.replaceChildren(createPageTitle());
}
