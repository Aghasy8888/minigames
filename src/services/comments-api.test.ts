import { describe, expect, it } from 'vitest';

import { makeComment, makeCommentsMeta, TEST_USER_EMAIL } from '../test-support/api-factories';
import { sentRequest, stubFetch, stubFetchJson } from '../test-support/fetch-stub';
import { API_BASE_URL, NETWORK_ERROR_STATUS } from './api-client';
import { fetchGameComments, postGameComment } from './comments-api';

const COMMENTS_URL = `${API_BASE_URL}/api/games/cat-mail-co/comments`;

describe('fetchGameComments', () => {
  it('sends limit, sort, and the URL-encoded userEmail for a signed-in user', async () => {
    const fetchMock = stubFetchJson({ data: [], meta: makeCommentsMeta() });

    await fetchGameComments('cat-mail-co', {
      limit: 3,
      sort: 'newest',
      userEmail: 'jane+games@rs.school',
    });

    const { url, method } = sentRequest(fetchMock);
    expect(method).toBe('GET');
    expect(url.href).toBe(`${COMMENTS_URL}?limit=3&sort=newest&userEmail=jane%2Bgames%40rs.school`);
  });

  it('omits userEmail for a guest', async () => {
    const fetchMock = stubFetchJson({ data: [], meta: makeCommentsMeta() });

    await fetchGameComments('cat-mail-co', { limit: 3, sort: 'newest' });

    expect(sentRequest(fetchMock).url.searchParams.has('userEmail')).toBe(false);
  });

  it('returns the comments and the total count from meta', async () => {
    const comments = [makeComment({ commentId: 'c2' }), makeComment({ commentId: 'c1' })];
    const meta = makeCommentsMeta({ totalComments: 12, returnedCount: 2 });
    stubFetchJson({ data: comments, meta });

    await expect(fetchGameComments('cat-mail-co', { limit: 3 })).resolves.toEqual({
      data: comments,
      meta,
    });
  });

  it('forwards the abort signal', async () => {
    const fetchMock = stubFetchJson({ data: [], meta: makeCommentsMeta() });
    const controller = new AbortController();

    await fetchGameComments('cat-mail-co', { signal: controller.signal });

    expect(sentRequest(fetchMock).signal).toBe(controller.signal);
  });
});

describe('postGameComment', () => {
  const comment = { userEmail: TEST_USER_EMAIL, authorName: 'ForestDweller', text: 'Lovely!' };

  it('POSTs exactly userEmail, authorName, and text as JSON', async () => {
    const fetchMock = stubFetchJson({ data: makeComment({ text: 'Lovely!' }) }, 201);

    await postGameComment('cat-mail-co', comment);

    const sent = sentRequest(fetchMock);
    expect(sent.url.href).toBe(COMMENTS_URL);
    expect(sent.method).toBe('POST');
    expect(sent.contentType).toBe('application/json');
    expect(sent.body).toEqual(comment);
  });

  it('does not send the abort signal inside the body', async () => {
    const fetchMock = stubFetchJson({ data: makeComment() }, 201);
    const controller = new AbortController();

    await postGameComment('cat-mail-co', { ...comment, signal: controller.signal });

    const sent = sentRequest(fetchMock);
    expect(sent.body).toEqual(comment);
    expect(sent.signal).toBe(controller.signal);
  });

  it('returns the created comment from a 201', async () => {
    const created = makeComment({ commentId: 'new-1', text: 'Lovely!' });
    stubFetchJson({ data: created }, 201);

    await expect(postGameComment('cat-mail-co', comment)).resolves.toEqual({
      data: created,
      meta: undefined,
    });
  });

  it.each([
    { status: 400, error: 'text must be 1-500 characters' },
    { status: 401, error: 'userEmail is required' },
    { status: 404, error: 'Game not found: cat-mail-co' },
    { status: 429, error: 'Too many requests' },
  ])('rejects a definitive $status once, without retrying', async ({ status, error }) => {
    const fetchMock = stubFetchJson({ error }, status);

    await expect(postGameComment('cat-mail-co', comment)).rejects.toMatchObject({ status });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown outcome with the network status once, without retrying', async () => {
    const fetchMock = stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    await expect(postGameComment('cat-mail-co', comment)).rejects.toMatchObject({
      status: NETWORK_ERROR_STATUS,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
