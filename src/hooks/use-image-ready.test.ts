// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { useImageReady } from './use-image-ready';

let image: HTMLImageElement;
let onReady: Mock<() => void>;
let onError: Mock<() => void>;

function stubImage({ complete, naturalWidth }: { complete: boolean; naturalWidth: number }): void {
  vi.spyOn(image, 'complete', 'get').mockReturnValue(complete);
  vi.spyOn(image, 'naturalWidth', 'get').mockReturnValue(naturalWidth);
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  image = document.createElement('img');
  onReady = vi.fn();
  onError = vi.fn();
});

describe('useImageReady', () => {
  it('reports ready after a cached image is decoded', async () => {
    stubImage({ complete: true, naturalWidth: 640 });
    const decode = vi.spyOn(image, 'decode').mockResolvedValue();

    useImageReady(image, { onReady, onError });
    await flushMicrotasks();

    expect(decode).toHaveBeenCalledOnce();
    expect(onReady).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it('still reports ready when decoding fails', async () => {
    stubImage({ complete: true, naturalWidth: 640 });
    vi.spyOn(image, 'decode').mockRejectedValue(new DOMException('Decode failed', 'EncodingError'));

    useImageReady(image, { onReady, onError });
    await flushMicrotasks();

    expect(onReady).toHaveBeenCalledOnce();
  });

  it('reports an error right away for a broken cached image', async () => {
    stubImage({ complete: true, naturalWidth: 0 });

    useImageReady(image, { onReady, onError });
    await flushMicrotasks();

    expect(onError).toHaveBeenCalledOnce();
    expect(onReady).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'a loaded', naturalWidth: 640, ready: 1, errors: 0 },
    { name: 'a broken', naturalWidth: 0, ready: 0, errors: 1 },
  ])(
    'reports $name cached image once and ignores later events',
    async ({ naturalWidth, ready, errors }) => {
      stubImage({ complete: true, naturalWidth });
      vi.spyOn(image, 'decode').mockResolvedValue();

      useImageReady(image, { onReady, onError });
      image.dispatchEvent(new Event('load'));
      image.dispatchEvent(new Event('error'));
      await flushMicrotasks();

      expect(onReady).toHaveBeenCalledTimes(ready);
      expect(onError).toHaveBeenCalledTimes(errors);
    },
  );

  it('waits for a loading image and reports ready once', async () => {
    stubImage({ complete: false, naturalWidth: 0 });
    vi.spyOn(image, 'decode').mockResolvedValue();

    useImageReady(image, { onReady, onError });
    await flushMicrotasks();
    expect(onReady).not.toHaveBeenCalled();

    image.dispatchEvent(new Event('load'));
    image.dispatchEvent(new Event('load'));
    await flushMicrotasks();

    expect(onReady).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports an error once when a loading image fails', async () => {
    stubImage({ complete: false, naturalWidth: 0 });

    useImageReady(image, { onReady, onError });
    image.dispatchEvent(new Event('error'));
    image.dispatchEvent(new Event('error'));
    await flushMicrotasks();

    expect(onError).toHaveBeenCalledOnce();
    expect(onReady).not.toHaveBeenCalled();
  });
});
