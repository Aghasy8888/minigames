import './skeleton.scss';

export type CreateSkeletonOptions = {
  className?: string;
};

export function createSkeleton({ className }: CreateSkeletonOptions = {}): HTMLElement {
  const block = document.createElement('div');
  block.className = ['skeleton', className].filter(Boolean).join(' ');
  block.setAttribute('aria-hidden', 'true');
  return block;
}
