import { closeDarkIcon, closeDefaultIcon } from '../../assets/icons';
import { useImageReady } from '../../hooks/use-image-ready';
import { resolveGameImage } from '../../utils/resolve-game-image';
import { createSkeleton, fadeOutSkeleton } from '../skeleton';
import { CLOSE_DIALOG_ARIA_LABEL } from './game-details-dialog-data';

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

  const media = document.createElement('div');
  media.className = 'game-details-dialog__hero-media';

  const image = document.createElement('img');
  image.className = 'game-details-dialog__hero-image';
  image.src = source;
  image.alt = '';
  image.decoding = 'async';

  const skeleton = createSkeleton({ className: 'game-details-dialog__hero-skeleton' });
  media.append(image, skeleton);

  useImageReady(image, {
    onReady() {
      fadeOutSkeleton(skeleton);
    },
    onError() {
      media.replaceChildren(createHeroPlaceholder());
    },
  });

  return media;
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
