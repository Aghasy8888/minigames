import { describe, expect, it } from 'vitest';

import { makeLeaderboardEntry } from '../test-support/api-factories';
import { sentRequest, stubFetchJson } from '../test-support/fetch-stub';
import { API_BASE_URL } from './api-client';
import { fetchLeaderboard } from './leaderboard-api';

describe('fetchLeaderboard', () => {
  it('sends GET /api/leaderboard without query params', async () => {
    const fetchMock = stubFetchJson({ data: [], meta: { totalItems: 0, description: '' } });

    await fetchLeaderboard();

    const { url, method } = sentRequest(fetchMock);
    expect(method).toBe('GET');
    expect(url.href).toBe(`${API_BASE_URL}/api/leaderboard`);
  });

  it('returns the entries in server order with meta', async () => {
    const entries = [
      makeLeaderboardEntry(),
      makeLeaderboardEntry({ rank: 2, playerName: 'CozyGamer_x', totalScore: 80_100 }),
    ];
    const meta = { totalItems: 2, description: 'Top players' };
    stubFetchJson({ data: entries, meta });

    await expect(fetchLeaderboard()).resolves.toEqual({ data: entries, meta });
  });

  it('forwards the abort signal', async () => {
    const fetchMock = stubFetchJson({ data: [], meta: { totalItems: 0, description: '' } });
    const controller = new AbortController();

    await fetchLeaderboard({ signal: controller.signal });

    expect(sentRequest(fetchMock).signal).toBe(controller.signal);
  });

  it('rejects with the 429 status and server message', async () => {
    stubFetchJson({ error: 'Too many requests' }, 429);

    await expect(fetchLeaderboard()).rejects.toMatchObject({
      status: 429,
      message: 'Too many requests',
    });
  });
});
