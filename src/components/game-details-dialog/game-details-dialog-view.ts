import { starIcon } from '../../assets/icons';
import { useDisconnectCleanup } from '../../hooks/use-disconnect-cleanup';
import { useFavoriteToggle, type FavoriteToggleController } from '../../hooks/use-favorite-toggle';
import type { GameCommentsController } from '../../hooks/use-game-comments';
import type { GameDetails } from '../../services/games-api-provider';
import { createButton } from '../button';
import { createComments } from '../comments';
import { createTopRecords } from '../top-records';
import {
  GAME_DETAILS_TITLE_ID,
  PLAY_NOW_LABEL,
  SPEC_KEYS,
  SPEC_LABELS,
} from './game-details-dialog-data';
import { createFavoriteToggle, createLikesStat } from './game-details-dialog-favorite';
import { createSpecWidget, createStat } from './game-details-dialog-parts';

function createHeader(game: GameDetails, favorite: FavoriteToggleController): HTMLElement {
  const header = document.createElement('div');
  header.className = 'game-details-dialog__header';

  const title = document.createElement('h2');
  title.id = GAME_DETAILS_TITLE_ID;
  title.className = 'game-details-dialog__title';
  title.textContent = game.name;

  const stats = document.createElement('div');
  stats.className = 'game-details-dialog__stats';
  stats.append(createStat(starIcon, game.rating.toFixed(1)), createLikesStat(favorite));

  header.append(title, stats);
  return header;
}

function createActions(favorite: FavoriteToggleController): HTMLElement {
  const actions = document.createElement('div');
  actions.className = 'game-details-dialog__actions';

  const playButton = createButton({
    label: PLAY_NOW_LABEL,
    variant: 'primary',
    size: 'large',
    className: 'button--dialog-cta game-details-dialog__play',
  });

  actions.append(playButton, createFavoriteToggle(favorite));
  return actions;
}

/** Body children for a loaded game; all API text goes through `textContent`. */
export function createGameDetailsBody(
  game: GameDetails,
  comments: GameCommentsController,
): HTMLElement[] {
  const favorite = useFavoriteToggle({
    slug: game.slug,
    isFavorited: game.isLikedByCurrentUser,
    likesCount: game.likesCount,
  });

  const description = document.createElement('p');
  description.className = 'game-details-dialog__description';
  description.textContent = game.fullDescription;

  const widgets = document.createElement('div');
  widgets.className = 'game-details-dialog__widgets';
  widgets.append(...SPEC_KEYS.map((key) => createSpecWidget(SPEC_LABELS[key], game.specs[key])));

  const actions = createActions(favorite);
  useDisconnectCleanup(actions, favorite.destroy);

  return [
    createHeader(game, favorite),
    description,
    widgets,
    actions,
    createTopRecords(game.topRecords),
    createComments({ controller: comments }),
  ];
}
