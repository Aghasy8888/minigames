import { createSkeleton } from '../skeleton';
import {
  SKELETON_ACTION_COUNT,
  SKELETON_DESCRIPTION_LINES,
  SKELETON_RECORD_COUNT,
  SPEC_KEYS,
} from './game-details-dialog-data';

function block(modifier: string): HTMLElement {
  return createSkeleton({
    className: `game-details-dialog__skeleton game-details-dialog__skeleton--${modifier}`,
  });
}

function group(className: string, children: HTMLElement[]): HTMLElement {
  const element = document.createElement('div');
  element.className = className;
  element.setAttribute('aria-hidden', 'true');
  element.append(...children);
  return element;
}

function repeat(count: number, modifier: string): HTMLElement[] {
  return Array.from({ length: count }, () => block(modifier));
}

export function createHeroSkeleton(): HTMLElement {
  return block('hero');
}

/** Mirrors the loaded body: header, description, 4 specs, 2 actions, 3 top records. */
export function createGameDetailsSkeleton(): HTMLElement[] {
  return [
    group('game-details-dialog__header', [block('title'), block('stats')]),
    group('game-details-dialog__skeleton-lines', repeat(SKELETON_DESCRIPTION_LINES, 'line')),
    group('game-details-dialog__widgets', repeat(SPEC_KEYS.length, 'widget')),
    group('game-details-dialog__actions', repeat(SKELETON_ACTION_COUNT, 'action')),
    group('game-details-dialog__skeleton-lines', repeat(SKELETON_RECORD_COUNT, 'record')),
  ];
}
