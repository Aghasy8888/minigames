export { tukoniComments as GAME_COMMENTS } from '../../mocks/comments';

export const PLAY_NOW_LABEL = 'Play Now';
export const ADD_TO_FAVORITES_LABEL = 'Add to Favorites';
export const REMOVE_FROM_FAVORITES_LABEL = 'Remove from Favorites';
export const CLOSE_DIALOG_ARIA_LABEL = 'Close game details';
export const GAME_DETAILS_ARIA_LABEL = 'Game details';
export const GAME_DETAILS_TITLE_ID = 'game-details-dialog-title';

export const GAME_DETAILS_ERROR_TITLE = 'Could not load game details';
export const GAME_DETAILS_RETRY_LABEL = 'Retry';

export const SPEC_LABELS = {
  genre: 'Genre',
  players: 'Players',
  duration: 'Duration',
  price: 'Price',
} as const;

export const SPEC_KEYS = ['genre', 'players', 'duration', 'price'] as const;

export const SKELETON_DESCRIPTION_LINES = 3;
export const SKELETON_ACTION_COUNT = 2;
export const SKELETON_RECORD_COUNT = 3;
