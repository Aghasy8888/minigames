import { arrowIcon, favoriteIcon, starIcon } from '../../assets/icons';
import { getGameBySlug, getGameCardImage } from '../../mocks/games';
import { formatCompactCount } from '../../utils/format-compact-count';
import {
  SLIDER_CARD_ROLES,
  SLIDER_DESKTOP_SLUGS,
  SLIDER_SECTION_TITLE,
  type SliderCardRole,
} from './slider-data';
import './slider.scss';

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

function createSliderCard(slug: string, role: SliderCardRole): HTMLElement {
  const game = getGameBySlug(slug);

  const card = document.createElement('article');
  card.className = `slider-card slider-card--${role}`;
  card.setAttribute('aria-label', game.name);

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
  card.append(media);

  return card;
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
  nav.append(createNavButton('prev'), createNavButton('next'));

  header.append(heading, nav);

  const track = document.createElement('div');
  track.className = 'slider__track';

  for (const [index, slug] of SLIDER_DESKTOP_SLUGS.entries()) {
    const role = SLIDER_CARD_ROLES[index] ?? 'peek';
    track.append(createSliderCard(slug, role));
  }

  section.append(header, track);
  return section;
}
