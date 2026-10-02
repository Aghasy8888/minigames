export type LeaderboardEntry = {
  rank: number;
  playerName: string;
  gamesPlayed: number;
  totalScore: number;
  streakDays: number;
  favoriteGameSlug: string;
  favoriteGameName: string;
};

export type LeaderboardMeta = {
  totalItems: number;
  description: string;
};
