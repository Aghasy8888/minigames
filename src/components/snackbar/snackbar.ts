import { checkIcon, closeDarkIcon, errorIcon, infoIcon, warningIcon } from '../../assets/icons';
import { usePausableTimer } from '../../hooks/use-pausable-timer';
import { useTopLayer } from '../../hooks/use-top-layer';
import {
  dismissSnackbar,
  subscribeSnackbars,
  type SnackbarItem,
  type SnackbarVariant,
} from '../../store/snackbar-store';
import { SNACKBAR_CLOSE_LABEL, SNACKBAR_VARIANT_ROLE } from './snackbar-data';
import './snackbar.scss';

const SNACKBAR_ICONS: Record<SnackbarVariant, string> = {
  success: checkIcon,
  error: errorIcon,
  warning: warningIcon,
  info: infoIcon,
};

type MountedSnackbar = {
  element: HTMLElement;
  destroy: () => void;
};

function createSnackbarItem(item: SnackbarItem): MountedSnackbar {
  const toast = document.createElement('div');
  toast.className = `snackbar snackbar--${item.variant}`;
  toast.setAttribute('role', SNACKBAR_VARIANT_ROLE[item.variant]);

  const icon = document.createElement('img');
  icon.className = 'snackbar__icon';
  icon.src = SNACKBAR_ICONS[item.variant];
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');

  const message = document.createElement('p');
  message.className = 'snackbar__message';
  message.textContent = item.message;

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'snackbar__close';
  closeButton.setAttribute('aria-label', SNACKBAR_CLOSE_LABEL);

  const closeIcon = document.createElement('img');
  closeIcon.className = 'snackbar__close-icon';
  closeIcon.src = closeDarkIcon;
  closeIcon.alt = '';
  closeIcon.setAttribute('aria-hidden', 'true');
  closeButton.append(closeIcon);

  toast.append(icon, message, closeButton);

  const timer = usePausableTimer({
    durationMs: item.durationMs,
    onTick() {
      dismissSnackbar(item.id);
    },
  });

  function onMouseEnter(): void {
    timer.pause();
  }

  function onMouseLeave(): void {
    timer.resume();
  }

  function onFocusIn(): void {
    timer.pause();
  }

  function onFocusOut(event: FocusEvent): void {
    if (event.relatedTarget instanceof Node && toast.contains(event.relatedTarget)) {
      return;
    }

    timer.resume();
  }

  function onClose(): void {
    dismissSnackbar(item.id);
  }

  toast.addEventListener('mouseenter', onMouseEnter);
  toast.addEventListener('mouseleave', onMouseLeave);
  toast.addEventListener('focusin', onFocusIn);
  toast.addEventListener('focusout', onFocusOut);
  closeButton.addEventListener('click', onClose);
  timer.reset();

  return {
    element: toast,
    destroy() {
      timer.destroy();
      toast.removeEventListener('mouseenter', onMouseEnter);
      toast.removeEventListener('mouseleave', onMouseLeave);
      toast.removeEventListener('focusin', onFocusIn);
      toast.removeEventListener('focusout', onFocusOut);
      closeButton.removeEventListener('click', onClose);
    },
  };
}

export function createSnackbarHost(): HTMLElement {
  const host = document.createElement('div');
  host.className = 'snackbar-host';
  host.setAttribute('popover', 'manual');
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('aria-relevant', 'additions text');

  const mounted = new Map<string, MountedSnackbar>();

  function sync(items: readonly SnackbarItem[]): void {
    const visibleIds = new Set(items.map((item) => item.id));

    for (const [id, entry] of mounted) {
      if (visibleIds.has(id)) {
        continue;
      }

      entry.destroy();
      entry.element.remove();
      mounted.delete(id);
    }

    for (const item of items) {
      if (mounted.has(item.id)) {
        continue;
      }

      const entry = createSnackbarItem(item);
      mounted.set(item.id, entry);
      host.append(entry.element);
    }
  }

  subscribeSnackbars(sync);
  useTopLayer(host);

  return host;
}
