export type AutoResizeTextarea = {
  resize: () => void;
};

/** Grows the textarea with its content up to its CSS `max-height`, then scrolls internally. */
export function useAutoResizeTextarea(textarea: HTMLTextAreaElement): AutoResizeTextarea {
  function resize(): void {
    textarea.style.height = 'auto';

    const styles = globalThis.getComputedStyle(textarea);
    const borders =
      Number.parseFloat(styles.borderTopWidth) + Number.parseFloat(styles.borderBottomWidth);
    const maxHeight = Number.parseFloat(styles.maxHeight);
    const contentHeight = textarea.scrollHeight + borders;
    const hasMaxHeight = Number.isFinite(maxHeight);
    const isOverflowing = hasMaxHeight && contentHeight > maxHeight;

    textarea.style.height = `${isOverflowing ? maxHeight : contentHeight}px`;
    textarea.style.overflowY = isOverflowing ? 'auto' : 'hidden';
  }

  textarea.addEventListener('input', resize);

  return { resize };
}
