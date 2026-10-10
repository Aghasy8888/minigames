import { ApiError } from '../services/api-client';
import type { CategoriesResponse } from '../services/categories-api';
import type { CategoriesMeta } from '../services/categories-types';
import type { CommentLikeToggleResponse } from '../services/comment-like-api';
import type { GameCommentsResponse, PostGameCommentResponse } from '../services/comments-api';
import type { FavoriteToggleResponse } from '../services/favorite-api';
import type { GameDetailsResponse } from '../services/game-details-api';
import type { GamesApi, GamesListResponse } from '../services/games-api';
import type { GamesListMeta, GamesListParameters } from '../services/games-types';
import type { LeaderboardResponse } from '../services/leaderboard-api';
import type { LeaderboardMeta } from '../services/leaderboard-types';
import categoriesFixture from './categories.json';
import { tukoniCommentsResponse } from './comments';
import featuredGamesFixture from './featured-games.json';
import { tukoniForestKeepersResponse } from './game-details';
import leaderboardFixture from './leaderboard.json';
import libraryGamesFixture from './library-games.json';

export type FakeGamesScenario = 'success' | 'empty' | '401' | '404' | '429';

type ErrorScenario = Exclude<FakeGamesScenario, 'success' | 'empty'>;

type EndpointFake<TResponse> = {
  success: TResponse;
  empty: TResponse;
  errors: Record<ErrorScenario, string>;
};

const FAKE_DELAY_MS = 400;

const FEATURED_EMPTY_META: GamesListMeta = {
  page: 1,
  limit: 9,
  totalItems: 0,
  totalPages: 0,
  appliedFilter: { featured: true },
};

const LIBRARY_EMPTY_META: GamesListMeta = {
  page: 1,
  limit: 6,
  totalItems: 0,
  totalPages: 0,
};

const LEADERBOARD_EMPTY_META: LeaderboardMeta = {
  totalItems: 0,
  description: 'Top Players This Week',
};

const RATE_LIMIT_MESSAGE = 'Rate limit exceeded. Try again in 42 seconds';

/** 401/404 are not in the spec for list endpoints; they exercise the section fallback copy. */
const FEATURED_FAKE: EndpointFake<GamesListResponse> = {
  success: featuredGamesFixture as GamesListResponse,
  empty: { data: [], meta: FEATURED_EMPTY_META },
  errors: {
    '401': 'Authentication required',
    '404': 'Games not found',
    '429': RATE_LIMIT_MESSAGE,
  },
};

const LIBRARY_GAMES_FAKE: EndpointFake<GamesListResponse> = {
  success: libraryGamesFixture as GamesListResponse,
  empty: { data: [], meta: LIBRARY_EMPTY_META },
  errors: {
    '401': 'Authentication required',
    '404': 'Games not found',
    '429': RATE_LIMIT_MESSAGE,
  },
};

function withRequestedPage(response: GamesListResponse, page: number): GamesListResponse {
  const meta = response.meta;

  return {
    data: response.data,
    meta: {
      page,
      limit: meta?.limit ?? 6,
      totalItems: meta?.totalItems ?? 0,
      totalPages: meta?.totalPages ?? 0,
      appliedFilter: meta?.appliedFilter,
    },
  };
}

const LEADERBOARD_FAKE: EndpointFake<LeaderboardResponse> = {
  success: leaderboardFixture as LeaderboardResponse,
  empty: { data: [], meta: LEADERBOARD_EMPTY_META },
  errors: {
    '401': 'Authentication required',
    '404': 'Leaderboard not found',
    '429': RATE_LIMIT_MESSAGE,
  },
};

const CATEGORIES_EMPTY_META: CategoriesMeta = {
  totalItems: 0,
  description: 'Game categories for Library filter chips',
};

const CATEGORIES_FAKE: EndpointFake<CategoriesResponse> = {
  success: categoriesFixture as CategoriesResponse,
  empty: { data: [], meta: CATEGORIES_EMPTY_META },
  errors: {
    '401': 'Authentication required',
    '404': 'Categories not found',
    '429': RATE_LIMIT_MESSAGE,
  },
};

/** Empty = a 2xx game with no top records; the details endpoint has no list to be empty. */
const GAME_DETAILS_FAKE: EndpointFake<GameDetailsResponse> = {
  success: tukoniForestKeepersResponse,
  empty: { data: { ...tukoniForestKeepersResponse.data, topRecords: [] } },
  errors: {
    '401': 'Authentication required',
    '404': 'Game not found: invalid-slug',
    '429': RATE_LIMIT_MESSAGE,
  },
};

const COMMENTS_FAKE: EndpointFake<GameCommentsResponse> = {
  success: tukoniCommentsResponse,
  empty: { data: [], meta: { totalComments: 0, returnedCount: 0, sort: 'newest' } },
  errors: {
    '401': 'Authentication required',
    '404': 'Game not found: invalid-slug',
    '429': RATE_LIMIT_MESSAGE,
  },
};

const FAKE_CREATED_COMMENT: PostGameCommentResponse = {
  data: {
    commentId: 'c5d9f2a1-7c3b-4e8f-9a0d-00000000f001',
    authorName: 'ForestDweller',
    text: 'Such a calming little game!',
    likesCount: 0,
    isLikedByCurrentUser: false,
    createdAt: '2026-08-30T07:00:00Z',
  },
};

/** Stateless: the comments list fake doesn't change after a post. 201 has no list to be empty. */
const COMMENT_POST_FAKE: EndpointFake<PostGameCommentResponse> = {
  success: FAKE_CREATED_COMMENT,
  empty: FAKE_CREATED_COMMENT,
  errors: {
    '401': 'Authentication required: userEmail is missing',
    '404': 'Game not found: comment could not be posted',
    '429': RATE_LIMIT_MESSAGE,
  },
};

const FAVORITE_BASE_LIKES = tukoniForestKeepersResponse.data.likesCount;

/** The toggle has no list to be empty; both 2xx scenarios return a flipped state (see `toggleFavorite`). */
const FAVORITE_FAKE: EndpointFake<FavoriteToggleResponse> = {
  success: {
    data: {
      gameSlug: tukoniForestKeepersResponse.data.slug,
      isFavorited: true,
      likesCount: FAVORITE_BASE_LIKES + 1,
    },
  },
  empty: {
    data: {
      gameSlug: tukoniForestKeepersResponse.data.slug,
      isFavorited: true,
      likesCount: FAVORITE_BASE_LIKES + 1,
    },
  },
  errors: {
    '401': 'Authentication required: userEmail is missing',
    '404': 'Game not found: favorites could not be updated',
    '429': RATE_LIMIT_MESSAGE,
  },
};

/** The toggle has no list to be empty; both 2xx scenarios return a flipped state (see `toggleCommentLike`). */
const COMMENT_LIKE_FAKE: EndpointFake<CommentLikeToggleResponse> = {
  success: { data: { isLikedByCurrentUser: true, likesCount: 1 } },
  empty: { data: { isLikedByCurrentUser: true, likesCount: 1 } },
  errors: {
    '401': 'Authentication required: userEmail is missing',
    '404': 'Comment not found: like could not be updated',
    '429': RATE_LIMIT_MESSAGE,
  },
};

const COMMENT_BASE_LIKES = new Map(
  tukoniCommentsResponse.data.map(({ commentId, likesCount }) => [commentId, likesCount]),
);

function favoriteKey(slug: string, userEmail: string): string {
  return `${userEmail}\n${slug}`;
}

function commentLikeKey(commentId: string, userEmail: string): string {
  return `${userEmail}\n${commentId}`;
}

function createAbortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

function wait(durationMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const timeoutId = setTimeout(() => {
      resolve();
    }, durationMs);

    const onAbort = (): void => {
      clearTimeout(timeoutId);
      reject(createAbortError());
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function respond<TResponse>(
  scenario: FakeGamesScenario,
  endpoint: EndpointFake<TResponse>,
  signal?: AbortSignal,
): Promise<TResponse> {
  await wait(FAKE_DELAY_MS, signal);

  if (scenario === 'success' || scenario === 'empty') {
    return endpoint[scenario];
  }

  throw new ApiError(endpoint.errors[scenario], Number(scenario));
}

export function createFakeGamesApi(scenario: FakeGamesScenario): GamesApi {
  const favorites = new Set<string>();
  const commentLikes = new Set<string>();

  return {
    async fetchGames(parameters: GamesListParameters, options = {}) {
      const response = await respond(scenario, LIBRARY_GAMES_FAKE, options.signal);

      if (scenario !== 'success') {
        return response;
      }

      return withRequestedPage(response, parameters.page ?? 1);
    },
    fetchFeaturedGames(options = {}) {
      return respond(scenario, FEATURED_FAKE, options.signal);
    },
    fetchLeaderboard(options = {}) {
      return respond(scenario, LEADERBOARD_FAKE, options.signal);
    },
    fetchCategories(options = {}) {
      return respond(scenario, CATEGORIES_FAKE, options.signal);
    },
    async fetchGameDetails(slug, options = {}) {
      const response = await respond(scenario, GAME_DETAILS_FAKE, options.signal);
      const { userEmail } = options;

      if (userEmail === undefined || !favorites.has(favoriteKey(slug, userEmail))) {
        return response;
      }

      return {
        data: { ...response.data, isLikedByCurrentUser: true, likesCount: FAVORITE_BASE_LIKES + 1 },
      };
    },
    async fetchGameComments(_slug, options = {}) {
      const response = await respond(scenario, COMMENTS_FAKE, options.signal);
      const { userEmail } = options;

      if (userEmail === undefined) {
        return response;
      }

      return {
        ...response,
        data: response.data.map((comment) =>
          commentLikes.has(commentLikeKey(comment.commentId, userEmail))
            ? { ...comment, isLikedByCurrentUser: true, likesCount: comment.likesCount + 1 }
            : comment,
        ),
      };
    },
    async postGameComment(_slug, { authorName, text, signal }) {
      const { data } = await respond(scenario, COMMENT_POST_FAKE, signal);
      return { data: { ...data, authorName, text, createdAt: new Date().toISOString() } };
    },
    async toggleFavorite(slug, { userEmail, signal }) {
      const { data } = await respond(scenario, FAVORITE_FAKE, signal);
      const key = favoriteKey(slug, userEmail);
      const isFavorited = !favorites.has(key);

      if (isFavorited) {
        favorites.add(key);
      } else {
        favorites.delete(key);
      }

      return {
        data: {
          ...data,
          gameSlug: slug,
          isFavorited,
          likesCount: FAVORITE_BASE_LIKES + (isFavorited ? 1 : 0),
        },
      };
    },
    async toggleCommentLike(commentId, { userEmail, signal }) {
      await respond(scenario, COMMENT_LIKE_FAKE, signal);
      const key = commentLikeKey(commentId, userEmail);
      const isLikedByCurrentUser = !commentLikes.has(key);

      if (isLikedByCurrentUser) {
        commentLikes.add(key);
      } else {
        commentLikes.delete(key);
      }

      const baseLikes = COMMENT_BASE_LIKES.get(commentId) ?? 0;
      return {
        data: { isLikedByCurrentUser, likesCount: baseLikes + (isLikedByCurrentUser ? 1 : 0) },
      };
    },
  };
}
