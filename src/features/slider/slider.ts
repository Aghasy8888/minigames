import { arrowIcon } from '../../assets/icons';
import { createEmptyState } from '../../components/empty-state';
import { createErrorBanner } from '../../components/error-banner';
import {
  applySliderCardRoles,
  createSliderCard,
  createSliderCardSkeleton,
} from '../../components/slider-card';
import { useCarousel, type Carousel } from '../../hooks/use-carousel';
import { useDisconnectCleanup } from '../../hooks/use-disconnect-cleanup';
import { useFeaturedGames, type FeaturedGamesState } from '../../hooks/use-featured-games';
import type { GameListItem } from '../../services/games-api-provider';
import { openGameDetailsDialog } from '../../store/game-details-dialog-store';
import {
  SLIDER_AUTOPLAY_MS,
  SLIDER_EMPTY_MESSAGE,
  SLIDER_EMPTY_TITLE,
  SLIDER_ERROR_FALLBACK_MESSAGE,
  SLIDER_ERROR_TITLE,
  SLIDER_NAV_LABELS,
  SLIDER_RETRY_LABEL,
  SLIDER_SECTION_TITLE,
  SLIDER_SKELETON_COUNT,
  SLIDER_SWIPE_THRESHOLD_PX,
  SLIDER_TAP_MAX_MS,
} from './slider-data';
import './slider.scss';

type SliderNav = {
  element: HTMLElement;
  previousButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  setEnabled: (enabled: boolean) => void;
};

function createNavButton(direction: 'prev' | 'next'): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `slider__nav-btn slider__nav-btn--${direction}`;
  button.setAttribute('aria-label', SLIDER_NAV_LABELS[direction]);

  const icon = document.createElement('img');
  icon.className = 'slider__nav-icon';
  icon.src = arrowIcon;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');

  button.append(icon);
  return button;
}

function createNav(): SliderNav {
  const element = document.createElement('div');
  element.className = 'slider__nav';

  const previousButton = createNavButton('prev');
  const nextButton = createNavButton('next');
  element.append(previousButton, nextButton);

  return {
    element,
    previousButton,
    nextButton,
    setEnabled(enabled) {
      previousButton.disabled = !enabled;
      nextButton.disabled = !enabled;
    },
  };
}

function createHeader(nav: SliderNav): HTMLElement {
  const header = document.createElement('div');
  header.className = 'slider__header';

  const heading = document.createElement('div');
  heading.className = 'slider__heading';

  const accent = document.createElement('span');
  accent.className = 'slider__accent';
  accent.setAttribute('aria-hidden', 'true');

  const title = document.createElement('h2');
  title.className = 'slider__title';
  title.textContent = SLIDER_SECTION_TITLE;

  heading.append(accent, title);
  header.append(heading, nav.element);
  return header;
}

function createTrack(cards: readonly HTMLElement[]): HTMLElement {
  const track = document.createElement('div');
  track.className = 'slider__track';
  track.append(...cards);
  return track;
}

function createSkeletonTrack(): HTMLElement {
  const cards = Array.from({ length: SLIDER_SKELETON_COUNT }, () => createSliderCardSkeleton());
  const track = createTrack(cards);
  track.setAttribute('aria-hidden', 'true');
  applySliderCardRoles(cards, 0, false);
  return track;
}

function createGameCards(games: readonly GameListItem[]): HTMLElement[] {
  return games.map((game) => createSliderCard(game, { onActivate: openGameDetailsDialog }));
}

export function createSlider(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'slider';
  section.setAttribute('aria-label', SLIDER_SECTION_TITLE);

  const nav = createNav();

  const content = document.createElement('div');
  content.className = 'slider__content';

  let carousel: Carousel | undefined;

  function mountTrack(games: readonly GameListItem[]): void {
    const cards = createGameCards(games);
    const track = createTrack(cards);
    content.append(track);

    const canCycle = cards.length >= 2;
    nav.setEnabled(canCycle);

    if (!canCycle) {
      applySliderCardRoles(cards, 0, false);
      return;
    }

    carousel = useCarousel({
      track,
      itemCount: cards.length,
      previousButton: nav.previousButton,
      nextButton: nav.nextButton,
      autoplayMs: SLIDER_AUTOPLAY_MS,
      swipeThresholdPx: SLIDER_SWIPE_THRESHOLD_PX,
      tapMaxMs: SLIDER_TAP_MAX_MS,
      isActive: () => section.isConnected,
      onIndexChange(index, animate) {
        applySliderCardRoles(cards, index, animate);
      },
      onTap(target) {
        if (target.closest('.slider-card')) {
          openGameDetailsDialog();
        }
      },
    });
  }

  function render(state: FeaturedGamesState): void {
    carousel?.destroy();
    carousel = undefined;
    content.replaceChildren();
    content.setAttribute('aria-busy', String(state.status === 'loading'));

    if (state.status === 'success') {
      mountTrack(state.data);
      return;
    }

    nav.setEnabled(false);

    if (state.status === 'loading') {
      content.append(createSkeletonTrack());
      return;
    }

    if (state.status === 'empty') {
      content.append(
        createEmptyState({ title: SLIDER_EMPTY_TITLE, message: SLIDER_EMPTY_MESSAGE }),
      );
      return;
    }

    content.append(
      createErrorBanner({
        title: SLIDER_ERROR_TITLE,
        message: state.message === '' ? SLIDER_ERROR_FALLBACK_MESSAGE : state.message,
        retryLabel: SLIDER_RETRY_LABEL,
        onRetry: state.retry,
      }),
    );
  }

  const featuredGames = useFeaturedGames();
  const unsubscribe = featuredGames.subscribe(render);
  render(featuredGames.getState());

  useDisconnectCleanup(section, () => {
    carousel?.destroy();
    unsubscribe();
    featuredGames.destroy();
  });

  section.append(createHeader(nav), content);
  return section;
}
