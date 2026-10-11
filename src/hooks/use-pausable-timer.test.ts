import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePausableTimer, type PausableTimer } from './use-pausable-timer';

const DURATION_MS = 5000;

const timers: PausableTimer[] = [];

function createTimer(isActive?: () => boolean): { timer: PausableTimer; onTick: () => void } {
  const onTick = vi.fn<() => void>();
  const timer = usePausableTimer({ durationMs: DURATION_MS, onTick, isActive });
  timers.push(timer);
  return { timer, onTick };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  for (const timer of timers.splice(0)) {
    timer.destroy();
  }
  vi.useRealTimers();
});

describe('usePausableTimer', () => {
  it('stays idle until it is started', () => {
    const { onTick } = createTimer();

    vi.advanceTimersByTime(DURATION_MS * 3);

    expect(onTick).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'resume', start: (timer: PausableTimer) => timer.resume() },
    { name: 'reset', start: (timer: PausableTimer) => timer.reset() },
  ])('ticks once per full duration after $name', ({ start }) => {
    const { timer, onTick } = createTimer();

    start(timer);
    vi.advanceTimersByTime(DURATION_MS - 1);

    expect(onTick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(onTick).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(DURATION_MS);

    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it('pausing freezes the remaining time and resuming continues from it', () => {
    const { timer, onTick } = createTimer();
    timer.resume();
    vi.advanceTimersByTime(3000);

    timer.pause();
    vi.advanceTimersByTime(DURATION_MS * 2);

    expect(onTick).not.toHaveBeenCalled();

    timer.resume();
    vi.advanceTimersByTime(1999);

    expect(onTick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('counts each pause from the latest resume', () => {
    const { timer, onTick } = createTimer();
    timer.resume();
    vi.advanceTimersByTime(1000);
    timer.pause();
    timer.resume();
    vi.advanceTimersByTime(1000);
    timer.pause();

    timer.resume();
    vi.advanceTimersByTime(2999);

    expect(onTick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('ignores a second pause', () => {
    const { timer, onTick } = createTimer();
    timer.resume();
    vi.advanceTimersByTime(3000);
    timer.pause();
    vi.advanceTimersByTime(1000);
    timer.pause();

    timer.resume();
    vi.advanceTimersByTime(1999);

    expect(onTick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('ignores resume while already running', () => {
    const { timer, onTick } = createTimer();
    timer.resume();
    vi.advanceTimersByTime(3000);

    timer.resume();
    vi.advanceTimersByTime(2000);

    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('measures a pause after a tick from the full duration', () => {
    const { timer, onTick } = createTimer();
    timer.resume();
    vi.advanceTimersByTime(1000);
    timer.pause();
    timer.resume();
    vi.advanceTimersByTime(4000);
    expect(onTick).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    timer.pause();
    timer.resume();
    vi.advanceTimersByTime(3999);

    expect(onTick).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);

    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it('reset after a pause restarts the full duration', () => {
    const { timer, onTick } = createTimer();
    timer.resume();
    vi.advanceTimersByTime(3000);
    timer.pause();

    timer.reset();
    vi.advanceTimersByTime(DURATION_MS - 1);

    expect(onTick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('reset restarts the full duration', () => {
    const { timer, onTick } = createTimer();
    timer.resume();
    vi.advanceTimersByTime(4000);

    timer.reset();
    vi.advanceTimersByTime(DURATION_MS - 1);

    expect(onTick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('never ticks after destroy, and ignores later calls', () => {
    const { timer, onTick } = createTimer();
    timer.resume();

    timer.destroy();

    expect(vi.getTimerCount()).toBe(0);

    timer.resume();
    timer.reset();
    vi.advanceTimersByTime(DURATION_MS * 2);

    expect(onTick).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not start while inactive, and can start once active again', () => {
    let active = false;
    const { timer, onTick } = createTimer(() => active);

    timer.resume();

    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(DURATION_MS);
    active = true;
    timer.resume();
    vi.advanceTimersByTime(DURATION_MS);

    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('destroys itself instead of ticking when it became inactive while waiting', () => {
    let active = true;
    const { timer, onTick } = createTimer(() => active);
    timer.resume();

    active = false;
    vi.advanceTimersByTime(DURATION_MS);
    active = true;
    timer.reset();
    vi.advanceTimersByTime(DURATION_MS);

    expect(onTick).not.toHaveBeenCalled();
  });

  it('stops repeating when it becomes inactive during a tick', () => {
    let active = true;
    const onTick = vi.fn(() => {
      active = false;
    });
    const timer = usePausableTimer({ durationMs: DURATION_MS, onTick, isActive: () => active });
    timers.push(timer);
    timer.resume();

    vi.advanceTimersByTime(DURATION_MS * 3);

    expect(onTick).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops repeating when onTick destroys the timer', () => {
    const holder: { timer?: PausableTimer } = {};
    const onTick = vi.fn(() => holder.timer?.destroy());
    holder.timer = usePausableTimer({ durationMs: DURATION_MS, onTick });
    timers.push(holder.timer);
    holder.timer.resume();

    vi.advanceTimersByTime(DURATION_MS * 3);

    expect(onTick).toHaveBeenCalledTimes(1);
  });
});
