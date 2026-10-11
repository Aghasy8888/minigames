// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkIcon, errorIcon, infoIcon, warningIcon } from '../../assets/icons';
import type { SnackbarVariant } from '../../store/snackbar-store';

type SnackbarModule = typeof import('.');
type SnackbarStore = typeof import('../../store/snackbar-store');

let snackbar: SnackbarModule;
let store: SnackbarStore;
let host: HTMLElement;

function toasts(): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>('.snackbar')];
}

function messages(): (string | undefined)[] {
  return toasts().map(
    (toast) => toast.querySelector('.snackbar__message')?.textContent ?? undefined,
  );
}

function onlyToast(): HTMLElement {
  const [toast] = toasts();
  if (!toast) {
    throw new Error('no snackbar is rendered');
  }
  return toast;
}

function closeButtonOf(toast: HTMLElement): HTMLButtonElement {
  const button = toast.querySelector<HTMLButtonElement>('.snackbar__close');
  if (!button) {
    throw new Error('snackbar has no close button');
  }
  return button;
}

function showInfo(message: string, durationMs?: number): string {
  return store.showSnackbar({ variant: 'info', message, durationMs });
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  store = await import('../../store/snackbar-store');
  snackbar = await import('.');
  host = snackbar.createSnackbarHost();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('host', () => {
  it('is a manual popover live region announcing added and changed text', () => {
    expect(host.className).toBe('snackbar-host');
    expect(host.getAttribute('popover')).toBe('manual');
    expect(host.getAttribute('aria-live')).toBe('polite');
    expect(host.getAttribute('aria-relevant')).toBe('additions text');
  });

  it('mounts itself in the body once created', async () => {
    await Promise.resolve();

    expect(host.parentElement).toBe(document.body);
  });

  it('renders snackbars that were shown before it was created', async () => {
    vi.resetModules();
    store = await import('../../store/snackbar-store');
    snackbar = await import('.');
    showInfo('Shown before mount');

    host = snackbar.createSnackbarHost();

    expect(messages()).toStrictEqual(['Shown before mount']);
  });
});

describe('rendering', () => {
  it.each<{ variant: SnackbarVariant; role: string; icon: string }>([
    { variant: 'success', role: 'status', icon: checkIcon },
    { variant: 'info', role: 'status', icon: infoIcon },
    { variant: 'error', role: 'alert', icon: errorIcon },
    { variant: 'warning', role: 'alert', icon: warningIcon },
  ])('renders a $variant snackbar with role $role and its own icon', ({ variant, role, icon }) => {
    store.showSnackbar({ variant, message: 'Saved' });
    const toast = onlyToast();
    const iconElement = toast.querySelector<HTMLImageElement>('.snackbar__icon');

    expect(toast.className).toBe(`snackbar snackbar--${variant}`);
    expect(toast.getAttribute('role')).toBe(role);
    expect(iconElement?.getAttribute('src')).toBe(icon);
    expect(iconElement?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the message as text, never as markup', () => {
    showInfo('<b>bold</b>');

    expect(messages()).toStrictEqual(['<b>bold</b>']);
    expect(onlyToast().querySelector('b')).toBeNull();
  });

  it('gives every snackbar a keyboard-reachable close button', () => {
    showInfo('Saved');
    const button = closeButtonOf(onlyToast());

    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Close notification');
  });

  it('appends new snackbars after the visible ones and keeps the existing elements', () => {
    showInfo('First');
    const [first] = toasts();

    showInfo('Second');

    expect(messages()).toStrictEqual(['First', 'Second']);
    expect(toasts()[0]).toBe(first);
  });

  it('drops the oldest snackbar when a fourth one arrives', () => {
    showInfo('One');
    showInfo('Two');
    showInfo('Three');

    showInfo('Four');

    expect(messages()).toStrictEqual(['Two', 'Three', 'Four']);
  });
});

describe('dismissal', () => {
  it('closes a snackbar when its close button is clicked', () => {
    showInfo('Saved');

    closeButtonOf(onlyToast()).click();

    expect(toasts()).toHaveLength(0);
    expect(store.getSnackbars()).toHaveLength(0);
  });

  it('removes only the dismissed snackbar', () => {
    const firstId = showInfo('First');
    showInfo('Second');

    store.dismissSnackbar(firstId);

    expect(messages()).toStrictEqual(['Second']);
  });

  it.each<{ variant: SnackbarVariant; durationMs: number }>([
    { variant: 'success', durationMs: 5000 },
    { variant: 'error', durationMs: 7000 },
  ])('auto-dismisses a $variant snackbar after $durationMs ms', ({ variant, durationMs }) => {
    store.showSnackbar({ variant, message: 'Done' });

    vi.advanceTimersByTime(durationMs - 1);
    expect(toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(toasts()).toHaveLength(0);
  });

  it('honors a custom duration', () => {
    showInfo('Quick', 1000);

    vi.advanceTimersByTime(1000);

    expect(toasts()).toHaveLength(0);
  });

  it('keeps counting down the other snackbars after one is closed', () => {
    const firstId = showInfo('First', 3000);
    showInfo('Second', 3000);
    store.dismissSnackbar(firstId);

    vi.advanceTimersByTime(3000);

    expect(toasts()).toHaveLength(0);
  });
});

describe('pausing on hover and focus', () => {
  it('pauses the countdown while hovered and resumes with the remaining time', () => {
    showInfo('Saved', 5000);
    const toast = onlyToast();
    vi.advanceTimersByTime(3000);

    toast.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(60_000);
    expect(toasts()).toHaveLength(1);

    toast.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(1999);
    expect(toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(toasts()).toHaveLength(0);
  });

  it('pauses the countdown while focus is inside the snackbar', () => {
    showInfo('Saved', 5000);
    const toast = onlyToast();

    toast.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(60_000);

    expect(toasts()).toHaveLength(1);
  });

  it('stays paused when focus moves to another control inside the snackbar', () => {
    showInfo('Saved', 5000);
    const toast = onlyToast();
    toast.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    toast.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: closeButtonOf(toast) }),
    );
    vi.advanceTimersByTime(60_000);

    expect(toasts()).toHaveLength(1);
  });

  it('resumes when focus leaves the snackbar', () => {
    showInfo('Saved', 5000);
    const toast = onlyToast();
    toast.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    toast.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }),
    );
    vi.advanceTimersByTime(5000);

    expect(toasts()).toHaveLength(0);
  });

  it('resumes when focus leaves the page entirely', () => {
    showInfo('Saved', 5000);
    const toast = onlyToast();
    toast.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    toast.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    vi.advanceTimersByTime(5000);

    expect(toasts()).toHaveLength(0);
  });
});
