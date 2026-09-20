import { googleIcon, lockIcon, mailIcon, personIcon } from '../../assets/icons';
import {
  closeAuthDialog,
  subscribeAuthDialog,
  type AuthDialogMode,
} from '../../store/auth-dialog-store';
import { lockScroll, unlockScroll } from '../../utils/scroll-lock';
import { createButton } from '../button';
import { createTextField } from '../text-field';
import './auth-dialog.scss';

const TRANSITION_MS = 250;
const PANEL_TRANSITION_MS = 200;

interface AuthDialogSection {
  panel: HTMLElement;
  tab: HTMLButtonElement;
}

// Two frames so the starting state is painted before the transition begins
function nextFrame(callback: () => void): void {
  globalThis.requestAnimationFrame(() => {
    globalThis.requestAnimationFrame(callback);
  });
}

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
  label.textContent = 'OR';

  divider.append(label);
  return divider;
}

function createSwitchLine(
  question: string,
  actionLabel: string,
  onSwitch: () => void,
): HTMLParagraphElement {
  const line = document.createElement('p');
  line.className = 'auth-dialog__switch';
  line.append(`${question} `);

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'auth-dialog__switch-action';
  action.textContent = actionLabel;
  action.addEventListener('click', onSwitch);

  line.append(action);
  return line;
}

function createLoginPanel(onSwitch: () => void): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'auth-dialog__panel';
  panel.id = 'auth-dialog-panel-login';
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', 'auth-dialog-tab-login');

  const form = document.createElement('form');
  form.className = 'auth-dialog__form';
  form.noValidate = true;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  const forgotPassword = document.createElement('button');
  forgotPassword.type = 'button';
  forgotPassword.className = 'auth-dialog__forgot';
  forgotPassword.textContent = 'Forgot Password?';

  const fields = document.createElement('div');
  fields.className = 'auth-dialog__fields';
  fields.append(
    createTextField({
      id: 'login-email',
      name: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'e.g. alex@minigames.com',
      autocomplete: 'email',
      required: true,
      icon: mailIcon,
    }),
    createTextField({
      id: 'login-password',
      name: 'password',
      label: 'Password',
      type: 'password',
      placeholder: 'Your password',
      autocomplete: 'current-password',
      required: true,
      icon: lockIcon,
      passwordToggle: true,
    }),
    forgotPassword,
  );

  const actions = document.createElement('div');
  actions.className = 'auth-dialog__actions';
  actions.append(
    createButton({
      label: 'Login',
      variant: 'primary',
      size: 'large',
      type: 'submit',
      className: 'button--block button--raised',
    }),
    createDivider(),
    createButton({
      label: 'Continue with Google',
      variant: 'secondary',
      size: 'large',
      icon: createIconImage(googleIcon),
      className: 'button--block button--icon-md',
    }),
  );

  form.append(fields, actions, createSwitchLine("Don't have an account?", 'Register', onSwitch));

  panel.append(createHeading('Welcome Back!', 'Sign in to resume your games and progress.'), form);
  return panel;
}

function createRegisterPanel(onSwitch: () => void): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'auth-dialog__panel';
  panel.id = 'auth-dialog-panel-register';
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', 'auth-dialog-tab-register');

  const form = document.createElement('form');
  form.className = 'auth-dialog__form';
  form.noValidate = true;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  const fields = document.createElement('div');
  fields.className = 'auth-dialog__fields';
  fields.append(
    createTextField({
      id: 'register-username',
      name: 'username',
      label: 'Username',
      placeholder: 'e.g. CozyGamer_99',
      autocomplete: 'username',
      required: true,
      icon: personIcon,
    }),
    createTextField({
      id: 'register-email',
      name: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'your.email@domain.com',
      autocomplete: 'email',
      required: true,
      icon: mailIcon,
    }),
    createTextField({
      id: 'register-password',
      name: 'password',
      label: 'Password',
      type: 'password',
      placeholder: 'Min. 8 characters',
      autocomplete: 'new-password',
      required: true,
      icon: lockIcon,
    }),
    createTextField({
      id: 'register-confirm-password',
      name: 'confirmPassword',
      label: 'Confirm Password',
      type: 'password',
      placeholder: 'Repeat your password',
      autocomplete: 'new-password',
      required: true,
      icon: lockIcon,
    }),
  );

  const actions = document.createElement('div');
  actions.className = 'auth-dialog__actions';
  actions.append(
    createButton({
      label: 'Create Account',
      variant: 'primary',
      size: 'large',
      type: 'submit',
      className: 'button--block button--raised',
    }),
    createDivider(),
    createButton({
      label: 'Sign up with Google',
      variant: 'secondary',
      size: 'large',
      icon: createIconImage(googleIcon),
      className: 'button--block button--icon-md',
    }),
  );

  form.append(fields, actions, createSwitchLine('Already have an account?', 'Login', onSwitch));

  panel.append(
    createHeading('Create Account', 'Join MiniGames to track your score & streak.'),
    form,
  );
  return panel;
}

function createTab(mode: AuthDialogMode, label: string): HTMLButtonElement {
  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'auth-dialog__tab';
  tab.id = `auth-dialog-tab-${mode}`;
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-controls', `auth-dialog-panel-${mode}`);
  tab.setAttribute('aria-selected', 'false');
  tab.textContent = label;
  return tab;
}

export function createAuthDialog(): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.className = 'auth-dialog';
  dialog.setAttribute('aria-label', 'Authentication');

  const content = document.createElement('div');
  content.className = 'auth-dialog__content hide-scrollbar';

  const tabs = document.createElement('div');
  tabs.className = 'auth-dialog__tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Authentication mode');

  const panels = document.createElement('div');
  panels.className = 'auth-dialog__panels';

  let currentMode: AuthDialogMode = 'login';
  let closeTimerId: ReturnType<typeof globalThis.setTimeout> | undefined;
  let panelTimerId: ReturnType<typeof globalThis.setTimeout> | undefined;
  let isLocked = false;

  const loginTab = createTab('login', 'Login');
  const registerTab = createTab('register', 'Register');
  const loginPanel = createLoginPanel(() => {
    setMode('register');
  });
  const registerPanel = createRegisterPanel(() => {
    setMode('login');
  });

  const sections: Record<AuthDialogMode, AuthDialogSection> = {
    login: { panel: loginPanel, tab: loginTab },
    register: { panel: registerPanel, tab: registerTab },
  };

  function applyMode(mode: AuthDialogMode): void {
    for (const key of Object.keys(sections) as AuthDialogMode[]) {
      const { panel, tab } = sections[key];
      const isActive = key === mode;

      tab.classList.toggle('auth-dialog__tab--active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      panel.hidden = !isActive;
      panel.classList.remove('auth-dialog__panel--leaving', 'auth-dialog__panel--entering');
    }
  }

  function setMode(mode: AuthDialogMode): void {
    if (mode === currentMode) {
      return;
    }

    const outgoing = sections[currentMode].panel;
    const incoming = sections[mode].panel;
    currentMode = mode;

    globalThis.clearTimeout(panelTimerId);
    applyMode(mode);

    outgoing.hidden = false;
    outgoing.classList.add('auth-dialog__panel--leaving');
    incoming.classList.add('auth-dialog__panel--entering');

    nextFrame(() => {
      incoming.classList.remove('auth-dialog__panel--entering');
    });

    panelTimerId = globalThis.setTimeout(() => {
      outgoing.classList.remove('auth-dialog__panel--leaving');
      outgoing.hidden = true;
    }, PANEL_TRANSITION_MS);
  }

  function requestClose(): void {
    if (!dialog.open || dialog.classList.contains('auth-dialog--closing')) {
      return;
    }

    dialog.classList.remove('auth-dialog--open');
    dialog.classList.add('auth-dialog--closing');

    closeTimerId = globalThis.setTimeout(() => {
      dialog.classList.remove('auth-dialog--closing');
      dialog.close();
    }, TRANSITION_MS);

    closeAuthDialog();
  }

  function open(mode: AuthDialogMode): void {
    globalThis.clearTimeout(closeTimerId);
    dialog.classList.remove('auth-dialog--closing');

    if (dialog.open) {
      setMode(mode);
    } else {
      currentMode = mode;
      applyMode(mode);
      dialog.showModal();
      lockScroll();
      isLocked = true;
    }

    nextFrame(() => {
      dialog.classList.add('auth-dialog--open');
    });
  }

  loginTab.addEventListener('click', () => {
    setMode('login');
  });
  registerTab.addEventListener('click', () => {
    setMode('register');
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    requestClose();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      requestClose();
    }
  });

  dialog.addEventListener('close', () => {
    dialog.classList.remove('auth-dialog--open', 'auth-dialog--closing');

    if (isLocked) {
      unlockScroll();
      isLocked = false;
    }

    closeAuthDialog();
  });

  subscribeAuthDialog((state) => {
    if (state.isOpen) {
      open(state.mode);
    } else {
      requestClose();
    }
  });

  applyMode(currentMode);
  tabs.append(loginTab, registerTab);
  panels.append(loginPanel, registerPanel);
  content.append(tabs, panels);
  dialog.append(content);

  return dialog;
}
