import { ApiError, gamesApi, toUserFacingMessage } from '../services/games-api-provider';
import { AUTH_DIALOG_MODE, openAuthDialog } from '../store/auth-dialog-store';
import { clearCommentDraft } from '../store/comment-draft-store';
import { requireActiveSession } from '../store/session-store';
import { showSnackbar } from '../store/snackbar-store';
import { checkCommentText } from '../utils/comment-text';
import { getCommentAuthorName } from '../utils/get-comment-author-name';
import type { GameCommentsController } from './use-game-comments';
import { GAME_SLUG_LOAD_STATUS } from './use-game-slug-load';

const { active } = GAME_SLUG_LOAD_STATUS;
const { login } = AUTH_DIALOG_MODE;

/** A request still hanging after this long has an unknown outcome; it is never resent. */
const COMMENT_POST_TIMEOUT_MS = 15_000;

const GUEST_MESSAGE = 'Log in to post a comment.';
const POSTED_MESSAGE = 'Comment posted';
const REJECTED_FALLBACK_MESSAGE = "Your comment couldn't be posted. Please try again.";
const UNKNOWN_OUTCOME_MESSAGE =
  "We couldn't confirm whether your comment was posted. Check the latest comments before sending it again.";

const CLIENT_ERROR_MIN = 400;
const SERVER_ERROR_MIN = 500;

export type CommentSubmitController = {
  /** Resolves `true` only after the server created the comment (201). */
  submit: (rawText: string) => Promise<boolean>;
};

/** A 4xx means the server refused it, so nothing was created. Anything else may have been saved. */
function isDefiniteRejection(error: unknown): boolean {
  return (
    error instanceof ApiError && error.status >= CLIENT_ERROR_MIN && error.status < SERVER_ERROR_MIN
  );
}

/**
 * Posts a comment for the open Game Details game, then refreshes the latest comments. Never
 * retries: an ambiguous failure could already have created the comment.
 */
export function useCommentSubmit(comments: GameCommentsController): CommentSubmitController {
  let isSubmitting = false;

  async function submit(rawText: string): Promise<boolean> {
    const commentsState = comments.getState();
    const { text, isValid } = checkCommentText(rawText);

    if (isSubmitting || commentsState.status !== active || !isValid) {
      return false;
    }

    const access = requireActiveSession();

    if (!access.allowed) {
      if (!access.expired) {
        showSnackbar({ variant: 'warning', message: GUEST_MESSAGE });
      }
      openAuthDialog(login);
      return false;
    }

    const { userEmail, displayName } = access;
    isSubmitting = true;

    try {
      await gamesApi.postGameComment(commentsState.slug, {
        userEmail,
        authorName: getCommentAuthorName({ displayName, email: userEmail }),
        text,
        signal: AbortSignal.timeout(COMMENT_POST_TIMEOUT_MS),
      });
    } catch (error) {
      if (isDefiniteRejection(error)) {
        showSnackbar({
          variant: 'error',
          message: toUserFacingMessage(error, REJECTED_FALLBACK_MESSAGE),
        });
      } else {
        showSnackbar({ variant: 'warning', message: UNKNOWN_OUTCOME_MESSAGE });
        comments.reload();
      }
      return false;
    } finally {
      isSubmitting = false;
    }

    clearCommentDraft();
    showSnackbar({ variant: 'success', message: POSTED_MESSAGE });
    comments.reload();
    return true;
  }

  return { submit };
}
