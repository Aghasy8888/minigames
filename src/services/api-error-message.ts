import { ApiError, NETWORK_ERROR_STATUS } from './api-client';

/**
 * Statuses whose message is safe to show as-is: the network message is our own copy, and the
 * server's 429 text is readable for every endpoint. Other server texts (e.g. 400
 * "Invalid sort parameter: bogus") are technical, so they fall back to the section's copy.
 */
const USER_FACING_STATUSES = new Set<number>([NETWORK_ERROR_STATUS, 429]);

export function toUserFacingMessage(error: unknown, fallbackMessage: string): string {
  if (!(error instanceof ApiError) || !USER_FACING_STATUSES.has(error.status)) {
    return fallbackMessage;
  }

  const message = error.message.trim();
  return message === '' ? fallbackMessage : message;
}
