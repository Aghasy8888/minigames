import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../services/api-client';
import type { GamesApi } from '../services/games-api';
import { TEST_USER_EMAIL } from '../test-support/api-factories';
import categoriesFixture from './categories.json';
import { tukoniCommentsResponse } from './comments';
import { createFakeGamesApi, type FakeGamesScenario } from './fake-games-api';
import featuredGamesFixture from './featured-games.json';
import { tukoniForestKeepersResponse } from './game-details';
import leaderboardFixture from './leaderboard.json';
import libraryGamesFixture from './library-games.json';

const FAKE_DELAY_MS = 400;
const OTHER_EMAIL = 'other@rs.school';
const SLUG = tukoniForestKeepersResponse.data.slug;
const BASE_GAME_LIKES = tukoniForestKeepersResponse.data.likesCount;
const [firstComment] = tukoniCommentsResponse.data;
const FIRST_COMMENT_ID = firstComment?.commentId ?? '';
const FIRST_COMMENT_LIKES = firstComment?.likesCount ?? 0;
const USER = { userEmail: TEST_USER_EMAIL };

/** Resolves a fake call by running its simulated network delay. */
async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(FAKE_DELAY_MS);
  return promise;
}

/** Attaches the rejection check before the delay runs, so the rejection is never unhandled. */
async function expectRejection(promise: Promise<unknown>, expected: object): Promise<void> {
  const assertion = expect(promise).rejects.toMatchObject(expected);
  await vi.advanceTimersByTimeAsync(FAKE_DELAY_MS);
  await assertion;
}

type EndpointCall = { name: string; call: (api: GamesApi) => Promise<unknown> };

const COMMENT = { ...USER, authorName: 'Alex2026', text: 'Lovely!' };

const ENDPOINTS: EndpointCall[] = [
  { name: 'fetchGames', call: (api) => api.fetchGames({ page: 1 }) },
  { name: 'fetchFeaturedGames', call: (api) => api.fetchFeaturedGames() },
  { name: 'fetchLeaderboard', call: (api) => api.fetchLeaderboard() },
  { name: 'fetchCategories', call: (api) => api.fetchCategories() },
  { name: 'fetchGameDetails', call: (api) => api.fetchGameDetails(SLUG) },
  { name: 'fetchGameComments', call: (api) => api.fetchGameComments(SLUG) },
  { name: 'postGameComment', call: (api) => api.postGameComment(SLUG, COMMENT) },
  { name: 'toggleFavorite', call: (api) => api.toggleFavorite(SLUG, USER) },
  { name: 'toggleCommentLike', call: (api) => api.toggleCommentLike(FIRST_COMMENT_ID, USER) },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-11T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('simulated network', () => {
  it('answers only after the simulated delay', async () => {
    const onSettled = vi.fn();
    void createFakeGamesApi('success').fetchLeaderboard().then(onSettled);

    await vi.advanceTimersByTimeAsync(FAKE_DELAY_MS - 1);
    expect(onSettled).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('rejects at once with an AbortError when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      createFakeGamesApi('success').fetchLeaderboard({ signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects with an AbortError and clears its timer when aborted while waiting', async () => {
    const controller = new AbortController();
    const pending = createFakeGamesApi('success').fetchCategories({ signal: controller.signal });
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('success scenario', () => {
  it('returns the featured, leaderboard, and categories fixtures', async () => {
    const fake = createFakeGamesApi('success');

    await expect(settle(fake.fetchFeaturedGames())).resolves.toEqual(featuredGamesFixture);
    await expect(settle(fake.fetchLeaderboard())).resolves.toEqual(leaderboardFixture);
    await expect(settle(fake.fetchCategories())).resolves.toEqual(categoriesFixture);
  });

  it('echoes the requested page in meta without slicing or reordering the items', async () => {
    const { data, meta } = await settle(
      createFakeGamesApi('success').fetchGames({ page: 3, category: 'puzzle' }),
    );

    expect(data).toEqual(libraryGamesFixture.data);
    expect(meta).toEqual({ ...libraryGamesFixture.meta, page: 3, appliedFilter: undefined });
  });

  it('reports page 1 when no page is requested', async () => {
    const { meta } = await settle(createFakeGamesApi('success').fetchGames({}));

    expect(meta?.page).toBe(1);
  });

  it('returns the game details and comments fixtures for a guest', async () => {
    const fake = createFakeGamesApi('success');

    await expect(settle(fake.fetchGameDetails(SLUG))).resolves.toEqual(tukoniForestKeepersResponse);
    await expect(settle(fake.fetchGameComments(SLUG))).resolves.toEqual(tukoniCommentsResponse);
  });

  it('creates a comment with the sent author and text, stamped when the response arrives', async () => {
    const { data } = await settle(createFakeGamesApi('success').postGameComment(SLUG, COMMENT));

    expect(data).toMatchObject({
      authorName: 'Alex2026',
      text: 'Lovely!',
      likesCount: 0,
      isLikedByCurrentUser: false,
      createdAt: new Date(Date.parse('2026-10-11T12:00:00.000Z') + FAKE_DELAY_MS).toISOString(),
    });
  });
});

describe('favorite toggle state', () => {
  it('flips on, then off, with the matching count', async () => {
    const fake = createFakeGamesApi('success');

    const first = await settle(fake.toggleFavorite(SLUG, USER));
    const second = await settle(fake.toggleFavorite(SLUG, USER));

    expect(first.data).toEqual({
      gameSlug: SLUG,
      isFavorited: true,
      likesCount: BASE_GAME_LIKES + 1,
    });
    expect(second.data).toEqual({
      gameSlug: SLUG,
      isFavorited: false,
      likesCount: BASE_GAME_LIKES,
    });
  });

  it('shows the favorite in game details only for the user who added it', async () => {
    const fake = createFakeGamesApi('success');
    await settle(fake.toggleFavorite(SLUG, USER));

    const own = await settle(fake.fetchGameDetails(SLUG, USER));
    const other = await settle(fake.fetchGameDetails(SLUG, { userEmail: OTHER_EMAIL }));
    const guest = await settle(fake.fetchGameDetails(SLUG));

    expect(own.data).toMatchObject({ isLikedByCurrentUser: true, likesCount: BASE_GAME_LIKES + 1 });
    expect(other.data.isLikedByCurrentUser).toBe(false);
    expect(guest.data.isLikedByCurrentUser).toBe(false);
  });

  it('shows the game as not favorited again after it is removed', async () => {
    const fake = createFakeGamesApi('success');
    await settle(fake.toggleFavorite(SLUG, USER));
    await settle(fake.toggleFavorite(SLUG, USER));

    const { data } = await settle(fake.fetchGameDetails(SLUG, USER));

    expect(data).toMatchObject({ isLikedByCurrentUser: false, likesCount: BASE_GAME_LIKES });
  });

  it('keeps state per fake instance', async () => {
    await settle(createFakeGamesApi('success').toggleFavorite(SLUG, USER));

    const { data } = await settle(createFakeGamesApi('success').toggleFavorite(SLUG, USER));

    expect(data.isFavorited).toBe(true);
  });
});

describe('comment like toggle state', () => {
  it('flips on, then off, from the fixture count', async () => {
    const fake = createFakeGamesApi('success');

    const first = await settle(fake.toggleCommentLike(FIRST_COMMENT_ID, USER));
    const second = await settle(fake.toggleCommentLike(FIRST_COMMENT_ID, USER));

    expect(first.data).toEqual({ isLikedByCurrentUser: true, likesCount: FIRST_COMMENT_LIKES + 1 });
    expect(second.data).toEqual({ isLikedByCurrentUser: false, likesCount: FIRST_COMMENT_LIKES });
  });

  it('counts from zero for a comment that is not in the fixture', async () => {
    const { data } = await settle(
      createFakeGamesApi('success').toggleCommentLike('new-comment', USER),
    );

    expect(data).toEqual({ isLikedByCurrentUser: true, likesCount: 1 });
  });

  it('shows the like in the comments list only for the user who liked it', async () => {
    const fake = createFakeGamesApi('success');
    await settle(fake.toggleCommentLike(FIRST_COMMENT_ID, USER));

    const own = await settle(fake.fetchGameComments(SLUG, USER));
    const other = await settle(fake.fetchGameComments(SLUG, { userEmail: OTHER_EMAIL }));
    const guest = await settle(fake.fetchGameComments(SLUG));

    expect(own.data[0]).toMatchObject({
      isLikedByCurrentUser: true,
      likesCount: FIRST_COMMENT_LIKES + 1,
    });
    expect(own.data.slice(1)).toEqual(tukoniCommentsResponse.data.slice(1));
    expect(own.meta).toEqual(tukoniCommentsResponse.meta);
    expect(other.data).toEqual(tukoniCommentsResponse.data);
    expect(guest.data).toEqual(tukoniCommentsResponse.data);
  });
});

type ListCall = {
  name: string;
  call: (fake: GamesApi) => Promise<{ data: unknown[]; meta?: { totalItems: number } }>;
};

describe('empty scenario', () => {
  it.each<ListCall>([
    { name: 'library games', call: (fake: GamesApi) => fake.fetchGames({ page: 2 }) },
    { name: 'featured games', call: (fake: GamesApi) => fake.fetchFeaturedGames() },
    { name: 'leaderboard', call: (fake: GamesApi) => fake.fetchLeaderboard() },
    { name: 'categories', call: (fake: GamesApi) => fake.fetchCategories() },
  ])('returns a 2xx with no $name and a zero total', async ({ call }) => {
    const { data, meta } = await settle(call(createFakeGamesApi('empty')));

    expect(data).toEqual([]);
    expect(meta).toMatchObject({ totalItems: 0 });
  });

  it('returns a 2xx with no comments and a zero total', async () => {
    const { data, meta } = await settle(createFakeGamesApi('empty').fetchGameComments(SLUG));

    expect(data).toEqual([]);
    expect(meta).toMatchObject({ totalComments: 0, returnedCount: 0 });
  });

  it('keeps the empty library meta instead of echoing the requested page', async () => {
    const { meta } = await settle(createFakeGamesApi('empty').fetchGames({ page: 2 }));

    expect(meta).toMatchObject({ page: 1, totalPages: 0 });
  });

  it('returns game details with no top records', async () => {
    const { data } = await settle(createFakeGamesApi('empty').fetchGameDetails(SLUG));

    expect(data).toEqual({ ...tukoniForestKeepersResponse.data, topRecords: [] });
  });
});

describe.each<FakeGamesScenario>(['401', '404', '429'])('%s scenario', (scenario) => {
  it.each(ENDPOINTS)('$name rejects with an ApiError of status ' + scenario, async ({ call }) => {
    const pending = call(createFakeGamesApi(scenario));

    await expectRejection(pending, { name: 'ApiError', status: Number(scenario) });
    await expect(pending).rejects.toBeInstanceOf(ApiError);
  });
});

describe('404 messages', () => {
  it.each<{ name: string; call: EndpointCall['call']; resource: RegExp }>([
    { name: 'fetchGames', call: (api) => api.fetchGames({}), resource: /games/i },
    { name: 'fetchLeaderboard', call: (api) => api.fetchLeaderboard(), resource: /leaderboard/i },
    { name: 'fetchCategories', call: (api) => api.fetchCategories(), resource: /categories/i },
    {
      name: 'toggleFavorite',
      call: (api) => api.toggleFavorite(SLUG, USER),
      resource: /favorite/i,
    },
    {
      name: 'toggleCommentLike',
      call: (api) => api.toggleCommentLike(FIRST_COMMENT_ID, USER),
      resource: /like/i,
    },
    {
      name: 'postGameComment',
      call: (api) => api.postGameComment(SLUG, COMMENT),
      resource: /comment/i,
    },
  ])('$name describes its own resource', async ({ call, resource }) => {
    await expectRejection(call(createFakeGamesApi('404')), {
      message: expect.stringMatching(resource),
    });
  });

  it('never leaks the game-details message into the leaderboard', async () => {
    await expectRejection(createFakeGamesApi('404').fetchLeaderboard(), {
      message: expect.not.stringMatching(/game not found/i),
    });
  });
});
