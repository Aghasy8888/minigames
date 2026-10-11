import { describe, expect, it } from 'vitest';

import { checkCommentText, COMMENT_TEXT_MAX_LENGTH } from './comment-text';

describe('checkCommentText', () => {
  it('trims the text to send', () => {
    expect(checkCommentText('  Nice game!\n')).toEqual({
      text: 'Nice game!',
      isValid: true,
      isTooLong: false,
    });
  });

  it.each([
    { name: 'an empty value', raw: '' },
    { name: 'spaces, tabs, and newlines only', raw: ' \t\n ' },
  ])('rejects $name as empty, not too long', ({ raw }) => {
    expect(checkCommentText(raw)).toEqual({ text: '', isValid: false, isTooLong: false });
  });

  it.each([
    { name: '1 character', length: 1 },
    { name: 'exactly the maximum', length: COMMENT_TEXT_MAX_LENGTH },
  ])('accepts $name', ({ length }) => {
    const raw = 'a'.repeat(length);

    expect(checkCommentText(raw)).toEqual({ text: raw, isValid: true, isTooLong: false });
  });

  it('rejects one character over the maximum as too long', () => {
    const raw = 'a'.repeat(COMMENT_TEXT_MAX_LENGTH + 1);

    expect(checkCommentText(raw)).toEqual({ text: raw, isValid: false, isTooLong: true });
  });

  it('does not count surrounding whitespace toward the maximum', () => {
    const body = 'a'.repeat(COMMENT_TEXT_MAX_LENGTH);

    expect(checkCommentText(`   ${body}   `)).toEqual({
      text: body,
      isValid: true,
      isTooLong: false,
    });
  });
});
