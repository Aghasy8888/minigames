import type { CategoryItem } from '../services/categories-types';
import type { CommentLikeResult, GameComment, GameCommentsMeta } from '../services/comments-types';
import type { FavoriteToggleResult } from '../services/favorite-types';
import type { GameDetails } from '../services/game-details-types';
import type { GameListItem, GamesListMeta } from '../services/games-types';
import type { LeaderboardEntry } from '../services/leaderboard-types';

export const TEST_USER_EMAIL = 'student@rs.school';

export function makeGame(overrides: Partial<GameListItem> = {}): GameListItem {
  return {
    slug: 'cat-mail-co',
    name: 'Cat Mail Co.',
    category: 'puzzle',
    price: 'Free',
    shortDescription: 'Run a cozy cat post office.',
    rating: 4.9,
    likesCount: 38_207,
    cardImage: '/assets/images/games/cat-mail-co-card.jpg',
    ...overrides,
  };
}

export function makeGamesMeta(overrides: Partial<GamesListMeta> = {}): GamesListMeta {
  return { page: 1, limit: 6, totalItems: 24, totalPages: 4, ...overrides };
}

export function makeGameDetails(overrides: Partial<GameDetails> = {}): GameDetails {
  return {
    slug: 'cat-mail-co',
    name: 'Cat Mail Co.',
    heroImage: '/assets/images/games/cat-mail-co-hero.jpg',
    rating: 4.9,
    likesCount: 38_207,
    isLikedByCurrentUser: false,
    fullDescription: 'Run a cozy cat post office and deliver parcels from the daily boat.',
    specs: { genre: 'Puzzle', players: '1', duration: '15 min', price: 'Free' },
    topRecords: [
      {
        position: 1,
        playerName: 'ForestDweller',
        score: 94_250,
        achievedAt: '2026-09-01T10:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

export function makeComment(overrides: Partial<GameComment> = {}): GameComment {
  return {
    commentId: 'comment-1',
    authorName: 'ForestDweller',
    text: 'Lovely game!',
    likesCount: 3,
    isLikedByCurrentUser: false,
    createdAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

export function makeCommentsMeta(overrides: Partial<GameCommentsMeta> = {}): GameCommentsMeta {
  return { totalComments: 1, returnedCount: 1, sort: 'newest', ...overrides };
}

export function makeFavoriteResult(
  overrides: Partial<FavoriteToggleResult> = {},
): FavoriteToggleResult {
  return { gameSlug: 'cat-mail-co', isFavorited: true, likesCount: 38_208, ...overrides };
}

export function makeCommentLikeResult(
  overrides: Partial<CommentLikeResult> = {},
): CommentLikeResult {
  return { isLikedByCurrentUser: true, likesCount: 4, ...overrides };
}

export function makeCategory(overrides: Partial<CategoryItem> = {}): CategoryItem {
  return { slug: 'all', label: 'All', isDefault: true, ...overrides };
}

export function makeLeaderboardEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    rank: 1,
    playerName: 'ForestDweller',
    gamesPlayed: 42,
    totalScore: 94_250,
    streakDays: 7,
    favoriteGameSlug: 'cat-mail-co',
    favoriteGameName: 'Cat Mail Co.',
    ...overrides,
  };
}
