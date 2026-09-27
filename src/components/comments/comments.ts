import type { GameComment } from '../../mocks/comments';
import { MOCK_REFERENCE_DATE } from '../../mocks/mock-reference-date';
import { formatRelativeTime } from '../../utils/format-relative-time';
import { getNameInitial } from '../../utils/get-player-initials';
import { createCommentComposer } from '../comment-composer';
import { createCommentLikeButton, type CommentLikeButton } from '../comment-like-button';
import {
  COMMENT_AVATAR_MODIFIERS,
  COMMENT_PLACEHOLDER,
  COMMENT_TEXTAREA_ARIA_LABEL,
  CURRENT_USER_INITIAL,
  SEND_COMMENT_ARIA_LABEL,
  formatCommentsTitle,
  formatLikeAriaLabel,
} from './comments-data';
import './comments.scss';

const TITLE_ID = 'comments-title';

export type CommentsOptions = {
  comments: GameComment[];
  totalCount: number;
};

export type CommentsSection = {
  element: HTMLElement;
  reset: () => void;
};

function createCommentCard(
  comment: GameComment,
  index: number,
): { element: HTMLLIElement; likeButton: CommentLikeButton } {
  const item = document.createElement('li');
  item.className = 'comments__item';

  const card = document.createElement('article');
  card.className = 'comments__card';

  const header = document.createElement('div');
  header.className = 'comments__card-header';

  const author = document.createElement('div');
  author.className = 'comments__author';

  const avatarModifier = COMMENT_AVATAR_MODIFIERS[index % COMMENT_AVATAR_MODIFIERS.length];
  const avatar = document.createElement('span');
  avatar.className = `comments__avatar comments__avatar--${avatarModifier}`;
  avatar.textContent = getNameInitial(comment.authorName);
  avatar.setAttribute('aria-hidden', 'true');

  const name = document.createElement('h3');
  name.className = 'comments__author-name';
  name.textContent = comment.authorName;

  author.append(avatar, name);

  const time = document.createElement('time');
  time.className = 'comments__time';
  time.dateTime = comment.createdAt;
  time.textContent = formatRelativeTime(comment.createdAt, MOCK_REFERENCE_DATE);

  header.append(author, time);

  const text = document.createElement('p');
  text.className = 'comments__text';
  text.textContent = comment.text;

  const likeButton = createCommentLikeButton({
    count: comment.likesCount,
    isLiked: comment.isLikedByCurrentUser,
    ariaLabel: formatLikeAriaLabel(comment.authorName),
  });

  const footer = document.createElement('div');
  footer.className = 'comments__card-footer';
  footer.append(likeButton.element);

  card.append(header, text, footer);
  item.append(card);

  return { element: item, likeButton };
}

export function createComments(options: CommentsOptions): CommentsSection {
  const section = document.createElement('section');
  section.className = 'comments';
  section.setAttribute('aria-labelledby', TITLE_ID);

  const title = document.createElement('h3');
  title.id = TITLE_ID;
  title.className = 'comments__title';
  title.textContent = formatCommentsTitle(options.totalCount);

  const composer = createCommentComposer({
    userInitial: CURRENT_USER_INITIAL,
    placeholder: COMMENT_PLACEHOLDER,
    textareaAriaLabel: COMMENT_TEXTAREA_ARIA_LABEL,
    sendAriaLabel: SEND_COMMENT_ARIA_LABEL,
  });

  const list = document.createElement('ul');
  list.className = 'comments__list';

  const cards = options.comments.map((comment, index) => createCommentCard(comment, index));
  list.append(...cards.map((card) => card.element));

  section.append(title, composer.element, list);

  function reset(): void {
    composer.reset();
    for (const card of cards) {
      card.likeButton.reset();
    }
  }

  return { element: section, reset };
}
