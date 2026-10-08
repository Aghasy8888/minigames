let timerId: ReturnType<typeof globalThis.setTimeout> | undefined;
let onExpire: (() => void) | undefined;

function clearTimer(): void {
  if (timerId !== undefined) {
    globalThis.clearTimeout(timerId);
    timerId = undefined;
  }
}

export function clearSessionExpiry(): void {
  clearTimer();
}

export function scheduleSessionExpiry(delayMs: number, expire: () => void): void {
  clearTimer();
  onExpire = expire;

  if (delayMs <= 0) {
    expire();
    return;
  }

  timerId = globalThis.setTimeout(() => {
    timerId = undefined;
    expire();
  }, delayMs);
}

export function startSessionExpiryWatcher(expire: () => void): void {
  onExpire = expire;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      onExpire?.();
    }
  });
}
