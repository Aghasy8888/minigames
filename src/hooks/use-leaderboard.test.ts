import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeLeaderboardEntry } from '../test-support/api-factories';
import {
  jsonResponse,
  sentRequest,
  stubFetchJson,
  stubPendingFetch,
} from '../test-support/fetch-stub';
import type { LeaderboardController, LeaderboardState } from './use-leaderboard';
import { LOAD_STATUS } from './use-load-state';

const { success, empty, error: errorStatus } = LOAD_STATUS;

const API_BASE_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com';
const FALLBACK_MESSAGE = 'Top players are unavailable right now. Please try again.';

let hook: typeof import('./use-leaderboard');
let snackbars: typeof import('../store/snackbar-store');
const controllers: LeaderboardController[] = [];

function createLeaderboard(): LeaderboardController {
  const controller = hook.useLeaderboard();
  controllers.push(controller);
  return controller;
}

async function waitForStatus(
  controller: LeaderboardController,
  status: LeaderboardState['status'],
): Promise<void> {
  await vi.waitFor(() => expect(controller.getState().status).toBe(status));
}

beforeEach(async () => {
  vi.stubEnv('VITE_API_MOCK', '');
  vi.resetModules();
  snackbars = await import('../store/snackbar-store');
  hook = await import('./use-leaderboard');
});

afterEach(() => {
  for (const controller of controllers.splice(0)) {
    controller.destroy();
  }
});

describe('useLeaderboard', () => {
  it('requests the leaderboard and exposes the players', async () => {
    const data = [
      makeLeaderboardEntry(),
      makeLeaderboardEntry({ rank: 2, playerName: 'RiverFox' }),
    ];
    const fetchMock = stubFetchJson({ data, meta: { totalItems: 2, description: 'Top players' } });

    const leaderboard = createLeaderboard();
    await waitForStatus(leaderboard, success);

    const { url, method } = sentRequest(fetchMock);
    expect(method).toBe('GET');
    expect(url.href).toBe(`${API_BASE_URL}/api/leaderboard`);
    expect(leaderboard.getState()).toStrictEqual({ status: success, data, meta: undefined });
  });

  it('aborts the pending request on destroy', () => {
    const { fetchMock } = stubPendingFetch();

    createLeaderboard().destroy();

    expect(sentRequest(fetchMock).signal?.aborted).toBe(true);
  });

  it('shows the empty state when there are no players', async () => {
    stubFetchJson({ data: [] });

    await waitForStatus(createLeaderboard(), empty);
  });

  it.each([
    { name: 'a 500', status: 500, error: 'Internal error', message: FALLBACK_MESSAGE },
    {
      name: 'a 429',
      status: 429,
      error: 'Too many requests, please try again later.',
      message: 'Too many requests, please try again later.',
    },
  ])('shows a readable error for $name', async ({ status, error, message }) => {
    stubFetchJson({ error }, status);

    const leaderboard = createLeaderboard();
    await waitForStatus(leaderboard, errorStatus);

    expect(leaderboard.getState()).toMatchObject({ status: errorStatus, message });
  });

  it('confirms a successful Retry with a Snackbar', async () => {
    const fetchMock = stubFetchJson({ error: 'Internal error' }, 500);
    const leaderboard = createLeaderboard();
    await waitForStatus(leaderboard, errorStatus);
    const state = leaderboard.getState();

    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ data: [makeLeaderboardEntry()] })),
    );
    if (state.status === errorStatus) {
      state.retry();
    }
    await waitForStatus(leaderboard, success);

    expect(
      snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message })),
    ).toStrictEqual([{ variant: 'success', message: 'Top players loaded' }]);
  });
});
