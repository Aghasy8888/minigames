import { gamesApi, type LeaderboardEntry } from '../services/games-api-provider';
import { useLoadState, type LoadState, type LoadStateController } from './use-load-state';

export type LeaderboardState = LoadState<LeaderboardEntry>;

export type LeaderboardController = LoadStateController<LeaderboardEntry>;

export function useLeaderboard(): LeaderboardController {
  return useLoadState<LeaderboardEntry>({
    async load(signal) {
      const { data } = await gamesApi.fetchLeaderboard({ signal });
      return data;
    },
    fallbackErrorMessage: 'Top players are unavailable right now. Please try again.',
    retrySuccessMessage: 'Top players loaded',
  });
}
