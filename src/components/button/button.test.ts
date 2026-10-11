// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';

import { clearButtonLoading, createButton, setButtonLoading, type CreateButtonOptions } from '.';

function createIcon(): HTMLImageElement {
  const icon = document.createElement('img');
  icon.alt = '';
  return icon;
}

function childClasses(button: HTMLButtonElement): string[] {
  return [...button.children].map((child) => child.className);
}

function labelText(button: HTMLButtonElement): string | null | undefined {
  return button.querySelector('.button__label')?.textContent;
}

describe('createButton', () => {
  it('renders a medium primary button by default, labelled by its text', () => {
    const button = createButton({ label: 'Play' });

    expect(button.className).toBe('button button--primary button--medium');
    expect(button.type).toBe('button');
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-label')).toBe('Play');
    expect(labelText(button)).toBe('Play');
  });

  it('applies the variant, size, type, disabled state, and extra class names', () => {
    const button = createButton({
      label: 'Create Account',
      variant: 'secondary',
      size: 'large',
      type: 'submit',
      disabled: true,
      className: 'button--block button--raised',
    });

    expect(button.className).toBe(
      'button button--secondary button--large button--block button--raised',
    );
    expect(button.type).toBe('submit');
    expect(button.disabled).toBe(true);
  });

  it('prefers ariaLabel over the visible label as the accessible name', () => {
    const button = createButton({ label: 'More', ariaLabel: 'Show more games' });

    expect(button.getAttribute('aria-label')).toBe('Show more games');
    expect(labelText(button)).toBe('More');
  });

  it.each<{ name: string; position: CreateButtonOptions['iconPosition']; order: string[] }>([
    { name: 'start (default)', position: undefined, order: ['button__icon', 'button__label'] },
    { name: 'start', position: 'start', order: ['button__icon', 'button__label'] },
    { name: 'end', position: 'end', order: ['button__label', 'button__icon'] },
  ])('places the icon at the $name of the label', ({ position, order }) => {
    const icon = createIcon();
    const button = createButton({ label: 'Next', icon, iconPosition: position });

    expect(childClasses(button)).toStrictEqual(order);
    expect(button.querySelector('.button__icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(icon.parentElement?.className).toBe('button__icon');
  });

  it('renders only the icon for an icon-size button, even when a label is given', () => {
    const button = createButton({
      label: 'Close',
      ariaLabel: 'Close dialog',
      size: 'icon',
      icon: createIcon(),
    });

    expect(childClasses(button)).toStrictEqual(['button__icon']);
    expect(button.getAttribute('aria-label')).toBe('Close dialog');
  });

  it('renders an icon-only button without a label element when there is no label', () => {
    const button = createButton({ ariaLabel: 'Favorite', icon: createIcon() });

    expect(childClasses(button)).toStrictEqual(['button__icon']);
  });

  it.each<{ name: string; options: CreateButtonOptions; message: string }>([
    {
      name: 'no label and no ariaLabel',
      options: {},
      message: 'createButton: provide label or ariaLabel',
    },
    {
      name: 'an empty label',
      options: { label: '' },
      message: 'createButton: provide label or ariaLabel',
    },
    {
      name: 'an icon size without an accessible name',
      options: { size: 'icon', icon: createIcon() },
      message: 'createButton: ariaLabel is required when size is "icon"',
    },
    {
      name: 'an icon size without an icon',
      options: { size: 'icon', ariaLabel: 'Close' },
      message: 'createButton: icon is required when size is "icon"',
    },
    {
      name: 'an icon size with a label but no icon',
      options: { size: 'icon', label: 'Close' },
      message: 'createButton: icon is required when size is "icon"',
    },
  ])('throws for $name', ({ options, message }) => {
    expect(() => createButton(options)).toThrow(message);
  });

  it('calls onClick with the click event', () => {
    const onClick = vi.fn<(event: MouseEvent) => void>();
    const button = createButton({ label: 'Play', onClick });

    button.click();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]?.[0].type).toBe('click');
  });
});

describe('setButtonLoading', () => {
  it('locks the button, marks it busy, and shows the loading label', () => {
    const button = createButton({ label: 'Login' });

    setButtonLoading(button, 'Logging in…');

    expect(button.disabled).toBe(true);
    expect(button.classList.contains('button--loading')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Logging in…');
    expect(labelText(button)).toBe('Logging in…');
  });

  it('keeps the current label when no loading label is given', () => {
    const button = createButton({ label: 'Send' });

    setButtonLoading(button);

    expect(button.getAttribute('aria-label')).toBe('Send');
    expect(labelText(button)).toBe('Send');
  });

  it('prepends the spinner to a button without an icon', () => {
    const button = createButton({ label: 'Login' });

    setButtonLoading(button);

    expect(childClasses(button)).toStrictEqual(['button__spinner', 'button__label']);
    expect(button.querySelector('.button__spinner')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('puts the spinner inside the icon wrapper so it replaces the icon visually', () => {
    const button = createButton({ label: 'Continue with Google', icon: createIcon() });

    setButtonLoading(button);

    expect(button.querySelector('.button__spinner')?.parentElement?.className).toBe('button__icon');
  });

  it('adds only one spinner when called repeatedly', () => {
    const button = createButton({ label: 'Continue', icon: createIcon() });

    setButtonLoading(button, 'Waiting…');
    setButtonLoading(button, 'Checking…');

    expect(button.querySelectorAll('.button__spinner')).toHaveLength(1);
    expect(labelText(button)).toBe('Checking…');
  });

  it('remembers the original labels from the first call only', () => {
    const button = createButton({ label: 'Continue', ariaLabel: 'Continue with Google' });

    setButtonLoading(button, 'Waiting…');
    setButtonLoading(button, 'Checking…');
    clearButtonLoading(button);

    expect(button.getAttribute('aria-label')).toBe('Continue with Google');
    expect(labelText(button)).toBe('Continue');
  });
});

describe('clearButtonLoading', () => {
  it('restores the labels and removes the spinner, loading class, and busy flag', () => {
    const button = createButton({ label: 'Login' });
    setButtonLoading(button, 'Logging in…');

    clearButtonLoading(button);

    expect(button.getAttribute('aria-label')).toBe('Login');
    expect(labelText(button)).toBe('Login');
    expect(button.querySelector('.button__spinner')).toBeNull();
    expect(button.classList.contains('button--loading')).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
  });

  it('forgets the saved labels so the next loading run restores the labels current then', () => {
    const button = createButton({ label: 'Login' });
    setButtonLoading(button, 'Logging in…');
    clearButtonLoading(button);
    button.setAttribute('aria-label', 'Try again');
    const label = button.querySelector('.button__label');
    if (label) {
      label.textContent = 'Retry';
    }

    setButtonLoading(button, 'Logging in…');
    clearButtonLoading(button);

    expect(button.getAttribute('aria-label')).toBe('Try again');
    expect(labelText(button)).toBe('Retry');
  });

  it('leaves re-enabling to the caller, which owns the disabled state', () => {
    const button = createButton({ label: 'Login' });
    setButtonLoading(button);

    clearButtonLoading(button);

    expect(button.disabled).toBe(true);
  });

  it('leaves a button that was never loading unchanged', () => {
    const button = createButton({ label: 'Login', ariaLabel: 'Sign in' });

    clearButtonLoading(button);

    expect(button.getAttribute('aria-label')).toBe('Sign in');
    expect(labelText(button)).toBe('Login');
    expect(button.disabled).toBe(false);
  });
});
