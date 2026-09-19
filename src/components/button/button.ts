import './button.scss';

export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'medium' | 'large' | 'icon';
export type ButtonIconPosition = 'start' | 'end';
export type ButtonType = 'button' | 'submit' | 'reset';

export interface CreateButtonOptions {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: HTMLElement;
  iconPosition?: ButtonIconPosition;
  type?: ButtonType;
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: (event: MouseEvent) => void;
}

function resolveAccessibleName(
  label: string | undefined,
  ariaLabel: string | undefined,
  size: ButtonSize,
): string {
  const accessibleName = ariaLabel ?? label;

  if (!accessibleName) {
    throw new Error(
      size === 'icon'
        ? 'createButton: ariaLabel is required when size is "icon"'
        : 'createButton: provide label or ariaLabel',
    );
  }

  return accessibleName;
}

export function createButton(options: CreateButtonOptions = {}): HTMLButtonElement {
  const {
    label,
    variant = 'primary',
    size = 'medium',
    icon,
    iconPosition = 'start',
    type = 'button',
    disabled = false,
    ariaLabel,
    onClick,
  } = options;

  const accessibleName = resolveAccessibleName(label, ariaLabel, size);

  const button = document.createElement('button');
  button.type = type;
  button.disabled = disabled;
  button.className = `button button--${variant} button--${size}`;
  button.setAttribute('aria-label', accessibleName);

  if (icon) {
    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'button__icon';
    iconWrapper.setAttribute('aria-hidden', 'true');
    iconWrapper.append(icon);

    if (iconPosition === 'start') {
      button.append(iconWrapper);
    }

    if (label && size !== 'icon') {
      const labelElement = document.createElement('span');
      labelElement.className = 'button__label';
      labelElement.textContent = label;
      button.append(labelElement);
    }

    if (iconPosition === 'end') {
      button.append(iconWrapper);
    }
  } else if (label && size !== 'icon') {
    const labelElement = document.createElement('span');
    labelElement.className = 'button__label';
    labelElement.textContent = label;
    button.append(labelElement);
  } else if (size === 'icon') {
    throw new Error('createButton: icon is required when size is "icon"');
  }

  if (onClick) {
    button.addEventListener('click', onClick);
  }

  return button;
}
