export type PointerInit = {
  pointerId?: number;
  clientX?: number;
  clientY?: number;
  pointerType?: string;
  button?: number;
};

/** Dispatches a bubbling pointer event; defaults to the primary touch pointer at the origin. */
export function dispatchPointer(
  target: EventTarget,
  type: 'pointerdown' | 'pointerup' | 'pointercancel',
  { pointerId = 1, clientX = 0, clientY = 0, pointerType = 'touch', button = 0 }: PointerInit = {},
): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId,
      clientX,
      clientY,
      pointerType,
      button,
    }),
  );
}
