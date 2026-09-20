import { leaderboardSeed } from '../../mocks/leaderboard';

export const LEADERBOARD_TITLE_SHORT = 'Top Players' as const;
export const LEADERBOARD_TITLE_FULL = leaderboardSeed.meta.description;

export const LEADERBOARD_STREAK_FIRE = '🔥' as const;

export const LEADERBOARD_MOBILE_ROW_LIMIT = 3;

export const LEADERBOARD_COLUMNS = {
  rank: { label: 'Rank' },
  player: { label: 'Player' },
  games: { labelShort: 'Games', labelFull: 'Games Played' },
  score: { labelShort: 'Score', labelFull: 'Total Score' },
  streak: { label: 'Streak' },
  favorite: { label: 'Favorite Game' },
} as const;

/** Avatar background BEM modifiers by 0-based row index (rank 1 = primary). */
export const LEADERBOARD_AVATAR_MODIFIERS = [
  'primary',
  'random-2',
  'random-3',
  'random-4',
  'random-5',
] as const;
