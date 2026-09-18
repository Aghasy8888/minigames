import { renderHomePage } from '../pages/home/home-page';

export function startRouter(outlet: HTMLElement): void {
  renderHomePage(outlet);
}
