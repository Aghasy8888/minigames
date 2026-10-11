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

export const COMMENT_LIKE_STATUS = {
  idle: 'idle',
  pending: 'pending',
} as const;

const { idle, pending } = COMMENT_LIKE_STATUS;
const { login } = AUTH_DIALOG_MODE;

const GUEST_MESSAGE = 'Log in to like comments.';
const LIKED_MESSAGE = 'Comment liked';
const UNLIKED_MESSAGE = 'Like removed';
const FALLBACK_ERROR_MESSAGE = 'Comment likes could not be updated right now. Please try again.';
const UNCONFIRMED_MESSAGE =
  "Couldn't reach the server, so your like wasn't confirmed. Check your connection and reopen the game before trying again.";

export type CommentLikeState = {
  status: typeof idle | typeof pending;
  isLiked: boolean;
  likesCount: number;
};

export type CommentLikeController = {
  getState: () => CommentLikeState;
  subscribe: (listener: (state: CommentLikeState) => void) => () => void;
  toggle: () => void;
  destroy: () => void;
};

export type UseCommentLikeOptions = {
  commentId: string;
  /** From the personalized comments response (`isLikedByCurrentUser`). */
  isLiked: boolean;
  likesCount: number;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === NETWORK_ERROR_STATUS) {
    return UNCONFIRMED_MESSAGE;
  }

  return toUserFacingMessage(error, FALLBACK_ERROR_MESSAGE);
}

/**
 * Server-driven like toggle for one comment: state changes only from the POST response. The
 * endpoint flips on every call, so a pending request blocks new ones and a failure is never replayed.
 */
export function useCommentLike({
  commentId,
  isLiked,
  likesCount,
}: UseCommentLikeOptions): CommentLikeController {
  let state: CommentLikeState = { status: idle, isLiked, likesCount };
  let controller: AbortController | undefined;
  let isDestroyed = false;
  const listeners = new Set<(state: CommentLikeState) => void>();

  function setState(next: CommentLikeState): void {
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
      const { data } = await gamesApi.toggleCommentLike(commentId, {
        userEmail,
        signal: controller.signal,
      });

      if (isDestroyed) {
        return;
      }

      setState({ status: idle, isLiked: data.isLikedByCurrentUser, likesCount: data.likesCount });
      showSnackbar({
        variant: 'success',
        message: data.isLikedByCurrentUser ? LIKED_MESSAGE : UNLIKED_MESSAGE,
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
