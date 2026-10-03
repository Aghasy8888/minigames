import type { GameSort } from '../../services/games-api-provider';
import { useDismissOnOutside } from '../../hooks/use-dismiss-on-outside';
import {
  KEY_ARROW_DOWN,
  KEY_ARROW_UP,
  KEY_END,
  KEY_ENTER,
  KEY_HOME,
  KEY_SPACE,
  SORT_OPTIONS,
  SORT_TRIGGER_PREFIX,
  type SortOption,
} from './sort-dropdown-data';
import { createSortListbox, createSortOption, createSortTrigger } from './sort-dropdown-parts';
import './sort-dropdown.scss';

export interface CreateSortDropdownOptions {
  options?: readonly SortOption[];
  selectedId: GameSort;
  onSelect: (id: GameSort) => void;
}

export interface SortDropdown {
  element: HTMLElement;
  setSelectedId: (id: GameSort) => void;
  /** Removes the document listeners; call when the dropdown leaves the page. */
  destroy: () => void;
}

export function createSortDropdown({
  options: items = SORT_OPTIONS,
  selectedId: initialSelectedId,
  onSelect,
}: CreateSortDropdownOptions): SortDropdown {
  let selectedId = initialSelectedId;
  let highlightedIndex = 0;
  let isOpen = false;

  const root = document.createElement('div');
  root.className = 'sort-dropdown';

  const listboxId = `sort-dropdown-listbox-${crypto.randomUUID()}`;
  const label = document.createElement('span');
  label.className = 'sort-dropdown__label';
  const trigger = createSortTrigger(listboxId, label);
  const listbox = createSortListbox(listboxId);

  const optionElements = items.map((item, index) => {
    const option = createSortOption(item, listboxId);
    option.addEventListener('click', (event) => {
      event.stopPropagation();
      choose(item.id);
    });
    option.addEventListener('mouseenter', () => {
      setHighlightedIndex(index);
    });
    return option;
  });

  listbox.append(...optionElements);
  root.append(trigger, listbox);

  function selectedIndex(): number {
    return Math.max(
      0,
      items.findIndex((item) => item.id === selectedId),
    );
  }

  function render(): void {
    label.textContent = `${SORT_TRIGGER_PREFIX} ${items[selectedIndex()].label}`;

    for (const [index, option] of optionElements.entries()) {
      const isSelected = option.dataset.id === selectedId;
      option.classList.toggle('sort-dropdown__option--selected', isSelected);
      option.classList.toggle('sort-dropdown__option--highlighted', index === highlightedIndex);
      option.setAttribute('aria-selected', String(isSelected));
    }

    const highlighted = optionElements[highlightedIndex];
    if (isOpen && highlighted) {
      trigger.setAttribute('aria-activedescendant', highlighted.id);
    } else {
      trigger.removeAttribute('aria-activedescendant');
    }
  }

  function setHighlightedIndex(index: number): void {
    if (index >= 0 && index < items.length) {
      highlightedIndex = index;
      render();
    }
  }

  function setOpen(next: boolean): void {
    if (isOpen === next) {
      return;
    }
    isOpen = next;
    root.classList.toggle('sort-dropdown--open', next);
    trigger.setAttribute('aria-expanded', String(next));
    listbox.hidden = !next;
    if (next) {
      highlightedIndex = selectedIndex();
    }
    render();
  }

  function choose(id: GameSort): void {
    setOpen(false);
    trigger.focus();
    onSelect(id);
  }

  function handleKey(key: string): boolean {
    if (key === KEY_ENTER || key === KEY_SPACE) {
      if (isOpen) {
        choose(items[highlightedIndex].id);
      } else {
        setOpen(true);
      }
      return true;
    }

    if (key === KEY_ARROW_DOWN || key === KEY_ARROW_UP) {
      const step = key === KEY_ARROW_DOWN ? 1 : -1;
      if (isOpen) {
        setHighlightedIndex((highlightedIndex + step + items.length) % items.length);
      } else {
        setOpen(true);
      }
      return true;
    }

    if (isOpen && (key === KEY_HOME || key === KEY_END)) {
      setHighlightedIndex(key === KEY_HOME ? 0 : items.length - 1);
      return true;
    }

    return false;
  }

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(!isOpen);
  });

  trigger.addEventListener('keydown', (event) => {
    if (handleKey(event.key)) {
      event.preventDefault();
    }
  });

  const destroy = useDismissOnOutside({
    root,
    isActive: () => isOpen,
    onDismiss(reason) {
      setOpen(false);
      if (reason === 'escape') {
        trigger.focus();
      }
    },
  });

  function setSelectedId(id: GameSort): void {
    selectedId = id;
    render();
  }

  render();
  return { element: root, setSelectedId, destroy };
}
