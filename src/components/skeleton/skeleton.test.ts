// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSkeleton, fadeOutSkeleton } from '.';

const FADE_MS = 300;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('createSkeleton', () => {
  it('renders a decorative block hidden from assistive technology', () => {
    const block = createSkeleton();

    expect(block.className).toBe('skeleton');
    expect(block.getAttribute('aria-hidden')).toBe('true');
  });

  it('adds the given class names', () => {
    expect(createSkeleton({ className: 'comments__skeleton' }).className).toBe(
      'skeleton comments__skeleton',
    );
  });
});

describe('fadeOutSkeleton', () => {
  it('starts the fade-out at once and removes the block after it', () => {
    const block = createSkeleton();
    document.body.append(block);

    fadeOutSkeleton(block);
    expect(block.classList.contains('skeleton--fade-out')).toBe(true);

    vi.advanceTimersByTime(FADE_MS - 1);
    expect(block.isConnected).toBe(true);

    vi.advanceTimersByTime(1);
    expect(block.isConnected).toBe(false);
  });
});
