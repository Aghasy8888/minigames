import { describe, expect, it } from 'vitest';

import { COMMENT_AUTHOR_NAME_MAX_LENGTH, getCommentAuthorName } from './get-comment-author-name';
import { FALLBACK_PROFILE_NAME } from './get-profile-display-name';

const EMAIL = 'jane.doe@example.com';

describe('getCommentAuthorName', () => {
  it('uses the trimmed display name', () => {
    expect(getCommentAuthorName({ displayName: '  Jane Doe  ', email: EMAIL })).toBe('Jane Doe');
  });

  it('falls back to the email local part without a usable display name', () => {
    expect(getCommentAuthorName({ email: EMAIL })).toBe('jane.doe');
    expect(getCommentAuthorName({ displayName: ' '.repeat(3), email: EMAIL })).toBe('jane.doe');
    expect(getCommentAuthorName({ displayName: 'J', email: EMAIL })).toBe('jane.doe');
  });

  it('counts a single emoji as one character, so it is too short', () => {
    expect(getCommentAuthorName({ displayName: '😀', email: EMAIL })).toBe('jane.doe');
  });

  it('falls back to the generic name when the email local part is too short or empty', () => {
    expect(getCommentAuthorName({ email: 'a@example.com' })).toBe(FALLBACK_PROFILE_NAME);
    expect(getCommentAuthorName({ email: '@example.com' })).toBe(FALLBACK_PROFILE_NAME);
  });

  it('cuts a long name to the maximum length instead of replacing it', () => {
    const name = getCommentAuthorName({ displayName: 'A'.repeat(40), email: EMAIL });

    expect(name).toBe('A'.repeat(COMMENT_AUTHOR_NAME_MAX_LENGTH));
  });

  it('never splits an emoji at the cut', () => {
    const displayName = `${'A'.repeat(COMMENT_AUTHOR_NAME_MAX_LENGTH - 1)}😀`;

    expect(getCommentAuthorName({ displayName, email: EMAIL })).toBe(
      'A'.repeat(COMMENT_AUTHOR_NAME_MAX_LENGTH - 1),
    );
  });

  it('does not end the cut name with a space', () => {
    const displayName = `${'A'.repeat(COMMENT_AUTHOR_NAME_MAX_LENGTH - 1)} Smith`;

    expect(getCommentAuthorName({ displayName, email: EMAIL })).toBe(
      'A'.repeat(COMMENT_AUTHOR_NAME_MAX_LENGTH - 1),
    );
  });
});
