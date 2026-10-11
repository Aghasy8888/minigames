// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';

import { warningIcon } from '../../assets/icons';
import { createErrorBanner } from '.';

function retryButtonOf(banner: HTMLElement): HTMLButtonElement | null {
  return banner.querySelector<HTMLButtonElement>('.error-banner__retry');
}

describe('createErrorBanner', () => {
  it('is an alert with a warning icon, the title, and the message', () => {
    const banner = createErrorBanner({
      title: 'Could not load comments',
      message: 'Comments are unavailable right now.',
      onRetry: vi.fn<() => void>(),
    });
    const icon = banner.querySelector('.error-banner__icon');

    expect(banner.getAttribute('role')).toBe('alert');
    expect(icon?.getAttribute('src')).toBe(warningIcon);
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(banner.querySelector('.error-banner__title')?.textContent).toBe(
      'Could not load comments',
    );
    expect(banner.querySelector('.error-banner__message')?.textContent).toBe(
      'Comments are unavailable right now.',
    );
  });

  it('falls back to a generic title and a Retry label', () => {
    const banner = createErrorBanner({ message: 'Offline.', onRetry: vi.fn<() => void>() });

    expect(banner.querySelector('.error-banner__title')?.textContent).toBe('Something went wrong');
    expect(retryButtonOf(banner)?.textContent).toBe('Retry');
  });

  it('uses a custom retry label', () => {
    const banner = createErrorBanner({
      message: 'Offline.',
      retryLabel: 'Try again',
      onRetry: vi.fn<() => void>(),
    });

    expect(retryButtonOf(banner)?.textContent).toBe('Try again');
  });

  it('calls onRetry once per click, without arguments', () => {
    const onRetry = vi.fn<() => void>();
    const banner = createErrorBanner({ message: 'Offline.', onRetry });

    retryButtonOf(banner)?.click();

    expect(onRetry.mock.calls).toStrictEqual([[]]);
  });

  it('renders the message as text, never as markup', () => {
    const banner = createErrorBanner({ message: '<b>boom</b>', onRetry: vi.fn<() => void>() });

    expect(banner.querySelector('b')).toBeNull();
    expect(banner.querySelector('.error-banner__message')?.textContent).toBe('<b>boom</b>');
  });
});
