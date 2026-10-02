import { LEADERBOARD_TABLE_COLUMNS } from './leaderboard-table-data';

export type ColumnKey = keyof typeof LEADERBOARD_TABLE_COLUMNS;

export const COLUMN_ORDER: readonly ColumnKey[] = [
  'rank',
  'player',
  'games',
  'score',
  'streak',
  'favorite',
];

const COLUMN_EXTRA_CLASS: Partial<Record<ColumnKey, string>> = {
  games: 'leaderboard-table__col--games',
  favorite: 'leaderboard-table__col--favorite',
};

export function createDualText(
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

function columnClassName(element: 'cell' | 'th', column: ColumnKey): string {
  const extraClass = COLUMN_EXTRA_CLASS[column];
  const base = `leaderboard-table__${element} leaderboard-table__${element}--${column}`;
  return extraClass === undefined ? base : `${base} ${extraClass}`;
}

export function createCell(column: ColumnKey): HTMLTableCellElement {
  const cell = document.createElement('td');
  cell.className = columnClassName('cell', column);
  return cell;
}

export function createRow(isDesktopOnly: boolean): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.className = 'leaderboard-table__row';

  if (isDesktopOnly) {
    row.classList.add('leaderboard-table__row--desktop-only');
  }

  return row;
}

function createHeaderCell(column: ColumnKey): HTMLTableCellElement {
  const th = document.createElement('th');
  th.className = columnClassName('th', column);
  th.scope = 'col';

  const labels = LEADERBOARD_TABLE_COLUMNS[column];

  if ('labelShort' in labels) {
    th.append(
      createDualText(
        labels.labelShort,
        labels.labelFull,
        'leaderboard-table__th-label--short',
        'leaderboard-table__th-label--full',
      ),
    );
  } else {
    th.textContent = labels.label;
  }

  return th;
}

function createTableHead(): HTMLTableSectionElement {
  const thead = document.createElement('thead');
  thead.className = 'leaderboard-table__head';

  const row = document.createElement('tr');
  row.append(...COLUMN_ORDER.map((column) => createHeaderCell(column)));
  thead.append(row);
  return thead;
}

export function createTableShell(rows: readonly HTMLTableRowElement[]): HTMLElement {
  const root = document.createElement('div');
  root.className = 'leaderboard-table';

  const table = document.createElement('table');
  table.className = 'leaderboard-table__table';

  const tbody = document.createElement('tbody');
  tbody.className = 'leaderboard-table__body';
  tbody.append(...rows);

  table.append(createTableHead(), tbody);
  root.append(table);
  return root;
}
