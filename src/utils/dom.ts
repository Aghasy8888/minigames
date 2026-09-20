export function qs<T extends Element>(selector: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(selector);
}

export function clearChildren(element: HTMLElement): void {
  element.replaceChildren();
}
