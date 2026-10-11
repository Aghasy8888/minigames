import { describe, expect, it } from 'vitest';

import { makeCategory } from '../test-support/api-factories';
import { sentRequest, stubFetchJson } from '../test-support/fetch-stub';
import { API_BASE_URL } from './api-client';
import { fetchCategories } from './categories-api';

describe('fetchCategories', () => {
  it('sends GET /api/categories without query params', async () => {
    const fetchMock = stubFetchJson({ data: [], meta: { totalItems: 0, description: '' } });

    await fetchCategories();

    const { url, method } = sentRequest(fetchMock);
    expect(method).toBe('GET');
    expect(url.href).toBe(`${API_BASE_URL}/api/categories`);
  });

  it('returns the categories in server order with meta', async () => {
    const categories = [
      makeCategory(),
      makeCategory({ slug: 'puzzle', label: 'Puzzle', isDefault: false }),
    ];
    const meta = { totalItems: 2, description: 'Game categories' };
    stubFetchJson({ data: categories, meta });

    await expect(fetchCategories()).resolves.toEqual({ data: categories, meta });
  });

  it('rejects with the 429 status and server message', async () => {
    stubFetchJson({ error: 'Too many requests' }, 429);

    await expect(fetchCategories()).rejects.toMatchObject({
      status: 429,
      message: 'Too many requests',
    });
  });
});
