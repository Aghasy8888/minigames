import { lockIcon, mailIcon, personIcon } from '../../assets/icons';
import type { CreateTextFieldOptions } from '../text-field';

export type LoginFieldName = 'email' | 'password';
export type RegisterFieldName = 'username' | 'email' | 'password' | 'confirmPassword';

export interface AuthPanelCopy {
  title: string;
  subtitle: string;
  submitLabel: string;
  googleLabel: string;
  switchQuestion: string;
  switchAction: string;
}

export const AUTH_DIALOG_LABEL = 'Authentication';
export const AUTH_TABS_LABEL = 'Authentication mode';
export const LOGIN_TAB_LABEL = 'Login';
export const REGISTER_TAB_LABEL = 'Register';
export const DIVIDER_LABEL = 'OR';
export const FORGOT_PASSWORD_LABEL = 'Forgot Password?';

export const LOGIN_COPY: AuthPanelCopy = {
  title: 'Welcome Back!',
  subtitle: 'Sign in to resume your games and progress.',
  submitLabel: 'Login',
  googleLabel: 'Continue with Google',
  switchQuestion: "Don't have an account?",
  switchAction: 'Register',
};

export const REGISTER_COPY: AuthPanelCopy = {
  title: 'Create Account',
  subtitle: 'Join MiniGames to track your score & streak.',
  submitLabel: 'Create Account',
  googleLabel: 'Sign up with Google',
  switchQuestion: 'Already have an account?',
  switchAction: 'Login',
};

export const LOGIN_FIELDS: Record<LoginFieldName, CreateTextFieldOptions> = {
  email: {
    id: 'login-email',
    name: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'e.g. alex@minigames.com',
    autocomplete: 'email',
    required: true,
    icon: mailIcon,
  },
  password: {
    id: 'login-password',
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Your password',
    autocomplete: 'current-password',
    required: true,
    icon: lockIcon,
    passwordToggle: true,
  },
};

export const REGISTER_FIELDS: Record<RegisterFieldName, CreateTextFieldOptions> = {
  username: {
    id: 'register-username',
    name: 'username',
    label: 'Username',
    placeholder: 'e.g. CozyGamer99',
    autocomplete: 'username',
    required: true,
    icon: personIcon,
  },
  email: {
    id: 'register-email',
    name: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'your.email@domain.com',
    autocomplete: 'email',
    required: true,
    icon: mailIcon,
  },
  password: {
    id: 'register-password',
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Min. 6 characters',
    autocomplete: 'new-password',
    required: true,
    icon: lockIcon,
  },
  confirmPassword: {
    id: 'register-confirm-password',
    name: 'confirmPassword',
    label: 'Confirm Password',
    type: 'password',
    placeholder: 'Repeat your password',
    autocomplete: 'new-password',
    required: true,
    icon: lockIcon,
  },
};
