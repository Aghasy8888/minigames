import { mockLeaderboard, type LeaderboardEntry } from '../../mocks/leaderboard';
import { formatCompactCount } from '../../utils/format-compact-count';
import { formatScore } from '../../utils/format-score';
import { getPlayerInitials } from '../../utils/get-player-initials';
import {
  LEADERBOARD_AVATAR_MODIFIERS,
  LEADERBOARD_COLUMNS,
  LEADERBOARD_MOBILE_ROW_LIMIT,
  LEADERBOARD_STREAK_FIRE,
  LEADERBOARD_TITLE_FULL,
  LEADERBOARD_TITLE_SHORT,
} from './leaderboard-data';
import './leaderboard.scss';

function createDualText(
  shortText: string,
  fullText: string,
  shortClass: string,
  fullClass: string,
): DocumentFragment {
  const fragment = document.createDocumentFragment();

  const short = document.createElement('span');
  short.className = shortClass;
  short.textContent = shortText;

  const full = document.createElement('span');
  full.className = fullClass;
  full.textContent = fullText;

  fragment.append(short, full);
  return fragment;
}

function createPlayerCell(entry: LeaderboardEntry, rowIndex: number): HTMLTableCellElement {
  const cell = document.createElement('td');
  cell.className = 'leaderboard__cell leaderboard__cell--player';

  const player = document.createElement('div');
  player.className = 'leaderboard__player';

  const avatarModifier = LEADERBOARD_AVATAR_MODIFIERS[rowIndex] ?? 'random-2';
  const avatar = document.createElement('span');
  avatar.className = `leaderboard__avatar leaderboard__avatar--${avatarModifier}`;
  avatar.textContent = getPlayerInitials(entry.playerName);
  avatar.setAttribute('aria-hidden', 'true');

  const name = document.createElement('span');
  name.className = 'leaderboard__player-name';
  name.textContent = entry.playerName;

  player.append(avatar, name);
  cell.append(player);
  return cell;
}

function createLeaderboardRow(entry: LeaderboardEntry, rowIndex: number): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.className = 'leaderboard__row';

  if (entry.rank > LEADERBOARD_MOBILE_ROW_LIMIT) {
    row.classList.add('leaderboard__row--desktop-only');
  }

  const rankCell = document.createElement('td');
  rankCell.className = 'leaderboard__cell leaderboard__cell--rank';
  if (entry.rank === 1) {
    rankCell.classList.add('leaderboard__cell--rank-first');
  }
  rankCell.textContent = `#${entry.rank}`;

  const gamesCell = document.createElement('td');
  gamesCell.className = 'leaderboard__cell leaderboard__cell--games leaderboard__col--games';
  gamesCell.textContent = String(entry.gamesPlayed);

  const scoreCell = document.createElement('td');
  scoreCell.className = 'leaderboard__cell leaderboard__cell--score';
  scoreCell.append(
    createDualText(
      formatCompactCount(entry.totalScore),
      formatScore(entry.totalScore),
      'leaderboard__score--compact',
      'leaderboard__score--full',
    ),
  );

  const streakCell = document.createElement('td');
  streakCell.className = 'leaderboard__cell leaderboard__cell--streak';
  streakCell.append(
    createDualText(
      `${LEADERBOARD_STREAK_FIRE} ${entry.streakDays}d`,
      `${LEADERBOARD_STREAK_FIRE} ${entry.streakDays} days`,
      'leaderboard__streak--short',
      'leaderboard__streak--full',
    ),
  );

  const favoriteCell = document.createElement('td');
  favoriteCell.className =
    'leaderboard__cell leaderboard__cell--favorite leaderboard__col--favorite';
  const badge = document.createElement('span');
  badge.className = 'leaderboard__game-badge';
  badge.textContent = entry.favoriteGameName;
  favoriteCell.append(badge);

  row.append(
    rankCell,
    createPlayerCell(entry, rowIndex),
    gamesCell,
    scoreCell,
    streakCell,
    favoriteCell,
  );

  return row;
}

function createTableHead(): HTMLTableSectionElement {
  const thead = document.createElement('thead');
  thead.className = 'leaderboard__head';

  const row = document.createElement('tr');

  const rankTh = document.createElement('th');
  rankTh.className = 'leaderboard__th leaderboard__th--rank';
  rankTh.scope = 'col';
  rankTh.textContent = LEADERBOARD_COLUMNS.rank.label;

  const playerTh = document.createElement('th');
  playerTh.className = 'leaderboard__th leaderboard__th--player';
  playerTh.scope = 'col';
  playerTh.textContent = LEADERBOARD_COLUMNS.player.label;

  const gamesTh = document.createElement('th');
  gamesTh.className = 'leaderboard__th leaderboard__th--games leaderboard__col--games';
  gamesTh.scope = 'col';
  gamesTh.append(
    createDualText(
      LEADERBOARD_COLUMNS.games.labelShort,
      LEADERBOARD_COLUMNS.games.labelFull,
      'leaderboard__th-label--short',
      'leaderboard__th-label--full',
    ),
  );

  const scoreTh = document.createElement('th');
  scoreTh.className = 'leaderboard__th leaderboard__th--score';
  scoreTh.scope = 'col';
  scoreTh.append(
    createDualText(
      LEADERBOARD_COLUMNS.score.labelShort,
      LEADERBOARD_COLUMNS.score.labelFull,
      'leaderboard__th-label--short',
      'leaderboard__th-label--full',
    ),
  );

  const streakTh = document.createElement('th');
  streakTh.className = 'leaderboard__th leaderboard__th--streak';
  streakTh.scope = 'col';
  streakTh.textContent = LEADERBOARD_COLUMNS.streak.label;

  const favoriteTh = document.createElement('th');
  favoriteTh.className = 'leaderboard__th leaderboard__th--favorite leaderboard__col--favorite';
  favoriteTh.scope = 'col';
  favoriteTh.textContent = LEADERBOARD_COLUMNS.favorite.label;

  row.append(rankTh, playerTh, gamesTh, scoreTh, streakTh, favoriteTh);
  thead.append(row);
  return thead;
}

export function createLeaderboard(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'leaderboard';
  section.setAttribute('aria-label', LEADERBOARD_TITLE_FULL);

  const header = document.createElement('div');
  header.className = 'leaderboard__header';

  const accent = document.createElement('span');
  accent.className = 'leaderboard__accent';
  accent.setAttribute('aria-hidden', 'true');

  const title = document.createElement('h2');
  title.className = 'leaderboard__title';
  title.append(
    createDualText(
      LEADERBOARD_TITLE_SHORT,
      LEADERBOARD_TITLE_FULL,
      'leaderboard__title-text--short',
      'leaderboard__title-text--full',
    ),
  );

  header.append(accent, title);

  const frame = document.createElement('div');
  frame.className = 'leaderboard__frame';

  const table = document.createElement('table');
  table.className = 'leaderboard__table';

  const tbody = document.createElement('tbody');
  tbody.className = 'leaderboard__body';

  for (const [index, entry] of mockLeaderboard.entries()) {
    tbody.append(createLeaderboardRow(entry, index));
  }

  table.append(createTableHead(), tbody);
  frame.append(table);
  section.append(header, frame);

  return section;
}
