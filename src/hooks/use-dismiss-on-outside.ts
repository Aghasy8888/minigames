export type UseDismissOnOutsideOptions = {
  root: HTMLElement;
  isActive: () => boolean;
  onDismiss: (reason: 'outside-click' | 'escape') => void;
};

/** Calls `onDismiss` on a document click outside `root` or on Escape while `isActive()`. */
export function useDismissOnOutside({
  root,
  isActive,
  onDismiss,
}: UseDismissOnOutsideOptions): () => void {
  const onClick = (event: MouseEvent): void => {
    const target = event.target;
    if (isActive() && target instanceof Node && !root.contains(target)) {
      onDismiss('outside-click');
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && isActive()) {
      onDismiss('escape');
    }
  };

  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeyDown);

  return () => {
    document.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKeyDown);
  };
}
