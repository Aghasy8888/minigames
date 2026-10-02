import { createEmptyState } from '../../components/empty-state';
import { createErrorBanner } from '../../components/error-banner';
import {
  createLeaderboardTable,
  createLeaderboardTableSkeleton,
} from '../../components/leaderboard-table';
import { useDisconnectCleanup } from '../../hooks/use-disconnect-cleanup';
import { useLeaderboard, type LeaderboardState } from '../../hooks/use-leaderboard';
import {
  LEADERBOARD_EMPTY_MESSAGE,
  LEADERBOARD_EMPTY_TITLE,
  LEADERBOARD_ERROR_FALLBACK_MESSAGE,
  LEADERBOARD_ERROR_TITLE,
  LEADERBOARD_RETRY_LABEL,
  LEADERBOARD_SKELETON_ROWS,
  LEADERBOARD_TITLE_FULL,
  LEADERBOARD_TITLE_SHORT,
} from './leaderboard-data';
import './leaderboard.scss';

function createTitleText(className: string, text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

function createHeader(): HTMLElement {
  const header = document.createElement('div');
  header.className = 'leaderboard__header';

  const accent = document.createElement('span');
  accent.className = 'leaderboard__accent';
  accent.setAttribute('aria-hidden', 'true');

  const title = document.createElement('h2');
  title.className = 'leaderboard__title';
  title.append(
    createTitleText('leaderboard__title-text--short', LEADERBOARD_TITLE_SHORT),
    createTitleText('leaderboard__title-text--full', LEADERBOARD_TITLE_FULL),
  );

  header.append(accent, title);
  return header;
}

function createStatusView(state: LeaderboardState): HTMLElement {
  switch (state.status) {
    case 'loading': {
      return createLeaderboardTableSkeleton(LEADERBOARD_SKELETON_ROWS);
    }
    case 'success': {
      return createLeaderboardTable(state.data);
    }
    case 'empty': {
      return createEmptyState({
        title: LEADERBOARD_EMPTY_TITLE,
        message: LEADERBOARD_EMPTY_MESSAGE,
      });
    }
    case 'error': {
      return createErrorBanner({
        title: LEADERBOARD_ERROR_TITLE,
        message: state.message === '' ? LEADERBOARD_ERROR_FALLBACK_MESSAGE : state.message,
        retryLabel: LEADERBOARD_RETRY_LABEL,
        onRetry: state.retry,
      });
    }
  }
}

export function createLeaderboard(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'leaderboard';
  section.setAttribute('aria-label', LEADERBOARD_TITLE_FULL);

  const content = document.createElement('div');
  content.className = 'leaderboard__content';

  function render(state: LeaderboardState): void {
    content.setAttribute('aria-busy', String(state.status === 'loading'));
    content.replaceChildren(createStatusView(state));
  }

  section.append(createHeader(), content);

  const leaderboard = useLeaderboard();
  const unsubscribe = leaderboard.subscribe(render);
  render(leaderboard.getState());

  useDisconnectCleanup(section, () => {
    unsubscribe();
    leaderboard.destroy();
  });

  return section;
}
