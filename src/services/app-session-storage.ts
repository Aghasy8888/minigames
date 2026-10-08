export const APP_SESSION_TTL_MS = 5 * 60 * 1000;
export const APP_SESSION_STORAGE_KEY = 'minigames:minigames-aghasy:app-session';

export type AppSessionRecord = {
  email: string;
  displayName?: string;
  avatarUrl?: string;
  authenticatedAt: number;
  startedAt: number;
  expiresAt: number;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

function isEpochMilliseconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readOptionalString(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

export function parseAppSessionRecord(value: unknown): AppSessionRecord | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { email, authenticatedAt, startedAt, expiresAt } = value;

  if (!isNonEmptyString(email) || !isEpochMilliseconds(authenticatedAt)) {
    return undefined;
  }

  const resolvedStartedAt = isEpochMilliseconds(startedAt) ? startedAt : authenticatedAt;
  const resolvedExpiresAt = isEpochMilliseconds(expiresAt)
    ? expiresAt
    : authenticatedAt + APP_SESSION_TTL_MS;

  const displayName = readOptionalString(value.displayName);
  const avatarUrl = readOptionalString(value.avatarUrl);

  return {
    email,
    authenticatedAt,
    startedAt: resolvedStartedAt,
    expiresAt: resolvedExpiresAt,
    ...(displayName ? { displayName } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
  };
}

export function isAppSessionExpired(record: AppSessionRecord, now = Date.now()): boolean {
  return now >= record.authenticatedAt + APP_SESSION_TTL_MS;
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
  const authenticatedAt = Date.now();

  return {
    email,
    authenticatedAt,
    startedAt: authenticatedAt,
    expiresAt: authenticatedAt + APP_SESSION_TTL_MS,
    ...(displayName ? { displayName } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
  };
}
