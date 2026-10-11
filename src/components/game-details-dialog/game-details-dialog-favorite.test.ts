// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

import { addToFavoriteIcon, favoriteIcon } from '../../assets/icons';
import {
  FAVORITE_TOGGLE_STATUS,
  type FavoriteToggleController,
  type FavoriteToggleState,
} from '../../hooks/use-favorite-toggle';
import { createFavoriteToggle, createLikesStat } from './game-details-dialog-favorite';

const { idle, pending } = FAVORITE_TOGGLE_STATUS;

type FakeFavorite = FavoriteToggleController & {
  toggle: Mock<() => void>;
  emit: (state: FavoriteToggleState) => void;
};

/** Stands in for `useFavoriteToggle`: the toggle may only render what the controller emits. */
function fakeFavorite(initial: FavoriteToggleState): FakeFavorite {
  let state = initial;
  const listeners = new Set<(next: FavoriteToggleState) => void>();

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

function mountToggle(controller: FakeFavorite): HTMLButtonElement {
  const button = createFavoriteToggle(controller);
  document.body.append(button);
  return button;
}

function labelOf(button: HTMLButtonElement): string | null | undefined {
  return button.querySelector('.button__label')?.textContent;
}

function iconOf(button: HTMLButtonElement): string | null | undefined {
  return button.querySelector('.game-details-dialog__favorite-icon')?.getAttribute('src');
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('createFavoriteToggle', () => {
  it('offers "Add to Favorites" for a game the user has not favorited', () => {
    const button = mountToggle(fakeFavorite({ status: idle, isFavorited: false, likesCount: 10 }));

    expect(labelOf(button)).toBe('Add to Favorites');
    expect(button.getAttribute('aria-label')).toBe('Add to Favorites');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.classList.contains('game-details-dialog__favorite--active')).toBe(false);
    expect(iconOf(button)).toBe(addToFavoriteIcon);
  });

  it('offers "Remove from Favorites" for a favorited game', () => {
    const button = mountToggle(fakeFavorite({ status: idle, isFavorited: true, likesCount: 10 }));

    expect(labelOf(button)).toBe('Remove from Favorites');
    expect(button.getAttribute('aria-label')).toBe('Remove from Favorites');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.classList.contains('game-details-dialog__favorite--active')).toBe(true);
    expect(iconOf(button)).toBe(favoriteIcon);
  });

  it('asks the controller to toggle on click and changes nothing on its own', () => {
    const favorite = fakeFavorite({ status: idle, isFavorited: false, likesCount: 10 });
    const button = mountToggle(favorite);

    button.click();

    expect(favorite.toggle).toHaveBeenCalledTimes(1);
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it.each([
    { name: 'adding', isFavorited: false, label: 'Adding to Favorites…' },
    { name: 'removing', isFavorited: true, label: 'Removing from Favorites…' },
  ])('locks with a "$label" label while $name', ({ isFavorited, label }) => {
    const favorite = fakeFavorite({ status: idle, isFavorited, likesCount: 10 });
    const button = mountToggle(favorite);

    favorite.emit({ status: pending, isFavorited, likesCount: 10 });

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(labelOf(button)).toBe(label);
    expect(button.getAttribute('aria-pressed')).toBe(String(isFavorited));
  });

  it('unlocks and renders the server-confirmed state once the request settles', () => {
    const favorite = fakeFavorite({ status: idle, isFavorited: false, likesCount: 10 });
    const button = mountToggle(favorite);
    favorite.emit({ status: pending, isFavorited: false, likesCount: 10 });

    favorite.emit({ status: idle, isFavorited: true, likesCount: 11 });

    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(button.querySelector('.button__spinner')).toBeNull();
    expect(labelOf(button)).toBe('Remove from Favorites');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the previous state after a failed request', () => {
    const favorite = fakeFavorite({ status: idle, isFavorited: false, likesCount: 10 });
    const button = mountToggle(favorite);
    favorite.emit({ status: pending, isFavorited: false, likesCount: 10 });

    favorite.emit({ status: idle, isFavorited: false, likesCount: 10 });

    expect(button.disabled).toBe(false);
    expect(labelOf(button)).toBe('Add to Favorites');
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  // Browsers drop focus from a control that gets disabled; happy-dom keeps it, so assert on `focus()`
  it('gives focus back after the request when the button had it', () => {
    const favorite = fakeFavorite({ status: idle, isFavorited: false, likesCount: 10 });
    const button = mountToggle(favorite);
    button.focus();
    favorite.emit({ status: pending, isFavorited: false, likesCount: 10 });
    const focus = vi.spyOn(button, 'focus');

    favorite.emit({ status: idle, isFavorited: true, likesCount: 11 });

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('leaves focus alone when the button did not have it', () => {
    const favorite = fakeFavorite({ status: idle, isFavorited: false, likesCount: 10 });
    const button = mountToggle(favorite);
    favorite.emit({ status: pending, isFavorited: false, likesCount: 10 });
    const focus = vi.spyOn(button, 'focus');

    favorite.emit({ status: idle, isFavorited: true, likesCount: 11 });

    expect(focus).not.toHaveBeenCalled();
  });

  it('does not focus a button that left the page while pending', () => {
    const favorite = fakeFavorite({ status: idle, isFavorited: false, likesCount: 10 });
    const button = mountToggle(favorite);
    button.focus();
    favorite.emit({ status: pending, isFavorited: false, likesCount: 10 });

    button.remove();
    const focus = vi.spyOn(button, 'focus');
    favorite.emit({ status: idle, isFavorited: true, likesCount: 11 });

    expect(focus).not.toHaveBeenCalled();
  });

  it('re-enables the button only after a pending request', () => {
    const favorite = fakeFavorite({ status: idle, isFavorited: false, likesCount: 10 });
    const button = mountToggle(favorite);
    button.disabled = true;

    favorite.emit({ status: idle, isFavorited: false, likesCount: 12 });

    expect(button.disabled).toBe(true);
  });
});

describe('createLikesStat', () => {
  it('shows the likes count in compact form with the heart icon', () => {
    const stat = createLikesStat(
      fakeFavorite({ status: idle, isFavorited: false, likesCount: 38_207 }),
    );

    expect(stat.querySelector('.game-details-dialog__stat-value')?.textContent).toBe('38.2K');
    expect(stat.querySelector('img')?.getAttribute('src')).toBe(favoriteIcon);
  });

  it('follows the server-confirmed count', () => {
    const favorite = fakeFavorite({ status: idle, isFavorited: false, likesCount: 999 });
    const stat = createLikesStat(favorite);

    favorite.emit({ status: idle, isFavorited: true, likesCount: 1000 });

    expect(stat.querySelector('.game-details-dialog__stat-value')?.textContent).toBe('1K');
  });
});
