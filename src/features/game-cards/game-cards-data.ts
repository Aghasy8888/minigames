import { getLibraryGameBySlug, type GameSeed } from '../../mocks/games';

export const GAME_CARDS_ARIA_LABEL = 'Games';

/** Keep in sync with $breakpoints 'desktop-wide' in tokens.scss (1830px). */
export const GAME_CARDS_WIDE_MEDIA_QUERY = '(min-width: 1830px)' as const;

/**
 * List item contract for the Library cards section.
 * Mock mapper fills orderNarrow / orderWide; an API can supply the same fields.
 */
export type LibraryGameListItem = GameSeed & {
  orderNarrow: number;
  orderWide: number;
};

/** Story 2 mock — wide (2-col) Figma sequence; used only by the mock mapper. */
const MOCK_WIDE_ORDER_SLUGS = [
  'vacation-cafe-simulator',
  'winter-burrow',
  'shelve-the-potions',
  'heartopia',
  'palia',
  'cat-mail-co',
] as const;

/** Story 2 mock — narrow (1-col) Figma sequence; used only by the mock mapper. */
const MOCK_NARROW_ORDER_SLUGS = [
  'vacation-cafe-simulator',
  'shelve-the-potions',
  'winter-burrow',
  'heartopia',
  'cat-mail-co',
  'palia',
] as const;

function toOrderIndex(slugs: readonly string[], slug: string, fallback: number): number {
  const index = slugs.indexOf(slug);
  return index === -1 ? fallback : index;
}

/**
 * Builds Library list items with layout order indices.
 * Replace this mapper with an API → LibraryGameListItem map later.
 */
export function getLibraryGameListItems(): LibraryGameListItem[] {
  return MOCK_WIDE_ORDER_SLUGS.map((slug, orderWide) => {
    const game = getLibraryGameBySlug(slug);

    return {
      ...game,
      orderWide,
      orderNarrow: toOrderIndex(MOCK_NARROW_ORDER_SLUGS, slug, orderWide),
    };
  });
}

/** Defaults missing order fields to the array index (stable for a flat API list). */
export function normalizeLibraryGameListItem(
  game: GameSeed & Partial<Pick<LibraryGameListItem, 'orderNarrow' | 'orderWide'>>,
  index: number,
): LibraryGameListItem {
  return {
    ...game,
    orderNarrow: game.orderNarrow ?? index,
    orderWide: game.orderWide ?? index,
  };
}
