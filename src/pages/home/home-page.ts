import { createSlider } from '../../features/slider/slider';
import './home-page.scss';

export function renderHomePage(container: HTMLElement): void {
  container.replaceChildren(createSlider());
}
