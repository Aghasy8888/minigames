import {
  COMMENT_LIKE_STATUS,
  type CommentLikeController,
  type CommentLikeState,
} from '../../hooks/use-comment-like';
import { createFavoriteIcon } from '../favorite-icon';
import './comment-like-button.scss';

const { pending } = COMMENT_LIKE_STATUS;

export type CommentLikeButtonOptions = {
  controller: CommentLikeController;
  ariaLabel: string;
};

/** Renders only from the controller; a click never flips local state on its own. */
export function createCommentLikeButton({
  controller,
  ariaLabel,
}: CommentLikeButtonOptions): HTMLButtonElement {
  const { getState, subscribe, toggle } = controller;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'comment-like-button';
  button.setAttribute('aria-label', ariaLabel);

  const icon = createFavoriteIcon();

  const spinner = document.createElement('span');
  spinner.className = 'comment-like-button__spinner';
  spinner.setAttribute('aria-hidden', 'true');

  const count = document.createElement('span');
  count.className = 'comment-like-button__count';

  button.append(icon, count);
  button.addEventListener('click', toggle);

  let hadFocus = false;

  function render({ status, isLiked, likesCount }: CommentLikeState): void {
    const isPending = status === pending;

    if (isPending) {
      hadFocus = document.activeElement === button;
      icon.replaceWith(spinner);
      button.setAttribute('aria-busy', 'true');
    } else {
      spinner.replaceWith(icon);
      button.removeAttribute('aria-busy');
    }

    button.disabled = isPending;
    button.classList.toggle('comment-like-button--loading', isPending);

    button.classList.toggle('comment-like-button--liked', isLiked);
    button.setAttribute('aria-pressed', String(isLiked));
    count.textContent = String(likesCount);

    // Disabling the button while pending drops focus to <body>
    if (!isPending && hadFocus && button.isConnected) {
      hadFocus = false;
      button.focus();
    }
  }

  subscribe(render);
  render(getState());
  return button;
}
