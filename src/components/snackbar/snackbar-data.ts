import type { SnackbarVariant } from '../../store/snackbar-store';

export const SNACKBAR_CLOSE_LABEL = 'Close notification';

export const SNACKBAR_VARIANT_ROLE: Record<SnackbarVariant, 'alert' | 'status'> = {
  success: 'status',
  info: 'status',
  error: 'alert',
  warning: 'alert',
};
