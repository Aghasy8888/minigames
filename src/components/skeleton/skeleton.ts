import './skeleton.scss';

const SKELETON_FADE_MS = 300;

export type CreateSkeletonOptions = {
  className?: string;
};

export function createSkeleton({ className }: CreateSkeletonOptions = {}): HTMLElement {
  const block = document.createElement('div');
  block.className = ['skeleton', className].filter(Boolean).join(' ');
  block.setAttribute('aria-hidden', 'true');
  return block;
}

export function fadeOutSkeleton(skeleton: HTMLElement): void {
  skeleton.classList.add('skeleton--fade-out');
  globalThis.setTimeout(() => {
    skeleton.remove();
  }, SKELETON_FADE_MS);
}
