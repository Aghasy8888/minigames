// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APP_SESSION_STORAGE_KEY } from '../../services/app-session-storage';
import { SESSION_STATUS } from '../../store/session-store';
import { currentUrl } from '../../test-support/history';

vi.mock('../../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { guest } = SESSION_STATUS;

type HeaderModule = typeof import('.');
type FirebaseAuth = typeof import('../../services/firebase-auth');
type SessionStore = typeof import('../../store/session-store');
type NavigationStore = typeof import('../../store/navigation-store');
type SnackbarStore = typeof import('../../store/snackbar-store');
type ScrollLock = typeof import('../../utils/scroll-lock');

const PROFILE = { email: 'jane@example.com', displayName: 'Jane Doe' };
const MENU_CLOSE_MS = 250;
const ACTIVE = 'header__nav-link--active';
const TABLET_QUERY = '(min-width: 769px)';

let headerModule: HeaderModule;
let firebase: FirebaseAuth;
let session: SessionStore;
let navigation: NavigationStore;
let snackbars: SnackbarStore;
let scrollLock: ScrollLock;
let header: HTMLElement;
let viewport: EventTarget & { matches: boolean; media: string };
let requestedQueries: string[];

/** happy-dom's window has a fixed desktop width; the header only needs a query it can flip. */
function stubViewport(isTablet: boolean): void {
  requestedQueries = [];
  viewport = Object.assign(new EventTarget(), { matches: isTablet, media: TABLET_QUERY });
  vi.stubGlobal('matchMedia', (query: string) => {
    requestedQueries.push(query);
    return viewport;
  });
}

function resizeTo({ isTablet }: { isTablet: boolean }): void {
  viewport.matches = isTablet;
  viewport.dispatchEvent(Object.assign(new Event('change'), { matches: isTablet }));
}

async function loadHeader(path = '/'): Promise<void> {
  globalThis.history.replaceState(undefined, '', path);
  vi.resetModules();
  firebase = await import('../../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  session = await import('../../store/session-store');
  navigation = await import('../../store/navigation-store');
  snackbars = await import('../../store/snackbar-store');
  scrollLock = await import('../../utils/scroll-lock');
  headerModule = await import('.');
}

function mount(): void {
  header = headerModule.createHeader();
  document.body.append(header);
}

function query<T extends Element>(selector: string): T {
  const element = header.querySelector<T>(selector);
  if (!element) {
    throw new Error(`missing element: ${selector}`);
  }
  return element;
}

function button(selector: string): HTMLButtonElement {
  return query<HTMLButtonElement>(selector);
}

function menuButton(): HTMLButtonElement {
  return button('.header__menu');
}

function mobileNav(): HTMLElement {
  return query<HTMLElement>('#mobile-nav');
}

function mobileAction(label: string): HTMLButtonElement {
  return button(`.mobile-nav__actions > button[aria-label="${label}"]`);
}

function navLinks(): HTMLAnchorElement[] {
  return [...header.querySelectorAll<HTMLAnchorElement>('.header__nav-link')];
}

function activeLinks(): (string | null)[] {
  return navLinks()
    .filter((link) => link.classList.contains(ACTIVE))
    .map(({ textContent }) => textContent);
}

function isMenuOpen(): boolean {
  return header.classList.contains('header--menu-open');
}

function pressKey(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function shownSnackbars(): { variant: string; message: string }[] {
  return snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message }));
}

beforeEach(async () => {
  vi.useFakeTimers();
  localStorage.clear();
  document.body.style.overflow = '';
  stubViewport(false);
  await loadHeader();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  document.body.style.overflow = '';
  localStorage.clear();
});

describe('layout', () => {
  beforeEach(mount);

  it('links the logo Home', () => {
    const logo = query<HTMLAnchorElement>('.header__logo');

    expect(logo.getAttribute('href')).toBe('/');
    expect(logo.textContent).toBe('MiniGames');
    expect(logo.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('lists the main navigation with real pages linked and placeholders sent Home', () => {
    expect(query('nav').getAttribute('aria-label')).toBe('Main');
    expect(navLinks().map((link) => [link.textContent, link.getAttribute('href')])).toStrictEqual([
      ['Home', '/'],
      ['Library', '/library'],
      ['Tournaments', '/'],
      ['Community', '/'],
    ]);
  });

  it('has a collapsed menu button that controls the mobile navigation', () => {
    expect(menuButton().type).toBe('button');
    expect(menuButton().getAttribute('aria-label')).toBe('Open menu');
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(menuButton().getAttribute('aria-controls')).toBe(mobileNav().id);
    expect(mobileNav().getAttribute('aria-hidden')).toBe('true');
  });

  it('watches the tablet breakpoint used by the stylesheet', () => {
    expect(requestedQueries).toStrictEqual([TABLET_QUERY]);
  });
});

describe('active link', () => {
  it('highlights the page from the URL', async () => {
    await loadHeader('/library?category=puzzle');
    mount();

    expect(activeLinks()).toStrictEqual(['Library']);
    expect(navLinks()[1]?.getAttribute('aria-current')).toBe('page');
  });

  it('follows navigation, including Back to an earlier page', () => {
    mount();

    navigation.navigate('library');
    expect(activeLinks()).toStrictEqual(['Library']);

    globalThis.history.replaceState(undefined, '', '/');
    navigation.syncPageFromLocation();
    expect(activeLinks()).toStrictEqual(['Home']);
    expect(navLinks()[1]?.hasAttribute('aria-current')).toBe(false);
  });

  it('highlights nothing on the 404 view', async () => {
    await loadHeader('/unknown');
    mount();

    expect(activeLinks()).toStrictEqual([]);
    expect(header.querySelector('[aria-current]')).toBeNull();
  });
});

describe('Auth entry', () => {
  beforeEach(mount);

  it.each([
    { label: 'Log In', selector: '.header__log-in', mode: 'login' },
    { label: 'Sign Up', selector: '.header__sign-up', mode: 'register' },
  ])('$label opens the $mode dialog as a new history entry', ({ selector, mode }) => {
    const { length } = globalThis.history;

    button(selector).click();

    expect(currentUrl()).toBe(`/?auth=${mode}`);
    expect(globalThis.history.length).toBe(length + 1);
  });
});

describe('session', () => {
  beforeEach(mount);

  it('shows the guest form without a profile', () => {
    expect(header.classList.contains('header--authenticated')).toBe(false);
    expect(query('.header__profile').children).toHaveLength(0);
  });

  it('switches to the compact profile once a session starts', () => {
    session.startSession(PROFILE);
    const profile = query('.header__profile > .user-profile');

    expect(header.classList.contains('header--authenticated')).toBe(true);
    expect(profile.className).toBe('user-profile user-profile--compact');
    expect(profile.querySelector('.user-profile__name')?.textContent).toBe('Jane Doe');
    expect(profile.querySelector('.user-profile__initials')?.textContent).toBe('JD');
  });

  it('logs out in place: guest form, record cleared, Firebase signed out, one success Snackbar', async () => {
    session.startSession(PROFILE);
    const { length } = globalThis.history;

    button('.header__log-out').click();
    expect(header.classList.contains('header--authenticated')).toBe(false);
    await vi.advanceTimersByTimeAsync(0);

    expect(session.getSession().status).toBe(guest);
    expect(query('.header__profile').children).toHaveLength(0);
    expect(localStorage.getItem(APP_SESSION_STORAGE_KEY)).toBeNull();
    expect(firebase.signOutFirebase).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([{ variant: 'success', message: "You've logged out." }]);
    expect(currentUrl()).toBe('/');
    expect(globalThis.history.length).toBe(length);
  });

  it('switches back to the guest form when the session expires', async () => {
    session.startSession(PROFILE);

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(header.classList.contains('header--authenticated')).toBe(false);
    expect(shownSnackbars()).toStrictEqual([
      { variant: 'info', message: 'Your session has ended. Please log in again.' },
    ]);
  });
});

describe('mobile menu', () => {
  beforeEach(mount);

  it('opens from the menu button and locks page scroll', () => {
    menuButton().click();

    expect(isMenuOpen()).toBe(true);
    expect(menuButton().classList.contains('header__menu--open')).toBe(true);
    expect(menuButton().getAttribute('aria-expanded')).toBe('true');
    expect(menuButton().getAttribute('aria-label')).toBe('Close menu');
    expect(mobileNav().classList.contains('mobile-nav--open')).toBe(true);
    expect(mobileNav().getAttribute('aria-hidden')).toBe('false');
    expect(mobileNav().inert).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes from the menu button, and hides the panel only after the slide-out', () => {
    menuButton().click();

    menuButton().click();

    expect(isMenuOpen()).toBe(false);
    expect(menuButton().classList.contains('header__menu--open')).toBe(false);
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(menuButton().getAttribute('aria-label')).toBe('Open menu');
    expect(mobileNav().classList.contains('mobile-nav--open')).toBe(false);
    expect(document.body.style.overflow).toBe('');

    vi.advanceTimersByTime(MENU_CLOSE_MS - 1);
    expect(mobileNav().getAttribute('aria-hidden')).toBe('false');
    expect(mobileNav().inert).toBe(false);

    vi.advanceTimersByTime(1);
    expect(mobileNav().getAttribute('aria-hidden')).toBe('true');
    expect(mobileNav().inert).toBe(true);
  });

  it('stays visible when reopened during the slide-out', () => {
    menuButton().click();
    menuButton().click();
    vi.advanceTimersByTime(MENU_CLOSE_MS / 2);

    menuButton().click();
    vi.advanceTimersByTime(MENU_CLOSE_MS);

    expect(isMenuOpen()).toBe(true);
    expect(mobileNav().getAttribute('aria-hidden')).toBe('false');
    expect(mobileNav().inert).toBe(false);
  });

  it('closes on Escape but not on other keys', () => {
    menuButton().click();

    pressKey('Enter');
    expect(isMenuOpen()).toBe(true);

    pressKey('Escape');
    expect(isMenuOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('stops listening for Escape once closed', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    menuButton().click();

    menuButton().click();

    expect(removeSpy.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1);
  });

  it('closes when a menu link opens another page', () => {
    menuButton().click();

    mobileNav().querySelector<HTMLAnchorElement>('a[href="/library"]')?.click();

    expect(currentUrl()).toBe('/library');
    expect(isMenuOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it.each([
    { label: 'Log In', mode: 'login' },
    { label: 'Sign Up', mode: 'register' },
  ])('closes before $label opens the $mode dialog', ({ label, mode }) => {
    menuButton().click();

    mobileAction(label).click();

    expect(isMenuOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(currentUrl()).toBe(`/?auth=${mode}`);
  });

  it('closes and logs out from the menu', async () => {
    session.startSession(PROFILE);
    menuButton().click();

    mobileAction('Log Out').click();
    await vi.advanceTimersByTimeAsync(0);

    expect(isMenuOpen()).toBe(false);
    expect(session.getSession().status).toBe(guest);
    expect(shownSnackbars()).toStrictEqual([{ variant: 'success', message: "You've logged out." }]);
  });

  it('closes when the window widens to the tablet layout', () => {
    menuButton().click();

    resizeTo({ isTablet: true });

    expect(isMenuOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('stays open when the window changes but stays below the tablet layout', () => {
    menuButton().click();

    resizeTo({ isTablet: false });

    expect(isMenuOpen()).toBe(true);
  });

  it('releases only its own scroll lock, even if asked to close twice', () => {
    scrollLock.lockScroll();
    menuButton().click();
    menuButton().click();

    resizeTo({ isTablet: true });

    expect(document.body.style.overflow).toBe('hidden');
  });
});
