export { tukoniForestKeepers as GAME_DETAILS } from '../../mocks/game-details';

export const PLAY_NOW_LABEL = 'Play Now';
export const ADD_TO_FAVORITES_LABEL = 'Add to Favorites';
export const REMOVE_FROM_FAVORITES_LABEL = 'Remove from Favorites';
export const CLOSE_DIALOG_ARIA_LABEL = 'Close game details';

export const SPEC_LABELS = {
  genre: 'Genre',
  players: 'Players',
  duration: 'Duration',
  price: 'Price',
} as const;

export const SPEC_KEYS = ['genre', 'players', 'duration', 'price'] as const;
