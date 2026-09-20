import {
  camperVanMakeItHomeCard,
  islandersNewShoresCard,
  organizedInsideCard,
  vacationCafeSimulatorCard,
  winterBurrowCard,
} from '../assets/images';
import allGamesSeed from './all-games-seed.json';

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

export const mockGames: readonly GameSeed[] = gamesSeed.data;

const gameCardImagesBySlug: Readonly<Record<string, string>> = {
  'organized-inside': organizedInsideCard,
  'islanders-new-shores': islandersNewShoresCard,
  'vacation-cafe-simulator': vacationCafeSimulatorCard,
  'winter-burrow': winterBurrowCard,
  'camper-van-make-it-home': camperVanMakeItHomeCard,
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
