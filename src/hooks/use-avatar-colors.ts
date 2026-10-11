/**
 * Picks a random avatar color the first time a comment is seen and returns the same color for it
 * afterwards. Create one picker per mounted view so re-renders keep their colors.
 */
export function useAvatarColors<T extends string>(
  colors: readonly [T, ...T[]],
): (commentId: string) => T {
  const assigned = new Map<string, T>();

  return (commentId) => {
    const known = assigned.get(commentId);
    if (known) {
      return known;
    }

    const [first] = colors;
    const color = colors[Math.floor(Math.random() * colors.length)] ?? first;
    assigned.set(commentId, color);
    return color;
  };
}
