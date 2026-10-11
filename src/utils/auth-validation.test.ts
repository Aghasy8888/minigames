import { describe, expect, it } from 'vitest';

import {
  AUTH_VALIDATION_MESSAGES,
  validateConfirmPassword,
  validateEmail,
  validateLoginPassword,
  validateRegisterPassword,
  validateUsername,
} from './auth-validation';

const {
  emailRequired,
  emailFormat,
  usernameRequired,
  usernameLength,
  usernameStart,
  usernameCharacters,
  passwordRequired,
  passwordLength,
  passwordCharacters,
  passwordUppercase,
  passwordDigit,
  passwordSpecial,
  confirmPasswordRequired,
  confirmPasswordMismatch,
} = AUTH_VALIDATION_MESSAGES;

describe('validateEmail', () => {
  it.each([
    { name: 'a simple address', value: 'alex@minigames.com' },
    { name: 'dots and a plus tag in the local part', value: 'jane.doe+games@mail.example.org' },
    { name: 'a two-letter top-level domain', value: 'alex@minigames.am' },
  ])('accepts $name', ({ value }) => {
    expect(validateEmail(value)).toBeUndefined();
  });

  it.each([
    { name: 'an empty value', value: '', expected: emailRequired },
    { name: 'whitespace only', value: ' '.repeat(3), expected: emailRequired },
    { name: 'no @', value: 'alex.minigames.com', expected: emailFormat },
    { name: 'no local part', value: '@minigames.com', expected: emailFormat },
    { name: 'no domain', value: 'alex@', expected: emailFormat },
    { name: 'a domain without a dot', value: 'alex@minigames', expected: emailFormat },
    { name: 'a one-letter top-level domain', value: 'alex@minigames.c', expected: emailFormat },
    { name: 'two @ signs', value: 'alex@@minigames.com', expected: emailFormat },
    { name: 'a space inside', value: 'alex smith@minigames.com', expected: emailFormat },
    { name: 'surrounding spaces', value: ' alex@minigames.com ', expected: emailFormat },
  ])('rejects $name', ({ value, expected }) => {
    expect(validateEmail(value)).toBe(expected);
  });
});

describe('validateUsername', () => {
  it.each([
    { name: 'the 2-character minimum', value: 'Al' },
    { name: 'the 30-character maximum', value: `A${'b'.repeat(29)}` },
    { name: 'letters and digits', value: 'Alex2026' },
    { name: 'uppercase letters after the first', value: 'AlexSmith' },
  ])('accepts $name', ({ value }) => {
    expect(validateUsername(value)).toBeUndefined();
  });

  it.each([
    { name: 'an empty value', value: '', expected: usernameRequired },
    { name: 'whitespace only', value: ' '.repeat(3), expected: usernameRequired },
    { name: '1 character', value: 'A', expected: usernameLength },
    { name: '31 characters', value: `A${'b'.repeat(30)}`, expected: usernameLength },
    { name: 'a lowercase first letter', value: 'alex', expected: usernameStart },
    { name: 'a digit first', value: '1Alex', expected: usernameStart },
    { name: 'a leading space', value: ' Alex', expected: usernameStart },
    { name: 'a non-English uppercase first letter', value: 'Ани', expected: usernameStart },
    { name: 'an underscore', value: 'Alex_1', expected: usernameCharacters },
    { name: 'a space inside', value: 'Alex Smith', expected: usernameCharacters },
    { name: 'a non-English letter after the first', value: 'Alexé', expected: usernameCharacters },
    { name: 'a special character', value: 'Alex!', expected: usernameCharacters },
  ])('rejects $name', ({ value, expected }) => {
    expect(validateUsername(value)).toBe(expected);
  });

  it('reports the length before the first-letter rule', () => {
    expect(validateUsername('a')).toBe(usernameLength);
  });
});

describe('validateLoginPassword', () => {
  it('accepts a 6-character password without the registration strength rules', () => {
    expect(validateLoginPassword('abcdef')).toBeUndefined();
  });

  it.each([
    { name: 'an empty value', value: '', expected: passwordRequired },
    { name: '5 characters', value: 'Ab1!x', expected: passwordLength },
  ])('rejects $name', ({ value, expected }) => {
    expect(validateLoginPassword(value)).toBe(expected);
  });
});

describe('validateRegisterPassword', () => {
  it.each([
    { name: 'the 6-character minimum', value: 'Abc12!' },
    { name: 'a $ special character', value: 'Pa$$w0rd' },
    { name: 'a [ special character', value: 'Abc12[' },
    { name: 'a { special character', value: 'Abc12{' },
    { name: 'a : special character', value: 'Abc12:' },
    { name: 'a ~ special character', value: 'Abc12~' },
  ])('accepts $name', ({ value }) => {
    expect(validateRegisterPassword(value)).toBeUndefined();
  });

  it.each([
    { name: 'an empty value', value: '', expected: passwordRequired },
    { name: '5 characters', value: 'Ab1!x', expected: passwordLength },
    { name: 'a space', value: 'Abc1! x', expected: passwordCharacters },
    { name: 'a non-English letter', value: 'Abc1!ж', expected: passwordCharacters },
    { name: 'no uppercase letter', value: 'abc12!', expected: passwordUppercase },
    { name: 'no digit', value: 'Abcde!', expected: passwordDigit },
    { name: 'no special character', value: 'Abc123', expected: passwordSpecial },
  ])('rejects $name', ({ value, expected }) => {
    expect(validateRegisterPassword(value)).toBe(expected);
  });

  it('reports the length before the strength rules', () => {
    expect(validateRegisterPassword('abc')).toBe(passwordLength);
  });
});

describe('validateConfirmPassword', () => {
  it('accepts an exact match', () => {
    expect(validateConfirmPassword('Abc12!', 'Abc12!')).toBeUndefined();
  });

  it('does not apply the password rules to a matching value', () => {
    expect(validateConfirmPassword('abc', 'abc')).toBeUndefined();
  });

  it.each([
    { name: 'an empty value', value: '', password: 'Abc12!', expected: confirmPasswordRequired },
    {
      name: 'an empty value with an empty password',
      value: '',
      password: '',
      expected: confirmPasswordRequired,
    },
    {
      name: 'a different value',
      value: 'Abc12?',
      password: 'Abc12!',
      expected: confirmPasswordMismatch,
    },
    {
      name: 'a different case',
      value: 'abc12!',
      password: 'Abc12!',
      expected: confirmPasswordMismatch,
    },
    {
      name: 'a trailing space',
      value: 'Abc12! ',
      password: 'Abc12!',
      expected: confirmPasswordMismatch,
    },
  ])('rejects $name', ({ value, password, expected }) => {
    expect(validateConfirmPassword(value, password)).toBe(expected);
  });
});
