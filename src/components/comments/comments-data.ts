import { COMMENT_TEXT_MAX_LENGTH } from '../../utils/comment-text';

export const COMMENTS_TITLE = 'Comments';
export const COMMENT_PLACEHOLDER = 'Write a comment...';
export const COMMENT_GUEST_PLACEHOLDER = 'Log in to write a comment';
export const COMMENT_TEXTAREA_ARIA_LABEL = 'Write a comment';
export const SEND_COMMENT_ARIA_LABEL = 'Send comment';
export const COMMENT_LOGIN_PROMPT = 'Log in to join the conversation.';
export const COMMENT_LOGIN_LABEL = 'Log in';

export function formatCommentTooLong(length: number): string {
  return `Comments can be up to ${COMMENT_TEXT_MAX_LENGTH} characters (${length} now).`;
}

export const COMMENTS_EMPTY_TITLE = 'No comments yet';
export const COMMENTS_EMPTY_MESSAGE = 'Be the first to share your thoughts about this game.';
export const COMMENTS_ERROR_TITLE = 'Could not load comments';
export const COMMENTS_RETRY_LABEL = 'Retry';
export const COMMENTS_SKELETON_COUNT = 3;
export const COMMENTS_SKELETON_TEXT_LINES = 2;

/** Must match the `$comments-avatar-colors` keys in `comments.scss`. */
export const COMMENT_AVATAR_COLORS = [
  'random-1',
  'random-2',
  'random-3',
  'random-4',
  'random-5',
] as const;

export function formatCommentsTitle(totalCount: number): string {
  return `${COMMENTS_TITLE} (${totalCount})`;
}

export function formatLikeAriaLabel(authorName: string): string {
  return `Like comment by ${authorName}`;
}
