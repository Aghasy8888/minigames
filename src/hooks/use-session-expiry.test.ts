// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

type SessionExpiry = typeof import('./use-session-expiry');

const DELAY_MS = 60_000;

let expiry: SessionExpiry;
let addListenerSpy: MockInstance<typeof document.addEventListener>;

function setVisibility(visibility: DocumentVisibilityState): void {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibility);
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(async () => {
  vi.useFakeTimers();
  addListenerSpy = vi.spyOn(document, 'addEventListener');
  vi.resetModules();
  expiry = await import('./use-session-expiry');
});

afterEach(() => {
  for (const [type, listener] of addListenerSpy.mock.calls) {
    document.removeEventListener(type, listener);
  }
  vi.useRealTimers();
});

describe('scheduleSessionExpiry', () => {
  it('expires exactly when the delay elapses, not before', () => {
    const expire = vi.fn();

    expiry.scheduleSessionExpiry(DELAY_MS, expire);
    vi.advanceTimersByTime(DELAY_MS - 1);

    expect(expire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(expire).toHaveBeenCalledTimes(1);
  });

  it.each([
    { name: 'a zero delay', delayMs: 0 },
    { name: 'a negative delay', delayMs: -1 },
  ])('expires immediately for $name', ({ delayMs }) => {
    const expire = vi.fn();

    expiry.scheduleSessionExpiry(delayMs, expire);

    expect(expire).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps a single timer: rescheduling cancels the previous one', () => {
    const first = vi.fn();
    const second = vi.fn();

    expiry.scheduleSessionExpiry(DELAY_MS, first);
    expiry.scheduleSessionExpiry(DELAY_MS * 2, second);

    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(DELAY_MS * 2);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending timer when an immediate expiry is scheduled', () => {
    const pending = vi.fn();

    expiry.scheduleSessionExpiry(DELAY_MS, pending);
    expiry.scheduleSessionExpiry(0, vi.fn());
    vi.advanceTimersByTime(DELAY_MS);

    expect(pending).not.toHaveBeenCalled();
  });
});

describe('clearSessionExpiry', () => {
  it('cancels the pending expiry', () => {
    const expire = vi.fn();

    expiry.scheduleSessionExpiry(DELAY_MS, expire);
    expiry.clearSessionExpiry();
    vi.advanceTimersByTime(DELAY_MS);

    expect(expire).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does nothing after the timer has already fired', () => {
    const expire = vi.fn();

    expiry.scheduleSessionExpiry(DELAY_MS, expire);
    vi.advanceTimersByTime(DELAY_MS);
    expiry.clearSessionExpiry();

    expect(expire).toHaveBeenCalledTimes(1);
  });
});

describe('startSessionExpiryWatcher', () => {
  it('runs the check when the page becomes visible', () => {
    const check = vi.fn();

    expiry.startSessionExpiryWatcher(check);
    setVisibility('visible');

    expect(check).toHaveBeenCalledTimes(1);
  });

  it('skips the check while the page is hidden', () => {
    const check = vi.fn();

    expiry.startSessionExpiryWatcher(check);
    setVisibility('hidden');

    expect(check).not.toHaveBeenCalled();
  });

  it('keeps running the check, not the expiry callback, once a timer is scheduled', () => {
    const check = vi.fn();
    const expire = vi.fn();

    expiry.startSessionExpiryWatcher(check);
    expiry.scheduleSessionExpiry(DELAY_MS, expire);
    setVisibility('visible');

    expect(check).toHaveBeenCalledTimes(1);
    expect(expire).not.toHaveBeenCalled();
  });
});
