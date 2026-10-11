import { describe, expect, it } from 'vitest';

import { makeGame, makeGamesMeta } from '../test-support/api-factories';
import { sentRequest, stubFetchJson } from '../test-support/fetch-stub';
import { API_BASE_URL } from './api-client';
import { fetchFeaturedGames, fetchGames } from './games-api';

describe('fetchGames', () => {
  it('sends category, sort, page, and limit as query params of GET /api/games', async () => {
    const fetchMock = stubFetchJson({ data: [], meta: makeGamesMeta() });

    await fetchGames({ category: 'puzzle', sort: 'name-asc', page: 2, limit: 6 });

    const { url, method } = sentRequest(fetchMock);
    expect(method).toBe('GET');
    expect(`${url.origin}${url.pathname}`).toBe(`${API_BASE_URL}/api/games`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      category: 'puzzle',
      sort: 'name-asc',
      page: '2',
      limit: '6',
    });
  });

  it('sends "all" as is, so the server applies no filter', async () => {
    const fetchMock = stubFetchJson({ data: [], meta: makeGamesMeta() });

    await fetchGames({ category: 'all' });

    expect(sentRequest(fetchMock).url.searchParams.get('category')).toBe('all');
  });

  it('omits params that are not set', async () => {
    const fetchMock = stubFetchJson({ data: [], meta: makeGamesMeta() });

    await fetchGames({});

    expect(sentRequest(fetchMock).url.href).toBe(`${API_BASE_URL}/api/games`);
  });

  it('returns the server items unchanged and in server order, with meta', async () => {
    const items = [
      makeGame({ slug: 'zeta', rating: 3.1 }),
      makeGame({ slug: 'alpha', rating: 4.9 }),
      makeGame({ slug: 'mid', rating: 4 }),
    ];
    const meta = makeGamesMeta({ page: 3, totalPages: 7, totalItems: 40 });
    stubFetchJson({ data: items, meta });

    await expect(fetchGames({ page: 3 })).resolves.toEqual({ data: items, meta });
  });

  it('forwards the abort signal', async () => {
    const fetchMock = stubFetchJson({ data: [], meta: makeGamesMeta() });
    const controller = new AbortController();

    await fetchGames({}, { signal: controller.signal });

    expect(sentRequest(fetchMock).signal).toBe(controller.signal);
  });

  it('rejects with the 400 status for an invalid param', async () => {
    stubFetchJson({ error: 'Invalid sort parameter: bogus' }, 400);

    await expect(fetchGames({ page: 1 })).rejects.toMatchObject({ name: 'ApiError', status: 400 });
  });
});

describe('fetchFeaturedGames', () => {
  it('asks the server for featured games only', async () => {
    const fetchMock = stubFetchJson({ data: [makeGame()], meta: makeGamesMeta() });

    await fetchFeaturedGames();

    expect(sentRequest(fetchMock).url.search).toBe('?featured=true');
  });
});
