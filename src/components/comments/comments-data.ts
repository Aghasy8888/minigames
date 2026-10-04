export const COMMENTS_TITLE = 'Comments';
export const CURRENT_USER_INITIAL = 'U';
export const COMMENT_PLACEHOLDER = 'Write a comment...';
export const COMMENT_TEXTAREA_ARIA_LABEL = 'Write a comment';
export const SEND_COMMENT_ARIA_LABEL = 'Send comment';

export const COMMENTS_EMPTY_TITLE = 'No comments yet';
export const COMMENTS_EMPTY_MESSAGE = 'Be the first to share your thoughts about this game.';
export const COMMENTS_ERROR_TITLE = 'Could not load comments';
export const COMMENTS_RETRY_LABEL = 'Retry';
export const COMMENTS_SKELETON_COUNT = 3;
export const COMMENTS_SKELETON_TEXT_LINES = 2;

export const COMMENT_AVATAR_MODIFIERS = ['random-3', 'primary', 'random-1'] as const;

export function formatCommentsTitle(totalCount: number): string {
  return `${COMMENTS_TITLE} (${totalCount})`;
}

export function formatLikeAriaLabel(authorName: string): string {
  return `Like comment by ${authorName}`;
}
