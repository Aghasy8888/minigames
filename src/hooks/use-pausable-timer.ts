export type PausableTimer = {
  pause: () => void;
  resume: () => void;
  reset: () => void;
  destroy: () => void;
};

export type UsePausableTimerOptions = {
  durationMs: number;
  onTick: () => void;
  isActive?: () => boolean;
};

export function usePausableTimer({
  durationMs,
  onTick,
  isActive = () => true,
}: UsePausableTimerOptions): PausableTimer {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let remainingMs = durationMs;
  let startedAt = 0;
  let isPaused = true;
  let isDestroyed = false;

  function clearScheduled(): void {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  }

  function schedule(delayMs: number): void {
    clearScheduled();

    if (isDestroyed || !isActive()) {
      return;
    }

    remainingMs = delayMs;
    startedAt = Date.now();
    isPaused = false;

    timeoutId = setTimeout(() => {
      timeoutId = undefined;

      if (isDestroyed || !isActive()) {
        destroy();
        return;
      }

      onTick();

      if (!isDestroyed && isActive()) {
        schedule(durationMs);
      }
    }, delayMs);
  }

  function pause(): void {
    if (isDestroyed || isPaused) {
      return;
    }

    remainingMs = Math.max(0, remainingMs - (Date.now() - startedAt));
    isPaused = true;
    clearScheduled();
  }

  function resume(): void {
    if (isDestroyed || !isPaused) {
      return;
    }

    schedule(remainingMs);
  }

  function reset(): void {
    if (isDestroyed) {
      return;
    }

    schedule(durationMs);
  }

  function destroy(): void {
    isDestroyed = true;
    isPaused = true;
    clearScheduled();
  }

  return { pause, resume, reset, destroy };
}
