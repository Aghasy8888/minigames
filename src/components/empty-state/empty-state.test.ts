// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';

import { createEmptyState } from '.';

describe('createEmptyState', () => {
  it('is a neutral status region with a title and an explanation', () => {
    const root = createEmptyState({ title: 'No games found', message: 'Try another category.' });

    expect(root.getAttribute('role')).toBe('status');
    expect(root.querySelector('.empty-state__title')?.textContent).toBe('No games found');
    expect(root.querySelector('.empty-state__message')?.textContent).toBe('Try another category.');
  });

  it('has no button and no warning icon without an action', () => {
    const root = createEmptyState({ title: 'No comments yet', message: 'Be the first.' });

    expect(root.querySelector('button')).toBeNull();
    expect(root.querySelector('img')).toBeNull();
  });

  it('renders the action as a secondary button that calls its handler', () => {
    const onClick = vi.fn<() => void>();
    const root = createEmptyState({
      title: 'No games found',
      message: 'Try another category.',
      action: { label: 'Reset filters', onClick },
    });
    const button = root.querySelector<HTMLButtonElement>('.empty-state__action');

    button?.click();

    expect(button?.textContent).toBe('Reset filters');
    expect(button?.classList.contains('button--secondary')).toBe(true);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders API text as text, never as markup', () => {
    const root = createEmptyState({ title: '<b>Empty</b>', message: '<i>none</i>' });

    expect(root.querySelector('b, i')).toBeNull();
    expect(root.querySelector('.empty-state__title')?.textContent).toBe('<b>Empty</b>');
  });
});
