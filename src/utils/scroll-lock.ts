let lockCount = 0;

export function lockScroll(): void {
  lockCount += 1;

  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
  }
}

export function unlockScroll(): void {
  if (lockCount === 0) {
    return;
  }

  lockCount -= 1;

  if (lockCount === 0) {
    document.body.style.overflow = '';
  }
}
