// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TopLayer = typeof import('./use-top-layer');

let topLayer: TopLayer;
let host: HTMLElement;
const cleanups: (() => void)[] = [];

function createModal(id: string): HTMLDialogElement {
  const modal = document.createElement('dialog');
  modal.id = id;
  document.body.append(modal);
  return modal;
}

function register(element: HTMLElement): () => void {
  const cleanup = topLayer.useTopLayer(element);
  cleanups.push(cleanup);
  return cleanup;
}

/** `useTopLayer` places the host in a microtask, once the caller has mounted it. */
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
}

async function loadTopLayer(): Promise<void> {
  vi.resetModules();
  topLayer = await import('./use-top-layer');
}

beforeEach(() => {
  host = document.createElement('section');
});

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup();
  }
  document.body.replaceChildren();
});

describe('without the Popover API', () => {
  beforeEach(loadTopLayer);

  it('mounts the registered host in the body', async () => {
    register(host);

    await flushMicrotasks();

    expect(host.parentElement).toBe(document.body);
  });

  it('moves the host into each newly raised modal and back as they are released', async () => {
    register(host);
    await flushMicrotasks();
    const authModal = createModal('auth');
    const detailsModal = createModal('details');

    topLayer.raiseTopLayer(detailsModal);
    expect(host.parentElement).toBe(detailsModal);
    topLayer.raiseTopLayer(authModal);
    expect(host.parentElement).toBe(authModal);
    topLayer.releaseTopLayer(authModal);
    expect(host.parentElement).toBe(detailsModal);
    topLayer.releaseTopLayer(detailsModal);
    expect(host.parentElement).toBe(document.body);
  });

  it('brings a modal raised again to the top of the stack', async () => {
    register(host);
    await flushMicrotasks();
    const first = createModal('first');
    const second = createModal('second');

    topLayer.raiseTopLayer(first);
    topLayer.raiseTopLayer(second);
    topLayer.raiseTopLayer(first);
    topLayer.releaseTopLayer(first);

    expect(host.parentElement).toBe(second);
  });

  it('keeps the host in place when an unknown modal is released', async () => {
    register(host);
    await flushMicrotasks();
    const open = createModal('open');

    topLayer.raiseTopLayer(open);
    topLayer.releaseTopLayer(createModal('never-raised'));

    expect(host.parentElement).toBe(open);
  });

  it('places a host registered after a modal opened inside that modal', async () => {
    const open = createModal('open');
    topLayer.raiseTopLayer(open);

    register(host);
    await flushMicrotasks();

    expect(host.parentElement).toBe(open);
  });

  it('stops moving the host after cleanup', async () => {
    const cleanup = register(host);
    await flushMicrotasks();
    const open = createModal('open');
    topLayer.raiseTopLayer(open);

    cleanup();
    topLayer.raiseTopLayer(createModal('later'));

    expect(host.parentElement).toBe(open);
  });

  it('forgets the modal stack on cleanup, so the next host starts in the body', async () => {
    const cleanup = register(host);
    await flushMicrotasks();
    topLayer.raiseTopLayer(createModal('open'));

    cleanup();
    const nextHost = document.createElement('section');
    register(nextHost);
    await flushMicrotasks();

    expect(nextHost.parentElement).toBe(document.body);
  });

  it('ignores a stale cleanup after another host registered', async () => {
    const staleCleanup = register(host);
    const nextHost = document.createElement('section');
    register(nextHost);
    await flushMicrotasks();
    const open = createModal('open');

    staleCleanup();
    topLayer.raiseTopLayer(open);

    expect(nextHost.parentElement).toBe(open);
  });
});

describe('with the Popover API', () => {
  let isOpen: boolean;
  let popoverCalls: string[];

  function recordPopover(action: 'show' | 'hide'): void {
    const { parentElement } = host;
    popoverCalls.push(`${action}:${parentElement === document.body ? 'BODY' : parentElement?.id}`);
  }

  /** happy-dom has no Popover API: the prototype stubs switch support on, the host ones record calls. */
  beforeEach(async () => {
    isOpen = false;
    popoverCalls = [];
    for (const method of ['showPopover', 'hidePopover']) {
      Object.defineProperty(HTMLElement.prototype, method, { configurable: true, value: vi.fn() });
    }
    Object.defineProperty(host, 'showPopover', {
      value: () => {
        isOpen = true;
        recordPopover('show');
      },
    });
    Object.defineProperty(host, 'hidePopover', {
      value: () => {
        isOpen = false;
        recordPopover('hide');
      },
    });
    vi.spyOn(host, 'matches').mockImplementation(
      (selector) => selector === ':popover-open' && isOpen,
    );
    await loadTopLayer();
  });

  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
    Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover');
  });

  it('shows the host popover once it is mounted', async () => {
    register(host);

    await flushMicrotasks();

    expect(popoverCalls).toStrictEqual(['show:BODY']);
  });

  it('re-shows the open popover inside each raised modal so it stays the newest top layer', async () => {
    register(host);
    await flushMicrotasks();
    const open = createModal('details');

    topLayer.raiseTopLayer(open);
    topLayer.releaseTopLayer(open);

    expect(popoverCalls).toStrictEqual([
      'show:BODY',
      'hide:details',
      'show:details',
      'hide:BODY',
      'show:BODY',
    ]);
  });

  it('does not show the popover inside a modal that is not in the document', async () => {
    register(host);
    await flushMicrotasks();
    const detached = document.createElement('dialog');

    topLayer.raiseTopLayer(detached);

    expect(host.parentElement).toBe(detached);
    expect(popoverCalls).toStrictEqual(['show:BODY']);
  });
});
