import { useCommentLike } from '../../hooks/use-comment-like';
import type { GameComment } from '../../services/games-api-provider';
import { formatRelativeTime } from '../../utils/format-relative-time';
import { getNameInitial } from '../../utils/get-player-initials';
import { createCommentLikeButton } from '../comment-like-button';
import { createSkeleton } from '../skeleton';
import { COMMENTS_SKELETON_TEXT_LINES, formatLikeAriaLabel } from './comments-data';

/** Maps a comment id to its `comments__avatar--*` color modifier. */
export type AvatarColorFor = (commentId: string) => string;

export type CommentCardOptions = {
  avatarColorFor: AvatarColorFor;
  /** Receives each card's teardown; call it when the list is replaced or unmounted. */
  onCleanup: (cleanup: () => void) => void;
};

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}

function block(modifier: string): HTMLElement {
  return createSkeleton({ className: `comments__skeleton comments__skeleton--${modifier}` });
}

/** One comment card; API text only goes through `textContent`. */
export function createCommentCard(
  comment: GameComment,
  { avatarColorFor, onCleanup }: CommentCardOptions,
): HTMLLIElement {
  const item = createElement('li', 'comments__item');
  const card = createElement('article', 'comments__card');
  const header = createElement('div', 'comments__card-header');
  const author = createElement('div', 'comments__author');

  const avatar = createElement(
    'span',
    `comments__avatar comments__avatar--${avatarColorFor(comment.commentId)}`,
  );
  avatar.textContent = getNameInitial(comment.authorName);
  avatar.setAttribute('aria-hidden', 'true');

  const name = createElement('h3', 'comments__author-name');
  name.textContent = comment.authorName;

  author.append(avatar, name);

  const time = createElement('time', 'comments__time');
  time.dateTime = comment.createdAt;
  time.textContent = formatRelativeTime(comment.createdAt);

  header.append(author, time);

  const text = createElement('p', 'comments__text');
  text.textContent = comment.text;

  const like = useCommentLike({
    commentId: comment.commentId,
    isLiked: comment.isLikedByCurrentUser,
    likesCount: comment.likesCount,
  });
  onCleanup(like.destroy);

  const likeButton = createCommentLikeButton({
    controller: like,
    ariaLabel: formatLikeAriaLabel(comment.authorName),
  });

  const footer = createElement('div', 'comments__card-footer');
  footer.append(likeButton);

  card.append(header, text, footer);
  item.append(card);
  return item;
}

export function createCommentList(
  comments: GameComment[],
  options: CommentCardOptions,
): HTMLUListElement {
  const list = createElement('ul', 'comments__list');
  list.append(...comments.map((comment) => createCommentCard(comment, options)));
  return list;
}

/** Mirrors `createCommentList`: same card frame with avatar, name, time, text lines, like. */
export function createCommentsSkeleton(count: number): HTMLElement {
  const list = createElement('div', 'comments__list');
  list.setAttribute('aria-hidden', 'true');

  for (let index = 0; index < count; index += 1) {
    const card = createElement('div', 'comments__card');
    const header = createElement('div', 'comments__card-header');
    const author = createElement('div', 'comments__author');
    author.append(block('avatar'), block('name'));
    header.append(author, block('time'));

    const lines = Array.from({ length: COMMENTS_SKELETON_TEXT_LINES }, () => block('line'));
    const text = createElement('div', 'comments__skeleton-lines');
    text.append(...lines);

    const footer = createElement('div', 'comments__card-footer');
    footer.append(block('like'));

    card.append(header, text, footer);
    list.append(card);
  }

  return list;
}
