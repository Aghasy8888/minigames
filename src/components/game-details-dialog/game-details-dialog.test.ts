// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TEST_USER_EMAIL,
  makeComment,
  makeCommentsMeta,
  makeFavoriteResult,
  makeGameDetails,
} from '../../test-support/api-factories';
import { deferred } from '../../test-support/deferred';
import { jsonResponse, stubFetch, type FetchMock } from '../../test-support/fetch-stub';
import { currentUrl, goBack } from '../../test-support/history';
import { AUTH_DIALOG_MODE } from '../../utils/auth-dialog-query';

vi.mock('../../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { login } = AUTH_DIALOG_MODE;

type DialogModule = typeof import('.');
type DialogStore = typeof import('../../store/game-details-dialog-store');
type AuthDialogStore = typeof import('../../store/auth-dialog-store');
type SessionStore = typeof import('../../store/session-store');
type SnackbarStore = typeof import('../../store/snackbar-store');
type TopLayer = typeof import('../../hooks/use-top-layer');
type Route = (url: URL, init?: RequestInit) => Promise<Response>;

const NOW = new Date('2026-10-11T12:00:00.000Z');
const START_URL = '/library?category=puzzle';
const SLUG = 'cat-mail-co';
const OTHER_SLUG = 'cozy-solitaire';
const PROFILE = { email: TEST_USER_EMAIL, displayName: 'Student' };
const CLOSE_MS = 250;
const GAME_TITLE_ID = 'game-details-dialog-title';

let dialogModule: DialogModule;
let dialogStore: DialogStore;
let authDialog: AuthDialogStore;
let session: SessionStore;
let snackbars: SnackbarStore;
let topLayer: TopLayer;
let dialog: HTMLDialogElement;
let routes: { details: Route; comments: Route; favorite: Route };
let fetchMock: FetchMock;
let frames: FrameRequestCallback[];

function respondJson(body: unknown, status = 200): Route {
  return () => Promise.resolve(jsonResponse(body, status));
}

/** Routes stubbed `fetch` calls by endpoint, so each test sets only the answers it cares about. */
function stubApi(): void {
  fetchMock = stubFetch((input, init) => {
    const url = new URL(String(input));
    const { pathname } = url;

    if (pathname.endsWith('/comments')) {
      return routes.comments(url, init);
    }
    if (pathname.endsWith('/favorite')) {
      return routes.favorite(url, init);
    }
    return routes.details(url, init);
  });
}

function requestsTo(suffix: string): URL[] {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input)))
    .filter(({ pathname }) => pathname.endsWith(suffix));
}

function detailsRequests(): URL[] {
  return requestsTo(SLUG);
}

function query<T extends Element>(selector: string): T {
  const element = dialog.querySelector<T>(selector);
  if (!element) {
    throw new Error(`missing element: ${selector}`);
  }
  return element;
}

function body(): HTMLElement {
  return query<HTMLElement>('.game-details-dialog__body');
}

function content(): HTMLElement {
  return query<HTMLElement>('.game-details-dialog__content');
}

function favoriteButton(): HTMLButtonElement {
  return query<HTMLButtonElement>('.game-details-dialog__favorite');
}

function labelOf(button: HTMLButtonElement): string | null | undefined {
  return button.querySelector('.button__label')?.textContent;
}

function shownSnackbars(): { variant: string; message: string }[] {
  return snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message }));
}

function cancelDialog(): Event {
  const event = new Event('cancel', { cancelable: true });
  dialog.dispatchEvent(event);
  return event;
}

/** Lets stubbed requests, their JSON bodies, and the follow-up renders settle. */
async function settle(): Promise<void> {
  for (let step = 0; step < 3; step += 1) {
    await vi.advanceTimersByTimeAsync(0);
  }
}

async function openLoaded(slug = SLUG): Promise<void> {
  dialogStore.openGameDetailsDialog(slug);
  await settle();
}

/**
 * happy-dom schedules animation frames outside Vitest's fake timers, so the tests queue them
 * and run them explicitly.
 */
function stubAnimationFrames(): void {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
}

function runFrames(count: number): void {
  for (let frame = 0; frame < count; frame += 1) {
    for (const callback of frames.splice(0)) {
      callback(0);
    }
  }
}

function syncOnPopState(): void {
  dialogStore.syncGameDetailsFromLocation();
}

async function loadDialog(): Promise<void> {
  document.body.replaceChildren();
  vi.resetModules();
  const firebase = await import('../../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  dialogStore = await import('../../store/game-details-dialog-store');
  authDialog = await import('../../store/auth-dialog-store');
  session = await import('../../store/session-store');
  snackbars = await import('../../store/snackbar-store');
  topLayer = await import('../../hooks/use-top-layer');
  dialogModule = await import('.');
  dialog = dialogModule.createGameDetailsDialog();
  document.body.append(dialog);
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubEnv('VITE_API_MOCK', '');
  localStorage.clear();
  document.body.style.overflow = '';
  globalThis.history.replaceState(undefined, '', START_URL);
  routes = {
    details: respondJson({ data: makeGameDetails() }),
    comments: respondJson({ data: [makeComment()], meta: makeCommentsMeta() }),
    favorite: respondJson({ data: makeFavoriteResult() }),
  };
  stubApi();
  stubAnimationFrames();
  await loadDialog();
});

afterEach(() => {
  globalThis.removeEventListener('popstate', syncOnPopState);
  document.body.replaceChildren();
  document.body.style.overflow = '';
  vi.useRealTimers();
  localStorage.clear();
});

describe('closed', () => {
  it('starts closed with a generic accessible name and loads nothing', () => {
    expect(dialog.open).toBe(false);
    expect(dialog.getAttribute('aria-label')).toBe('Game details');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('opening', () => {
  it('opens with a skeleton that mirrors the loaded layout and locks page scroll', () => {
    routes.details = () => deferred<Response>().promise;

    dialogStore.openGameDetailsDialog(SLUG);

    expect(dialog.open).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    expect(body().getAttribute('aria-busy')).toBe('true');
    expect(query('.game-details-dialog__hero > .skeleton')).not.toBeNull();
    expect(
      [...body().children].map((child) => [
        child.className,
        child.getAttribute('aria-hidden') ?? undefined,
        child.querySelectorAll('.skeleton').length,
      ]),
    ).toStrictEqual([
      ['game-details-dialog__header', 'true', 2],
      ['game-details-dialog__skeleton-lines', 'true', 3],
      ['game-details-dialog__widgets', 'true', 4],
      ['game-details-dialog__actions', 'true', 2],
      ['game-details-dialog__skeleton-lines', 'true', 3],
      ['comments', undefined, 18],
    ]);
  });

  it('keeps the generic accessible name until the game has a title', () => {
    routes.details = () => deferred<Response>().promise;

    dialogStore.openGameDetailsDialog(SLUG);

    expect(dialog.getAttribute('aria-label')).toBe('Game details');
    expect(dialog.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('fades in only after two animation frames', () => {
    routes.details = () => deferred<Response>().promise;
    dialogStore.openGameDetailsDialog(SLUG);

    runFrames(1);
    expect(dialog.classList.contains('game-details-dialog--open')).toBe(false);

    runFrames(1);
    expect(dialog.classList.contains('game-details-dialog--open')).toBe(true);
  });

  it('opens from a deep link and requests that game', async () => {
    globalThis.history.replaceState(undefined, '', `${START_URL}&game=${SLUG}`);

    dialogStore.syncGameDetailsFromLocation();
    await settle();

    expect(dialog.open).toBe(true);
    expect(detailsRequests()).toHaveLength(1);
    expect(query(`#${GAME_TITLE_ID}`).textContent).toBe('Cat Mail Co.');
  });

  it('moves the Snackbar host into the dialog while it is open', async () => {
    const host = document.createElement('div');
    topLayer.useTopLayer(host);
    await Promise.resolve();

    await openLoaded();
    expect(host.parentElement).toBe(dialog);

    dialogStore.closeGameDetailsDialog();
    vi.advanceTimersByTime(CLOSE_MS);
    expect(host.parentElement).toBe(document.body);
  });
});

describe('loaded game', () => {
  it('is named by the game title', async () => {
    await openLoaded();

    expect(dialog.getAttribute('aria-labelledby')).toBe(GAME_TITLE_ID);
    expect(dialog.hasAttribute('aria-label')).toBe(false);
    expect(query('h2').id).toBe(GAME_TITLE_ID);
    expect(body().getAttribute('aria-busy')).toBe('false');
  });

  it('goes back to the generic name while the next game loads', async () => {
    await openLoaded();
    routes.details = () => deferred<Response>().promise;

    dialogStore.openGameDetailsDialog(OTHER_SLUG);

    expect(dialog.getAttribute('aria-label')).toBe('Game details');
    expect(dialog.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('always shows the rating with one decimal', async () => {
    routes.details = respondJson({ data: makeGameDetails({ rating: 4 }) });

    await openLoaded();

    expect(query('.game-details-dialog__stat-value').textContent).toBe('4.0');
  });

  it('shows the title, rating, likes, description, and the four specs', async () => {
    await openLoaded();

    expect(query('.game-details-dialog__title').textContent).toBe('Cat Mail Co.');
    expect(
      [...dialog.querySelectorAll('.game-details-dialog__stat-value')].map(
        ({ textContent }) => textContent,
      ),
    ).toStrictEqual(['4.9', '38.2K']);
    expect(query('.game-details-dialog__description').textContent).toBe(
      'Run a cozy cat post office and deliver parcels from the daily boat.',
    );
    expect(
      [...dialog.querySelectorAll('.game-details-dialog__widget')].map((widget) => [
        widget.querySelector('.game-details-dialog__widget-label')?.textContent,
        widget.querySelector('.game-details-dialog__widget-value')?.textContent,
      ]),
    ).toStrictEqual([
      ['Genre', 'Puzzle'],
      ['Players', '1'],
      ['Duration', '15 min'],
      ['Price', 'Free'],
    ]);
  });

  it('offers Play Now, the favorite toggle, top records, and comments', async () => {
    await openLoaded();

    expect(labelOf(query<HTMLButtonElement>('.game-details-dialog__play'))).toBe('Play Now');
    expect(labelOf(favoriteButton())).toBe('Add to Favorites');
    expect(query('.top-records .top-records__name').textContent).toBe('ForestDweller');
    expect(query('.comments__title').textContent).toBe('Comments (1)');
    expect(query('.comments__text').textContent).toBe('Lovely game!');
  });

  it('renders API text as text, never as markup', async () => {
    routes.details = respondJson({
      data: makeGameDetails({ name: '<img src=x>', fullDescription: '<b>bold</b>' }),
    });

    await openLoaded();

    expect(body().querySelector('.game-details-dialog__header img[src="x"], b')).toBeNull();
    expect(query('.game-details-dialog__title').textContent).toBe('<img src=x>');
  });

  it('requests details and the latest three comments without userEmail for a guest', async () => {
    await openLoaded();

    const [details] = detailsRequests();
    const [commentsRequest] = requestsTo('/comments');
    expect(details?.searchParams.has('userEmail')).toBe(false);
    expect(commentsRequest?.searchParams.get('limit')).toBe('3');
    expect(commentsRequest?.searchParams.get('sort')).toBe('newest');
    expect(commentsRequest?.searchParams.has('userEmail')).toBe(false);
  });

  it('requests per-user data and starts the toggle from it while signed in', async () => {
    session.startSession(PROFILE);
    routes.details = respondJson({ data: makeGameDetails({ isLikedByCurrentUser: true }) });

    await openLoaded();

    expect(detailsRequests()[0]?.searchParams.get('userEmail')).toBe(TEST_USER_EMAIL);
    expect(requestsTo('/comments')[0]?.searchParams.get('userEmail')).toBe(TEST_USER_EMAIL);
    expect(labelOf(favoriteButton())).toBe('Remove from Favorites');
  });
});

describe('load failure', () => {
  beforeEach(() => {
    routes.details = respondJson({ error: 'Internal error' }, 500);
  });

  it('replaces the body with an error banner and a placeholder hero', async () => {
    await openLoaded();
    const banner = query('.game-details-dialog__body > .error-banner');

    expect(banner.querySelector('.error-banner__title')?.textContent).toBe(
      'Could not load game details',
    );
    expect(banner.querySelector('.error-banner__message')?.textContent).toBe(
      'Game details are unavailable right now. Please try again.',
    );
    expect(banner.querySelector('.error-banner__retry')?.textContent).toBe('Retry');
    expect(
      dialog.querySelector('.game-details-dialog__hero > .game-details-dialog__hero-placeholder'),
    ).not.toBeNull();
    expect(dialog.getAttribute('aria-label')).toBe('Game details');
    expect(body().getAttribute('aria-busy')).toBe('false');
  });

  it('retries the same game and shows it once it loads', async () => {
    await openLoaded();
    routes.details = respondJson({ data: makeGameDetails() });

    query<HTMLButtonElement>('.error-banner__retry').click();
    expect(body().getAttribute('aria-busy')).toBe('true');
    await settle();

    expect(detailsRequests()).toHaveLength(2);
    expect(query('.game-details-dialog__title').textContent).toBe('Cat Mail Co.');
  });

  it('closes without a history entry when the game does not exist', async () => {
    routes.details = respondJson({ error: 'Game not found: cat-mail-co' }, 404);
    const { length } = globalThis.history;
    dialogStore.openGameDetailsDialog(SLUG);

    await settle();
    vi.advanceTimersByTime(CLOSE_MS);

    expect(dialog.open).toBe(false);
    expect(currentUrl()).toBe(START_URL);
    expect(globalThis.history.length).toBe(length + 1);
    expect(shownSnackbars()).toStrictEqual([
      { variant: 'error', message: 'This game could not be found.' },
    ]);
  });
});

describe('favorite toggle', () => {
  it('sends nothing for a guest and opens Auth on top, keeping the game underneath', async () => {
    await openLoaded();
    const callsBefore = fetchMock.mock.calls.length;

    favoriteButton().click();

    expect(requestsTo('/favorite')).toHaveLength(0);
    expect(fetchMock.mock.calls).toHaveLength(callsBefore);
    expect(currentUrl()).toBe(`${START_URL}&game=${SLUG}&auth=login`);
    expect(dialog.open).toBe(true);
    expect(dialog.classList.contains('game-details-dialog--covered')).toBe(true);
    expect(shownSnackbars()).toStrictEqual([
      { variant: 'warning', message: 'Log in to add games to your favorites.' },
    ]);
  });

  it('favorites the game for a signed-in user and shows the confirmed state', async () => {
    session.startSession(PROFILE);
    routes.details = respondJson({ data: makeGameDetails({ likesCount: 999 }) });
    const response = deferred<Response>();
    routes.favorite = () => response.promise;
    await openLoaded();

    favoriteButton().click();
    expect(labelOf(favoriteButton())).toBe('Adding to Favorites…');

    response.resolve(jsonResponse({ data: makeFavoriteResult({ likesCount: 1000 }) }));
    await settle();

    const [request] = requestsTo('/favorite');
    expect(request?.pathname).toBe(`/api/games/${SLUG}/favorite`);
    expect(labelOf(favoriteButton())).toBe('Remove from Favorites');
    expect(
      [...dialog.querySelectorAll('.game-details-dialog__stat-value')].map(
        ({ textContent }) => textContent,
      ),
    ).toStrictEqual(['4.9', '1K']);
  });

  it('abandons a pending favorite request when another game replaces this one', async () => {
    session.startSession(PROFILE);
    routes.favorite = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    await openLoaded();
    favoriteButton().click();
    const [, init] = fetchMock.mock.calls.at(-1) ?? [];

    await openLoaded(OTHER_SLUG);

    expect(init?.signal?.aborted).toBe(true);
    expect(shownSnackbars()).toStrictEqual([]);
    expect(labelOf(favoriteButton())).toBe('Add to Favorites');
  });
});

describe('closing', () => {
  beforeEach(async () => {
    await openLoaded();
    runFrames(2);
  });

  it('closes from its close button as a new history entry, after the fade-out', () => {
    const { length } = globalThis.history;
    expect(dialog.classList.contains('game-details-dialog--open')).toBe(true);

    query<HTMLButtonElement>('.game-details-dialog__close').click();

    expect(currentUrl()).toBe(START_URL);
    expect(globalThis.history.length).toBe(length + 1);
    expect(dialog.classList.contains('game-details-dialog--closing')).toBe(true);
    expect(dialog.classList.contains('game-details-dialog--open')).toBe(false);

    vi.advanceTimersByTime(CLOSE_MS - 1);
    expect(dialog.open).toBe(true);

    vi.advanceTimersByTime(1);
    expect(dialog.open).toBe(false);
    expect(dialog.classList.contains('game-details-dialog--closing')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on Escape', () => {
    expect(cancelDialog().defaultPrevented).toBe(true);
    vi.advanceTimersByTime(CLOSE_MS);

    expect(dialog.open).toBe(false);
    expect(currentUrl()).toBe(START_URL);
  });

  it('closes on a press that starts and ends on the backdrop', () => {
    dialog.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(CLOSE_MS);

    expect(dialog.open).toBe(false);
  });

  it('closes when Back leaves the game URL', async () => {
    globalThis.addEventListener('popstate', syncOnPopState);

    await goBack();
    vi.advanceTimersByTime(CLOSE_MS);

    expect(currentUrl()).toBe(START_URL);
    expect(dialog.open).toBe(false);
  });

  it('drops the game from the URL when the browser closes the dialog directly', () => {
    dialog.close();

    expect(dialogStore.getGameDetailsDialogState().slug).toBeUndefined();
    expect(currentUrl()).toBe(START_URL);
    expect(dialog.classList.contains('game-details-dialog--open')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('stays open when another game opens during the fade-out', async () => {
    dialogStore.closeGameDetailsDialog();
    vi.advanceTimersByTime(CLOSE_MS / 2);

    await openLoaded(OTHER_SLUG);
    vi.advanceTimersByTime(CLOSE_MS);

    expect(dialog.open).toBe(true);
    expect(dialog.classList.contains('game-details-dialog--closing')).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('unlocks page scroll only once after reopening', async () => {
    dialogStore.closeGameDetailsDialog();
    vi.advanceTimersByTime(CLOSE_MS);
    await openLoaded(OTHER_SLUG);

    dialogStore.closeGameDetailsDialog();
    vi.advanceTimersByTime(CLOSE_MS);

    expect(document.body.style.overflow).toBe('');
  });
});

describe('scroll position', () => {
  it('starts a newly opened game at the top', async () => {
    await openLoaded();
    content().scrollTop = 120;

    await openLoaded(OTHER_SLUG);

    expect(content().scrollTop).toBe(0);
  });

  it('keeps the position when the same game refreshes after sign-in', async () => {
    await openLoaded();
    content().scrollTop = 120;

    session.startSession(PROFILE);
    await settle();

    expect(detailsRequests()).toHaveLength(2);
    expect(content().scrollTop).toBe(120);
  });

  it('starts at the top when the same game reopens during the fade-out', async () => {
    await openLoaded();
    content().scrollTop = 120;
    dialogStore.closeGameDetailsDialog();
    vi.advanceTimersByTime(CLOSE_MS / 2);

    await openLoaded();

    expect(dialog.open).toBe(true);
    expect(content().scrollTop).toBe(0);
  });

  it('resets the position once the dialog has closed', async () => {
    await openLoaded();
    content().scrollTop = 120;

    dialogStore.closeGameDetailsDialog();
    vi.advanceTimersByTime(CLOSE_MS);

    expect(content().scrollTop).toBe(0);
  });
});

describe('Auth over Game Details', () => {
  it('is hidden, not closed, while Auth is open, and reappears when Auth closes', async () => {
    await openLoaded();
    const requestCount = fetchMock.mock.calls.length;

    authDialog.openAuthDialog(login);
    expect(dialog.classList.contains('game-details-dialog--covered')).toBe(true);
    expect(dialog.open).toBe(true);

    authDialog.closeAuthDialog();
    expect(dialog.classList.contains('game-details-dialog--covered')).toBe(false);
    expect(query('.game-details-dialog__title').textContent).toBe('Cat Mail Co.');
    expect(fetchMock.mock.calls).toHaveLength(requestCount);
  });

  it('starts hidden when created under an open Auth dialog', async () => {
    globalThis.history.replaceState(undefined, '', `${START_URL}&auth=login`);
    vi.resetModules();
    authDialog = await import('../../store/auth-dialog-store');
    authDialog.syncAuthDialogFromLocation();
    dialogModule = await import('.');

    const covered = dialogModule.createGameDetailsDialog();

    expect(covered.classList.contains('game-details-dialog--covered')).toBe(true);
  });
});
