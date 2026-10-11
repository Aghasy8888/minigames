// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { APP_SESSION_STORAGE_KEY } from '../../services/app-session-storage';
import { SESSION_STATUS } from '../../store/session-store';
import { currentUrl } from '../../test-support/history';
import { AUTH_DIALOG_MODE, type AuthDialogMode } from '../../utils/auth-dialog-query';

vi.mock('../../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { login, register } = AUTH_DIALOG_MODE;
const { guest } = SESSION_STATUS;

type MobileNavModule = typeof import('.');
type FirebaseAuth = typeof import('../../services/firebase-auth');
type SessionStore = typeof import('../../store/session-store');
type NavigationStore = typeof import('../../store/navigation-store');
type SnackbarStore = typeof import('../../store/snackbar-store');

const PROFILE = { email: 'jane@example.com', displayName: 'Jane Doe' };
const ACTIVE = 'mobile-nav__link--active';

let mobileNav: MobileNavModule;
let firebase: FirebaseAuth;
let session: SessionStore;
let navigation: NavigationStore;
let snackbars: SnackbarStore;
let panel: HTMLElement;
let onNavigate: Mock<() => void>;
let onAuthRequest: Mock<(mode: AuthDialogMode) => void>;

function mount(options?: Parameters<MobileNavModule['createMobileNav']>[0]): void {
  panel = mobileNav.createMobileNav(options ?? { onNavigate, onAuthRequest });
  document.body.append(panel);
}

function navLinks(): HTMLAnchorElement[] {
  return [...panel.querySelectorAll<HTMLAnchorElement>('.mobile-nav__link')];
}

function navLink(label: string): HTMLAnchorElement {
  const link = navLinks().find(({ textContent }) => textContent === label);
  if (!link) {
    throw new Error(`missing link: ${label}`);
  }
  return link;
}

function actionButtons(): HTMLButtonElement[] {
  return [...panel.querySelectorAll<HTMLButtonElement>('.mobile-nav__actions > button')];
}

function actionLabels(): (string | null)[] {
  return actionButtons().map((button) => button.getAttribute('aria-label'));
}

function actionButton(label: string): HTMLButtonElement {
  const button = actionButtons().find(
    (candidate) => candidate.getAttribute('aria-label') === label,
  );
  if (!button) {
    throw new Error(`missing button: ${label}`);
  }
  return button;
}

function activeLinks(): (string | null)[] {
  return navLinks()
    .filter((link) => link.classList.contains(ACTIVE))
    .map(({ textContent }) => textContent);
}

function plainClick(target: Element): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  target.dispatchEvent(event);
  return event;
}

function shownSnackbars(): { variant: string; message: string }[] {
  return snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message }));
}

beforeEach(async () => {
  vi.useFakeTimers();
  localStorage.clear();
  globalThis.history.replaceState(undefined, '', '/');
  vi.resetModules();
  firebase = await import('../../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  session = await import('../../store/session-store');
  navigation = await import('../../store/navigation-store');
  snackbars = await import('../../store/snackbar-store');
  mobileNav = await import('.');
  onNavigate = vi.fn<() => void>();
  onAuthRequest = vi.fn<(mode: AuthDialogMode) => void>();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  localStorage.clear();
});

describe('panel', () => {
  it('starts as a hidden, inert modal navigation panel', () => {
    mount();

    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.getAttribute('aria-label')).toBe('Mobile navigation');
    expect(panel.getAttribute('aria-hidden')).toBe('true');
    expect(panel.inert).toBe(true);
  });

  it('lists the main navigation with real pages linked and placeholders sent Home', () => {
    mount();

    expect(panel.querySelector('nav')?.getAttribute('aria-label')).toBe('Mobile');
    expect(navLinks().map((link) => [link.textContent, link.getAttribute('href')])).toStrictEqual([
      ['Home', '/'],
      ['Library', '/library'],
      ['Tournaments', '/'],
      ['Community', '/'],
    ]);
    expect(panel.querySelector('.mobile-nav__logo')?.getAttribute('href')).toBe('/');
  });
});

describe('active link', () => {
  it('highlights the current page as the current location', () => {
    mount();

    expect(activeLinks()).toStrictEqual(['Home']);
    expect(navLink('Home').getAttribute('aria-current')).toBe('page');
  });

  it('follows navigation to another page', () => {
    mount();

    navigation.navigate('library');

    expect(activeLinks()).toStrictEqual(['Library']);
    expect(navLink('Library').getAttribute('aria-current')).toBe('page');
    expect(navLink('Home').hasAttribute('aria-current')).toBe(false);
  });
});

describe('navigating', () => {
  it('opens the page in place and tells the menu to close', () => {
    mount();

    const click = plainClick(navLink('Library'));

    expect(click.defaultPrevented).toBe(true);
    expect(currentUrl()).toBe('/library');
    expect(navigation.getCurrentPage()).toBe('library');
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('goes Home from the logo and tells the menu to close', () => {
    globalThis.history.replaceState(undefined, '', '/library');
    navigation.syncPageFromLocation();
    mount();

    plainClick(panel.querySelector('.mobile-nav__logo') ?? panel);

    expect(currentUrl()).toBe('/');
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('still navigates when created without callbacks', () => {
    mount({});

    plainClick(navLink('Library'));

    expect(currentUrl()).toBe('/library');
  });
});

describe('guest actions', () => {
  it('offers Log In and Sign Up', () => {
    mount();

    expect(actionLabels()).toStrictEqual(['Log In', 'Sign Up']);
    expect(panel.querySelector('.user-profile')).toBeNull();
  });

  it.each([
    { label: 'Log In', mode: login },
    { label: 'Sign Up', mode: register },
  ])('asks for the $mode Auth dialog from $label', ({ label, mode }) => {
    mount();

    actionButton(label).click();

    expect(onAuthRequest.mock.calls).toStrictEqual([[mode]]);
  });
});

describe('signed-in actions', () => {
  it('replaces Log In and Sign Up with the profile and Log Out', () => {
    session.startSession(PROFILE);
    mount();
    const profile = panel.querySelector('.mobile-nav__actions > .user-profile');

    expect(actionLabels()).toStrictEqual(['Log Out']);
    expect(profile?.className).toBe('user-profile user-profile--on-dark');
    expect(profile?.querySelector('.user-profile__name')?.textContent).toBe('Jane Doe');
    expect(profile?.firstElementChild?.className).toBe('user-profile__avatar');
  });

  it('follows the session as the user signs in and out', async () => {
    mount();

    session.startSession(PROFILE);
    expect(actionLabels()).toStrictEqual(['Log Out']);

    await session.endSession();
    expect(actionLabels()).toStrictEqual(['Log In', 'Sign Up']);
    expect(panel.querySelector('.user-profile')).toBeNull();
  });

  it('logs out: closes the menu, ends the session, and confirms once', async () => {
    session.startSession(PROFILE);
    mount();

    actionButton('Log Out').click();
    await vi.advanceTimersByTimeAsync(0);

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(session.getSession().status).toBe(guest);
    expect(localStorage.getItem(APP_SESSION_STORAGE_KEY)).toBeNull();
    expect(firebase.signOutFirebase).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([{ variant: 'success', message: "You've logged out." }]);
    expect(actionLabels()).toStrictEqual(['Log In', 'Sign Up']);
  });

  it('stays logged out with only an error when Firebase sign-out fails', async () => {
    vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.reject(new Error('network')));
    session.startSession(PROFILE);
    mount();

    actionButton('Log Out').click();
    await vi.advanceTimersByTimeAsync(0);

    expect(session.getSession().status).toBe(guest);
    expect(shownSnackbars()).toStrictEqual([
      {
        variant: 'error',
        message: 'Signed out of MiniGames, but ending the saved login failed.',
      },
    ]);
  });
});
