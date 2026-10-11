// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cupImage, medalFirstImage, medalSecondImage, medalThirdImage } from '../../assets/images';
import type { GameDetailsTopRecord } from '../../services/games-api-provider';
import { createTopRecords } from '.';

const NOW = new Date('2026-10-11T12:00:00.000Z');

function makeRecord(overrides: Partial<GameDetailsTopRecord> = {}): GameDetailsTopRecord {
  return {
    position: 1,
    playerName: 'ForestDweller',
    score: 94_250,
    achievedAt: '2026-10-11T10:00:00.000Z',
    ...overrides,
  };
}

function rows(section: HTMLElement): HTMLLIElement[] {
  return [...section.querySelectorAll<HTMLLIElement>('.top-records__row')];
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createTopRecords', () => {
  it('is a section labelled by its "Top Records" title with a cup icon', () => {
    const section = createTopRecords([makeRecord()]);
    const title = section.querySelector('h3');

    expect(section.getAttribute('aria-labelledby')).toBe(title?.id);
    expect(title?.textContent).toBe('Top Records');
    expect(title?.querySelector('img')?.getAttribute('src')).toBe(cupImage);
  });

  it('lists the records in an ordered list, in the order the API returned', () => {
    const section = createTopRecords([
      makeRecord({ position: 1, playerName: 'First' }),
      makeRecord({ position: 2, playerName: 'Second' }),
    ]);

    expect(section.querySelector('ol')?.className).toBe('top-records__list');
    expect(
      rows(section).map((row) => row.querySelector('.top-records__name')?.textContent),
    ).toEqual(['First', 'Second']);
  });

  it('shows the score with thousands separators and points, and when it was set', () => {
    const [row] = rows(createTopRecords([makeRecord()]));
    const time = row?.querySelector('time');

    expect(row?.querySelector('.top-records__score')?.textContent).toBe('94,250 pts');
    expect(time?.dateTime).toBe('2026-10-11T10:00:00.000Z');
    expect(time?.textContent).toBe('2 hours ago');
  });

  it.each([
    { position: 1, medal: medalFirstImage },
    { position: 2, medal: medalSecondImage },
    { position: 3, medal: medalThirdImage },
  ])('marks position $position with its medal', ({ position, medal }) => {
    const [row] = rows(createTopRecords([makeRecord({ position })]));
    const image = row?.querySelector('.top-records__medal');

    expect(image?.getAttribute('src')).toBe(medal);
    expect(image?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows no medal from position 4 on', () => {
    const [row] = rows(createTopRecords([makeRecord({ position: 4 })]));

    expect(row?.querySelector('.top-records__medal')).toBeNull();
  });

  it('renders player names as text, never as markup', () => {
    const [row] = rows(createTopRecords([makeRecord({ playerName: '<b>Hax</b>' })]));

    expect(row?.querySelector('b')).toBeNull();
    expect(row?.querySelector('.top-records__name')?.textContent).toBe('<b>Hax</b>');
  });

  it('shows a neutral empty state instead of a list when there are no records', () => {
    const section = createTopRecords([]);
    const emptyState = section.querySelector('.empty-state');

    expect(section.querySelector('ol')).toBeNull();
    expect(emptyState?.getAttribute('role')).toBe('status');
    expect(emptyState?.querySelector('.empty-state__title')?.textContent).toBe('No records yet');
  });
});
