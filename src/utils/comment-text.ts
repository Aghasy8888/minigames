/** `POST /api/games/{slug}/comments` accepts `text` of 1–500 characters after trimming. */
export const COMMENT_TEXT_MAX_LENGTH = 500;

export type CommentTextCheck = {
  /** Trimmed text, the value to send. */
  text: string;
  isValid: boolean;
  isTooLong: boolean;
};

export function checkCommentText(raw: string): CommentTextCheck {
  const text = raw.trim();
  const isTooLong = text.length > COMMENT_TEXT_MAX_LENGTH;

  return { text, isValid: text.length > 0 && !isTooLong, isTooLong };
}
