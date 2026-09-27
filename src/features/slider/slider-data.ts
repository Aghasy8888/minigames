import { mockGames } from '../../mocks/games';

export const SLIDER_SECTION_TITLE = 'New Games' as const;

export const SLIDER_FEATURED_SLUGS = mockGames
  .filter((game) => game.featured)
  .map((game) => game.slug);

export type { SliderCardRole } from '../../utils/circular-index';

export const SLIDER_AUTOPLAY_MS = 4000;
export const SLIDER_SWIPE_THRESHOLD_PX = 40;
