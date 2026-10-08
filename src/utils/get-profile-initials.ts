const ALPHANUMERIC_CHARACTER = /\p{L}|\p{N}/u;
const FALLBACK_INITIALS = '?';

function firstAlphanumeric(word: string): string | undefined {
  for (const character of word) {
    if (ALPHANUMERIC_CHARACTER.test(character)) {
      return character.toLocaleUpperCase();
    }
  }

  return undefined;
}

/**
 * Header/avatar initials: first alphanumeric of one word, or of the first two words.
 * Returns `?` when the name has no alphanumeric character.
 */
export function getProfileInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const [firstWord, secondWord] = words;

  if (!firstWord) {
    return FALLBACK_INITIALS;
  }

  const first = firstAlphanumeric(firstWord);

  if (!secondWord) {
    return first ?? FALLBACK_INITIALS;
  }

  const second = firstAlphanumeric(secondWord);

  if (!first && !second) {
    return FALLBACK_INITIALS;
  }

  return `${first ?? ''}${second ?? ''}`;
}
