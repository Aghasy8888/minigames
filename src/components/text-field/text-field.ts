import { visibilityIcon } from '../../assets/icons';
import './text-field.scss';

export type TextFieldType = 'text' | 'email' | 'password';

export interface CreateTextFieldOptions {
  id: string;
  label: string;
  name: string;
  type?: TextFieldType;
  placeholder?: string;
  autocomplete?: string;
  required?: boolean;
  icon?: string;
  passwordToggle?: boolean;
}

function createIcon(source: string): HTMLImageElement {
  const icon = document.createElement('img');
  icon.className = 'text-field__icon';
  icon.src = source;
  icon.alt = '';
  return icon;
}

function createVisibilityToggle(input: HTMLInputElement): HTMLButtonElement {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'text-field__toggle';
  toggle.setAttribute('aria-label', 'Show password');
  toggle.setAttribute('aria-pressed', 'false');
  toggle.setAttribute('aria-controls', input.id);

  const toggleIcon = document.createElement('img');
  toggleIcon.className = 'text-field__toggle-icon';
  toggleIcon.src = visibilityIcon;
  toggleIcon.alt = '';
  toggle.append(toggleIcon);

  toggle.addEventListener('click', () => {
    const isVisible = input.type === 'text';
    input.type = isVisible ? 'password' : 'text';
    toggle.setAttribute('aria-pressed', String(!isVisible));
    toggle.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
  });

  return toggle;
}

export function createTextField(options: CreateTextFieldOptions): HTMLElement {
  const {
    id,
    label,
    name,
    type = 'text',
    placeholder,
    autocomplete,
    required = false,
    icon,
    passwordToggle = false,
  } = options;

  const field = document.createElement('div');
  field.className = 'text-field';

  const labelElement = document.createElement('label');
  labelElement.className = 'text-field__label';
  labelElement.htmlFor = id;
  labelElement.textContent = label;

  const control = document.createElement('div');
  control.className = 'text-field__control';

  const input = document.createElement('input');
  input.className = 'text-field__input';
  input.id = id;
  input.name = name;
  input.type = type;
  input.required = required;

  if (placeholder) {
    input.placeholder = placeholder;
  }

  if (autocomplete) {
    input.setAttribute('autocomplete', autocomplete);
  }

  if (icon) {
    control.append(createIcon(icon));
  }

  control.append(input);

  if (passwordToggle) {
    control.append(createVisibilityToggle(input));
  }

  field.append(labelElement, control);
  return field;
}
