import { useDisconnectCleanup } from '../../hooks/use-disconnect-cleanup';
import type { GameCommentsController, GameCommentsState } from '../../hooks/use-game-comments';
import { GAME_SLUG_LOAD_STATUS } from '../../hooks/use-game-slug-load';
import { LOAD_STATUS } from '../../hooks/use-load-state';
import { createCommentComposer } from '../comment-composer';
import { createEmptyState } from '../empty-state';
import { createErrorBanner } from '../error-banner';
import {
  COMMENT_PLACEHOLDER,
  COMMENT_TEXTAREA_ARIA_LABEL,
  COMMENTS_EMPTY_MESSAGE,
  COMMENTS_EMPTY_TITLE,
  COMMENTS_ERROR_TITLE,
  COMMENTS_RETRY_LABEL,
  COMMENTS_SKELETON_COUNT,
  COMMENTS_TITLE,
  CURRENT_USER_INITIAL,
  SEND_COMMENT_ARIA_LABEL,
  formatCommentsTitle,
} from './comments-data';
import { createCommentList, createCommentsSkeleton } from './comments-parts';
import './comments.scss';

const TITLE_ID = 'comments-title';

const { idle } = GAME_SLUG_LOAD_STATUS;
const { loading, success, empty, error } = LOAD_STATUS;

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

function createStatusView(load: CommentsLoad): HTMLElement {
  switch (load.status) {
    case loading: {
      return createCommentsSkeleton(COMMENTS_SKELETON_COUNT);
    }
    case success: {
      return createCommentList(load.data);
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

  const composer = createCommentComposer({
    userInitial: CURRENT_USER_INITIAL,
    placeholder: COMMENT_PLACEHOLDER,
    textareaAriaLabel: COMMENT_TEXTAREA_ARIA_LABEL,
    sendAriaLabel: SEND_COMMENT_ARIA_LABEL,
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
    content.replaceChildren(createStatusView(load));
  }

  const { subscribe, getState } = controller;
  const unsubscribe = subscribe(render);
  render(getState());
  useDisconnectCleanup(section, unsubscribe);

  return section;
}
