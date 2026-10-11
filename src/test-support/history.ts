import { vi } from 'vitest';

export function currentUrl(): string {
  const { pathname, search, hash } = globalThis.location;
  return `${pathname}${search}${hash}`;
}

/** happy-dom fires `popstate` asynchronously, so wait for it before asserting (needs fake timers). */
async function traverse(step: () => void): Promise<void> {
  const popped = new Promise<void>((resolve) => {
    globalThis.addEventListener('popstate', () => resolve(), { once: true });
  });
  step();
  await vi.advanceTimersByTimeAsync(0);
  await popped;
}

export async function goBack(): Promise<void> {
  await traverse(() => globalThis.history.back());
}

export async function goForward(): Promise<void> {
  await traverse(() => globalThis.history.forward());
}
