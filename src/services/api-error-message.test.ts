import { describe, expect, it } from 'vitest';

import { ApiError, NETWORK_ERROR_STATUS } from './api-client';
import { toUserFacingMessage } from './api-error-message';

const FALLBACK = 'Top players are unavailable right now. Please try again.';

describe('toUserFacingMessage', () => {
  it('shows our own network message', () => {
    const error = new ApiError('Could not reach the server.', NETWORK_ERROR_STATUS);

    expect(toUserFacingMessage(error, FALLBACK)).toBe('Could not reach the server.');
  });

  it('shows the server text for a 429, trimmed', () => {
    const error = new ApiError('  Too many requests, slow down.  ', 429);

    expect(toUserFacingMessage(error, FALLBACK)).toBe('Too many requests, slow down.');
  });

  it('uses the fallback for an allowlisted status with a blank message', () => {
    expect(toUserFacingMessage(new ApiError(' '.repeat(3), 429), FALLBACK)).toBe(FALLBACK);
  });

  it.each([
    { status: 400, message: 'Invalid sort parameter: bogus' },
    { status: 401, message: 'userEmail is required' },
    { status: 404, message: 'Game not found: invalid-slug' },
    { status: 500, message: 'Internal error at handler.ts:42' },
  ])('hides the technical server text for status $status', ({ status, message }) => {
    expect(toUserFacingMessage(new ApiError(message, status), FALLBACK)).toBe(FALLBACK);
  });

  it.each([
    { name: 'a plain Error', error: new Error('TypeError: x is undefined') },
    { name: 'an abort', error: new DOMException('aborted', 'AbortError') },
    { name: 'a string', error: 'boom' },
    { name: 'undefined', error: undefined },
  ])('uses the fallback for $name', ({ error }) => {
    expect(toUserFacingMessage(error, FALLBACK)).toBe(FALLBACK);
  });
});
