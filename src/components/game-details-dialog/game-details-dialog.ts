import { useBackdropDismiss } from '../../hooks/use-backdrop-dismiss';
import { useGameComments, type GameCommentsController } from '../../hooks/use-game-comments';
import { useGameDetails, type GameDetailsState } from '../../hooks/use-game-details';
import { GAME_SLUG_LOAD_STATUS } from '../../hooks/use-game-slug-load';
import { LOAD_STATUS } from '../../hooks/use-load-state';
import { getAuthDialogState, subscribeAuthDialog } from '../../store/auth-dialog-store';
import {
  closeGameDetailsDialog,
  getGameDetailsDialogState,
} from '../../store/game-details-dialog-store';
import { lockScroll, unlockScroll } from '../../utils/scroll-lock';
import { createComments } from '../comments';
import { createErrorBanner } from '../error-banner';
import {
  GAME_DETAILS_ARIA_LABEL,
  GAME_DETAILS_ERROR_TITLE,
  GAME_DETAILS_RETRY_LABEL,
  GAME_DETAILS_TITLE_ID,
} from './game-details-dialog-data';
import {
  createCloseButton,
  createHeroMedia,
  createHeroPlaceholder,
} from './game-details-dialog-parts';
import { createGameDetailsSkeleton, createHeroSkeleton } from './game-details-dialog-skeleton';
import { createGameDetailsBody } from './game-details-dialog-view';
import './game-details-dialog.scss';

const TRANSITION_MS = 250;

const { idle } = GAME_SLUG_LOAD_STATUS;
const { loading, success, error } = LOAD_STATUS;

type VisibleState = Exclude<GameDetailsState, { status: typeof idle }>;

function nextFrame(callback: () => void): void {
  globalThis.requestAnimationFrame(() => {
    globalThis.requestAnimationFrame(callback);
  });
}

function createView(
  state: VisibleState,
  comments: GameCommentsController,
): { hero: HTMLElement; body: HTMLElement[] } {
  switch (state.status) {
    case loading: {
      return {
        hero: createHeroSkeleton(),
        body: [...createGameDetailsSkeleton(), createComments({ controller: comments })],
      };
    }
    case success: {
      const { game } = state;
      return {
        hero: createHeroMedia(game.heroImage),
        body: createGameDetailsBody(game, comments),
      };
    }
    case error: {
      const { message, retry } = state;
      return {
        hero: createHeroPlaceholder(),
        body: [
          createErrorBanner({
            title: GAME_DETAILS_ERROR_TITLE,
            message,
            retryLabel: GAME_DETAILS_RETRY_LABEL,
            onRetry: retry,
          }),
        ],
      };
    }
  }
}

export function createGameDetailsDialog(): HTMLDialogElement {
  let closeTimerId: ReturnType<typeof globalThis.setTimeout> | undefined;
  let isLocked = false;
  let renderedSlug: string | undefined;

  const dialog = document.createElement('dialog');
  dialog.className = 'game-details-dialog';

  const content = document.createElement('div');
  content.className = 'game-details-dialog__content hide-scrollbar';

  const hero = document.createElement('div');
  hero.className = 'game-details-dialog__hero';

  let heroMedia: HTMLElement = createHeroPlaceholder();
  const closeButton = createCloseButton();
  hero.append(heroMedia);

  const body = document.createElement('div');
  body.className = 'game-details-dialog__body';

  content.append(hero, body);
  dialog.append(closeButton, content);

  function setAccessibleName(hasTitle: boolean): void {
    if (hasTitle) {
      dialog.removeAttribute('aria-label');
      dialog.setAttribute('aria-labelledby', GAME_DETAILS_TITLE_ID);
    } else {
      dialog.removeAttribute('aria-labelledby');
      dialog.setAttribute('aria-label', GAME_DETAILS_ARIA_LABEL);
    }
  }

  function resetScroll(): void {
    content.scrollTop = 0;
  }

  function requestClose(): void {
    renderedSlug = undefined;

    if (!dialog.open || dialog.classList.contains('game-details-dialog--closing')) {
      return;
    }

    dialog.classList.remove('game-details-dialog--open');
    dialog.classList.add('game-details-dialog--closing');

    closeTimerId = globalThis.setTimeout(() => {
      dialog.classList.remove('game-details-dialog--closing');
      resetScroll();
      dialog.close();
    }, TRANSITION_MS);
  }

  function open(): void {
    globalThis.clearTimeout(closeTimerId);
    dialog.classList.remove('game-details-dialog--closing');

    if (!dialog.open) {
      dialog.showModal();
      resetScroll();
      lockScroll();
      isLocked = true;
    }

    nextFrame(() => {
      dialog.classList.add('game-details-dialog--open');
    });
  }

  function render(state: GameDetailsState): void {
    if (state.status === idle) {
      requestClose();
      return;
    }

    const { slug, status } = state;
    const isNewSlug = slug !== renderedSlug;
    renderedSlug = slug;

    const { hero: nextHero, body: nextBody } = createView(state, comments);
    heroMedia.replaceWith(nextHero);
    heroMedia = nextHero;
    body.replaceChildren(...nextBody);
    body.setAttribute('aria-busy', String(status === loading));
    setAccessibleName(status === success);
    open();

    if (isNewSlug) {
      resetScroll();
    }
  }

  closeButton.addEventListener('click', () => {
    closeGameDetailsDialog();
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeGameDetailsDialog();
  });

  useBackdropDismiss(dialog, closeGameDetailsDialog);

  dialog.addEventListener('close', () => {
    dialog.classList.remove('game-details-dialog--open', 'game-details-dialog--closing');

    if (isLocked) {
      unlockScroll();
      isLocked = false;
    }

    if (getGameDetailsDialogState().slug !== undefined) {
      closeGameDetailsDialog();
    }
  });

  function setCovered(isCovered: boolean): void {
    dialog.classList.toggle('game-details-dialog--covered', isCovered);
  }

  const comments = useGameComments();
  const { subscribe, getState } = useGameDetails();
  subscribe(render);
  setAccessibleName(false);
  render(getState());

  subscribeAuthDialog(({ mode }) => {
    setCovered(mode !== undefined);
  });
  setCovered(getAuthDialogState().mode !== undefined);

  return dialog;
}
