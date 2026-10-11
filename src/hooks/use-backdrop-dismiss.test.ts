// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { dispatchPointer } from '../test-support/pointer-events';
import { useBackdropDismiss } from './use-backdrop-dismiss';

let dialog: HTMLDialogElement;
let content: HTMLElement;
let onDismiss: Mock<() => void>;
let destroy: () => void;

/** A click is dispatched on the element where the press ended. */
function pressAndRelease(start: Element, end: Element): void {
  dispatchPointer(start, 'pointerdown');
  end.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

beforeEach(() => {
  dialog = document.createElement('dialog');
  content = document.createElement('form');
  dialog.append(content);
  document.body.append(dialog);
  onDismiss = vi.fn();
  destroy = useBackdropDismiss(dialog, onDismiss);
});

afterEach(() => {
  destroy();
  document.body.replaceChildren();
});

describe('useBackdropDismiss', () => {
  it('dismisses when a press starts and ends on the backdrop', () => {
    pressAndRelease(dialog, dialog);

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it.each([
    {
      name: 'starts in the content and ends on the backdrop',
      start: () => content,
      end: () => dialog,
    },
    {
      name: 'starts on the backdrop and ends in the content',
      start: () => dialog,
      end: () => content,
    },
    { name: 'stays in the content', start: () => content, end: () => content },
  ])('stays open when a press $name', ({ start, end }) => {
    pressAndRelease(start(), end());

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('stays open for a click without a press on the dialog, like the tap that opened it', () => {
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('needs a new press for every dismissal', () => {
    pressAndRelease(dialog, dialog);
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('stops listening after destroy', () => {
    destroy();

    pressAndRelease(dialog, dialog);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('ignores the end of a backdrop press that began before destroy', () => {
    dispatchPointer(dialog, 'pointerdown');

    destroy();
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
