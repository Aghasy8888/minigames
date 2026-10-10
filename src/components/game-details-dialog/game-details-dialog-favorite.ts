import { addToFavoriteIcon, favoriteIcon } from '../../assets/icons';
import {
  FAVORITE_TOGGLE_STATUS,
  type FavoriteToggleController,
  type FavoriteToggleState,
} from '../../hooks/use-favorite-toggle';
import { formatCompactCount } from '../../utils/format-compact-count';
import { clearButtonLoading, createButton, setButtonLoading } from '../button';
import {
  ADD_TO_FAVORITES_LABEL,
  ADDING_TO_FAVORITES_LABEL,
  REMOVE_FROM_FAVORITES_LABEL,
  REMOVING_FROM_FAVORITES_LABEL,
} from './game-details-dialog-data';
import { createIconImage, createStat } from './game-details-dialog-parts';

const { pending } = FAVORITE_TOGGLE_STATUS;

/** Renders only from the controller; a click never flips local state on its own. */
export function createFavoriteToggle({
  getState,
  subscribe,
  toggle,
}: FavoriteToggleController): HTMLButtonElement {
  const icon = createIconImage(addToFavoriteIcon, 'game-details-dialog__favorite-icon');

  const button = createButton({
    label: ADD_TO_FAVORITES_LABEL,
    variant: 'secondary',
    size: 'large',
    icon,
    className: 'button--dialog-cta button--dialog-cta-icon game-details-dialog__favorite',
    ariaLabel: ADD_TO_FAVORITES_LABEL,
    onClick: toggle,
  });
  const labelElement = button.querySelector('.button__label');
  let isLoading = false;
  let hadFocus = false;

  function render({ status, isFavorited }: FavoriteToggleState): void {
    if (status === pending) {
      hadFocus = document.activeElement === button;
      setButtonLoading(
        button,
        isFavorited ? REMOVING_FROM_FAVORITES_LABEL : ADDING_TO_FAVORITES_LABEL,
      );
      isLoading = true;
      return;
    }

    if (isLoading) {
      clearButtonLoading(button);
      button.disabled = false;
      isLoading = false;

      // Disabling the button while pending drops focus to <body>
      if (hadFocus && button.isConnected) {
        button.focus();
      }
    }

    const label = isFavorited ? REMOVE_FROM_FAVORITES_LABEL : ADD_TO_FAVORITES_LABEL;
    icon.src = isFavorited ? favoriteIcon : addToFavoriteIcon;
    if (labelElement) {
      labelElement.textContent = label;
    }
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(isFavorited));
    button.classList.toggle('game-details-dialog__favorite--active', isFavorited);
  }

  subscribe(render);
  render(getState());
  return button;
}

export function createLikesStat({ getState, subscribe }: FavoriteToggleController): HTMLElement {
  const stat = createStat(favoriteIcon, formatCompactCount(getState().likesCount));
  const valueElement = stat.querySelector('.game-details-dialog__stat-value');

  subscribe(({ likesCount }) => {
    if (valueElement) {
      valueElement.textContent = formatCompactCount(likesCount);
    }
  });

  return stat;
}
