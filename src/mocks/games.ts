import {
  camperVanMakeItHomeCard,
  catMailCoCard,
  heartopiaCard,
  islandersNewShoresCard,
  organizedInsideCard,
  paliaCard,
  shelveThePotionsCard,
  vacationCafeSimulatorCard,
  winterBurrowCard,
} from '../assets/images';
import allGamesSeed from './all-games-seed.json';
import allGamesSeedLibrary from './all-games-seed-lib.json';

export type GameSeed = {
  slug: string;
  name: string;
  category: string;
  price: string;
  shortDescription: string;
  rating: number;
  likesCount: number;
  cardImage: string;
  featured: boolean;
};

export type GamesSeedResponse = {
  data: GameSeed[];
  meta: {
    totalItems: number;
    description: string;
    featuredCount: number;
  };
};

export const gamesSeed = allGamesSeed as GamesSeedResponse;
export const libraryGamesSeed = allGamesSeedLibrary as GamesSeedResponse;

export const mockGames: readonly GameSeed[] = gamesSeed.data;
export const allLibraryGames: readonly GameSeed[] = libraryGamesSeed.data;

const gameCardImagesBySlug: Readonly<Record<string, string>> = {
  'organized-inside': organizedInsideCard,
  'islanders-new-shores': islandersNewShoresCard,
  'vacation-cafe-simulator': vacationCafeSimulatorCard,
  'winter-burrow': winterBurrowCard,
  'camper-van-make-it-home': camperVanMakeItHomeCard,
  'shelve-the-potions': shelveThePotionsCard,
  heartopia: heartopiaCard,
  palia: paliaCard,
  'cat-mail-co': catMailCoCard,
};

export function getGameCardImage(slug: string): string {
  const image = gameCardImagesBySlug[slug];

  if (!image) {
    throw new Error(`Missing card image for game slug: ${slug}`);
  }

  return image;
}

export function getGameBySlug(slug: string): GameSeed {
  const game = mockGames.find((item) => item.slug === slug);

  if (!game) {
    throw new Error(`Missing game seed for slug: ${slug}`);
  }

  return game;
}

export function getLibraryGameBySlug(slug: string): GameSeed {
  const game = allLibraryGames.find((item) => item.slug === slug);

  if (!game) {
    throw new Error(`Missing library game seed for slug: ${slug}`);
  }

  return game;
}

export function getLibraryGamesBySlugs(slugs: readonly string[]): GameSeed[] {
  return slugs.map((slug) => getLibraryGameBySlug(slug));
}
