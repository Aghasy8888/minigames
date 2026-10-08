export const AUTH_VALIDATION_MESSAGES = {
  emailRequired: 'Enter your email address.',
  emailFormat: 'Enter a valid email address, e.g. alex@minigames.com.',
  usernameRequired: 'Enter a username.',
  usernameLength: 'Username must be 2–30 characters long.',
  usernameStart: 'Username must start with an uppercase English letter.',
  usernameCharacters: 'Username may contain English letters and digits only.',
  passwordRequired: 'Enter a password.',
  passwordLength: 'Password must be at least 6 characters long.',
  passwordCharacters: 'Password may contain English letters, digits, and special characters only.',
  passwordUppercase: 'Password must contain at least one uppercase English letter.',
  passwordDigit: 'Password must contain at least one digit.',
  passwordSpecial: 'Password must contain at least one special character (e.g. ! @ # $).',
  confirmPasswordRequired: 'Confirm your password.',
  confirmPasswordMismatch: 'Passwords do not match.',
} as const;

const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 30;
const PASSWORD_MIN_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UPPERCASE_PATTERN = /[A-Z]/;
const DIGIT_PATTERN = /\d/;
const LETTERS_AND_DIGITS_PATTERN = /^[\dA-Za-z]+$/;
/** Printable ASCII without the space: English letters, digits, and special characters. */
const PASSWORD_CHARACTERS_PATTERN = /^[!-~]+$/;
/** ASCII punctuation and symbols. */
const SPECIAL_CHARACTER_PATTERN = /[!-/:-@[-`{-~]/;

const messages = AUTH_VALIDATION_MESSAGES;

export function validateEmail(value: string): string | undefined {
  if (value.trim() === '') {
    return messages.emailRequired;
  }

  return EMAIL_PATTERN.test(value) ? undefined : messages.emailFormat;
}

export function validateUsername(value: string): string | undefined {
  if (value.trim() === '') {
    return messages.usernameRequired;
  }

  if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) {
    return messages.usernameLength;
  }

  if (!UPPERCASE_PATTERN.test(value.charAt(0))) {
    return messages.usernameStart;
  }

  return LETTERS_AND_DIGITS_PATTERN.test(value) ? undefined : messages.usernameCharacters;
}

export function validateLoginPassword(value: string): string | undefined {
  if (value === '') {
    return messages.passwordRequired;
  }

  return value.length < PASSWORD_MIN_LENGTH ? messages.passwordLength : undefined;
}

export function validateRegisterPassword(value: string): string | undefined {
  const lengthError = validateLoginPassword(value);

  if (lengthError) {
    return lengthError;
  }

  if (!PASSWORD_CHARACTERS_PATTERN.test(value)) {
    return messages.passwordCharacters;
  }

  if (!UPPERCASE_PATTERN.test(value)) {
    return messages.passwordUppercase;
  }

  if (!DIGIT_PATTERN.test(value)) {
    return messages.passwordDigit;
  }

  return SPECIAL_CHARACTER_PATTERN.test(value) ? undefined : messages.passwordSpecial;
}

export function validateConfirmPassword(value: string, password: string): string | undefined {
  if (value === '') {
    return messages.confirmPasswordRequired;
  }

  return value === password ? undefined : messages.confirmPasswordMismatch;
}
