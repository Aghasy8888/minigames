import { favoriteIcon, starIcon } from '../../assets/icons';
import { getGameCardImage, type GameSeed } from '../../mocks/games';
import { formatCategoryLabel } from '../../utils/format-category-label';
import { formatCompactCount } from '../../utils/format-compact-count';
import { createButton } from '../button';
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

export function createGameCard(game: GameSeed): HTMLElement {
  const isFree = game.price.toLowerCase() === 'free';

  const card = document.createElement('article');
  card.className = 'game-card';
  card.setAttribute('aria-label', game.name);

  const media = document.createElement('div');
  media.className = 'game-card__media';

  const image = document.createElement('img');
  image.className = 'game-card__image';
  image.src = getGameCardImage(game.slug);
  image.alt = '';
  image.decoding = 'async';
  media.append(image);

  const content = document.createElement('div');
  content.className = 'game-card__content';

  const header = document.createElement('div');
  header.className = 'game-card__header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'game-card__title-group';

  const title = document.createElement('h3');
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
  });

  footer.append(statsRow, detailsButton);
  content.append(header, description, footer);
  card.append(media, content);

  return card;
}
