import type { CategoryItem } from '../../services/games-api-provider';
import { createSkeleton } from '../skeleton';
import { FILTER_CHIPS_ARIA_LABEL } from './filter-chips-data';
import './filter-chips.scss';

export type CreateFilterChipsOptions = {
  categories: readonly CategoryItem[];
  activeSlug: string;
  onSelect: (slug: string) => void;
};

export type FilterChips = {
  element: HTMLElement;
  setActiveSlug: (slug: string) => void;
};

function createRoot(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'filter-chips hide-scrollbar';
  return root;
}

export function createFilterChips({
  categories,
  activeSlug,
  onSelect,
}: CreateFilterChipsOptions): FilterChips {
  const root = createRoot();
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', FILTER_CHIPS_ARIA_LABEL);

  const buttons = categories.map((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-chips__chip';
    button.textContent = category.label;
    button.dataset.slug = category.slug;
    button.addEventListener('click', () => {
      onSelect(category.slug);
    });
    return button;
  });

  root.append(...buttons);

  function setActiveSlug(slug: string): void {
    for (const button of buttons) {
      const isActive = button.dataset.slug === slug;
      button.classList.toggle('filter-chips__chip--active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    }
  }

  setActiveSlug(activeSlug);
  return { element: root, setActiveSlug };
}

export function createFilterChipsSkeleton(count: number): HTMLElement {
  const root = createRoot();
  root.setAttribute('aria-hidden', 'true');
  root.append(
    ...Array.from({ length: count }, () => createSkeleton({ className: 'filter-chips__skeleton' })),
  );
  return root;
}
