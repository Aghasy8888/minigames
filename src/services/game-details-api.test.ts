import { describe, expect, it } from 'vitest';

import { makeGameDetails, TEST_USER_EMAIL } from '../test-support/api-factories';
import { sentRequest, stubFetchJson } from '../test-support/fetch-stub';
import { API_BASE_URL } from './api-client';
import { fetchGameDetails } from './game-details-api';

describe('fetchGameDetails', () => {
  it('sends a guest request without userEmail', async () => {
    const fetchMock = stubFetchJson({ data: makeGameDetails() });

    await fetchGameDetails('cat-mail-co');

    const { url, method } = sentRequest(fetchMock);
    expect(method).toBe('GET');
    expect(url.href).toBe(`${API_BASE_URL}/api/games/cat-mail-co`);
  });

  it('sends the URL-encoded userEmail for a signed-in user', async () => {
    const fetchMock = stubFetchJson({ data: makeGameDetails({ isLikedByCurrentUser: true }) });

    await fetchGameDetails('cat-mail-co', { userEmail: 'jane+games@rs.school' });

    expect(sentRequest(fetchMock).url.search).toBe('?userEmail=jane%2Bgames%40rs.school');
  });

  it('encodes the slug as one path segment', async () => {
    const fetchMock = stubFetchJson({ data: makeGameDetails() });

    await fetchGameDetails('a/b?c');

    expect(sentRequest(fetchMock).url.pathname).toBe('/api/games/a%2Fb%3Fc');
  });

  it('returns the details with the per-user flag from the server', async () => {
    const details = makeGameDetails({ isLikedByCurrentUser: true, likesCount: 10 });
    stubFetchJson({ data: details });

    await expect(fetchGameDetails('cat-mail-co', { userEmail: TEST_USER_EMAIL })).resolves.toEqual({
      data: details,
      meta: undefined,
    });
  });

  it('rejects with the 404 status for an unknown game', async () => {
    stubFetchJson({ error: 'Game not found: missing' }, 404);

    await expect(fetchGameDetails('missing')).rejects.toMatchObject({ status: 404 });
  });
});
