import {
  addToFavoriteIcon,
  closeDarkIcon,
  closeDefaultIcon,
  favoriteIcon,
} from '../../assets/icons';
import { resolveGameImage } from '../../utils/resolve-game-image';
import { createButton } from '../button';
import {
  ADD_TO_FAVORITES_LABEL,
  CLOSE_DIALOG_ARIA_LABEL,
  REMOVE_FROM_FAVORITES_LABEL,
} from './game-details-dialog-data';

export function createIconImage(source: string, className: string): HTMLImageElement {
  const icon = document.createElement('img');
  icon.src = source;
  icon.alt = '';
  icon.className = className;
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

export function createCloseButton(): HTMLButtonElement {
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'game-details-dialog__close';
  closeButton.setAttribute('aria-label', CLOSE_DIALOG_ARIA_LABEL);
  closeButton.append(
    createIconImage(
      closeDefaultIcon,
      'game-details-dialog__close-icon game-details-dialog__close-icon--default',
    ),
    createIconImage(
      closeDarkIcon,
      'game-details-dialog__close-icon game-details-dialog__close-icon--hover',
    ),
  );
  return closeButton;
}

export function createHeroPlaceholder(): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'game-details-dialog__hero-placeholder';
  placeholder.setAttribute('aria-hidden', 'true');
  return placeholder;
}

export function createHeroMedia(heroImage: string): HTMLElement {
  const source = resolveGameImage(heroImage);

  if (!source) {
    return createHeroPlaceholder();
  }

  const image = document.createElement('img');
  image.className = 'game-details-dialog__hero-image';
  image.src = source;
  image.alt = '';
  image.decoding = 'async';
  return image;
}

export function createStat(iconSource: string, value: string): HTMLElement {
  const stat = document.createElement('span');
  stat.className = 'game-details-dialog__stat';

  const valueElement = document.createElement('span');
  valueElement.className = 'game-details-dialog__stat-value';
  valueElement.textContent = value;

  stat.append(createIconImage(iconSource, 'game-details-dialog__stat-icon'), valueElement);
  return stat;
}

export function createSpecWidget(label: string, value: string): HTMLElement {
  const widget = document.createElement('div');
  widget.className = 'game-details-dialog__widget';

  const labelElement = document.createElement('p');
  labelElement.className = 'game-details-dialog__widget-label';
  labelElement.textContent = label;

  const valueElement = document.createElement('p');
  valueElement.className = 'game-details-dialog__widget-value';
  valueElement.textContent = value;

  widget.append(labelElement, valueElement);
  return widget;
}

/** Local toggle seeded from the API; the favorite endpoint is wired in a later step. */
export function createFavoriteToggle(initiallyFavorited: boolean): HTMLButtonElement {
  let isFavorited = initiallyFavorited;
  const icon = createIconImage(addToFavoriteIcon, 'game-details-dialog__favorite-icon');

  const button = createButton({
    label: ADD_TO_FAVORITES_LABEL,
    variant: 'secondary',
    size: 'large',
    icon,
    className: 'button--dialog-cta button--dialog-cta-icon game-details-dialog__favorite',
    ariaLabel: ADD_TO_FAVORITES_LABEL,
  });
  const labelElement = button.querySelector('.button__label');

  function sync(): void {
    const label = isFavorited ? REMOVE_FROM_FAVORITES_LABEL : ADD_TO_FAVORITES_LABEL;
    icon.src = isFavorited ? favoriteIcon : addToFavoriteIcon;
    if (labelElement) {
      labelElement.textContent = label;
    }
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(isFavorited));
    button.classList.toggle('game-details-dialog__favorite--active', isFavorited);
  }

  button.addEventListener('click', () => {
    isFavorited = !isFavorited;
    sync();
  });

  sync();
  return button;
}
