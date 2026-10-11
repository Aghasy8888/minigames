import { describe, expect, it } from 'vitest';

import { FALLBACK_PROFILE_NAME, getProfileDisplayName } from './get-profile-display-name';

const EMAIL = 'jane.doe@example.com';

describe('getProfileDisplayName', () => {
  it('uses the display name', () => {
    expect(getProfileDisplayName({ displayName: 'Jane Doe', email: EMAIL })).toBe('Jane Doe');
  });

  it('trims the display name but keeps its inner spacing', () => {
    expect(getProfileDisplayName({ displayName: '  Jane   Doe  ', email: EMAIL })).toBe(
      'Jane   Doe',
    );
  });

  it('keeps a one-character name (the comment author 2–30 rule does not apply)', () => {
    expect(getProfileDisplayName({ displayName: 'J', email: EMAIL })).toBe('J');
  });

  it('keeps a long name in full (the header shows the full name)', () => {
    const displayName = 'A'.repeat(40);

    expect(getProfileDisplayName({ displayName, email: EMAIL })).toBe(displayName);
  });

  it('returns markup-like names unchanged, so rendering decides how to show them', () => {
    expect(getProfileDisplayName({ displayName: '<b>Jane</b>', email: EMAIL })).toBe('<b>Jane</b>');
  });

  it.each([
    { name: 'missing', displayName: undefined },
    { name: 'empty', displayName: '' },
    { name: 'whitespace only', displayName: ' \t\n ' },
  ])('falls back to the email local part when the display name is $name', ({ displayName }) => {
    expect(getProfileDisplayName({ displayName, email: EMAIL })).toBe('jane.doe');
  });

  it.each([
    { name: 'an email with an empty local part', email: '@example.com' },
    { name: 'an empty email', email: '' },
  ])('falls back to the generic name for $name', ({ email }) => {
    expect(getProfileDisplayName({ email })).toBe(FALLBACK_PROFILE_NAME);
  });
});
