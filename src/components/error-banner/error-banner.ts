import { warningIcon } from '../../assets/icons';
import { createButton } from '../button';
import { ERROR_BANNER_DEFAULT_RETRY_LABEL, ERROR_BANNER_DEFAULT_TITLE } from './error-banner-data';
import './error-banner.scss';

export type CreateErrorBannerOptions = {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry: () => void;
};

export function createErrorBanner({
  title = ERROR_BANNER_DEFAULT_TITLE,
  message,
  retryLabel = ERROR_BANNER_DEFAULT_RETRY_LABEL,
  onRetry,
}: CreateErrorBannerOptions): HTMLElement {
  const banner = document.createElement('section');
  banner.className = 'error-banner';
  banner.setAttribute('role', 'alert');

  const icon = document.createElement('img');
  icon.className = 'error-banner__icon';
  icon.src = warningIcon;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');

  const body = document.createElement('div');
  body.className = 'error-banner__body';

  const heading = document.createElement('h3');
  heading.className = 'error-banner__title';
  heading.textContent = title;

  const text = document.createElement('p');
  text.className = 'error-banner__message';
  text.textContent = message;

  body.append(heading, text);

  const retryButton = createButton({
    label: retryLabel,
    variant: 'primary',
    onClick: () => {
      onRetry();
    },
  });
  retryButton.classList.add('error-banner__retry');

  banner.append(icon, body, retryButton);
  return banner;
}
