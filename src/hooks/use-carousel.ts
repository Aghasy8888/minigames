import { wrapIndex } from '../utils/circular-index';
import { usePausableTimer } from './use-pausable-timer';
import { usePointerSwipe } from './use-pointer-swipe';

export type CarouselDirection = 'prev' | 'next';

export type UseCarouselOptions = {
  track: HTMLElement;
  itemCount: number;
  previousButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  autoplayMs: number;
  swipeThresholdPx: number;
  tapMaxMs: number;
  isActive: () => boolean;
  onIndexChange: (index: number, animate: boolean) => void;
  onTap?: (target: Element) => void;
};

export type Carousel = {
  destroy: () => void;
};

/** Circular carousel behavior: autoplay, prev/next buttons, swipe, quick tap. Rendering stays with the caller. */
export function useCarousel({
  track,
  itemCount,
  previousButton,
  nextButton,
  autoplayMs,
  swipeThresholdPx,
  tapMaxMs,
  isActive,
  onIndexChange,
  onTap,
}: UseCarouselOptions): Carousel {
  let index = 0;
  onIndexChange(index, false);

  function step(direction: CarouselDirection): void {
    index = wrapIndex(index + (direction === 'next' ? 1 : -1), itemCount);
    onIndexChange(index, true);
  }

  const autoplay = usePausableTimer({
    durationMs: autoplayMs,
    onTick() {
      step('next');
    },
    isActive,
  });

  function onPrevious(): void {
    step('prev');
    autoplay.reset();
  }

  function onNext(): void {
    step('next');
    autoplay.reset();
  }

  previousButton.addEventListener('click', onPrevious);
  nextButton.addEventListener('click', onNext);

  const swipe = usePointerSwipe(track, {
    thresholdPx: swipeThresholdPx,
    onHold() {
      autoplay.pause();
    },
    onRelease({ didSwipe, direction, isTap, heldMs, pressTarget }) {
      if (didSwipe && direction) {
        step(direction);
        autoplay.reset();
        return;
      }

      autoplay.resume();

      if (isTap && heldMs <= tapMaxMs && pressTarget instanceof Element) {
        onTap?.(pressTarget);
      }
    },
  });

  autoplay.reset();

  return {
    destroy() {
      autoplay.destroy();
      swipe.destroy();
      previousButton.removeEventListener('click', onPrevious);
      nextButton.removeEventListener('click', onNext);
    },
  };
}
