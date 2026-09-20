import leaderboardJson from './leaderboard.json';

export type LeaderboardEntry = {
  rank: number;
  playerName: string;
  gamesPlayed: number;
  totalScore: number;
  streakDays: number;
  favoriteGameSlug: string;
  favoriteGameName: string;
};

export type LeaderboardResponse = {
  data: LeaderboardEntry[];
  meta: {
    totalItems: number;
    description: string;
  };
};

export const leaderboardSeed = leaderboardJson as LeaderboardResponse;

export const mockLeaderboard: readonly LeaderboardEntry[] = leaderboardSeed.data;
