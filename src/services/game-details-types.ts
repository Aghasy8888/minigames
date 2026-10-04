export type GameDetailsSpecs = {
  genre: string;
  players: string;
  duration: string;
  price: string;
};

export type GameDetailsTopRecord = {
  position: number;
  playerName: string;
  score: number;
  /** ISO 8601 UTC */
  achievedAt: string;
};

export type GameDetails = {
  slug: string;
  name: string;
  heroImage: string;
  rating: number;
  likesCount: number;
  /** Always false unless `userEmail` is supplied. */
  isLikedByCurrentUser: boolean;
  fullDescription: string;
  specs: GameDetailsSpecs;
  topRecords: GameDetailsTopRecord[];
};
