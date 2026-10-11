import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeGamesMeta } from '../test-support/api-factories';
import { stubFetchJson } from '../test-support/fetch-stub';

const FAKE_DELAY_MS = 400;

/** The provider picks real or fake once, at import, so each case needs a fresh module. */
async function importProvider(
  mockScenario: string,
): Promise<typeof import('./games-api-provider')> {
  vi.stubEnv('VITE_API_MOCK', mockScenario);
  vi.resetModules();
  return import('./games-api-provider');
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('gamesApi', () => {
  it.each([
    { name: 'no mock scenario', scenario: '' },
    { name: 'an unknown mock scenario', scenario: 'bogus' },
  ])('calls the real API for $name', async ({ scenario }) => {
    const fetchMock = stubFetchJson({ data: [], meta: makeGamesMeta() });
    const { gamesApi } = await importProvider(scenario);

    await gamesApi.fetchGames({ page: 2 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses the fake for a known scenario and never touches the network', async () => {
    const fetchMock = stubFetchJson({ data: [] });
    const { gamesApi } = await importProvider('empty');

    const pending = gamesApi.fetchLeaderboard();
    await vi.advanceTimersByTimeAsync(FAKE_DELAY_MS);

    await expect(pending).resolves.toMatchObject({ data: [], meta: { totalItems: 0 } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['401', '404', '429'])('serves the %s error scenario from the fake', async (scenario) => {
    stubFetchJson({ data: [] });
    const { gamesApi } = await importProvider(scenario);

    const assertion = expect(gamesApi.fetchCategories()).rejects.toMatchObject({
      status: Number(scenario),
    });
    await vi.advanceTimersByTimeAsync(FAKE_DELAY_MS);

    await assertion;
  });
});
