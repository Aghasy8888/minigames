import {
  addToFavoriteIcon,
  closeDarkIcon,
  closeDefaultIcon,
  favoriteIcon,
  starIcon,
} from '../../assets/icons';
import { tukoniHeroImage } from '../../assets/images';
import { useBackdropDismiss } from '../../hooks/use-backdrop-dismiss';
import {
  closeGameDetailsDialog,
  subscribeGameDetailsDialog,
} from '../../store/game-details-dialog-store';
import { formatCompactCount } from '../../utils/format-compact-count';
import { lockScroll, unlockScroll } from '../../utils/scroll-lock';
import { createButton } from '../button';
import { createComments } from '../comments';
import { createTopRecords } from '../top-records';
import {
  ADD_TO_FAVORITES_LABEL,
  CLOSE_DIALOG_ARIA_LABEL,
  GAME_COMMENTS,
  GAME_DETAILS,
  PLAY_NOW_LABEL,
  REMOVE_FROM_FAVORITES_LABEL,
  SPEC_KEYS,
  SPEC_LABELS,
} from './game-details-dialog-data';
import './game-details-dialog.scss';

const TRANSITION_MS = 250;

function nextFrame(callback: () => void): void {
  globalThis.requestAnimationFrame(() => {
    globalThis.requestAnimationFrame(callback);
  });
}

function createIconImage(source: string, className: string): HTMLImageElement {
  const icon = document.createElement('img');
  icon.src = source;
  icon.alt = '';
  icon.className = className;
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function createStat(iconSource: string, value: string): HTMLElement {
  const stat = document.createElement('span');
  stat.className = 'game-details-dialog__stat';

  const icon = createIconImage(iconSource, 'game-details-dialog__stat-icon');
  const valueElement = document.createElement('span');
  valueElement.className = 'game-details-dialog__stat-value';
  valueElement.textContent = value;

  stat.append(icon, valueElement);
  return stat;
}

function createSpecWidget(label: string, value: string): HTMLElement {
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

export function createGameDetailsDialog(): HTMLDialogElement {
  const game = GAME_DETAILS;
  let isFavorited = game.isLikedByCurrentUser;
  let closeTimerId: ReturnType<typeof globalThis.setTimeout> | undefined;
  let isLocked = false;

  const dialog = document.createElement('dialog');
  dialog.className = 'game-details-dialog';
  dialog.setAttribute('aria-labelledby', 'game-details-dialog-title');

  const content = document.createElement('div');
  content.className = 'game-details-dialog__content hide-scrollbar';

  const hero = document.createElement('div');
  hero.className = 'game-details-dialog__hero';

  const heroImage = document.createElement('img');
  heroImage.className = 'game-details-dialog__hero-image';
  heroImage.src = tukoniHeroImage;
  heroImage.alt = '';
  heroImage.decoding = 'async';

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

  hero.append(heroImage, closeButton);

  const body = document.createElement('div');
  body.className = 'game-details-dialog__body';

  const header = document.createElement('div');
  header.className = 'game-details-dialog__header';

  const title = document.createElement('h2');
  title.id = 'game-details-dialog-title';
  title.className = 'game-details-dialog__title';
  title.textContent = game.name;

  const stats = document.createElement('div');
  stats.className = 'game-details-dialog__stats';
  stats.append(
    createStat(starIcon, game.rating.toFixed(1)),
    createStat(favoriteIcon, formatCompactCount(game.likesCount)),
  );

  header.append(title, stats);

  const description = document.createElement('p');
  description.className = 'game-details-dialog__description';
  description.textContent = game.fullDescription;

  const widgets = document.createElement('div');
  widgets.className = 'game-details-dialog__widgets';
  widgets.append(...SPEC_KEYS.map((key) => createSpecWidget(SPEC_LABELS[key], game.specs[key])));

  const actions = document.createElement('div');
  actions.className = 'game-details-dialog__actions';

  const playButton = createButton({
    label: PLAY_NOW_LABEL,
    variant: 'primary',
    size: 'large',
    className: 'button--dialog-cta game-details-dialog__play',
  });

  const favoriteIconElement = createIconImage(
    isFavorited ? favoriteIcon : addToFavoriteIcon,
    'game-details-dialog__favorite-icon',
  );

  const favoriteButton = createButton({
    label: isFavorited ? REMOVE_FROM_FAVORITES_LABEL : ADD_TO_FAVORITES_LABEL,
    variant: 'secondary',
    size: 'large',
    icon: favoriteIconElement,
    className: 'button--dialog-cta button--dialog-cta-icon game-details-dialog__favorite',
    ariaLabel: isFavorited ? REMOVE_FROM_FAVORITES_LABEL : ADD_TO_FAVORITES_LABEL,
  });
  favoriteButton.setAttribute('aria-pressed', String(isFavorited));

  const favoriteLabel = favoriteButton.querySelector('.button__label');

  function syncFavoriteState(): void {
    favoriteIconElement.src = isFavorited ? favoriteIcon : addToFavoriteIcon;
    const label = isFavorited ? REMOVE_FROM_FAVORITES_LABEL : ADD_TO_FAVORITES_LABEL;
    if (favoriteLabel) {
      favoriteLabel.textContent = label;
    }
    favoriteButton.setAttribute('aria-label', label);
    favoriteButton.setAttribute('aria-pressed', String(isFavorited));
    favoriteButton.classList.toggle('game-details-dialog__favorite--active', isFavorited);
  }

  favoriteButton.addEventListener('click', () => {
    isFavorited = !isFavorited;
    syncFavoriteState();
  });

  actions.append(playButton, favoriteButton);

  const comments = createComments({
    comments: GAME_COMMENTS.data,
    totalCount: GAME_COMMENTS.meta.totalComments,
  });

  body.append(
    header,
    description,
    widgets,
    actions,
    createTopRecords(game.topRecords),
    comments.element,
  );
  content.append(hero, body);
  dialog.append(content);

  function resetTransientState(): void {
    isFavorited = game.isLikedByCurrentUser;
    syncFavoriteState();
    comments.reset();
  }

  function requestClose(): void {
    if (!dialog.open || dialog.classList.contains('game-details-dialog--closing')) {
      return;
    }

    dialog.classList.remove('game-details-dialog--open');
    dialog.classList.add('game-details-dialog--closing');

    closeTimerId = globalThis.setTimeout(() => {
      dialog.classList.remove('game-details-dialog--closing');
      dialog.close();
    }, TRANSITION_MS);

    closeGameDetailsDialog();
  }

  function open(): void {
    globalThis.clearTimeout(closeTimerId);
    dialog.classList.remove('game-details-dialog--closing');
    resetTransientState();

    if (!dialog.open) {
      dialog.showModal();
      lockScroll();
      isLocked = true;
    }

    nextFrame(() => {
      dialog.classList.add('game-details-dialog--open');
    });
  }

  closeButton.addEventListener('click', () => {
    requestClose();
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    requestClose();
  });

  useBackdropDismiss(dialog, requestClose);

  dialog.addEventListener('close', () => {
    dialog.classList.remove('game-details-dialog--open', 'game-details-dialog--closing');
    resetTransientState();

    if (isLocked) {
      unlockScroll();
      isLocked = false;
    }

    closeGameDetailsDialog();
  });

  subscribeGameDetailsDialog((state) => {
    if (state.isOpen) {
      open();
    } else {
      requestClose();
    }
  });

  syncFavoriteState();
  return dialog;
}
