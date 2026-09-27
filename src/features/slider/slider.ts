import { arrowIcon, favoriteIcon, starIcon } from '../../assets/icons';
import { usePausableTimer } from '../../hooks/use-pausable-timer';
import { usePointerSwipe } from '../../hooks/use-pointer-swipe';
import { getGameBySlug, getGameCardImage } from '../../mocks/games';
import { openGameDetailsDialog } from '../../store/game-details-dialog-store';
import {
  isWrapRoleTransition,
  signedCircularDistance,
  sliderOrderFromDistance,
  sliderRoleFromDistance,
  wrapIndex,
  type SliderCardRole,
} from '../../utils/circular-index';
import { formatCompactCount } from '../../utils/format-compact-count';
import {
  SLIDER_AUTOPLAY_MS,
  SLIDER_FEATURED_SLUGS,
  SLIDER_SECTION_TITLE,
  SLIDER_SWIPE_THRESHOLD_PX,
  SLIDER_TAP_MAX_MS,
} from './slider-data';
import './slider.scss';

const SLIDER_CARD_ROLES: readonly SliderCardRole[] = ['peek', 'secondary', 'featured', 'hidden'];

function createNavButton(direction: 'prev' | 'next'): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `slider__nav-btn slider__nav-btn--${direction}`;
  button.setAttribute('aria-label', direction === 'prev' ? 'Previous games' : 'Next games');

  const icon = document.createElement('img');
  icon.className = 'slider__nav-icon';
  icon.src = arrowIcon;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');

  button.append(icon);
  return button;
}

function createSliderCard(slug: string): HTMLElement {
  const game = getGameBySlug(slug);

  const card = document.createElement('article');
  card.className = 'slider-card';
  card.tabIndex = 0;

  const name = document.createElement('h3');
  name.className = 'slider-card__name';
  name.textContent = game.name;

  const media = document.createElement('div');
  media.className = 'slider-card__media';

  const image = document.createElement('img');
  image.className = 'slider-card__image';
  image.src = getGameCardImage(slug);
  image.alt = '';
  image.decoding = 'async';

  const gradient = document.createElement('div');
  gradient.className = 'slider-card__gradient';
  gradient.setAttribute('aria-hidden', 'true');

  const info = document.createElement('div');
  info.className = 'slider-card__info';

  const title = document.createElement('p');
  title.className = 'slider-card__title';
  title.textContent = game.name;
  title.setAttribute('aria-hidden', 'true');

  const meta = document.createElement('div');
  meta.className = 'slider-card__meta';

  const rating = document.createElement('span');
  rating.className = 'slider-card__stat';

  const star = document.createElement('img');
  star.className = 'slider-card__stat-icon';
  star.src = starIcon;
  star.alt = '';
  star.setAttribute('aria-hidden', 'true');

  const ratingValue = document.createElement('span');
  ratingValue.className = 'slider-card__stat-value';
  ratingValue.textContent = game.rating.toFixed(1);

  rating.append(star, ratingValue);

  const likes = document.createElement('span');
  likes.className = 'slider-card__stat';

  const heart = document.createElement('img');
  heart.className = 'slider-card__stat-icon';
  heart.src = favoriteIcon;
  heart.alt = '';
  heart.setAttribute('aria-hidden', 'true');

  const likesValue = document.createElement('span');
  likesValue.className = 'slider-card__stat-value';
  likesValue.textContent = formatCompactCount(game.likesCount);

  likes.append(heart, likesValue);
  meta.append(rating, likes);
  info.append(title, meta);
  media.append(image, gradient, info);
  card.append(name, media);

  card.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    openGameDetailsDialog();
  });

  return card;
}

function applyCardRoles(
  cards: readonly HTMLElement[],
  featuredIndex: number,
  animate: boolean,
): void {
  const length = cards.length;
  const wrappingCards: HTMLElement[] = [];

  for (const [index, card] of cards.entries()) {
    const distance = signedCircularDistance(index, featuredIndex, length);
    const role = sliderRoleFromDistance(distance);
    const previousDistance = card.dataset.distance;
    const skipTransition =
      !animate ||
      (previousDistance !== undefined && isWrapRoleTransition(Number(previousDistance), distance));

    if (skipTransition) {
      wrappingCards.push(card);
      card.classList.add('slider-card--no-transition');
    }

    for (const modifier of SLIDER_CARD_ROLES) {
      card.classList.toggle(`slider-card--${modifier}`, modifier === role);
    }

    card.style.order = String(sliderOrderFromDistance(distance));
    card.dataset.distance = String(distance);
  }

  if (wrappingCards.length === 0) {
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      for (const card of wrappingCards) {
        card.classList.remove('slider-card--no-transition');
      }
    });
  });
}

export function createSlider(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'slider';
  section.setAttribute('aria-label', SLIDER_SECTION_TITLE);

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

  const nav = document.createElement('div');
  nav.className = 'slider__nav';
  const previousButton = createNavButton('prev');
  const nextButton = createNavButton('next');
  nav.append(previousButton, nextButton);

  header.append(heading, nav);

  const track = document.createElement('div');
  track.className = 'slider__track';

  const cards = SLIDER_FEATURED_SLUGS.map((slug) => createSliderCard(slug));
  track.append(...cards);

  let featuredIndex = 0;
  applyCardRoles(cards, featuredIndex, false);

  function step(direction: 'prev' | 'next'): void {
    featuredIndex = wrapIndex(featuredIndex + (direction === 'next' ? 1 : -1), cards.length);
    applyCardRoles(cards, featuredIndex, true);
  }

  const autoplay = usePausableTimer({
    durationMs: SLIDER_AUTOPLAY_MS,
    onTick() {
      step('next');
    },
    isActive: () => section.isConnected,
  });

  previousButton.addEventListener('click', () => {
    step('prev');
    autoplay.reset();
  });

  nextButton.addEventListener('click', () => {
    step('next');
    autoplay.reset();
  });

  const swipe = usePointerSwipe(track, {
    thresholdPx: SLIDER_SWIPE_THRESHOLD_PX,
    onHold() {
      autoplay.pause();
    },
    onRelease({ didSwipe, direction, isTap, heldMs, pressTarget }) {
      if (didSwipe && direction) {
        step(direction);
        autoplay.reset();
        return;
      }

      autoplay.resume();

      const isQuickTap = isTap && heldMs <= SLIDER_TAP_MAX_MS;

      if (isQuickTap && pressTarget instanceof Element && pressTarget.closest('.slider-card')) {
        openGameDetailsDialog();
      }
    },
  });

  const observer = new MutationObserver(() => {
    if (section.isConnected) {
      return;
    }

    autoplay.destroy();
    swipe.destroy();
    observer.disconnect();
  });

  queueMicrotask(() => {
    if (!section.isConnected) {
      return;
    }

    const parent = section.parentElement;

    if (parent) {
      observer.observe(parent, { childList: true });
    }

    autoplay.reset();
  });

  section.append(header, track);
  return section;
}
