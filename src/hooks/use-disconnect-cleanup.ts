/**
 * Runs `cleanup` once when `element` leaves the DOM (e.g. the router swaps the page).
 * The element must be mounted in the same task; if it isn't connected by the next microtask,
 * cleanup runs immediately.
 */
export function useDisconnectCleanup(element: HTMLElement, cleanup: () => void): void {
  let isCleaned = false;

  function runCleanup(): void {
    if (isCleaned) {
      return;
    }

    isCleaned = true;
    observer.disconnect();
    cleanup();
  }

  const observer = new MutationObserver(() => {
    if (!element.isConnected) {
      runCleanup();
    }
  });

  queueMicrotask(() => {
    const parent = element.parentElement;

    if (!element.isConnected || !parent) {
      runCleanup();
      return;
    }

    observer.observe(parent, { childList: true });
  });
}
