import { createHero } from '../../components/hero';
import { createDeveloperCta } from '../../features/developer-cta';
import { createLeaderboard } from '../../features/leaderboard';
import { createSlider } from '../../features/slider';
import './home-page.scss';

export function renderHomePage(container: HTMLElement): void {
  container.className = 'home-page';
  container.replaceChildren(
    createHero(),
    createSlider(),
    createLeaderboard(),
    createDeveloperCta(),
  );
}
