import { createFavoriteIcon } from '../favorite-icon';
import './comment-like-button.scss';

export type CommentLikeButtonOptions = {
  count: number;
  isLiked: boolean;
  ariaLabel: string;
};

export type CommentLikeButton = {
  element: HTMLButtonElement;
  reset: () => void;
};

export function createCommentLikeButton(options: CommentLikeButtonOptions): CommentLikeButton {
  let isLiked = options.isLiked;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'comment-like-button';
  button.setAttribute('aria-label', options.ariaLabel);

  const count = document.createElement('span');
  count.className = 'comment-like-button__count';
  count.textContent = String(options.count);

  button.append(createFavoriteIcon(), count);

  function syncState(): void {
    button.classList.toggle('comment-like-button--liked', isLiked);
    button.setAttribute('aria-pressed', String(isLiked));
  }

  button.addEventListener('click', () => {
    isLiked = !isLiked;
    syncState();
  });

  function reset(): void {
    isLiked = options.isLiked;
    syncState();
  }

  syncState();
  return { element: button, reset };
}
