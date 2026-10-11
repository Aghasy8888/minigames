// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import {
  createTextField,
  getTextFieldInput,
  setTextFieldDisabled,
  setTextFieldError,
  type CreateTextFieldOptions,
} from '.';

const EMAIL_FIELD: CreateTextFieldOptions = {
  id: 'login-email',
  label: 'Email Address',
  name: 'email',
  type: 'email',
  placeholder: 'you@example.com',
  autocomplete: 'email',
  required: true,
  icon: '/icons/mail.svg',
};

const PASSWORD_FIELD: CreateTextFieldOptions = {
  id: 'login-password',
  label: 'Password',
  name: 'password',
  type: 'password',
  passwordToggle: true,
};

function toggleOf(field: HTMLElement): HTMLButtonElement {
  const toggle = field.querySelector<HTMLButtonElement>('.text-field__toggle');
  if (!toggle) {
    throw new Error('text field has no password toggle');
  }
  return toggle;
}

function errorOf(field: HTMLElement): HTMLElement | null {
  return field.querySelector<HTMLElement>('.text-field__error');
}

describe('createTextField', () => {
  it('links the label to an input carrying the given id, name, type, and required flag', () => {
    const field = createTextField(EMAIL_FIELD);
    const label = field.querySelector('label');
    const input = getTextFieldInput(field);

    expect(field.className).toBe('text-field');
    expect(label?.textContent).toBe('Email Address');
    expect(label?.htmlFor).toBe('login-email');
    expect(input.id).toBe('login-email');
    expect(input.name).toBe('email');
    expect(input.type).toBe('email');
    expect(input.required).toBe(true);
  });

  it('sets the placeholder and autocomplete hints when given', () => {
    const input = getTextFieldInput(createTextField(EMAIL_FIELD));

    expect(input.placeholder).toBe('you@example.com');
    expect(input.getAttribute('autocomplete')).toBe('email');
  });

  it('defaults to an optional text input without placeholder, autocomplete, icon, or toggle', () => {
    const field = createTextField({ id: 'username', label: 'Username', name: 'username' });
    const input = getTextFieldInput(field);

    expect(input.type).toBe('text');
    expect(input.required).toBe(false);
    expect(input.hasAttribute('placeholder')).toBe(false);
    expect(input.hasAttribute('autocomplete')).toBe(false);
    expect(field.querySelector('.text-field__icon')).toBeNull();
    expect(field.querySelector('.text-field__toggle')).toBeNull();
  });

  it('renders a decorative leading icon before the input', () => {
    const field = createTextField(EMAIL_FIELD);
    const control = field.querySelector('.text-field__control');
    const icon = field.querySelector<HTMLImageElement>('.text-field__icon');

    expect(icon?.getAttribute('src')).toBe('/icons/mail.svg');
    expect(icon?.getAttribute('alt')).toBe('');
    expect(control?.firstElementChild).toBe(icon);
  });

  it('starts with a hidden, empty error message whose id derives from the input id', () => {
    const error = errorOf(createTextField(EMAIL_FIELD));

    expect(error?.id).toBe('login-email-error');
    expect(error?.hidden).toBe(true);
    expect(error?.textContent).toBe('');
  });
});

describe('password visibility toggle', () => {
  it('starts as a "Show password" button controlling the input', () => {
    const toggle = toggleOf(createTextField(PASSWORD_FIELD));

    expect(toggle.type).toBe('button');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('login-password');
    expect(toggle.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('reveals the password on the first click', () => {
    const field = createTextField(PASSWORD_FIELD);
    const toggle = toggleOf(field);

    toggle.click();

    expect(getTextFieldInput(field).type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
  });

  it('hides the password again on the second click', () => {
    const field = createTextField(PASSWORD_FIELD);
    const toggle = toggleOf(field);

    toggle.click();
    toggle.click();

    expect(getTextFieldInput(field).type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
  });
});

describe('getTextFieldInput', () => {
  it('throws for an element that is not a text field', () => {
    expect(() => getTextFieldInput(document.createElement('div'))).toThrow(
      'getTextFieldInput: element is not a text field',
    );
  });
});

describe('setTextFieldError', () => {
  it('shows the message and marks the field and input invalid', () => {
    const field = createTextField(EMAIL_FIELD);
    const input = getTextFieldInput(field);

    setTextFieldError(input, 'Enter a valid email address.');

    expect(field.classList.contains('text-field--invalid')).toBe(true);
    expect(errorOf(field)?.textContent).toBe('Enter a valid email address.');
    expect(errorOf(field)?.hidden).toBe(false);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('login-email-error');
  });

  it('clears the error when called without a message', () => {
    const field = createTextField(EMAIL_FIELD);
    const input = getTextFieldInput(field);
    setTextFieldError(input, 'Enter a valid email address.');

    setTextFieldError(input);

    expect(field.classList.contains('text-field--invalid')).toBe(false);
    expect(errorOf(field)?.textContent).toBe('');
    expect(errorOf(field)?.hidden).toBe(true);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('renders the message as text, never as markup', () => {
    const field = createTextField(EMAIL_FIELD);

    setTextFieldError(getTextFieldInput(field), '<b>Required</b>');

    expect(errorOf(field)?.textContent).toBe('<b>Required</b>');
    expect(errorOf(field)?.querySelector('b')).toBeNull();
  });

  it('ignores an input that is not inside a text field', () => {
    const input = document.createElement('input');

    setTextFieldError(input, 'Required');

    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('setTextFieldDisabled', () => {
  it('disables the input together with its password toggle', () => {
    const field = createTextField(PASSWORD_FIELD);
    const input = getTextFieldInput(field);

    setTextFieldDisabled(input, true);

    expect(input.disabled).toBe(true);
    expect(toggleOf(field).disabled).toBe(true);
  });

  it('enables the input and its toggle again', () => {
    const field = createTextField(PASSWORD_FIELD);
    const input = getTextFieldInput(field);
    setTextFieldDisabled(input, true);

    setTextFieldDisabled(input, false);

    expect(input.disabled).toBe(false);
    expect(toggleOf(field).disabled).toBe(false);
  });

  it('disables a field that has no toggle', () => {
    const input = getTextFieldInput(createTextField(EMAIL_FIELD));

    setTextFieldDisabled(input, true);

    expect(input.disabled).toBe(true);
  });
});
