import { FALLBACK_PROFILE_NAME, type ProfileNameSource } from './get-profile-display-name';

/** `POST /api/games/{slug}/comments` accepts an `authorName` of 2–30 characters. */
export const COMMENT_AUTHOR_NAME_MIN_LENGTH = 2;
export const COMMENT_AUTHOR_NAME_MAX_LENGTH = 30;

// The cap uses string length (what the server trims by) without splitting an emoji; the minimum
// counts whole characters so a single emoji or letter is still too short.
function toAuthorName(candidate: string | undefined): string | undefined {
  let name = '';

  for (const character of candidate?.trim() ?? '') {
    if (name.length + character.length > COMMENT_AUTHOR_NAME_MAX_LENGTH) {
      break;
    }
    name += character;
  }

  name = name.trimEnd();
  return [...name].length >= COMMENT_AUTHOR_NAME_MIN_LENGTH ? name : undefined;
}

/**
 * Comment author name within the API limits: the profile name, then the email local part,
 * then a generic name. Names over the limit are cut to it rather than replaced.
 */
export function getCommentAuthorName({ displayName, email }: ProfileNameSource): string {
  return toAuthorName(displayName) ?? toAuthorName(email.split('@', 2)[0]) ?? FALLBACK_PROFILE_NAME;
}
