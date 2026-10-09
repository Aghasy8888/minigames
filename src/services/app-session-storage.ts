import { getProfileDisplayName } from '../utils/get-profile-display-name';

export const APP_SESSION_TTL_MS = 5 * 60 * 1000;
export const APP_SESSION_STORAGE_KEY = 'minigames:minigames-aghasy:app-session';

export type AppSessionRecord = {
  email: string;
  displayName: string;
  /** `Date.now()` at successful authentication; the only input to expiry. */
  authenticatedAt: number;
  avatarUrl?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

function isPastTimestamp(value: unknown, now: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= now;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/**
 * A missing or wrongly typed field, or an `authenticatedAt` in the future (which would never
 * expire), makes the whole record invalid.
 */
export function parseAppSessionRecord(
  value: unknown,
  now = Date.now(),
): AppSessionRecord | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { email, displayName, authenticatedAt, avatarUrl } = value;

  if (
    !isNonEmptyString(email) ||
    !isNonEmptyString(displayName) ||
    !isPastTimestamp(authenticatedAt, now)
  ) {
    return undefined;
  }

  if (avatarUrl !== undefined && !isNonEmptyString(avatarUrl)) {
    return undefined;
  }

  return {
    email,
    displayName,
    authenticatedAt,
    ...(avatarUrl === undefined ? {} : { avatarUrl }),
  };
}

export function isAppSessionExpired(
  { authenticatedAt }: Pick<AppSessionRecord, 'authenticatedAt'>,
  now = Date.now(),
): boolean {
  return now >= authenticatedAt + APP_SESSION_TTL_MS;
}

export function readAppSession(): AppSessionRecord | undefined {
  const raw = globalThis.localStorage.getItem(APP_SESSION_STORAGE_KEY);

  if (raw === null) {
    return undefined;
  }

  try {
    return parseAppSessionRecord(JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

export function writeAppSession(record: AppSessionRecord): void {
  globalThis.localStorage.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify(record));
}

export function clearAppSession(): void {
  globalThis.localStorage.removeItem(APP_SESSION_STORAGE_KEY);
}

export function createAppSessionRecord({
  email,
  displayName,
  avatarUrl,
}: {
  email: string;
  displayName?: string;
  avatarUrl?: string;
}): AppSessionRecord {
  return {
    email,
    displayName: getProfileDisplayName({ email, displayName }),
    authenticatedAt: Date.now(),
    ...(avatarUrl ? { avatarUrl } : {}),
  };
}
