/**
 * Derives two-letter initials from a player name.
 * Handles underscore segments (Alex_Pro99 → AP) and camelCase (MatchMaster → MM, CozyGamer_x → CG).
 */
export function getPlayerInitials(playerName: string): string {
  const parts = playerName.split('_').filter(Boolean);

  if (parts.length >= 2) {
    const first = parts[0] ?? '';
    const camelFromFirst = first.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])/g);

    if (camelFromFirst && camelFromFirst.length >= 2) {
      return `${camelFromFirst[0]?.[0] ?? ''}${camelFromFirst[1]?.[0] ?? ''}`.toUpperCase();
    }

    return `${first[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }

  const camelParts = playerName.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])/g) ?? [];
  const letters = camelParts.filter((part) => /^[A-Za-z]/.test(part)).map((part) => part[0] ?? '');

  if (letters.length >= 2) {
    return `${letters[0]}${letters[1]}`.toUpperCase();
  }

  return playerName.slice(0, 2).toUpperCase();
}
