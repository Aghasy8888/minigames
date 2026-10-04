import { favoriteIcon, starIcon } from '../../assets/icons';
import { useImageReady } from '../../hooks/use-image-ready';
import type { GameListItem } from '../../services/games-api-provider';
import { openGameDetailsDialog } from '../../store/game-details-dialog-store';
import { formatCategoryLabel } from '../../utils/format-category-label';
import { formatCompactCount } from '../../utils/format-compact-count';
import { resolveGameImage } from '../../utils/resolve-game-image';
import { createButton } from '../button';
import { createSkeleton, fadeOutSkeleton } from '../skeleton';
import './game-card.scss';

const DETAILS_LABEL = 'Details';

function createStat(iconSource: string, value: string): HTMLElement {
  const stat = document.createElement('span');
  stat.className = 'game-card__stat';

  const icon = document.createElement('img');
  icon.className = 'game-card__stat-icon';
  icon.src = iconSource;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');

  const valueElement = document.createElement('span');
  valueElement.className = 'game-card__stat-value';
  valueElement.textContent = value;

  stat.append(icon, valueElement);
  return stat;
}

function createPriceElement(
  price: string,
  isFree: boolean,
  modifier: string,
): HTMLParagraphElement {
  const priceElement = document.createElement('p');
  priceElement.className = [
    'game-card__price',
    isFree ? 'game-card__price--free' : 'game-card__price--paid',
    modifier,
  ].join(' ');
  priceElement.textContent = price;
  return priceElement;
}

function createPlaceholder(): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'game-card__placeholder';
  placeholder.setAttribute('aria-hidden', 'true');
  return placeholder;
}

function createMedia(cardImage: string): HTMLElement {
  const media = document.createElement('div');
  media.className = 'game-card__media';

  const imageUrl = resolveGameImage(cardImage);

  if (!imageUrl) {
    media.append(createPlaceholder());
    return media;
  }

  const image = document.createElement('img');
  image.className = 'game-card__image';
  image.src = imageUrl;
  image.alt = '';
  image.decoding = 'async';

  const skeleton = createSkeleton({ className: 'game-card__image-skeleton' });
  media.append(image, skeleton);

  useImageReady(image, {
    onReady() {
      fadeOutSkeleton(skeleton);
    },
    onError() {
      skeleton.remove();
      image.replaceWith(createPlaceholder());
    },
  });

  return media;
}

export function createGameCard(game: GameListItem): HTMLElement {
  const isFree = game.price.toLowerCase() === 'free';

  const card = document.createElement('article');
  card.className = 'game-card';
  card.setAttribute('aria-label', game.name);

  const content = document.createElement('div');
  content.className = 'game-card__content';

  const header = document.createElement('div');
  header.className = 'game-card__header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'game-card__title-group';

  const title = document.createElement('h2');
  title.className = 'game-card__title';
  title.textContent = game.name;

  const badge = document.createElement('span');
  badge.className = 'game-card__badge';
  badge.textContent = formatCategoryLabel(game.category);

  titleGroup.append(title, badge);
  header.append(titleGroup, createPriceElement(game.price, isFree, 'game-card__price--header'));

  const description = document.createElement('p');
  description.className = 'game-card__description';
  description.textContent = game.shortDescription;

  const footer = document.createElement('div');
  footer.className = 'game-card__footer';

  const statsRow = document.createElement('div');
  statsRow.className = 'game-card__stats-row';

  const stats = document.createElement('div');
  stats.className = 'game-card__stats';
  stats.append(
    createStat(starIcon, game.rating.toFixed(1)),
    createStat(favoriteIcon, formatCompactCount(game.likesCount)),
  );

  statsRow.append(stats, createPriceElement(game.price, isFree, 'game-card__price--mobile'));

  const detailsButton = createButton({
    label: DETAILS_LABEL,
    variant: 'primary',
    size: 'medium',
    className: 'game-card__details',
    onClick: () => {
      openGameDetailsDialog(game.slug);
    },
  });

  footer.append(statsRow, detailsButton);
  content.append(header, description, footer);
  card.append(createMedia(game.cardImage), content);

  return card;
}

export function createGameCardSkeleton(): HTMLElement {
  const card = document.createElement('article');
  card.className = 'game-card game-card--skeleton';
  card.setAttribute('aria-hidden', 'true');

  const media = document.createElement('div');
  media.className = 'game-card__media';
  media.append(createSkeleton({ className: 'game-card__skeleton game-card__skeleton--image' }));

  const content = document.createElement('div');
  content.className = 'game-card__content';
  content.append(
    createSkeleton({ className: 'game-card__skeleton game-card__skeleton--title' }),
    createSkeleton({ className: 'game-card__skeleton game-card__skeleton--description' }),
    createSkeleton({ className: 'game-card__skeleton game-card__skeleton--footer' }),
  );

  card.append(media, content);
  return card;
}
