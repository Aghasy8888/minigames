// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { currentUrl } from '../test-support/history';
import { APP_PAGE } from '../utils/app-page';
import type { NavLinkTarget } from '../utils/nav-items';

vi.mock('../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { home, library } = APP_PAGE;

let hook: typeof import('./use-nav-link');
let navigation: typeof import('../store/navigation-store');
let link: HTMLAnchorElement;
let addListenerSpy: MockInstance<typeof document.addEventListener>;
let clickResults: boolean[];

/** Records whether the link cancelled the click, then cancels it so happy-dom never follows it. */
function recordClick(event: Event): void {
  clickResults.push(event.defaultPrevented);
  event.preventDefault();
}

function click(init: MouseEventInit = {}): boolean | undefined {
  link.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }),
  );
  return clickResults.at(-1);
}

async function loadAt(url: string): Promise<void> {
  globalThis.history.replaceState(undefined, '', url);
  vi.resetModules();
  const firebase = await import('../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReset();
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  navigation = await import('../store/navigation-store');
  hook = await import('./use-nav-link');
}

function mountLink(item: NavLinkTarget, onNavigate?: () => void): void {
  link = document.createElement('a');
  document.body.append(link);
  hook.useNavLink(link, item, onNavigate);
}

beforeEach(() => {
  localStorage.clear();
  clickResults = [];
  addListenerSpy = vi.spyOn(document, 'addEventListener');
  document.addEventListener('click', recordClick);
  vi.spyOn(globalThis, 'scrollTo');
});

afterEach(() => {
  document.removeEventListener('click', recordClick);
  for (const [type, listener] of addListenerSpy.mock.calls) {
    document.removeEventListener(type, listener);
  }
  document.body.replaceChildren();
});

describe('useNavLink', () => {
  it.each([
    { name: 'dev', base: '/' },
    { name: 'production', base: '/minigames/' },
  ])('points a page link at its URL under the $name base', async ({ base }) => {
    vi.stubEnv('BASE_URL', base);
    await loadAt(base);

    mountLink({ page: library });

    expect(link.getAttribute('href')).toBe(`${base}library`);
    expect(link.dataset.navPage).toBe(library);
  });

  it('points a placeholder link at Home without marking it as a page', async () => {
    await loadAt('/library');

    mountLink({});

    expect(link.getAttribute('href')).toBe('/');
    expect(link.dataset.navPage).toBeUndefined();
  });

  it('navigates in place on a plain left click and reports it', async () => {
    await loadAt('/');
    const onNavigate = vi.fn();
    mountLink({ page: library }, onNavigate);
    const { length } = globalThis.history;

    const prevented = click();

    expect(prevented).toBe(true);
    expect(currentUrl()).toBe('/library');
    expect(globalThis.history.length).toBe(length + 1);
    expect(navigation.getCurrentPage()).toBe(library);
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('sends a placeholder click Home', async () => {
    await loadAt('/library');
    mountLink({});

    click();

    expect(navigation.getCurrentPage()).toBe(home);
    expect(currentUrl()).toBe('/');
  });

  it('navigates without a callback', async () => {
    await loadAt('/');
    mountLink({ page: library });

    click();

    expect(navigation.getCurrentPage()).toBe(library);
  });

  it.each([
    { name: 'Ctrl', init: { ctrlKey: true } },
    { name: 'Cmd', init: { metaKey: true } },
    { name: 'Shift', init: { shiftKey: true } },
    { name: 'Alt', init: { altKey: true } },
    { name: 'middle-button', init: { button: 1 } },
  ])('leaves a $name click to the browser', async ({ init }) => {
    await loadAt('/');
    const onNavigate = vi.fn();
    mountLink({ page: library }, onNavigate);

    const prevented = click(init);

    expect(prevented).toBe(false);
    expect(navigation.getCurrentPage()).toBe(home);
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
