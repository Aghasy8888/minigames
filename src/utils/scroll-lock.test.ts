// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

type ScrollLock = typeof import('./scroll-lock');

let lockScroll: ScrollLock['lockScroll'];
let unlockScroll: ScrollLock['unlockScroll'];

beforeEach(async () => {
  // The lock count is module state; a fresh module gives every test a count of 0.
  vi.resetModules();
  ({ lockScroll, unlockScroll } = await import('./scroll-lock'));
  document.body.style.overflow = '';
});

describe('scroll lock', () => {
  it('hides body overflow when locked', () => {
    lockScroll();

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body overflow when the only lock is released', () => {
    lockScroll();
    unlockScroll();

    expect(document.body.style.overflow).toBe('');
  });

  it('stays locked until every nested lock is released', () => {
    lockScroll();
    lockScroll();
    unlockScroll();

    expect(document.body.style.overflow).toBe('hidden');

    unlockScroll();

    expect(document.body.style.overflow).toBe('');
  });

  it('ignores extra unlocks, so the next lock still takes effect', () => {
    unlockScroll();
    unlockScroll();
    lockScroll();

    expect(document.body.style.overflow).toBe('hidden');
  });
});
