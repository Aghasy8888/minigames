import { favoriteIcon, starIcon } from '../../assets/icons';
import { useImageReady } from '../../hooks/use-image-ready';
import type { GameListItem } from '../../services/games-api-provider';
import {
  isWrapRoleTransition,
  signedCircularDistance,
  sliderOrderFromDistance,
  sliderRoleFromDistance,
} from '../../utils/circular-index';
import { formatCompactCount } from '../../utils/format-compact-count';
import { resolveGameImage } from '../../utils/resolve-game-image';
import { createSkeleton, fadeOutSkeleton } from '../skeleton';
import { SLIDER_CARD_ROLES } from './slider-card-data';
import './slider-card.scss';

export type CreateSliderCardOptions = {
  onActivate: (slug: string) => void;
};

function createDecorativeIcon(className: string, source: string): HTMLImageElement {
  const icon = document.createElement('img');
  icon.className = className;
  icon.src = source;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function createStat(iconSource: string, value: string): HTMLElement {
  const stat = document.createElement('span');
  stat.className = 'slider-card__stat';

  const statValue = document.createElement('span');
  statValue.className = 'slider-card__stat-value';
  statValue.textContent = value;

  stat.append(createDecorativeIcon('slider-card__stat-icon', iconSource), statValue);
  return stat;
}

function createPlaceholder(): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'slider-card__placeholder';
  placeholder.setAttribute('aria-hidden', 'true');
  return placeholder;
}

function createMediaFill(cardImage: string): HTMLElement[] {
  const imageUrl = resolveGameImage(cardImage);

  if (!imageUrl) {
    return [createPlaceholder()];
  }

  const image = document.createElement('img');
  image.className = 'slider-card__image';
  image.src = imageUrl;
  image.alt = '';
  image.decoding = 'async';

  const skeleton = createSkeleton({ className: 'slider-card__image-skeleton' });

  useImageReady(image, {
    onReady() {
      fadeOutSkeleton(skeleton);
    },
    onError() {
      skeleton.remove();
      image.replaceWith(createPlaceholder());
    },
  });

  return [image, skeleton];
}

export function createSliderCard(
  game: GameListItem,
  { onActivate }: CreateSliderCardOptions,
): HTMLElement {
  const card = document.createElement('article');
  card.className = 'slider-card';
  card.tabIndex = 0;
  card.dataset.slug = game.slug;

  const name = document.createElement('h3');
  name.className = 'slider-card__name';
  name.textContent = game.name;

  const media = document.createElement('div');
  media.className = 'slider-card__media';

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
  meta.append(
    createStat(starIcon, game.rating.toFixed(1)),
    createStat(favoriteIcon, formatCompactCount(game.likesCount)),
  );

  info.append(title, meta);
  media.append(...createMediaFill(game.cardImage), gradient, info);
  card.append(name, media);

  card.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    onActivate(game.slug);
  });

  return card;
}

export function createSliderCardSkeleton(): HTMLElement {
  const card = document.createElement('article');
  card.className = 'slider-card slider-card--skeleton';
  card.setAttribute('aria-hidden', 'true');
  card.append(createSkeleton({ className: 'slider-card__skeleton' }));
  return card;
}

export function applySliderCardRoles(
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
