// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { useDisconnectCleanup } from './use-disconnect-cleanup';

let parent: HTMLElement;
let element: HTMLElement;
let cleanup: Mock<() => void>;

/** The hook checks the mount in a microtask, and happy-dom delivers mutation records in one too. */
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  parent = document.createElement('main');
  element = document.createElement('section');
  document.body.append(parent);
  cleanup = vi.fn();
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('useDisconnectCleanup', () => {
  it('cleans up once the element leaves the document', async () => {
    parent.append(element);
    useDisconnectCleanup(element, cleanup);
    await flushMicrotasks();
    expect(cleanup).not.toHaveBeenCalled();

    element.remove();
    await flushMicrotasks();

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('keeps running while siblings come and go', async () => {
    parent.append(element);
    useDisconnectCleanup(element, cleanup);
    await flushMicrotasks();

    const sibling = document.createElement('aside');
    parent.append(sibling);
    sibling.remove();
    await flushMicrotasks();

    expect(cleanup).not.toHaveBeenCalled();
  });

  it('cleans up only once even if the element is mounted and removed again', async () => {
    parent.append(element);
    useDisconnectCleanup(element, cleanup);
    await flushMicrotasks();

    element.remove();
    await flushMicrotasks();
    parent.append(element);
    element.remove();
    await flushMicrotasks();

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('cleans up right away when the element is never mounted', async () => {
    useDisconnectCleanup(element, cleanup);

    await flushMicrotasks();

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('cleans up right away when the element is only inside a detached parent', async () => {
    const detachedParent = document.createElement('div');
    detachedParent.append(element);

    useDisconnectCleanup(element, cleanup);
    await flushMicrotasks();

    expect(cleanup).toHaveBeenCalledOnce();
  });
});
