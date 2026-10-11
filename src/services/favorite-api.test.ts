import { describe, expect, it } from 'vitest';

import { makeFavoriteResult, TEST_USER_EMAIL } from '../test-support/api-factories';
import { sentRequest, stubFetch, stubFetchJson } from '../test-support/fetch-stub';
import { API_BASE_URL, NETWORK_ERROR_STATUS } from './api-client';
import { toggleFavorite } from './favorite-api';

describe('toggleFavorite', () => {
  it('POSTs only userEmail to the game favorite endpoint', async () => {
    const fetchMock = stubFetchJson({ data: makeFavoriteResult() });

    await toggleFavorite('cat-mail-co', { userEmail: TEST_USER_EMAIL });

    const sent = sentRequest(fetchMock);
    expect(sent.url.href).toBe(`${API_BASE_URL}/api/games/cat-mail-co/favorite`);
    expect(sent.method).toBe('POST');
    expect(sent.body).toEqual({ userEmail: TEST_USER_EMAIL });
  });

  it('encodes the slug as one path segment', async () => {
    const fetchMock = stubFetchJson({ data: makeFavoriteResult() });

    await toggleFavorite('a/b', { userEmail: TEST_USER_EMAIL });

    expect(sentRequest(fetchMock).url.pathname).toBe('/api/games/a%2Fb/favorite');
  });

  it('returns the server-confirmed favorite state and count', async () => {
    const result = makeFavoriteResult({ isFavorited: false, likesCount: 38_206 });
    stubFetchJson({ data: result });

    await expect(toggleFavorite('cat-mail-co', { userEmail: TEST_USER_EMAIL })).resolves.toEqual({
      data: result,
      meta: undefined,
    });
  });

  it.each([
    { status: 401, error: 'userEmail is required' },
    { status: 404, error: 'Game not found: cat-mail-co' },
    { status: 429, error: 'Too many requests' },
  ])('rejects a definitive $status once, without retrying', async ({ status, error }) => {
    const fetchMock = stubFetchJson({ error }, status);

    await expect(
      toggleFavorite('cat-mail-co', { userEmail: TEST_USER_EMAIL }),
    ).rejects.toMatchObject({ status });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown outcome with the network status once, without retrying', async () => {
    const fetchMock = stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    await expect(
      toggleFavorite('cat-mail-co', { userEmail: TEST_USER_EMAIL }),
    ).rejects.toMatchObject({ status: NETWORK_ERROR_STATUS });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
