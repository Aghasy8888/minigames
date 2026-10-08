import { googleIcon } from '../../assets/icons';
import {
  useFormValidation,
  type FieldValues,
  type ValidatedField,
} from '../../hooks/use-form-validation';
import { registerWithEmail, signInWithEmail } from '../../services/firebase-auth';
import {
  AUTH_DIALOG_MODE,
  closeAuthDialog,
  type AuthDialogMode,
} from '../../store/auth-dialog-store';
import { startSession } from '../../store/session-store';
import { showSnackbar } from '../../store/snackbar-store';
import {
  validateConfirmPassword,
  validateEmail,
  validateLoginPassword,
  validateRegisterPassword,
  validateUsername,
} from '../../utils/auth-validation';
import { createButton } from '../button';
import {
  createTextField,
  getTextFieldInput,
  setTextFieldError,
  type CreateTextFieldOptions,
} from '../text-field';
import {
  DIVIDER_LABEL,
  FORGOT_PASSWORD_LABEL,
  LOGIN_COPY,
  LOGIN_FIELDS,
  LOGIN_SUCCESS_MESSAGE,
  REGISTER_COPY,
  REGISTER_FIELDS,
  REGISTER_SUCCESS_MESSAGE,
  type AuthPanelCopy,
  type LoginFieldName,
  type RegisterFieldName,
} from './auth-dialog-data';

const { login, register } = AUTH_DIALOG_MODE;

type FieldRule = Omit<ValidatedField, 'input'>;

export interface AuthPanel {
  panel: HTMLElement;
  /** Clears values, errors, and touched state; disables submit again. */
  reset: () => void;
  setBusy: (busy: boolean) => void;
}

interface AuthPanelOptions<Name extends string> {
  mode: AuthDialogMode;
  copy: AuthPanelCopy;
  fields: Record<Name, CreateTextFieldOptions>;
  rules: Record<Name, FieldRule>;
  extra?: HTMLButtonElement;
  onSwitch: () => void;
  onPending: (busy: boolean) => void;
  authenticate: (values: FieldValues) => Promise<void>;
  successMessage: string;
}

const LOGIN_RULES: Record<LoginFieldName, FieldRule> = {
  email: { validate: validateEmail },
  password: { validate: validateLoginPassword },
};

const REGISTER_RULES: Record<RegisterFieldName, FieldRule> = {
  username: { validate: validateUsername },
  email: { validate: validateEmail },
  password: { validate: validateRegisterPassword, revalidates: ['confirmPassword'] },
  confirmPassword: {
    validate: (value, values) => validateConfirmPassword(value, values.password ?? ''),
  },
};

const FALLBACK_AUTH_MESSAGE = 'Could not sign you in. Please try again.';

function createIconImage(source: string): HTMLImageElement {
  const icon = document.createElement('img');
  icon.src = source;
  icon.alt = '';
  return icon;
}

function createHeading(title: string, subtitle: string): HTMLElement {
  const group = document.createElement('div');
  group.className = 'auth-dialog__heading';

  const titleElement = document.createElement('h2');
  titleElement.className = 'auth-dialog__title';
  titleElement.textContent = title;

  const subtitleElement = document.createElement('p');
  subtitleElement.className = 'auth-dialog__subtitle';
  subtitleElement.textContent = subtitle;

  group.append(titleElement, subtitleElement);
  return group;
}

function createDivider(): HTMLElement {
  const divider = document.createElement('div');
  divider.className = 'auth-dialog__divider';

  const label = document.createElement('span');
  label.className = 'auth-dialog__divider-label';
  label.textContent = DIVIDER_LABEL;

  divider.append(label);
  return divider;
}

function createSwitchLine(
  question: string,
  actionLabel: string,
  onSwitch: () => void,
): { line: HTMLParagraphElement; action: HTMLButtonElement } {
  const line = document.createElement('p');
  line.className = 'auth-dialog__switch';
  line.append(`${question} `);

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'auth-dialog__switch-action';
  action.textContent = actionLabel;
  action.addEventListener('click', onSwitch);

  line.append(action);
  return { line, action };
}

function createForgotPassword(): HTMLButtonElement {
  const forgotPassword = document.createElement('button');
  forgotPassword.type = 'button';
  forgotPassword.className = 'auth-dialog__forgot';
  forgotPassword.textContent = FORGOT_PASSWORD_LABEL;
  return forgotPassword;
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : FALLBACK_AUTH_MESSAGE;
}

function createAuthPanel<Name extends string>(options: AuthPanelOptions<Name>): AuthPanel {
  const { mode, copy, fields, rules, extra, onSwitch, onPending, authenticate, successMessage } =
    options;

  const panel = document.createElement('section');
  panel.className = 'auth-dialog__panel';
  panel.id = `auth-dialog-panel-${mode}`;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', `auth-dialog-tab-${mode}`);

  const form = document.createElement('form');
  form.className = 'auth-dialog__form';
  form.noValidate = true;

  const fieldList = document.createElement('div');
  fieldList.className = 'auth-dialog__fields';

  const validatedFields: Record<string, ValidatedField> = {};

  for (const name of Object.keys(fields) as Name[]) {
    const field = createTextField(fields[name]);
    fieldList.append(field);
    validatedFields[name] = { input: getTextFieldInput(field), ...rules[name] };
  }

  if (extra) {
    fieldList.append(extra);
  }

  const submit = createButton({
    label: copy.submitLabel,
    variant: 'primary',
    size: 'large',
    type: 'submit',
    disabled: true,
    className: 'button--block button--raised',
  });

  const googleButton = createButton({
    label: copy.googleLabel,
    variant: 'secondary',
    size: 'large',
    icon: createIconImage(googleIcon),
    className: 'button--block button--icon-md',
  });

  const actions = document.createElement('div');
  actions.className = 'auth-dialog__actions';
  actions.append(submit, createDivider(), googleButton);

  const { line: switchLine, action: switchAction } = createSwitchLine(
    copy.switchQuestion,
    copy.switchAction,
    onSwitch,
  );

  form.append(fieldList, actions, switchLine);
  panel.append(createHeading(copy.title, copy.subtitle), form);

  const extraControls = [googleButton, switchAction, extra].filter(
    (control): control is HTMLButtonElement => control !== undefined,
  );

  const { reset, setBusy: setFormBusy } = useFormValidation({
    form,
    fields: validatedFields,
    submit,
    onFieldError: setTextFieldError,
    onValid(values) {
      void submitAuthentication(values);
    },
  });

  function setBusy(busy: boolean): void {
    setFormBusy(busy);
    for (const control of extraControls) {
      control.disabled = busy;
    }
  }

  async function submitAuthentication(values: FieldValues): Promise<void> {
    onPending(true);

    try {
      await authenticate(values);
      showSnackbar({ variant: 'success', message: successMessage });
      onPending(false);
      closeAuthDialog();
    } catch (error) {
      onPending(false);
      showSnackbar({ variant: 'error', message: messageFromError(error) });
    }
  }

  return { panel, reset, setBusy };
}

export function createLoginPanel(
  onSwitch: () => void,
  onPending: (busy: boolean) => void,
): AuthPanel {
  return createAuthPanel({
    mode: login,
    copy: LOGIN_COPY,
    fields: LOGIN_FIELDS,
    rules: LOGIN_RULES,
    extra: createForgotPassword(),
    onSwitch,
    onPending,
    successMessage: LOGIN_SUCCESS_MESSAGE,
    async authenticate(values) {
      const profile = await signInWithEmail(values.email ?? '', values.password ?? '');
      startSession(profile);
    },
  });
}

export function createRegisterPanel(
  onSwitch: () => void,
  onPending: (busy: boolean) => void,
): AuthPanel {
  return createAuthPanel({
    mode: register,
    copy: REGISTER_COPY,
    fields: REGISTER_FIELDS,
    rules: REGISTER_RULES,
    onSwitch,
    onPending,
    successMessage: REGISTER_SUCCESS_MESSAGE,
    async authenticate(values) {
      const profile = await registerWithEmail({
        email: values.email ?? '',
        password: values.password ?? '',
        displayName: values.username ?? '',
      });
      startSession(profile);
    },
  });
}
