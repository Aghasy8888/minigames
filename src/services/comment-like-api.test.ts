import { describe, expect, it } from 'vitest';

import { makeCommentLikeResult, TEST_USER_EMAIL } from '../test-support/api-factories';
import { sentRequest, stubFetch, stubFetchJson } from '../test-support/fetch-stub';
import { API_BASE_URL, NETWORK_ERROR_STATUS } from './api-client';
import { toggleCommentLike } from './comment-like-api';

describe('toggleCommentLike', () => {
  it('POSTs only userEmail to the comment like endpoint', async () => {
    const fetchMock = stubFetchJson({ data: makeCommentLikeResult() });

    await toggleCommentLike('comment-1', { userEmail: TEST_USER_EMAIL });

    const sent = sentRequest(fetchMock);
    expect(sent.url.href).toBe(`${API_BASE_URL}/api/comments/comment-1/like`);
    expect(sent.method).toBe('POST');
    expect(sent.body).toEqual({ userEmail: TEST_USER_EMAIL });
  });

  it('encodes the comment id as one path segment', async () => {
    const fetchMock = stubFetchJson({ data: makeCommentLikeResult() });

    await toggleCommentLike('a/b', { userEmail: TEST_USER_EMAIL });

    expect(sentRequest(fetchMock).url.pathname).toBe('/api/comments/a%2Fb/like');
  });

  it('returns the server-confirmed like state and count', async () => {
    const result = makeCommentLikeResult({ isLikedByCurrentUser: false, likesCount: 2 });
    stubFetchJson({ data: result });

    await expect(toggleCommentLike('comment-1', { userEmail: TEST_USER_EMAIL })).resolves.toEqual({
      data: result,
      meta: undefined,
    });
  });

  it.each([
    { status: 401, error: 'userEmail is required' },
    { status: 404, error: 'Comment not found: comment-1' },
    { status: 429, error: 'Too many requests' },
  ])('rejects a definitive $status once, without retrying', async ({ status, error }) => {
    const fetchMock = stubFetchJson({ error }, status);

    await expect(
      toggleCommentLike('comment-1', { userEmail: TEST_USER_EMAIL }),
    ).rejects.toMatchObject({ status });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown outcome with the network status once, without retrying', async () => {
    const fetchMock = stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    await expect(
      toggleCommentLike('comment-1', { userEmail: TEST_USER_EMAIL }),
    ).rejects.toMatchObject({ status: NETWORK_ERROR_STATUS });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
