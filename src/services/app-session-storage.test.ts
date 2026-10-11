// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  APP_SESSION_STORAGE_KEY,
  APP_SESSION_TTL_MS,
  type AppSessionRecord,
  clearAppSession,
  createAppSessionRecord,
  isAppSessionExpired,
  parseAppSessionRecord,
  readAppSession,
  writeAppSession,
} from './app-session-storage';

const NOW = 1_800_000_000_000;

const VALID_RECORD: AppSessionRecord = {
  email: 'jane@example.com',
  displayName: 'Jane Doe',
  authenticatedAt: NOW - 1000,
};

describe('parseAppSessionRecord', () => {
  it('accepts a complete record, with or without avatarUrl', () => {
    expect(parseAppSessionRecord(VALID_RECORD, NOW)).toEqual(VALID_RECORD);

    const withAvatar = { ...VALID_RECORD, avatarUrl: 'https://example.com/a.png' };
    expect(parseAppSessionRecord(withAvatar, NOW)).toEqual(withAvatar);
  });

  it('drops fields that are not part of the record', () => {
    const stored = { ...VALID_RECORD, token: 'secret', expiresAt: NOW };

    expect(parseAppSessionRecord(stored, NOW)).toEqual(VALID_RECORD);
  });

  it.each([
    ['a string', 'session'],
    ['a number', 42],
    ['an array', []],
    ['JSON null', JSON.parse('null') as unknown],
  ])('rejects %s', (_label, value) => {
    expect(parseAppSessionRecord(value, NOW)).toBeUndefined();
  });

  it.each([
    ['missing email', { displayName: 'Jane', authenticatedAt: NOW }],
    ['empty email', { ...VALID_RECORD, email: '' }],
    ['empty displayName', { ...VALID_RECORD, displayName: '' }],
    ['numeric displayName', { ...VALID_RECORD, displayName: 7 }],
    ['string authenticatedAt', { ...VALID_RECORD, authenticatedAt: String(NOW) }],
    ['fractional authenticatedAt', { ...VALID_RECORD, authenticatedAt: NOW - 0.5 }],
    ['zero authenticatedAt', { ...VALID_RECORD, authenticatedAt: 0 }],
    ['future authenticatedAt', { ...VALID_RECORD, authenticatedAt: NOW + 1 }],
    ['empty avatarUrl', { ...VALID_RECORD, avatarUrl: '' }],
    ['numeric avatarUrl', { ...VALID_RECORD, avatarUrl: 1 }],
  ])('rejects a record with %s', (_label, value) => {
    expect(parseAppSessionRecord(value, NOW)).toBeUndefined();
  });
});

describe('isAppSessionExpired', () => {
  it('expires exactly TTL after authentication', () => {
    const authenticatedAt = NOW;

    expect(isAppSessionExpired({ authenticatedAt }, NOW + APP_SESSION_TTL_MS - 1)).toBe(false);
    expect(isAppSessionExpired({ authenticatedAt }, NOW + APP_SESSION_TTL_MS)).toBe(true);
  });
});

describe('createAppSessionRecord', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stamps authenticatedAt with the current time', () => {
    expect(createAppSessionRecord({ email: 'jane@example.com', displayName: 'Jane Doe' })).toEqual({
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      authenticatedAt: NOW,
    });
  });

  it('resolves a missing display name from the email and omits an empty avatarUrl', () => {
    expect(createAppSessionRecord({ email: 'jane@example.com', avatarUrl: '' })).toEqual({
      email: 'jane@example.com',
      displayName: 'jane',
      authenticatedAt: NOW,
    });
  });
});

describe('app session in localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads back what was written', () => {
    const record = { ...VALID_RECORD, authenticatedAt: Date.now() - 1000 };

    writeAppSession(record);

    expect(readAppSession()).toEqual(record);
  });

  it('returns undefined when nothing is stored', () => {
    expect(readAppSession()).toBeUndefined();
  });

  it('returns undefined for corrupted JSON', () => {
    localStorage.setItem(APP_SESSION_STORAGE_KEY, '{not json');

    expect(readAppSession()).toBeUndefined();
  });

  it('returns undefined for valid JSON with an invalid shape', () => {
    localStorage.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify({ email: 'jane@example.com' }));

    expect(readAppSession()).toBeUndefined();
  });

  it('clears only the app session key', () => {
    localStorage.setItem('other-key', 'kept');
    writeAppSession(VALID_RECORD);

    clearAppSession();

    expect(localStorage.getItem(APP_SESSION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('other-key')).toBe('kept');
  });
});
