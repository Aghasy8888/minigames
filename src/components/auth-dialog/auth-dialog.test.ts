// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { SESSION_STATUS } from '../../store/session-store';
import { deferred, type Deferred } from '../../test-support/deferred';
import { currentUrl, goBack } from '../../test-support/history';
import { AUTH_DIALOG_MODE, type AuthDialogMode } from '../../utils/auth-dialog-query';

vi.mock('../../services/firebase-auth', () => ({
  AuthCancelledError: class AuthCancelledError extends Error {},
  signInWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOutFirebase: vi.fn(),
}));

const { login, register } = AUTH_DIALOG_MODE;
const { authenticated } = SESSION_STATUS;

type AuthDialogModule = typeof import('.');
type FirebaseAuth = typeof import('../../services/firebase-auth');
type AuthDialogStore = typeof import('../../store/auth-dialog-store');
type AuthBusy = typeof import('../../store/auth-busy');
type SessionStore = typeof import('../../store/session-store');
type SnackbarStore = typeof import('../../store/snackbar-store');
type TopLayer = typeof import('../../hooks/use-top-layer');
type AuthProfile = import('../../services/firebase-auth').AuthProfile;

const NOW = 1_800_000_000_000;
const START_URL = '/library?category=puzzle';
const PROFILE: AuthProfile = { email: 'jane@example.com', displayName: 'Jane Doe' };
const CLOSE_MS = 250;
const PANEL_SWITCH_MS = 200;
const TWO_FRAMES_MS = 32;

let authDialogModule: AuthDialogModule;
let firebase: FirebaseAuth;
let authDialog: AuthDialogStore;
let authBusy: AuthBusy;
let session: SessionStore;
let snackbars: SnackbarStore;
let topLayer: TopLayer;
let dialog: HTMLDialogElement;
let addListenerSpy: MockInstance<typeof document.addEventListener>;

function query<T extends Element>(selector: string): T {
  const element = dialog.querySelector<T>(selector);
  if (!element) {
    throw new Error(`missing element: ${selector}`);
  }
  return element;
}

function tab(mode: AuthDialogMode): HTMLButtonElement {
  return query<HTMLButtonElement>(`#auth-dialog-tab-${mode}`);
}

function panel(mode: AuthDialogMode): HTMLElement {
  return query<HTMLElement>(`#auth-dialog-panel-${mode}`);
}

function input(id: string): HTMLInputElement {
  return query<HTMLInputElement>(`#${id}`);
}

function submitOf(mode: AuthDialogMode): HTMLButtonElement {
  return query<HTMLButtonElement>(`#auth-dialog-panel-${mode} button[type="submit"]`);
}

function switchOf(mode: AuthDialogMode): HTMLButtonElement {
  return query<HTMLButtonElement>(`#auth-dialog-panel-${mode} .auth-dialog__switch-action`);
}

function type(field: HTMLInputElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event('input'));
}

function fillLogin(): void {
  type(input('login-email'), PROFILE.email);
  type(input('login-password'), 'abcdef');
}

function selectedTabs(): Record<AuthDialogMode, string | null> {
  return {
    [login]: tab(login).getAttribute('aria-selected'),
    [register]: tab(register).getAttribute('aria-selected'),
  };
}

function hiddenPanels(): Record<AuthDialogMode, boolean> {
  return { [login]: panel(login).hidden, [register]: panel(register).hidden };
}

function shownSnackbars(): { variant: string; message: string }[] {
  return snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message }));
}

function pressEscape(): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  document.dispatchEvent(event);
  return event;
}

function cancelDialog(): Event {
  const event = new Event('cancel', { cancelable: true });
  dialog.dispatchEvent(event);
  return event;
}

function pressBackdrop(): void {
  dialog.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function startPendingSignIn(): Deferred<AuthProfile> {
  const request = deferred<AuthProfile>();
  vi.mocked(firebase.signInWithEmail).mockReturnValue(request.promise);
  fillLogin();
  submitOf(login).click();
  return request;
}

/** Lets the awaited (mocked) Firebase call and the follow-up steps run. */
async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

function syncOnPopState(): void {
  authDialog.syncAuthDialogFromLocation();
}

/** Fresh stores and a freshly mounted dialog; `use-top-layer` detects the Popover API on import. */
async function loadDialog(): Promise<void> {
  document.body.replaceChildren();
  vi.resetModules();
  firebase = await import('../../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  authDialog = await import('../../store/auth-dialog-store');
  authBusy = await import('../../store/auth-busy');
  session = await import('../../store/session-store');
  snackbars = await import('../../store/snackbar-store');
  topLayer = await import('../../hooks/use-top-layer');
  authDialogModule = await import('.');
  dialog = authDialogModule.createAuthDialog();
  document.body.append(dialog);
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  localStorage.clear();
  document.body.style.overflow = '';
  globalThis.history.replaceState(undefined, '', START_URL);
  addListenerSpy = vi.spyOn(document, 'addEventListener');
  await loadDialog();
});

afterEach(() => {
  for (const [eventType, listener, options] of addListenerSpy.mock.calls) {
    document.removeEventListener(eventType, listener, options);
  }
  globalThis.removeEventListener('popstate', syncOnPopState);
  vi.useRealTimers();
  document.body.replaceChildren();
  document.body.style.overflow = '';
  localStorage.clear();
});

describe('structure', () => {
  it('labels the dialog and its tab list', () => {
    expect(dialog.getAttribute('aria-label')).toBe('Authentication');
    expect(query('[role="tablist"]').getAttribute('aria-label')).toBe('Authentication mode');
  });

  it.each([
    { mode: login, label: 'Login' },
    { mode: register, label: 'Register' },
  ])('renders a $label tab controlling the $mode panel', ({ mode, label }) => {
    expect(tab(mode).textContent).toBe(label);
    expect(tab(mode).getAttribute('role')).toBe('tab');
    expect(tab(mode).getAttribute('aria-controls')).toBe(panel(mode).id);
    expect(panel(mode).getAttribute('aria-labelledby')).toBe(tab(mode).id);
  });

  it('starts closed with the login panel selected', () => {
    expect(dialog.open).toBe(false);
    expect(selectedTabs()).toStrictEqual({ [login]: 'true', [register]: 'false' });
    expect(hiddenPanels()).toStrictEqual({ [login]: false, [register]: true });
  });
});

describe('opening', () => {
  it.each([
    { mode: login, other: register },
    { mode: register, other: login },
  ])('opens on the $mode panel and locks page scroll', ({ mode, other }) => {
    authDialog.openAuthDialog(mode);

    expect(dialog.open).toBe(true);
    expect(tab(mode).classList.contains('auth-dialog__tab--active')).toBe(true);
    expect(tab(other).classList.contains('auth-dialog__tab--active')).toBe(false);
    expect(selectedTabs()).toStrictEqual({ [mode]: 'true', [other]: 'false' });
    expect(hiddenPanels()).toStrictEqual({ [mode]: false, [other]: true });
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('opens from a deep link on the mode in the URL', () => {
    globalThis.history.replaceState(undefined, '', `${START_URL}&auth=register`);

    authDialog.syncAuthDialogFromLocation();

    expect(dialog.open).toBe(true);
    expect(selectedTabs()).toStrictEqual({ [login]: 'false', [register]: 'true' });
  });

  it('switches to Login after opening directly on Register', () => {
    authDialog.openAuthDialog(register);

    tab(login).click();

    expect(selectedTabs()).toStrictEqual({ [login]: 'true', [register]: 'false' });
    expect(panel(login).hidden).toBe(false);
  });

  it('fades in only after two animation frames', () => {
    authDialog.openAuthDialog(login);
    vi.advanceTimersByTime(TWO_FRAMES_MS / 2);
    expect(dialog.classList.contains('auth-dialog--open')).toBe(false);

    vi.advanceTimersByTime(TWO_FRAMES_MS / 2);

    expect(dialog.classList.contains('auth-dialog--open')).toBe(true);
  });

  it('moves the Snackbar host into the dialog while open and back to the body after', async () => {
    const host = document.createElement('div');
    topLayer.useTopLayer(host);
    await Promise.resolve();

    authDialog.openAuthDialog(login);
    expect(host.parentElement).toBe(dialog);

    authDialog.closeAuthDialog();
    vi.advanceTimersByTime(CLOSE_MS);

    expect(host.parentElement).toBe(document.body);
  });
});

describe('switching login ↔ register', () => {
  beforeEach(() => {
    authDialog.openAuthDialog(login);
  });

  it('switches to Register from its tab as a new history entry', () => {
    const { length } = globalThis.history;

    tab(register).click();

    expect(currentUrl()).toBe(`${START_URL}&auth=register`);
    expect(globalThis.history.length).toBe(length + 1);
    expect(selectedTabs()).toStrictEqual({ [login]: 'false', [register]: 'true' });
    expect(tab(register).classList.contains('auth-dialog__tab--active')).toBe(true);
  });

  it('switches back to Login from its tab', () => {
    tab(register).click();

    tab(login).click();

    expect(currentUrl()).toBe(`${START_URL}&auth=login`);
    expect(selectedTabs()).toStrictEqual({ [login]: 'true', [register]: 'false' });
  });

  it.each([
    { from: login, to: register },
    { from: register, to: login },
  ])('switches from $from to $to with the link under the form', ({ from, to }) => {
    authDialog.openAuthDialog(from);

    switchOf(from).click();

    expect(authDialog.getAuthDialogState().mode).toBe(to);
    expect(currentUrl()).toBe(`${START_URL}&auth=${to}`);
  });

  it('clears the fields and errors of the form being left', () => {
    const email = input('login-email');
    email.value = 'jane@';
    email.dispatchEvent(new Event('blur'));
    type(input('login-password'), 'abcdef');

    tab(register).click();

    expect(email.value).toBe('');
    expect(input('login-password').value).toBe('');
    expect(query('#login-email-error').hasAttribute('hidden')).toBe(true);
    expect(email.hasAttribute('aria-invalid')).toBe(false);
  });

  it('starts the other form empty when switching back', () => {
    tab(register).click();
    type(input('register-username'), 'Jane1');

    switchOf(register).click();
    tab(register).click();

    expect(input('register-username').value).toBe('');
    expect(submitOf(register).disabled).toBe(true);
  });

  it('keeps the outgoing panel visible while it animates out', () => {
    tab(register).click();

    expect(panel(login).hidden).toBe(false);
    expect(panel(login).classList.contains('auth-dialog__panel--leaving')).toBe(true);
    expect(panel(register).classList.contains('auth-dialog__panel--entering')).toBe(true);

    vi.advanceTimersByTime(TWO_FRAMES_MS);
    expect(panel(register).classList.contains('auth-dialog__panel--entering')).toBe(false);
    expect(panel(login).hidden).toBe(false);

    vi.advanceTimersByTime(PANEL_SWITCH_MS - TWO_FRAMES_MS);
    expect(panel(login).hidden).toBe(true);
    expect(panel(login).classList.contains('auth-dialog__panel--leaving')).toBe(false);
  });

  it('does not hide a panel that was switched back to before its exit finished', () => {
    tab(register).click();
    vi.advanceTimersByTime(PANEL_SWITCH_MS / 2);

    tab(login).click();
    vi.advanceTimersByTime(PANEL_SWITCH_MS);

    expect(hiddenPanels()).toStrictEqual({ [login]: false, [register]: true });
    expect(panel(login).classList.contains('auth-dialog__panel--leaving')).toBe(false);
  });

  it('keeps page scroll locked only once across switches', () => {
    tab(register).click();
    tab(login).click();

    authDialog.closeAuthDialog();
    vi.advanceTimersByTime(CLOSE_MS);

    expect(document.body.style.overflow).toBe('');
  });
});

describe('while a sign-in request is pending', () => {
  beforeEach(() => {
    authDialog.openAuthDialog(login);
  });

  it('locks both tabs and every field of both forms', () => {
    startPendingSignIn();

    expect(tab(login).disabled).toBe(true);
    expect(tab(register).disabled).toBe(true);
    expect(input('login-email').disabled).toBe(true);
    expect(input('register-email').disabled).toBe(true);
    expect(switchOf(login).disabled).toBe(true);
    expect(authBusy.isAuthBusy()).toBe(true);
  });

  it('cannot be closed with Escape', () => {
    startPendingSignIn();

    expect(pressEscape().defaultPrevented).toBe(true);
    expect(cancelDialog().defaultPrevented).toBe(true);
    vi.advanceTimersByTime(CLOSE_MS);
    expect(dialog.open).toBe(true);
    expect(currentUrl()).toBe(`${START_URL}&auth=login`);
  });

  it('leaves keys other than Escape alone', () => {
    startPendingSignIn();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });

    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('cannot be closed from the backdrop', () => {
    startPendingSignIn();

    pressBackdrop();
    vi.advanceTimersByTime(CLOSE_MS);

    expect(dialog.open).toBe(true);
    expect(authDialog.getAuthDialogState().mode).toBe(login);
  });

  it('reopens itself if the browser force-closes it', () => {
    startPendingSignIn();

    dialog.close();

    expect(dialog.open).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes after a successful sign-in, clearing the form and unlocking scroll', async () => {
    const request = startPendingSignIn();

    request.resolve(PROFILE);
    await settle();
    expect(dialog.classList.contains('auth-dialog--closing')).toBe(true);
    vi.advanceTimersByTime(CLOSE_MS);

    expect(dialog.open).toBe(false);
    expect(session.getSession().status).toBe(authenticated);
    expect(currentUrl()).toBe(START_URL);
    expect(input('login-email').value).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(authBusy.isAuthBusy()).toBe(false);
  });

  it('unlocks everything after a failure and lets the user retry with the same values', async () => {
    const request = startPendingSignIn();
    request.reject(new Error('Incorrect email or password.'));
    await settle();

    expect(tab(register).disabled).toBe(false);
    expect(input('login-email').value).toBe(PROFILE.email);
    expect(submitOf(login).disabled).toBe(false);
    expect(firebase.signInWithEmail).toHaveBeenCalledTimes(1);

    vi.mocked(firebase.signInWithEmail).mockResolvedValue(PROFILE);
    submitOf(login).click();
    await settle();

    expect(firebase.signInWithEmail).toHaveBeenCalledTimes(2);
    expect(shownSnackbars()).toStrictEqual([
      { variant: 'error', message: 'Incorrect email or password.' },
      { variant: 'success', message: "You're signed in." },
    ]);
  });
});

describe('closing', () => {
  beforeEach(() => {
    authDialog.openAuthDialog(login);
    vi.advanceTimersByTime(TWO_FRAMES_MS);
  });

  it('closes on Escape as a new history entry, after the fade-out', () => {
    const { length } = globalThis.history;

    expect(cancelDialog().defaultPrevented).toBe(true);
    expect(currentUrl()).toBe(START_URL);
    expect(globalThis.history.length).toBe(length + 1);
    expect(dialog.classList.contains('auth-dialog--closing')).toBe(true);
    expect(dialog.classList.contains('auth-dialog--open')).toBe(false);

    vi.advanceTimersByTime(CLOSE_MS - 1);
    expect(dialog.open).toBe(true);

    vi.advanceTimersByTime(1);
    expect(dialog.open).toBe(false);
    expect(dialog.classList.contains('auth-dialog--closing')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('leaves the Escape key to the dialog when nothing is pending', () => {
    expect(pressEscape().defaultPrevented).toBe(false);
  });

  it('ignores Escape on the page while the dialog is closed', () => {
    authDialog.closeAuthDialog();
    vi.advanceTimersByTime(CLOSE_MS);
    authBusy.setAuthBusy(true);

    expect(pressEscape().defaultPrevented).toBe(false);
  });

  it('closes on a press that starts and ends on the backdrop', () => {
    pressBackdrop();
    vi.advanceTimersByTime(CLOSE_MS);

    expect(dialog.open).toBe(false);
    expect(currentUrl()).toBe(START_URL);
  });

  it('clears both forms once closed', () => {
    fillLogin();

    authDialog.closeAuthDialog();
    vi.advanceTimersByTime(CLOSE_MS);

    expect(input('login-email').value).toBe('');
    expect(input('login-password').value).toBe('');
    expect(submitOf(login).disabled).toBe(true);
  });

  it('stays open when reopened during the fade-out', () => {
    authDialog.closeAuthDialog();
    vi.advanceTimersByTime(CLOSE_MS / 2);

    authDialog.openAuthDialog(register);
    vi.advanceTimersByTime(CLOSE_MS);

    expect(dialog.open).toBe(true);
    expect(dialog.classList.contains('auth-dialog--closing')).toBe(false);
    expect(dialog.classList.contains('auth-dialog--open')).toBe(true);
    expect(selectedTabs()).toStrictEqual({ [login]: 'false', [register]: 'true' });
  });

  it('keeps the same panel visible when its mode is reopened during the fade-out', () => {
    authDialog.closeAuthDialog();

    authDialog.openAuthDialog(login);
    vi.advanceTimersByTime(CLOSE_MS);

    expect(dialog.open).toBe(true);
    expect(hiddenPanels()).toStrictEqual({ [login]: false, [register]: true });
  });

  it('closes when Back leaves the Auth URL', async () => {
    globalThis.addEventListener('popstate', syncOnPopState);

    await goBack();
    vi.advanceTimersByTime(CLOSE_MS);

    expect(currentUrl()).toBe(START_URL);
    expect(dialog.open).toBe(false);
  });

  it('drops auth from the URL when the browser closes the dialog directly', () => {
    const { length } = globalThis.history;

    dialog.close();

    expect(dialog.classList.contains('auth-dialog--open')).toBe(false);
    expect(dialog.classList.contains('auth-dialog--closing')).toBe(false);
    expect(authDialog.getAuthDialogState().mode).toBeUndefined();
    expect(currentUrl()).toBe(START_URL);
    expect(globalThis.history.length).toBe(length + 1);
    expect(document.body.style.overflow).toBe('');
  });
});

describe('with the Popover API (missing in happy-dom, stubbed)', () => {
  const POPOVER_METHODS = ['showPopover', 'hidePopover'] as const;

  beforeEach(async () => {
    for (const method of POPOVER_METHODS) {
      Object.defineProperty(HTMLElement.prototype, method, { configurable: true, value: vi.fn() });
    }
    await loadDialog();
  });

  afterEach(() => {
    for (const method of POPOVER_METHODS) {
      Reflect.deleteProperty(HTMLElement.prototype, method);
    }
  });

  it('re-shows the Snackbar host above the dialog when a pending sign-in forces it open again', async () => {
    const host = document.createElement('div');
    const showPopover = vi.fn<() => void>();
    Object.defineProperty(host, 'showPopover', { configurable: true, value: showPopover });
    vi.spyOn(host, 'matches').mockReturnValue(false);
    topLayer.useTopLayer(host);
    await Promise.resolve();
    authDialog.openAuthDialog(login);
    startPendingSignIn();
    showPopover.mockClear();

    dialog.close();

    expect(host.parentElement).toBe(dialog);
    expect(showPopover).toHaveBeenCalledTimes(1);
  });
});
