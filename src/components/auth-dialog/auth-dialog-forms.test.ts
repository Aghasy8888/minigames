// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { SESSION_STATUS } from '../../store/session-store';
import { deferred } from '../../test-support/deferred';
import { currentUrl } from '../../test-support/history';
import { AUTH_DIALOG_MODE } from '../../utils/auth-dialog-query';

vi.mock('../../services/firebase-auth', () => ({
  AuthCancelledError: class AuthCancelledError extends Error {},
  signInWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOutFirebase: vi.fn(),
}));

const { login } = AUTH_DIALOG_MODE;
const { authenticated, guest } = SESSION_STATUS;

type Forms = typeof import('./auth-dialog-forms');
type FirebaseAuth = typeof import('../../services/firebase-auth');
type AuthDialogStore = typeof import('../../store/auth-dialog-store');
type SessionStore = typeof import('../../store/session-store');
type SnackbarStore = typeof import('../../store/snackbar-store');
type AuthProfile = import('../../services/firebase-auth').AuthProfile;
type AuthPanel = import('./auth-dialog-forms').AuthPanel;

const NOW = 1_800_000_000_000;
const START_URL = '/library?category=puzzle';
const PROFILE: AuthProfile = { email: 'jane@example.com', displayName: 'Jane Doe' };
const STRONG_PASSWORD = 'Passw0rd!';

let forms: Forms;
let firebase: FirebaseAuth;
let authDialog: AuthDialogStore;
let session: SessionStore;
let snackbars: SnackbarStore;
let onSwitch: Mock<() => void>;
let onPending: Mock<(busy: boolean) => void>;

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`missing element: ${selector}`);
  }
  return element;
}

function input(panel: HTMLElement, id: string): HTMLInputElement {
  return query<HTMLInputElement>(panel, `#${id}`);
}

function type(field: HTMLInputElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event('input'));
}

function submitOf(panel: HTMLElement): HTMLButtonElement {
  return query<HTMLButtonElement>(panel, 'button[type="submit"]');
}

function googleOf(panel: HTMLElement): HTMLButtonElement {
  return query<HTMLButtonElement>(panel, '.auth-dialog__actions .button--secondary');
}

function switchOf(panel: HTMLElement): HTMLButtonElement {
  return query<HTMLButtonElement>(panel, '.auth-dialog__switch-action');
}

function labelOf(button: HTMLButtonElement): string | null | undefined {
  return button.querySelector('.button__label')?.textContent;
}

function errorText(panel: HTMLElement, id: string): string | null | undefined {
  return panel.querySelector(`#${id}-error`)?.textContent;
}

function shownSnackbars(): { variant: string; message: string }[] {
  return snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message }));
}

function mountLogin(): AuthPanel {
  const created = forms.createLoginPanel(onSwitch, onPending);
  document.body.append(created.panel);
  return created;
}

function mountRegister(): AuthPanel {
  const created = forms.createRegisterPanel(onSwitch, onPending);
  document.body.append(created.panel);
  return created;
}

function fillLogin(panel: HTMLElement, email = PROFILE.email, password = 'abcdef'): void {
  type(input(panel, 'login-email'), email);
  type(input(panel, 'login-password'), password);
}

function fillRegister(panel: HTMLElement): void {
  type(input(panel, 'register-username'), 'Jane1');
  type(input(panel, 'register-email'), PROFILE.email);
  type(input(panel, 'register-password'), STRONG_PASSWORD);
  type(input(panel, 'register-confirm-password'), STRONG_PASSWORD);
}

/** Lets the awaited (mocked) Firebase call and the follow-up steps run. */
async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  localStorage.clear();
  globalThis.history.replaceState(undefined, '', START_URL);
  vi.resetModules();
  firebase = await import('../../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  authDialog = await import('../../store/auth-dialog-store');
  session = await import('../../store/session-store');
  snackbars = await import('../../store/snackbar-store');
  forms = await import('./auth-dialog-forms');
  onSwitch = vi.fn<() => void>();
  onPending = vi.fn<(busy: boolean) => void>();
  authDialog.openAuthDialog(login);
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  localStorage.clear();
});

describe('login panel', () => {
  it('is a tab panel labelled by the Login tab, with a heading and Forgot Password', () => {
    const { panel } = mountLogin();

    expect(panel.id).toBe('auth-dialog-panel-login');
    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe('auth-dialog-tab-login');
    expect(query(panel, 'h2').textContent).toBe('Welcome Back!');
    expect(query(panel, '.auth-dialog__forgot').textContent).toBe('Forgot Password?');
    expect(labelOf(googleOf(panel))).toBe('Continue with Google');
  });

  it('asks for an email and a password with a visibility toggle', () => {
    const { panel } = mountLogin();

    expect(input(panel, 'login-email').type).toBe('email');
    expect(input(panel, 'login-password').type).toBe('password');
    expect(query(panel, '.text-field__toggle').getAttribute('aria-controls')).toBe(
      'login-password',
    );
  });

  it('offers a switch to Register', () => {
    const { panel } = mountLogin();

    switchOf(panel).click();

    expect(switchOf(panel).textContent).toBe('Register');
    expect(onSwitch).toHaveBeenCalledTimes(1);
  });

  it.each([
    { name: 'empty form', email: '', password: '', enabled: false },
    { name: 'email only', email: PROFILE.email, password: '', enabled: false },
    { name: 'invalid email', email: 'jane@', password: 'abcdef', enabled: false },
    { name: 'five-character password', email: PROFILE.email, password: 'abcde', enabled: false },
    {
      name: 'weak six-character password',
      email: PROFILE.email,
      password: 'abcdef',
      enabled: true,
    },
  ])('enables Login only for a valid form: $name', ({ email, password, enabled }) => {
    const { panel } = mountLogin();

    fillLogin(panel, email, password);

    expect(submitOf(panel).disabled).toBe(!enabled);
  });

  it('shows a field error as soon as the field is left invalid', () => {
    const { panel } = mountLogin();
    const email = input(panel, 'login-email');

    email.value = 'jane@';
    email.dispatchEvent(new Event('blur'));

    expect(errorText(panel, 'login-email')).not.toBe('');
    expect(email.getAttribute('aria-invalid')).toBe('true');
  });
});

describe('register panel', () => {
  it('asks for username, email, password, and confirmation, without Forgot Password', () => {
    const { panel } = mountRegister();

    expect(panel.id).toBe('auth-dialog-panel-register');
    expect(query(panel, 'h2').textContent).toBe('Create Account');
    expect(
      [...panel.querySelectorAll<HTMLInputElement>('.text-field__input')].map(({ id }) => id),
    ).toStrictEqual([
      'register-username',
      'register-email',
      'register-password',
      'register-confirm-password',
    ]);
    expect(panel.querySelector('.auth-dialog__forgot')).toBeNull();
    expect(labelOf(googleOf(panel))).toBe('Sign up with Google');
  });

  it('offers a switch to Login', () => {
    const { panel } = mountRegister();

    switchOf(panel).click();

    expect(switchOf(panel).textContent).toBe('Login');
    expect(onSwitch).toHaveBeenCalledTimes(1);
  });

  it.each([
    { name: 'lowercase username', field: 'register-username', value: 'jane1' },
    { name: 'weak password', field: 'register-password', value: 'password' },
    { name: 'different confirmation', field: 'register-confirm-password', value: 'Passw0rd?' },
    { name: 'invalid email', field: 'register-email', value: 'jane.example.com' },
  ])('keeps Create Account disabled with a $name', ({ field, value }) => {
    const { panel } = mountRegister();
    fillRegister(panel);

    type(input(panel, field), value);

    expect(submitOf(panel).disabled).toBe(true);
  });

  it('enables Create Account once every field is valid', () => {
    const { panel } = mountRegister();

    fillRegister(panel);

    expect(submitOf(panel).disabled).toBe(false);
  });

  it('re-checks the confirmation when the password changes', () => {
    const { panel } = mountRegister();
    fillRegister(panel);

    type(input(panel, 'register-password'), 'N3w-Password');

    expect(errorText(panel, 'register-confirm-password')).not.toBe('');
    expect(submitOf(panel).disabled).toBe(true);
  });
});

describe('reset and busy state', () => {
  it('reset clears values and errors and disables submit again', () => {
    const { panel, reset } = mountLogin();
    fillLogin(panel, 'jane@', 'abcdef');

    reset();

    expect(input(panel, 'login-email').value).toBe('');
    expect(input(panel, 'login-password').value).toBe('');
    expect(errorText(panel, 'login-email')).toBe('');
    expect(input(panel, 'login-email').hasAttribute('aria-invalid')).toBe(false);
    expect(submitOf(panel).disabled).toBe(true);
  });

  it('setBusy locks every field and control of the panel', () => {
    const { panel, setBusy } = mountLogin();
    fillLogin(panel);

    setBusy(true);

    const controls = [
      ...panel.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button'),
    ];

    // email, password, visibility toggle, Forgot Password, Login, Google, switch to Register
    expect(controls.map(({ disabled }) => disabled)).toStrictEqual(
      Array.from({ length: 7 }, () => true),
    );
  });

  it('setBusy(false) unlocks the controls and re-enables a valid submit', () => {
    const { panel, setBusy } = mountLogin();
    fillLogin(panel);
    setBusy(true);

    setBusy(false);

    expect(input(panel, 'login-email').disabled).toBe(false);
    expect(googleOf(panel).disabled).toBe(false);
    expect(switchOf(panel).disabled).toBe(false);
    expect(query<HTMLButtonElement>(panel, '.auth-dialog__forgot').disabled).toBe(false);
    expect(submitOf(panel).disabled).toBe(false);
  });
});

describe('email sign-in', () => {
  it('signs in with the entered email and password', async () => {
    vi.mocked(firebase.signInWithEmail).mockResolvedValue(PROFILE);
    const { panel } = mountLogin();
    fillLogin(panel);

    submitOf(panel).click();
    await settle();

    expect(firebase.signInWithEmail).toHaveBeenCalledTimes(1);
    expect(firebase.signInWithEmail).toHaveBeenCalledWith(PROFILE.email, 'abcdef');
  });

  it('shows "Logging in…" and reports pending while the request runs', () => {
    vi.mocked(firebase.signInWithEmail).mockReturnValue(deferred<AuthProfile>().promise);
    const { panel } = mountLogin();
    fillLogin(panel);

    submitOf(panel).click();

    expect(labelOf(submitOf(panel))).toBe('Logging in…');
    expect(submitOf(panel).getAttribute('aria-busy')).toBe('true');
    expect(onPending.mock.calls).toStrictEqual([[true]]);
  });

  it('starts the session, shows a success Snackbar, and closes the dialog', async () => {
    vi.mocked(firebase.signInWithEmail).mockResolvedValue(PROFILE);
    const { panel } = mountLogin();
    fillLogin(panel);

    submitOf(panel).click();
    await settle();

    expect(session.getSession()).toMatchObject({ status: authenticated, email: PROFILE.email });
    expect(shownSnackbars()).toStrictEqual([{ variant: 'success', message: "You're signed in." }]);
    expect(onPending.mock.calls).toStrictEqual([[true], [false]]);
    expect(authDialog.getAuthDialogState().mode).toBeUndefined();
    expect(currentUrl()).toBe(START_URL);
  });

  it('restores the Login label after success', async () => {
    vi.mocked(firebase.signInWithEmail).mockResolvedValue(PROFILE);
    const { panel } = mountLogin();
    fillLogin(panel);

    submitOf(panel).click();
    await settle();

    expect(labelOf(submitOf(panel))).toBe('Login');
    expect(submitOf(panel).hasAttribute('aria-busy')).toBe(false);
  });

  it('shows the readable error, stays open as a guest, and keeps the form filled', async () => {
    vi.mocked(firebase.signInWithEmail).mockRejectedValue(
      new Error('Incorrect email or password.'),
    );
    const { panel } = mountLogin();
    fillLogin(panel);

    submitOf(panel).click();
    await settle();

    expect(shownSnackbars()).toStrictEqual([
      { variant: 'error', message: 'Incorrect email or password.' },
    ]);
    expect(session.getSession().status).toBe(guest);
    expect(authDialog.getAuthDialogState().mode).toBe(login);
    expect(input(panel, 'login-email').value).toBe(PROFILE.email);
    expect(onPending.mock.calls).toStrictEqual([[true], [false]]);
    expect(labelOf(submitOf(panel))).toBe('Login');
  });

  it('falls back to generic copy when the failure is not an Error', async () => {
    vi.mocked(firebase.signInWithEmail).mockRejectedValue('auth/internal-error');
    const { panel } = mountLogin();
    fillLogin(panel);

    submitOf(panel).click();
    await settle();

    expect(shownSnackbars()).toStrictEqual([
      { variant: 'error', message: 'Could not sign you in. Please try again.' },
    ]);
  });
});

describe('registration', () => {
  it('creates the account with the username as display name', async () => {
    vi.mocked(firebase.registerWithEmail).mockResolvedValue({
      email: PROFILE.email,
      displayName: 'Jane1',
    });
    const { panel } = mountRegister();
    fillRegister(panel);

    submitOf(panel).click();
    await settle();

    expect(firebase.registerWithEmail).toHaveBeenCalledTimes(1);
    expect(firebase.registerWithEmail).toHaveBeenCalledWith({
      email: PROFILE.email,
      password: STRONG_PASSWORD,
      displayName: 'Jane1',
    });
  });

  it('shows "Creating account…" while the request runs', () => {
    vi.mocked(firebase.registerWithEmail).mockReturnValue(deferred<AuthProfile>().promise);
    const { panel } = mountRegister();
    fillRegister(panel);

    submitOf(panel).click();

    expect(labelOf(submitOf(panel))).toBe('Creating account…');
  });

  it('starts the session, confirms the new account, and closes the dialog', async () => {
    vi.mocked(firebase.registerWithEmail).mockResolvedValue({
      email: PROFILE.email,
      displayName: 'Jane1',
    });
    const { panel } = mountRegister();
    fillRegister(panel);

    submitOf(panel).click();
    await settle();

    expect(session.getSession()).toMatchObject({ status: authenticated, displayName: 'Jane1' });
    expect(shownSnackbars()).toStrictEqual([{ variant: 'success', message: 'Account created.' }]);
    expect(authDialog.getAuthDialogState().mode).toBeUndefined();
  });

  it('shows the readable error and stays open as a guest', async () => {
    vi.mocked(firebase.registerWithEmail).mockRejectedValue(
      new Error('An account with this email already exists.'),
    );
    const { panel } = mountRegister();
    fillRegister(panel);

    submitOf(panel).click();
    await settle();

    expect(shownSnackbars()).toStrictEqual([
      { variant: 'error', message: 'An account with this email already exists.' },
    ]);
    expect(session.getSession().status).toBe(guest);
    expect(authDialog.getAuthDialogState().mode).toBe(login);
  });
});

describe('Google sign-in', () => {
  it.each([
    { name: 'login', mount: mountLogin },
    { name: 'register', mount: mountRegister },
  ])('signs in with Google from the $name panel and closes', async ({ mount }) => {
    vi.mocked(firebase.signInWithGoogle).mockResolvedValue(PROFILE);
    const { panel } = mount();

    googleOf(panel).click();
    await settle();

    expect(firebase.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(session.getSession()).toMatchObject({ status: authenticated, email: PROFILE.email });
    expect(shownSnackbars()).toStrictEqual([
      { variant: 'success', message: "You're signed in with Google." },
    ]);
    expect(authDialog.getAuthDialogState().mode).toBeUndefined();
  });

  it('starts the provider call synchronously so the popup is not blocked', () => {
    vi.mocked(firebase.signInWithGoogle).mockReturnValue(deferred<AuthProfile>().promise);
    const { panel } = mountLogin();

    googleOf(panel).click();

    expect(firebase.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(labelOf(googleOf(panel))).toBe('Waiting for Google…');
    expect(onPending.mock.calls).toStrictEqual([[true]]);
  });

  it('switches to "Checking sign-in…" when focus returns from the popup', () => {
    vi.mocked(firebase.signInWithGoogle).mockReturnValue(deferred<AuthProfile>().promise);
    const { panel } = mountLogin();
    googleOf(panel).click();

    globalThis.dispatchEvent(new FocusEvent('focus'));

    expect(labelOf(googleOf(panel))).toBe('Checking sign-in…');
  });

  it('ignores window focus once the Google sign-in has finished', async () => {
    vi.mocked(firebase.signInWithGoogle).mockRejectedValue(new Error('Popup blocked.'));
    const { panel } = mountLogin();
    googleOf(panel).click();
    await settle();

    globalThis.dispatchEvent(new FocusEvent('focus'));

    expect(labelOf(googleOf(panel))).toBe('Continue with Google');
    expect(googleOf(panel).classList.contains('button--loading')).toBe(false);
  });

  it('reports a canceled popup as information, not an error', async () => {
    vi.mocked(firebase.signInWithGoogle).mockRejectedValue(
      new firebase.AuthCancelledError('closed'),
    );
    const { panel } = mountLogin();

    googleOf(panel).click();
    await settle();

    expect(shownSnackbars()).toStrictEqual([
      { variant: 'info', message: 'Google sign-in was canceled.' },
    ]);
    expect(session.getSession().status).toBe(guest);
    expect(authDialog.getAuthDialogState().mode).toBe(login);
    expect(onPending.mock.calls).toStrictEqual([[true], [false]]);
  });

  it('shows the readable error when Google sign-in fails', async () => {
    vi.mocked(firebase.signInWithGoogle).mockRejectedValue(new Error('Popup blocked.'));
    const { panel } = mountLogin();

    googleOf(panel).click();
    await settle();

    expect(shownSnackbars()).toStrictEqual([{ variant: 'error', message: 'Popup blocked.' }]);
    expect(labelOf(googleOf(panel))).toBe('Continue with Google');
  });
});
