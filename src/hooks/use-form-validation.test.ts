// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import {
  AUTH_VALIDATION_MESSAGES as messages,
  validateConfirmPassword,
  validateEmail,
  validateLoginPassword,
  validateRegisterPassword,
} from '../utils/auth-validation';
import {
  useFormValidation,
  type FieldValues,
  type FormValidation,
  type ValidatedField,
} from './use-form-validation';

type FieldSpec = Omit<ValidatedField, 'input'>;

type TestForm = {
  form: HTMLFormElement;
  submit: HTMLButtonElement;
  inputs: Record<string, HTMLInputElement>;
  toggles: Record<string, HTMLButtonElement>;
  validation: FormValidation;
  onValid: Mock<(values: FieldValues) => void>;
  /** Last message passed to `onFieldError` per field; a key is present once it was called. */
  errors: Map<string, string | undefined>;
};

const LOGIN_FIELDS: Record<string, FieldSpec> = {
  email: { validate: validateEmail },
  password: { validate: validateLoginPassword },
};

const REGISTER_FIELDS: Record<string, FieldSpec> = {
  email: { validate: validateEmail },
  password: { validate: validateRegisterPassword, revalidates: ['confirmPassword'] },
  confirmPassword: {
    validate: (value, values) => validateConfirmPassword(value, values.password ?? ''),
  },
};

const VALID_EMAIL = 'alex@minigames.com';
const STRONG_PASSWORD = 'Abc12!';

function createTestForm(specs: Record<string, FieldSpec>): TestForm {
  const form = document.createElement('form');
  const submit = document.createElement('button');
  submit.type = 'submit';
  const inputs: Record<string, HTMLInputElement> = {};
  const toggles: Record<string, HTMLButtonElement> = {};
  const fields: Record<string, ValidatedField> = {};

  for (const [name, spec] of Object.entries(specs)) {
    const wrapper = document.createElement('div');
    wrapper.className = 'text-field';
    const input = document.createElement('input');
    input.name = name;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'text-field__toggle';
    wrapper.append(input, toggle);
    form.append(wrapper);
    inputs[name] = input;
    toggles[name] = toggle;
    fields[name] = { ...spec, input };
  }

  form.append(submit);
  document.body.append(form);

  const errors = new Map<string, string | undefined>();
  const onValid = vi.fn<(values: FieldValues) => void>();
  const validation = useFormValidation({
    form,
    fields,
    submit,
    onFieldError: (input, message) => errors.set(input.name, message),
    onValid,
  });

  return { form, submit, inputs, toggles, validation, onValid, errors };
}

function fill(input: HTMLInputElement, value: string, type = 'input'): void {
  input.value = value;
  input.dispatchEvent(new Event(type));
}

function submitForm(form: HTMLFormElement): Event {
  const event = new Event('submit', { cancelable: true });
  form.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  document.body.replaceChildren();
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('useFormValidation', () => {
  it('starts with submit disabled and no errors shown', () => {
    const { submit, errors } = createTestForm(LOGIN_FIELDS);

    expect(submit.disabled).toBe(true);
    expect(errors.size).toBe(0);
  });

  it.each(['input', 'change', 'blur'])('validates a field on %s', (type) => {
    const { inputs, errors } = createTestForm(LOGIN_FIELDS);

    fill(inputs.email!, 'not-an-email', type);

    expect(errors.get('email')).toBe(messages.emailFormat);
  });

  it('clears the error once the value becomes valid', () => {
    const { inputs, errors } = createTestForm(LOGIN_FIELDS);

    fill(inputs.email!, 'alex@');
    fill(inputs.email!, VALID_EMAIL);

    expect(errors.has('email')).toBe(true);
    expect(errors.get('email')).toBeUndefined();
  });

  it('shows no error for fields the user has not touched yet', () => {
    const { inputs, errors } = createTestForm(LOGIN_FIELDS);

    fill(inputs.email!, VALID_EMAIL);

    expect(errors.has('password')).toBe(false);
  });

  it.each([
    { name: 'both fields empty', email: '', password: '', disabled: true },
    { name: 'an invalid email', email: 'alex@minigames', password: 'abcdef', disabled: true },
    { name: 'a 5-character password', email: VALID_EMAIL, password: 'abcde', disabled: true },
    {
      name: 'a weak 6-character password',
      email: VALID_EMAIL,
      password: 'abcdef',
      disabled: false,
    },
  ])('login submit with $name is disabled: $disabled', ({ email, password, disabled }) => {
    const { inputs, submit } = createTestForm(LOGIN_FIELDS);

    fill(inputs.email!, email);
    fill(inputs.password!, password);

    expect(submit.disabled).toBe(disabled);
  });

  it('keeps submit disabled while an untouched field is still invalid', () => {
    const { inputs, submit } = createTestForm(REGISTER_FIELDS);

    fill(inputs.email!, VALID_EMAIL);
    fill(inputs.password!, STRONG_PASSWORD);

    expect(submit.disabled).toBe(true);

    fill(inputs.confirmPassword!, STRONG_PASSWORD);

    expect(submit.disabled).toBe(false);
  });

  describe('confirm password', () => {
    it('is revalidated when the password changes', () => {
      const { inputs, errors, submit } = createTestForm(REGISTER_FIELDS);
      fill(inputs.email!, VALID_EMAIL);
      fill(inputs.password!, STRONG_PASSWORD);
      fill(inputs.confirmPassword!, STRONG_PASSWORD);

      fill(inputs.password!, `${STRONG_PASSWORD}x`);

      expect(errors.get('confirmPassword')).toBe(messages.confirmPasswordMismatch);
      expect(submit.disabled).toBe(true);
    });

    it('shows no error from a password change before it was touched', () => {
      const { inputs, errors } = createTestForm(REGISTER_FIELDS);

      fill(inputs.password!, STRONG_PASSWORD);

      expect(errors.has('confirmPassword')).toBe(false);
    });

    it('accepts a weak value that matches the password', () => {
      const { inputs, errors } = createTestForm(REGISTER_FIELDS);

      fill(inputs.password!, 'abc');
      fill(inputs.confirmPassword!, 'abc');

      expect(errors.get('password')).toBe(messages.passwordLength);
      expect(errors.get('confirmPassword')).toBeUndefined();
    });
  });

  describe('submit', () => {
    it('passes the values to onValid and prevents the native submit', () => {
      const { form, inputs, onValid } = createTestForm(LOGIN_FIELDS);
      fill(inputs.email!, VALID_EMAIL);
      fill(inputs.password!, 'abcdef');

      const event = submitForm(form);

      expect(event.defaultPrevented).toBe(true);
      expect(onValid).toHaveBeenCalledExactlyOnceWith({ email: VALID_EMAIL, password: 'abcdef' });
    });

    it('does not call onValid while any field is invalid', () => {
      const { form, inputs, onValid } = createTestForm(LOGIN_FIELDS);
      fill(inputs.email!, VALID_EMAIL);

      const event = submitForm(form);

      expect(event.defaultPrevented).toBe(true);
      expect(onValid).not.toHaveBeenCalled();
    });
  });

  describe('setBusy', () => {
    it('locks the form: inputs, password toggles, and submit are disabled', () => {
      const { form, inputs, toggles, submit, validation } = createTestForm(LOGIN_FIELDS);
      fill(inputs.email!, VALID_EMAIL);
      fill(inputs.password!, 'abcdef');

      validation.setBusy(true);

      expect(form.getAttribute('aria-busy')).toBe('true');
      expect(inputs.email!.disabled).toBe(true);
      expect(toggles.password!.disabled).toBe(true);
      expect(submit.disabled).toBe(true);
    });

    it('ignores field events while busy', () => {
      const { inputs, validation, errors } = createTestForm(LOGIN_FIELDS);
      fill(inputs.email!, VALID_EMAIL);
      validation.setBusy(true);
      errors.clear();

      fill(inputs.email!, 'broken');

      expect(errors.size).toBe(0);
    });

    it('ignores a submit of a valid form while busy', () => {
      const { form, inputs, validation, onValid } = createTestForm(LOGIN_FIELDS);
      fill(inputs.email!, VALID_EMAIL);
      fill(inputs.password!, 'abcdef');
      validation.setBusy(true);

      const event = submitForm(form);

      expect(event.defaultPrevented).toBe(true);
      expect(onValid).not.toHaveBeenCalled();
    });

    it('unlocks and re-enables submit for a still-valid form', () => {
      const { form, inputs, toggles, submit, validation } = createTestForm(LOGIN_FIELDS);
      fill(inputs.email!, VALID_EMAIL);
      fill(inputs.password!, 'abcdef');
      validation.setBusy(true);

      validation.setBusy(false);

      expect(form.getAttribute('aria-busy')).toBe('false');
      expect(inputs.email!.disabled).toBe(false);
      expect(toggles.password!.disabled).toBe(false);
      expect(submit.disabled).toBe(false);
    });
  });

  describe('reset', () => {
    it('clears the values and every error', () => {
      const { inputs, validation, errors } = createTestForm(LOGIN_FIELDS);
      fill(inputs.email!, 'alex@');
      fill(inputs.password!, 'abc');

      validation.reset();

      expect(inputs.email!.value).toBe('');
      expect(inputs.password!.value).toBe('');
      expect([...errors.entries()]).toStrictEqual([
        ['email', undefined],
        ['password', undefined],
      ]);
    });

    it('disables submit again for a form that was valid', () => {
      const { inputs, submit, validation } = createTestForm(LOGIN_FIELDS);
      fill(inputs.email!, VALID_EMAIL);
      fill(inputs.password!, 'abcdef');

      validation.reset();

      expect(submit.disabled).toBe(true);
    });

    it('forgets touched fields, so their errors stay hidden until edited again', () => {
      const { inputs, validation, errors } = createTestForm(REGISTER_FIELDS);
      fill(inputs.password!, STRONG_PASSWORD);
      fill(inputs.confirmPassword!, STRONG_PASSWORD);
      validation.reset();
      errors.clear();

      fill(inputs.password!, STRONG_PASSWORD);

      expect(errors.has('confirmPassword')).toBe(false);
    });
  });
});
