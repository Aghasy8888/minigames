import { useBackdropDismiss } from '../../hooks/use-backdrop-dismiss';
import {
  AUTH_DIALOG_MODE,
  closeAuthDialog,
  getAuthDialogState,
  openAuthDialog,
  subscribeAuthDialog,
  type AuthDialogMode,
} from '../../store/auth-dialog-store';
import { lockScroll, unlockScroll } from '../../utils/scroll-lock';
import {
  AUTH_DIALOG_LABEL,
  AUTH_TABS_LABEL,
  LOGIN_TAB_LABEL,
  REGISTER_TAB_LABEL,
} from './auth-dialog-data';
import { createLoginPanel, createRegisterPanel, type AuthPanel } from './auth-dialog-forms';
import './auth-dialog.scss';

const { login, register } = AUTH_DIALOG_MODE;

const TRANSITION_MS = 250;
const PANEL_TRANSITION_MS = 200;

interface AuthDialogSection extends AuthPanel {
  tab: HTMLButtonElement;
}

// Two frames so the starting state is painted before the transition begins
function nextFrame(callback: () => void): void {
  globalThis.requestAnimationFrame(() => {
    globalThis.requestAnimationFrame(callback);
  });
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
  dialog.setAttribute('aria-label', AUTH_DIALOG_LABEL);

  const content = document.createElement('div');
  content.className = 'auth-dialog__content hide-scrollbar';

  const tabs = document.createElement('div');
  tabs.className = 'auth-dialog__tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', AUTH_TABS_LABEL);

  const panels = document.createElement('div');
  panels.className = 'auth-dialog__panels';

  let currentMode: AuthDialogMode = login;
  let closeTimerId: ReturnType<typeof globalThis.setTimeout> | undefined;
  let panelTimerId: ReturnType<typeof globalThis.setTimeout> | undefined;
  let isLocked = false;

  const loginTab = createTab(login, LOGIN_TAB_LABEL);
  const registerTab = createTab(register, REGISTER_TAB_LABEL);
  const loginPanel = createLoginPanel(() => {
    openAuthDialog(register);
  });
  const registerPanel = createRegisterPanel(() => {
    openAuthDialog(login);
  });

  const sections: Record<AuthDialogMode, AuthDialogSection> = {
    [login]: { ...loginPanel, tab: loginTab },
    [register]: { ...registerPanel, tab: registerTab },
  };
  const sectionList = Object.values(sections);

  function resetForms(): void {
    for (const { reset } of sectionList) {
      reset();
    }
  }

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

    resetForms();
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
    openAuthDialog(login);
  });
  registerTab.addEventListener('click', () => {
    openAuthDialog(register);
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeAuthDialog();
  });

  useBackdropDismiss(dialog, closeAuthDialog);

  dialog.addEventListener('close', () => {
    dialog.classList.remove('auth-dialog--open', 'auth-dialog--closing');
    resetForms();

    if (isLocked) {
      unlockScroll();
      isLocked = false;
    }

    if (getAuthDialogState().mode !== undefined) {
      closeAuthDialog();
    }
  });

  subscribeAuthDialog(({ mode }) => {
    if (mode === undefined) {
      requestClose();
    } else {
      open(mode);
    }
  });

  applyMode(currentMode);
  tabs.append(loginTab, registerTab);
  panels.append(loginPanel.panel, registerPanel.panel);
  content.append(tabs, panels);
  dialog.append(content);

  return dialog;
}
