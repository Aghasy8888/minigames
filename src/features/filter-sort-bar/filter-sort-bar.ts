import { createFilterChips } from '../../components/filter-chips';
import { createSortDropdown } from '../../components/sort-dropdown';
import './filter-sort-bar.scss';

export function createFilterSortBar(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'filter-sort-bar';
  section.setAttribute('aria-label', 'Filter and sort games');

  section.append(createFilterChips(), createSortDropdown());
  return section;
}
