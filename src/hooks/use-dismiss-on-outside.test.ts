// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { useDismissOnOutside, type UseDismissOnOutsideOptions } from './use-dismiss-on-outside';

let root: HTMLElement;
let inside: HTMLElement;
let outside: HTMLElement;
let isActive: boolean;
let onDismiss: Mock<UseDismissOnOutsideOptions['onDismiss']>;
let destroy: () => void;

function pressKey(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

beforeEach(() => {
  root = document.createElement('div');
  inside = document.createElement('button');
  outside = document.createElement('p');
  root.append(inside);
  document.body.append(root, outside);
  isActive = true;
  onDismiss = vi.fn();
  destroy = useDismissOnOutside({ root, isActive: () => isActive, onDismiss });
});

afterEach(() => {
  destroy();
  document.body.replaceChildren();
});

describe('useDismissOnOutside', () => {
  it('dismisses on a click outside the root', () => {
    outside.click();

    expect(onDismiss).toHaveBeenCalledExactlyOnceWith('outside-click');
  });

  it.each([
    { name: 'inside the root', target: () => inside },
    { name: 'on the root itself', target: () => root },
  ])('stays open on a click $name', ({ target }) => {
    target().click();

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('dismisses on Escape', () => {
    pressKey('Escape');

    expect(onDismiss).toHaveBeenCalledExactlyOnceWith('escape');
  });

  it('ignores other keys', () => {
    pressKey('Enter');

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does nothing while inactive', () => {
    isActive = false;

    outside.click();
    pressKey('Escape');

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('stops listening after destroy', () => {
    destroy();

    outside.click();
    pressKey('Escape');

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
