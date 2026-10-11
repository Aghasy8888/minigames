import { describe, expect, it, vi } from 'vitest';

import { jsonResponse, sentRequest, stubFetch, stubFetchJson } from '../test-support/fetch-stub';
import { API_BASE_URL, ApiError, isAbortError, NETWORK_ERROR_STATUS, request } from './api-client';

const NETWORK_MESSAGE = 'Could not reach the server. Check your connection and try again.';
const UNEXPECTED_MESSAGE = 'Unexpected server response. Try again.';
const FALLBACK_MESSAGE = 'Something went wrong. Try again.';

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

describe('request — what is sent', () => {
  it('sends a GET to the base URL plus the path, without a body or JSON header', async () => {
    const fetchMock = stubFetchJson({ data: [] });

    await request('/api/leaderboard');

    const sent = sentRequest(fetchMock);
    expect(sent.url.href).toBe(`${API_BASE_URL}/api/leaderboard`);
    expect(sent.method).toBe('GET');
    expect(sent.body).toBeUndefined();
    expect(sent.contentType).toBeUndefined();
  });

  it('builds the query string and skips undefined values', async () => {
    const fetchMock = stubFetchJson({ data: [] });

    await request('/api/games', {
      query: { featured: true, page: 2, limit: undefined, category: 'puzzle' },
    });

    expect(sentRequest(fetchMock).url.search).toBe('?featured=true&page=2&category=puzzle');
  });

  it('URL-encodes query values', async () => {
    const fetchMock = stubFetchJson({ data: {} });

    await request('/api/games/cat-mail-co', { query: { userEmail: 'jane+games@rs.school' } });

    expect(sentRequest(fetchMock).url.search).toBe('?userEmail=jane%2Bgames%40rs.school');
  });

  it('adds no "?" when every query value is undefined', async () => {
    const fetchMock = stubFetchJson({ data: {} });

    await request('/api/games/cat-mail-co', { query: { userEmail: undefined } });

    expect(sentRequest(fetchMock).url.href).toBe(`${API_BASE_URL}/api/games/cat-mail-co`);
  });

  it('sends a body as JSON with a JSON content type', async () => {
    const fetchMock = stubFetchJson({ data: {} }, 201);

    await request('/api/games/cat-mail-co/comments', {
      method: 'POST',
      body: { userEmail: 'student@rs.school', text: 'Hi' },
    });

    const sent = sentRequest(fetchMock);
    expect(sent.method).toBe('POST');
    expect(sent.contentType).toBe('application/json');
    expect(sent.body).toEqual({ userEmail: 'student@rs.school', text: 'Hi' });
  });

  it('forwards the abort signal', async () => {
    const fetchMock = stubFetchJson({ data: [] });
    const controller = new AbortController();

    await request('/api/categories', { signal: controller.signal });

    expect(sentRequest(fetchMock).signal).toBe(controller.signal);
  });
});

describe('request — successful responses', () => {
  it('unwraps data and meta', async () => {
    stubFetchJson({ data: [{ slug: 'a' }], meta: { totalItems: 1 } });

    await expect(request('/api/games')).resolves.toEqual({
      data: [{ slug: 'a' }],
      meta: { totalItems: 1 },
    });
  });

  it('returns meta as undefined when the response has none', async () => {
    stubFetchJson({ data: { isFavorited: true } });

    await expect(request('/api/games/a/favorite')).resolves.toEqual({
      data: { isFavorited: true },
      meta: undefined,
    });
  });

  it.each([
    { name: 'a body without data', body: { items: [] } },
    { name: 'a non-object body', body: 'ok' },
  ])('rejects $name as an unexpected response', async ({ body }) => {
    stubFetchJson(body);

    await expect(request('/api/games')).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
      message: UNEXPECTED_MESSAGE,
    });
  });

  it('rejects a body that is not JSON as an unexpected response with its status', async () => {
    stubFetch(() => Promise.resolve(new Response('<html>Bad gateway</html>', { status: 502 })));

    await expect(request('/api/games')).rejects.toMatchObject({
      status: 502,
      message: UNEXPECTED_MESSAGE,
    });
  });
});

describe('request — definitive failures (HTTP status)', () => {
  it('throws an ApiError with the status and the trimmed server message', async () => {
    stubFetchJson({ error: '  Too many requests, slow down.  ' }, 429);

    const pending = request('/api/games');

    await expect(pending).rejects.toBeInstanceOf(ApiError);
    await expect(pending).rejects.toMatchObject({
      status: 429,
      message: 'Too many requests, slow down.',
    });
  });

  it.each([
    { name: 'no error field', body: {} },
    { name: 'a blank error', body: { error: ' '.repeat(3) } },
    { name: 'a non-string error', body: { error: { code: 1 } } },
  ])('uses the fallback message for $name', async ({ body }) => {
    stubFetchJson(body, 404);

    await expect(request('/api/games/missing')).rejects.toMatchObject({
      status: 404,
      message: FALLBACK_MESSAGE,
    });
  });

  it('uses the fallback message for a JSON null body', async () => {
    stubFetch(() => Promise.resolve(new Response('null', { status: 404 })));

    await expect(request('/api/games/missing')).rejects.toMatchObject({
      status: 404,
      message: FALLBACK_MESSAGE,
    });
  });
});

describe('request — ambiguous failures and aborts', () => {
  it('turns a rejected fetch into an ApiError with the network status', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    await expect(request('/api/games')).rejects.toMatchObject({
      name: 'ApiError',
      status: NETWORK_ERROR_STATUS,
      message: NETWORK_MESSAGE,
    });
  });

  it('rethrows an abort from fetch unchanged', async () => {
    const abort = abortError();
    stubFetch(() => Promise.reject(abort));

    await expect(request('/api/games')).rejects.toBe(abort);
  });

  it('rethrows an abort while reading the body unchanged', async () => {
    const abort = abortError();
    const response = jsonResponse({ data: [] });
    vi.spyOn(response, 'json').mockRejectedValue(abort);
    stubFetch(() => Promise.resolve(response));

    await expect(request('/api/games')).rejects.toBe(abort);
  });

  it('sends the request exactly once on failure (no retry)', async () => {
    const fetchMock = stubFetchJson({ error: 'Too many requests' }, 429);

    await expect(request('/api/games')).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('isAbortError', () => {
  it.each([
    { name: 'a DOMException named AbortError', error: abortError(), expected: true },
    {
      name: 'an Error named AbortError',
      error: Object.assign(new Error('x'), { name: 'AbortError' }),
      expected: true,
    },
    {
      name: 'a DOMException with another name',
      error: new DOMException('t', 'TimeoutError'),
      expected: false,
    },
    { name: 'a plain Error', error: new Error('boom'), expected: false },
    { name: 'an ApiError', error: new ApiError('x', 0), expected: false },
    { name: 'a plain object named AbortError', error: { name: 'AbortError' }, expected: false },
    { name: 'a string', error: 'AbortError', expected: false },
  ])('returns $expected for $name', ({ error, expected }) => {
    expect(isAbortError(error)).toBe(expected);
  });
});
