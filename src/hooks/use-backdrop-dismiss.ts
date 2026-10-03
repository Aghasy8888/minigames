/**
 * Calls `onDismiss` when a press both starts and ends on the modal backdrop. A click from a
 * gesture that began elsewhere (e.g. the tap that opened the dialog) must not dismiss it.
 */
export function useBackdropDismiss(dialog: HTMLDialogElement, onDismiss: () => void): () => void {
  let pressStartedOnBackdrop = false;

  function onPointerDown(event: PointerEvent): void {
    pressStartedOnBackdrop = event.target === dialog;
  }

  function onClick(event: MouseEvent): void {
    const shouldDismiss = pressStartedOnBackdrop && event.target === dialog;
    pressStartedOnBackdrop = false;

    if (shouldDismiss) {
      onDismiss();
    }
  }

  dialog.addEventListener('pointerdown', onPointerDown);
  dialog.addEventListener('click', onClick);

  return () => {
    dialog.removeEventListener('pointerdown', onPointerDown);
    dialog.removeEventListener('click', onClick);
  };
}
