import tukoniSeed from './game-tukoni-forest-keepers.json';

export type GameDetailsTopRecord = {
  position: number;
  playerName: string;
  score: number;
  achievedAt: string;
};

export type GameDetailsSpecs = {
  genre: string;
  players: string;
  duration: string;
  price: string;
};

export type GameDetailsData = {
  slug: string;
  name: string;
  heroImage: string;
  rating: number;
  likesCount: number;
  isLikedByCurrentUser: boolean;
  fullDescription: string;
  specs: GameDetailsSpecs;
  topRecords: GameDetailsTopRecord[];
};

export type GameDetailsSeedResponse = {
  data: GameDetailsData;
};

export const tukoniForestKeepers = (tukoniSeed as GameDetailsSeedResponse).data;
