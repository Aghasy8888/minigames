import { favoriteIcon, starIcon } from '../../assets/icons';
import type { GameDetails } from '../../services/games-api-provider';
import { formatCompactCount } from '../../utils/format-compact-count';
import { createButton } from '../button';
import { createComments } from '../comments';
import { createTopRecords } from '../top-records';
import {
  GAME_COMMENTS,
  GAME_DETAILS_TITLE_ID,
  PLAY_NOW_LABEL,
  SPEC_KEYS,
  SPEC_LABELS,
} from './game-details-dialog-data';
import { createFavoriteToggle, createSpecWidget, createStat } from './game-details-dialog-parts';

function createHeader(game: GameDetails): HTMLElement {
  const header = document.createElement('div');
  header.className = 'game-details-dialog__header';

  const title = document.createElement('h2');
  title.id = GAME_DETAILS_TITLE_ID;
  title.className = 'game-details-dialog__title';
  title.textContent = game.name;

  const stats = document.createElement('div');
  stats.className = 'game-details-dialog__stats';
  stats.append(
    createStat(starIcon, game.rating.toFixed(1)),
    createStat(favoriteIcon, formatCompactCount(game.likesCount)),
  );

  header.append(title, stats);
  return header;
}

function createActions(game: GameDetails): HTMLElement {
  const actions = document.createElement('div');
  actions.className = 'game-details-dialog__actions';

  const playButton = createButton({
    label: PLAY_NOW_LABEL,
    variant: 'primary',
    size: 'large',
    className: 'button--dialog-cta game-details-dialog__play',
  });

  actions.append(playButton, createFavoriteToggle(game.isLikedByCurrentUser));
  return actions;
}

/** Body children for a loaded game; all API text goes through `textContent`. */
export function createGameDetailsBody(game: GameDetails): HTMLElement[] {
  const description = document.createElement('p');
  description.className = 'game-details-dialog__description';
  description.textContent = game.fullDescription;

  const widgets = document.createElement('div');
  widgets.className = 'game-details-dialog__widgets';
  widgets.append(...SPEC_KEYS.map((key) => createSpecWidget(SPEC_LABELS[key], game.specs[key])));

  const comments = createComments({
    comments: GAME_COMMENTS.data,
    totalCount: GAME_COMMENTS.meta.totalComments,
  });

  return [
    createHeader(game),
    description,
    widgets,
    createActions(game),
    createTopRecords(game.topRecords),
    comments.element,
  ];
}
