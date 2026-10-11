import { useAvatarColors } from '../../hooks/use-avatar-colors';
import { useCommentSubmit } from '../../hooks/use-comment-submit';
import { useDisconnectCleanup } from '../../hooks/use-disconnect-cleanup';
import type { GameCommentsController, GameCommentsState } from '../../hooks/use-game-comments';
import { GAME_SLUG_LOAD_STATUS } from '../../hooks/use-game-slug-load';
import { LOAD_STATUS } from '../../hooks/use-load-state';
import { AUTH_DIALOG_MODE, openAuthDialog } from '../../store/auth-dialog-store';
import { getCommentDraft, setCommentDraft } from '../../store/comment-draft-store';
import { SESSION_STATUS, subscribeSession } from '../../store/session-store';
import { getNameInitial } from '../../utils/get-player-initials';
import { createCommentComposer } from '../comment-composer';
import { createEmptyState } from '../empty-state';
import { createErrorBanner } from '../error-banner';
import {
  COMMENT_AVATAR_COLORS,
  COMMENT_GUEST_PLACEHOLDER,
  COMMENT_LOGIN_LABEL,
  COMMENT_LOGIN_PROMPT,
  COMMENT_PLACEHOLDER,
  COMMENT_TEXTAREA_ARIA_LABEL,
  COMMENTS_EMPTY_MESSAGE,
  COMMENTS_EMPTY_TITLE,
  COMMENTS_ERROR_TITLE,
  COMMENTS_RETRY_LABEL,
  COMMENTS_SKELETON_COUNT,
  COMMENTS_TITLE,
  SEND_COMMENT_ARIA_LABEL,
  formatCommentTooLong,
  formatCommentsTitle,
} from './comments-data';
import {
  createCommentList,
  createCommentsSkeleton,
  type CommentCardOptions,
} from './comments-parts';
import './comments.scss';

const TITLE_ID = 'comments-title';

const { idle } = GAME_SLUG_LOAD_STATUS;
const { loading, success, empty, error } = LOAD_STATUS;
const { authenticated } = SESSION_STATUS;
const { login } = AUTH_DIALOG_MODE;

type CommentsLoad = Exclude<GameCommentsState, { status: typeof idle }>['load'];

export type CommentsOptions = {
  controller: GameCommentsController;
};

function titleFor(load: CommentsLoad): string {
  switch (load.status) {
    case success: {
      const { meta, data } = load;
      return formatCommentsTitle(meta?.totalComments ?? data.length);
    }
    case empty: {
      return formatCommentsTitle(0);
    }
    default: {
      return COMMENTS_TITLE;
    }
  }
}

function createStatusView(load: CommentsLoad, cardOptions: CommentCardOptions): HTMLElement {
  switch (load.status) {
    case loading: {
      return createCommentsSkeleton(COMMENTS_SKELETON_COUNT);
    }
    case success: {
      return createCommentList(load.data, cardOptions);
    }
    case empty: {
      return createEmptyState({ title: COMMENTS_EMPTY_TITLE, message: COMMENTS_EMPTY_MESSAGE });
    }
    case error: {
      const { message, retry } = load;
      return createErrorBanner({
        title: COMMENTS_ERROR_TITLE,
        message,
        retryLabel: COMMENTS_RETRY_LABEL,
        onRetry: retry,
      });
    }
  }
}

/**
 * Comments block of the Game Details dialog. Title and composer stay mounted; only the content
 * area swaps between skeleton, list, empty state, and error banner.
 */
export function createComments({ controller }: CommentsOptions): HTMLElement {
  const section = document.createElement('section');
  section.className = 'comments';
  section.setAttribute('aria-labelledby', TITLE_ID);

  const title = document.createElement('h3');
  title.id = TITLE_ID;
  title.className = 'comments__title';
  title.textContent = COMMENTS_TITLE;

  const { submit } = useCommentSubmit(controller);
  const avatarColorFor = useAvatarColors(COMMENT_AVATAR_COLORS);
  let viewCleanups: (() => void)[] = [];

  const cardOptions: CommentCardOptions = {
    avatarColorFor,
    onCleanup(cleanup) {
      viewCleanups.push(cleanup);
    },
  };

  function clearView(): void {
    const cleanups = viewCleanups;
    viewCleanups = [];
    for (const cleanup of cleanups) {
      cleanup();
    }
  }

  const composer = createCommentComposer({
    placeholder: COMMENT_PLACEHOLDER,
    guestPlaceholder: COMMENT_GUEST_PLACEHOLDER,
    textareaAriaLabel: COMMENT_TEXTAREA_ARIA_LABEL,
    sendAriaLabel: SEND_COMMENT_ARIA_LABEL,
    loginPrompt: COMMENT_LOGIN_PROMPT,
    loginLabel: COMMENT_LOGIN_LABEL,
    formatTooLong: formatCommentTooLong,
    initialText: getCommentDraft(),
    onInput: setCommentDraft,
    async onSubmit(text) {
      composer.setBusy(true);
      const isPosted = await submit(text);
      composer.setBusy(false);

      if (isPosted) {
        composer.reset();
      }
    },
    onLogin() {
      openAuthDialog(login);
    },
  });

  const content = document.createElement('div');
  content.className = 'comments__content';

  section.append(title, composer.element, content);

  function render(state: GameCommentsState): void {
    if (state.status === idle) {
      return;
    }

    const { load } = state;
    title.textContent = titleFor(load);
    content.setAttribute('aria-busy', String(load.status === loading));
    clearView();
    content.replaceChildren(createStatusView(load, cardOptions));
  }

  const { subscribe, getState } = controller;
  const unsubscribe = subscribe(render);
  render(getState());

  const unsubscribeSession = subscribeSession((session) => {
    composer.setUser(
      session.status === authenticated ? getNameInitial(session.displayName) : undefined,
    );
  });

  useDisconnectCleanup(section, () => {
    unsubscribe();
    unsubscribeSession();
    clearView();
  });

  return section;
}
