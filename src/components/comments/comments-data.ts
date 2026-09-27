export const COMMENTS_TITLE = 'Comments';
export const CURRENT_USER_INITIAL = 'U';
export const COMMENT_PLACEHOLDER = 'Write a comment...';
export const COMMENT_TEXTAREA_ARIA_LABEL = 'Write a comment';
export const SEND_COMMENT_ARIA_LABEL = 'Send comment';

export const COMMENT_AVATAR_MODIFIERS = ['random-3', 'primary', 'random-1'] as const;

export function formatCommentsTitle(totalCount: number): string {
  return `${COMMENTS_TITLE} (${totalCount})`;
}

export function formatLikeAriaLabel(authorName: string): string {
  return `Like comment by ${authorName}`;
}
