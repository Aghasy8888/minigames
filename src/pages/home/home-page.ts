import { createHero } from '../../components/hero';
import { createSlider } from '../../features/slider';
import './home-page.scss';
export function renderHomePage(container: HTMLElement): void {
  container.className = 'home-page';
  container.replaceChildren(createHero(), createSlider());
}
