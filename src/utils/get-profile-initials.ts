const ALPHANUMERIC_CHARACTER = /\p{L}|\p{N}/u;

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
 * Returns `undefined` when the name has no alphanumeric character (show a generic avatar).
 */
export function getProfileInitials(name: string): string | undefined {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const [firstWord, secondWord] = words;

  if (!firstWord) {
    return undefined;
  }

  const first = firstAlphanumeric(firstWord);

  if (!secondWord) {
    return first;
  }

  const second = firstAlphanumeric(secondWord);

  if (!first && !second) {
    return undefined;
  }

  return `${first ?? ''}${second ?? ''}`;
}
