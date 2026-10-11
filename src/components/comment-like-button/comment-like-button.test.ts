// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

import {
  COMMENT_LIKE_STATUS,
  type CommentLikeController,
  type CommentLikeState,
} from '../../hooks/use-comment-like';
import { createCommentLikeButton } from '.';

const { idle, pending } = COMMENT_LIKE_STATUS;

type FakeLike = CommentLikeController & {
  toggle: Mock<() => void>;
  emit: (state: CommentLikeState) => void;
};

/** Stands in for `useCommentLike`: the button may only render what the controller emits. */
function fakeLike(initial: CommentLikeState): FakeLike {
  let state = initial;
  const listeners = new Set<(next: CommentLikeState) => void>();

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    toggle: vi.fn<() => void>(),
    destroy: vi.fn<() => void>(),
    emit(next) {
      state = next;
      for (const listener of listeners) {
        listener(next);
      }
    },
  };
}

function mount(controller: FakeLike): HTMLButtonElement {
  const button = createCommentLikeButton({ controller, ariaLabel: 'Like comment by Jane' });
  document.body.append(button);
  return button;
}

function countOf(button: HTMLButtonElement): string | null | undefined {
  return button.querySelector('.comment-like-button__count')?.textContent;
}

function showsSpinner(button: HTMLButtonElement): boolean {
  return button.querySelector('.comment-like-button__spinner') !== null;
}

function showsIcon(button: HTMLButtonElement): boolean {
  return button.querySelector('.favorite-icon') !== null;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('createCommentLikeButton', () => {
  it('renders a labelled toggle with the count and state from the controller', () => {
    const button = mount(fakeLike({ status: idle, isLiked: false, likesCount: 3 }));

    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Like comment by Jane');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.classList.contains('comment-like-button--liked')).toBe(false);
    expect(countOf(button)).toBe('3');
    expect(showsIcon(button)).toBe(true);
  });

  it('starts pressed when the comments response says the user liked it', () => {
    const button = mount(fakeLike({ status: idle, isLiked: true, likesCount: 4 }));

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.classList.contains('comment-like-button--liked')).toBe(true);
  });

  it('asks the controller to toggle on click and changes nothing on its own', () => {
    const like = fakeLike({ status: idle, isLiked: false, likesCount: 3 });
    const button = mount(like);

    button.click();

    expect(like.toggle).toHaveBeenCalledTimes(1);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(countOf(button)).toBe('3');
  });

  it('locks and shows a spinner while the like request is pending', () => {
    const like = fakeLike({ status: idle, isLiked: false, likesCount: 3 });
    const button = mount(like);

    like.emit({ status: pending, isLiked: false, likesCount: 3 });

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.classList.contains('comment-like-button--loading')).toBe(true);
    expect(showsSpinner(button)).toBe(true);
    expect(showsIcon(button)).toBe(false);
  });

  it('renders the server-confirmed state once the request settles', () => {
    const like = fakeLike({ status: idle, isLiked: false, likesCount: 3 });
    const button = mount(like);
    like.emit({ status: pending, isLiked: false, likesCount: 3 });

    like.emit({ status: idle, isLiked: true, likesCount: 4 });

    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(button.classList.contains('comment-like-button--loading')).toBe(false);
    expect(showsSpinner(button)).toBe(false);
    expect(showsIcon(button)).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(countOf(button)).toBe('4');
  });

  // Browsers drop focus from a control that gets disabled; happy-dom keeps it, so assert on `focus()`
  it('gives focus back after the request when the button had it', () => {
    const like = fakeLike({ status: idle, isLiked: false, likesCount: 3 });
    const button = mount(like);
    button.focus();
    like.emit({ status: pending, isLiked: false, likesCount: 3 });
    const focus = vi.spyOn(button, 'focus');

    like.emit({ status: idle, isLiked: true, likesCount: 4 });

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('leaves focus alone when the button did not have it', () => {
    const like = fakeLike({ status: idle, isLiked: false, likesCount: 3 });
    const button = mount(like);
    like.emit({ status: pending, isLiked: false, likesCount: 3 });
    const focus = vi.spyOn(button, 'focus');

    like.emit({ status: idle, isLiked: true, likesCount: 4 });

    expect(focus).not.toHaveBeenCalled();
  });

  it('restores focus only once per request', () => {
    const like = fakeLike({ status: idle, isLiked: false, likesCount: 3 });
    const button = mount(like);
    button.focus();
    like.emit({ status: pending, isLiked: false, likesCount: 3 });
    const focus = vi.spyOn(button, 'focus');
    like.emit({ status: idle, isLiked: true, likesCount: 4 });

    like.emit({ status: idle, isLiked: true, likesCount: 5 });

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('does not focus a button that left the page while pending', () => {
    const like = fakeLike({ status: idle, isLiked: false, likesCount: 3 });
    const button = mount(like);
    button.focus();
    like.emit({ status: pending, isLiked: false, likesCount: 3 });

    button.remove();
    const focus = vi.spyOn(button, 'focus');
    like.emit({ status: idle, isLiked: true, likesCount: 4 });

    expect(focus).not.toHaveBeenCalled();
  });
});
