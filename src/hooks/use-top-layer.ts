const supportsPopover = 'showPopover' in HTMLElement.prototype;

let host: HTMLElement | undefined;
const modalStack: HTMLElement[] = [];

/**
 * Puts the snackbar host in the topmost open modal (or `body`) and re-shows the popover.
 * A modal makes the rest of the document inert, so a body-level popover is visible but not
 * clickable. Appending into the modal keeps Close working.
 */
function place(): void {
  if (!host) {
    return;
  }

  const parent = modalStack.at(-1) ?? document.body;

  if (host.parentElement !== parent) {
    parent.append(host);
  }

  if (!supportsPopover || !host.isConnected) {
    return;
  }

  if (host.matches(':popover-open')) {
    host.hidePopover();
  }

  host.showPopover();
}

/** After `showModal()`: this dialog is the clickable parent and the newest top-layer entry. */
export function raiseTopLayer(modal: HTMLElement): void {
  const index = modalStack.indexOf(modal);

  if (index !== -1) {
    modalStack.splice(index, 1);
  }

  modalStack.push(modal);
  place();
}

/** After `close()`: drop this dialog; the host moves to the remaining modal or `body`. */
export function releaseTopLayer(modal: HTMLElement): void {
  const index = modalStack.indexOf(modal);

  if (index !== -1) {
    modalStack.splice(index, 1);
  }

  place();
}

/** Registers the one snackbar host and shows it once it is in the document. */
export function useTopLayer(element: HTMLElement): () => void {
  host = element;
  queueMicrotask(place);

  return () => {
    if (host === element) {
      host = undefined;
      modalStack.length = 0;
    }
  };
}
