export type SnackbarVariant = 'success' | 'error' | 'warning' | 'info';

export type ShowSnackbarOptions = {
  variant: SnackbarVariant;
  message: string;
  durationMs?: number;
};

export type SnackbarItem = {
  id: string;
  variant: SnackbarVariant;
  message: string;
  durationMs: number;
};

const DEFAULT_DURATION_MS = 5000;
const ERROR_DURATION_MS = 7000;
const MAX_VISIBLE = 3;

type SnackbarListener = (items: readonly SnackbarItem[]) => void;

let nextId = 0;
let items: SnackbarItem[] = [];
const listeners = new Set<SnackbarListener>();

function notify(): void {
  for (const listener of listeners) {
    listener(items);
  }
}

export function getSnackbars(): readonly SnackbarItem[] {
  return items;
}

export function showSnackbar({ variant, message, durationMs }: ShowSnackbarOptions): string {
  const id = String(++nextId);
  const item: SnackbarItem = {
    id,
    variant,
    message,
    durationMs: durationMs ?? (variant === 'error' ? ERROR_DURATION_MS : DEFAULT_DURATION_MS),
  };

  items = [...items, item].slice(-MAX_VISIBLE);
  notify();
  return id;
}

export function dismissSnackbar(id: string): void {
  const nextItems = items.filter((item) => item.id !== id);

  if (nextItems.length === items.length) {
    return;
  }

  items = nextItems;
  notify();
}

export function subscribeSnackbars(listener: SnackbarListener): () => void {
  listeners.add(listener);
  listener(items);

  return () => {
    listeners.delete(listener);
  };
}
