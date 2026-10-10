import {
  ApiError,
  NETWORK_ERROR_STATUS,
  gamesApi,
  isAbortError,
  toUserFacingMessage,
} from '../services/games-api-provider';
import { AUTH_DIALOG_MODE, openAuthDialog } from '../store/auth-dialog-store';
import { requireActiveSession } from '../store/session-store';
import { showSnackbar } from '../store/snackbar-store';

export const FAVORITE_TOGGLE_STATUS = {
  idle: 'idle',
  pending: 'pending',
} as const;

const { idle, pending } = FAVORITE_TOGGLE_STATUS;
const { login } = AUTH_DIALOG_MODE;

const GUEST_MESSAGE = 'Log in to add games to your favorites.';
const ADDED_MESSAGE = 'Added to favorites';
const REMOVED_MESSAGE = 'Removed from favorites';
const FALLBACK_ERROR_MESSAGE = 'Favorites could not be updated right now. Please try again.';
const UNCONFIRMED_MESSAGE =
  "Couldn't reach the server, so your favorites change wasn't confirmed. Check your connection and reopen the game before trying again.";

export type FavoriteToggleState = {
  status: typeof idle | typeof pending;
  isFavorited: boolean;
  likesCount: number;
};

export type FavoriteToggleController = {
  getState: () => FavoriteToggleState;
  subscribe: (listener: (state: FavoriteToggleState) => void) => () => void;
  toggle: () => void;
  destroy: () => void;
};

export type UseFavoriteToggleOptions = {
  slug: string;
  /** From the personalized Game Details response (`isLikedByCurrentUser`). */
  isFavorited: boolean;
  likesCount: number;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === NETWORK_ERROR_STATUS) {
    return UNCONFIRMED_MESSAGE;
  }

  return toUserFacingMessage(error, FALLBACK_ERROR_MESSAGE);
}

/**
 * Server-driven favorite toggle for one game: state changes only from the POST response. The
 * endpoint flips on every call, so a pending request blocks new ones and a failure is never replayed.
 */
export function useFavoriteToggle({
  slug,
  isFavorited,
  likesCount,
}: UseFavoriteToggleOptions): FavoriteToggleController {
  let state: FavoriteToggleState = { status: idle, isFavorited, likesCount };
  let controller: AbortController | undefined;
  let isDestroyed = false;
  const listeners = new Set<(state: FavoriteToggleState) => void>();

  function setState(next: FavoriteToggleState): void {
    if (isDestroyed) {
      return;
    }

    state = next;

    for (const listener of listeners) {
      listener(state);
    }
  }

  async function send(userEmail: string): Promise<void> {
    controller = new AbortController();
    setState({ ...state, status: pending });

    try {
      const { data } = await gamesApi.toggleFavorite(slug, {
        userEmail,
        signal: controller.signal,
      });

      if (isDestroyed) {
        return;
      }

      setState({ status: idle, isFavorited: data.isFavorited, likesCount: data.likesCount });
      showSnackbar({
        variant: 'success',
        message: data.isFavorited ? ADDED_MESSAGE : REMOVED_MESSAGE,
      });
    } catch (error) {
      if (isDestroyed || isAbortError(error)) {
        return;
      }

      setState({ ...state, status: idle });
      showSnackbar({ variant: 'error', message: toErrorMessage(error) });
    } finally {
      controller = undefined;
    }
  }

  function toggle(): void {
    if (isDestroyed || state.status === pending) {
      return;
    }

    const access = requireActiveSession();

    if (!access.allowed) {
      if (!access.expired) {
        showSnackbar({ variant: 'warning', message: GUEST_MESSAGE });
      }
      openAuthDialog(login);
      return;
    }

    void send(access.userEmail);
  }

  return {
    getState() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    toggle,
    destroy() {
      isDestroyed = true;
      controller?.abort();
      listeners.clear();
    },
  };
}
