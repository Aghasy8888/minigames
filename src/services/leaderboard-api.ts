import { request, type ApiListResponse } from './api-client';
import type { LeaderboardEntry, LeaderboardMeta } from './leaderboard-types';

export type LeaderboardRequestOptions = {
  signal?: AbortSignal;
};

export type LeaderboardResponse = ApiListResponse<LeaderboardEntry[], LeaderboardMeta>;

export function fetchLeaderboard(
  options: LeaderboardRequestOptions = {},
): Promise<LeaderboardResponse> {
  return request<LeaderboardEntry[], LeaderboardMeta>('/api/leaderboard', {
    signal: options.signal,
  });
}
