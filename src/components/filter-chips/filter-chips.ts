import { categories, DEFAULT_CATEGORY, type CategoryItem } from './filter-chips-data';
import './filter-chips.scss';

export interface CreateFilterChipsOptions {
  categories?: readonly CategoryItem[];
  defaultSlug?: string;
}

export function createFilterChips(options: CreateFilterChipsOptions = {}): HTMLElement {
  const items = options.categories ?? categories;
  let activeSlug = options.defaultSlug ?? DEFAULT_CATEGORY.slug;

  const root = document.createElement('div');
  root.className = 'filter-chips hide-scrollbar';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Game categories');

  const buttons = items.map((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-chips__chip';
    button.textContent = category.label;
    button.dataset.slug = category.slug;
    return button;
  });

  root.append(...buttons);

  function syncActiveState(): void {
    for (const button of buttons) {
      const isActive = button.dataset.slug === activeSlug;
      button.classList.toggle('filter-chips__chip--active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const slug = button.dataset.slug;
      if (!slug || slug === activeSlug) {
        return;
      }
      activeSlug = slug;
      syncActiveState();
    });
  }

  syncActiveState();
  return root;
}
