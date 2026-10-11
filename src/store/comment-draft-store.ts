/**
 * Unsent comment text for the open Game Details dialog. It outlives the comments block, which is
 * rebuilt on session changes, and is cleared whenever the dialog's game changes or it closes.
 */
let draft = '';

export function getCommentDraft(): string {
  return draft;
}

export function setCommentDraft(text: string): void {
  draft = text;
}

export function clearCommentDraft(): void {
  draft = '';
}
