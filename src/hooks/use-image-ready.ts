export type UseImageReadyOptions = {
  onReady: () => void;
  onError: () => void;
};

/** Calls `onReady` once the image is loaded and decoded, or `onError` if it can't load. */
export function useImageReady(
  image: HTMLImageElement,
  { onReady, onError }: UseImageReadyOptions,
): void {
  function reveal(): void {
    void image.decode().then(onReady, onReady);
  }

  if (image.complete) {
    if (image.naturalWidth === 0) {
      onError();
    } else {
      reveal();
    }
    return;
  }

  image.addEventListener('load', reveal, { once: true });
  image.addEventListener('error', onError, { once: true });
}
