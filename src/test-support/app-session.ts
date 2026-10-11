import { APP_SESSION_STORAGE_KEY, APP_SESSION_TTL_MS } from '../services/app-session-storage';

const ONE_MINUTE_MS = 60 * 1000;

/** The reviewer's DevTools step: move the stored `authenticatedAt` past the lifetime, without a reload. */
export function expireStoredSession(): void {
  const raw = localStorage.getItem(APP_SESSION_STORAGE_KEY);

  if (raw === null) {
    throw new Error('No stored app session to expire');
  }

  const record = JSON.parse(raw) as Record<string, unknown>;
  const authenticatedAt = Date.now() - APP_SESSION_TTL_MS - ONE_MINUTE_MS;
  localStorage.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify({ ...record, authenticatedAt }));
}
