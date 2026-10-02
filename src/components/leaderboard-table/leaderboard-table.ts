import type { LeaderboardEntry } from '../../services/games-api-provider';
import { formatCompactCount } from '../../utils/format-compact-count';
import { formatScore } from '../../utils/format-score';
import { getPlayerInitials } from '../../utils/get-player-initials';
import { createSkeleton } from '../skeleton';
import {
  LEADERBOARD_TABLE_AVATAR_FALLBACK,
  LEADERBOARD_TABLE_AVATAR_MODIFIERS,
  LEADERBOARD_TABLE_MOBILE_ROW_LIMIT,
  LEADERBOARD_TABLE_STREAK_FIRE,
} from './leaderboard-table-data';
import {
  COLUMN_ORDER,
  createCell,
  createDualText,
  createRow,
  createTableShell,
} from './leaderboard-table-parts';
import './leaderboard-table.scss';

function createPlayerCell(entry: LeaderboardEntry, rowIndex: number): HTMLTableCellElement {
  const cell = createCell('player');

  const player = document.createElement('div');
  player.className = 'leaderboard-table__player';

  const avatarModifier =
    LEADERBOARD_TABLE_AVATAR_MODIFIERS[rowIndex] ?? LEADERBOARD_TABLE_AVATAR_FALLBACK;
  const avatar = document.createElement('span');
  avatar.className = `leaderboard-table__avatar leaderboard-table__avatar--${avatarModifier}`;
  avatar.textContent = getPlayerInitials(entry.playerName);
  avatar.setAttribute('aria-hidden', 'true');

  const name = document.createElement('span');
  name.className = 'leaderboard-table__player-name';
  name.textContent = entry.playerName;

  player.append(avatar, name);
  cell.append(player);
  return cell;
}

function createEntryRow(entry: LeaderboardEntry, rowIndex: number): HTMLTableRowElement {
  const row = createRow(entry.rank > LEADERBOARD_TABLE_MOBILE_ROW_LIMIT);

  const rankCell = createCell('rank');
  if (entry.rank === 1) {
    rankCell.classList.add('leaderboard-table__cell--rank-first');
  }
  rankCell.textContent = `#${entry.rank}`;

  const gamesCell = createCell('games');
  gamesCell.textContent = String(entry.gamesPlayed);

  const scoreCell = createCell('score');
  scoreCell.append(
    createDualText(
      formatCompactCount(entry.totalScore),
      formatScore(entry.totalScore),
      'leaderboard-table__score--compact',
      'leaderboard-table__score--full',
    ),
  );

  const streakCell = createCell('streak');
  streakCell.append(
    createDualText(
      `${LEADERBOARD_TABLE_STREAK_FIRE} ${entry.streakDays}d`,
      `${LEADERBOARD_TABLE_STREAK_FIRE} ${entry.streakDays} days`,
      'leaderboard-table__streak--short',
      'leaderboard-table__streak--full',
    ),
  );

  const favoriteCell = createCell('favorite');
  const badge = document.createElement('span');
  badge.className = 'leaderboard-table__game-badge';
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

function createSkeletonRow(rowIndex: number): HTMLTableRowElement {
  const row = createRow(rowIndex >= LEADERBOARD_TABLE_MOBILE_ROW_LIMIT);

  for (const column of COLUMN_ORDER) {
    const cell = createCell(column);

    if (column === 'player') {
      const player = document.createElement('div');
      player.className = 'leaderboard-table__player';
      player.append(
        createSkeleton({ className: 'leaderboard-table__avatar' }),
        createSkeleton({
          className: 'leaderboard-table__skeleton leaderboard-table__skeleton--name',
        }),
      );
      cell.append(player);
    } else {
      cell.append(
        createSkeleton({
          className: `leaderboard-table__skeleton leaderboard-table__skeleton--${column}`,
        }),
      );
    }

    row.append(cell);
  }

  return row;
}

export function createLeaderboardTable(entries: readonly LeaderboardEntry[]): HTMLElement {
  return createTableShell(entries.map((entry, index) => createEntryRow(entry, index)));
}

export function createLeaderboardTableSkeleton(rowCount: number): HTMLElement {
  const root = createTableShell(
    Array.from({ length: rowCount }, (_, index) => createSkeletonRow(index)),
  );
  root.setAttribute('aria-hidden', 'true');
  return root;
}
