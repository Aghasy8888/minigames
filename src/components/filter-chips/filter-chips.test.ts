// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeCategory } from '../../test-support/api-factories';
import { createFilterChips, createFilterChipsSkeleton, type FilterChips } from '.';

const CATEGORIES = [
  makeCategory({ slug: 'all', label: 'All', isDefault: true }),
  makeCategory({ slug: 'puzzle', label: 'Puzzle', isDefault: false }),
  makeCategory({ slug: 'card', label: 'Card', isDefault: false }),
];

function mount(activeSlug = 'all', onSelect = vi.fn<(slug: string) => void>()): FilterChips {
  const chips = createFilterChips({ categories: CATEGORIES, activeSlug, onSelect });
  document.body.append(chips.element);
  return chips;
}

function chipButtons(chips: FilterChips): HTMLButtonElement[] {
  return [...chips.element.querySelectorAll<HTMLButtonElement>('.filter-chips__chip')];
}

function pressedStates(chips: FilterChips): (string | null)[] {
  return chipButtons(chips).map((chip) => chip.getAttribute('aria-pressed'));
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('chips', () => {
  it('is a labelled group with one toggle button per category, in API order', () => {
    const chips = mount();

    expect(chips.element.getAttribute('role')).toBe('group');
    expect(chips.element.getAttribute('aria-label')).toBe('Game categories');
    expect(chipButtons(chips).map(({ textContent }) => textContent)).toStrictEqual([
      'All',
      'Puzzle',
      'Card',
    ]);
    expect(chipButtons(chips).map(({ type }) => type)).toStrictEqual([
      'button',
      'button',
      'button',
    ]);
  });

  it('marks only the active category as pressed', () => {
    const chips = mount('puzzle');

    expect(pressedStates(chips)).toStrictEqual(['false', 'true', 'false']);
    expect(
      chipButtons(chips).map((chip) => chip.classList.contains('filter-chips__chip--active')),
    ).toStrictEqual([false, true, false]);
  });

  it('marks nothing as pressed for a category that is not in the list', () => {
    expect(pressedStates(mount('farm'))).toStrictEqual(['false', 'false', 'false']);
  });

  it('reports the clicked category without changing the pressed chip itself', () => {
    const onSelect = vi.fn<(slug: string) => void>();
    const chips = mount('all', onSelect);

    chipButtons(chips)[2]?.click();

    expect(onSelect.mock.calls).toStrictEqual([['card']]);
    expect(pressedStates(chips)).toStrictEqual(['true', 'false', 'false']);
  });

  it('moves the pressed state when the active category changes', () => {
    const chips = mount('all');

    chips.setActiveSlug('card');

    expect(pressedStates(chips)).toStrictEqual(['false', 'false', 'true']);
  });
});

describe('skeleton', () => {
  it('shows the requested number of hidden chip placeholders', () => {
    const skeleton = createFilterChipsSkeleton(7);

    expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton.querySelectorAll('.skeleton.filter-chips__skeleton')).toHaveLength(7);
    expect(skeleton.hasAttribute('role')).toBe(false);
  });
});
