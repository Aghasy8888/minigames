import { checkIcon, dropdownArrowIcon } from '../../assets/icons';
import {
  DEFAULT_SORT_OPTION,
  KEY_ARROW_DOWN,
  KEY_ARROW_UP,
  KEY_END,
  KEY_ENTER,
  KEY_ESCAPE,
  KEY_HOME,
  KEY_SPACE,
  SORT_OPTIONS,
  SORT_TRIGGER_PREFIX,
  type SortOption,
} from './sort-dropdown-data';
import './sort-dropdown.scss';

export interface CreateSortDropdownOptions {
  options?: readonly SortOption[];
  defaultId?: string;
}

function createIcon(source: string, className: string): HTMLImageElement {
  const icon = document.createElement('img');
  icon.src = source;
  icon.alt = '';
  icon.className = className;
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

export function createSortDropdown(options: CreateSortDropdownOptions = {}): HTMLElement {
  const items = options.options ?? SORT_OPTIONS;
  let selectedId = options.defaultId ?? DEFAULT_SORT_OPTION.id;
  let highlightedIndex = items.findIndex((item) => item.id === selectedId);
  if (highlightedIndex < 0) {
    highlightedIndex = 0;
  }
  let isOpen = false;

  const root = document.createElement('div');
  root.className = 'sort-dropdown';

  const listboxId = `sort-dropdown-listbox-${crypto.randomUUID()}`;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'sort-dropdown__trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', listboxId);

  const label = document.createElement('span');
  label.className = 'sort-dropdown__label';

  const arrow = createIcon(dropdownArrowIcon, 'sort-dropdown__arrow');
  trigger.append(label, arrow);

  const listbox = document.createElement('ul');
  listbox.id = listboxId;
  listbox.className = 'sort-dropdown__menu';
  listbox.setAttribute('role', 'listbox');
  listbox.hidden = true;

  const optionElements: HTMLLIElement[] = items.map((item, index) => {
    const option = document.createElement('li');
    option.className = 'sort-dropdown__option';
    option.id = `${listboxId}-option-${item.id}`;
    option.setAttribute('role', 'option');
    option.dataset.id = item.id;
    option.dataset.index = String(index);

    const check = createIcon(checkIcon, 'sort-dropdown__check');
    const text = document.createElement('span');
    text.className = 'sort-dropdown__option-label';
    text.textContent = item.label;

    option.append(check, text);

    option.addEventListener('click', (event) => {
      event.stopPropagation();
      selectOption(item.id);
    });

    option.addEventListener('mouseenter', () => {
      setHighlightedIndex(index);
    });

    return option;
  });

  listbox.append(...optionElements);
  root.append(trigger, listbox);

  function getSelectedOption(): SortOption {
    return items.find((item) => item.id === selectedId) ?? items[0];
  }

  function syncTriggerLabel(): void {
    label.textContent = `${SORT_TRIGGER_PREFIX} ${getSelectedOption().label}`;
  }

  function syncOptionStates(): void {
    for (const [index, option] of optionElements.entries()) {
      const isSelected = option.dataset.id === selectedId;
      const isHighlighted = index === highlightedIndex;
      option.classList.toggle('sort-dropdown__option--selected', isSelected);
      option.classList.toggle('sort-dropdown__option--highlighted', isHighlighted);
      option.setAttribute('aria-selected', String(isSelected));
    }
    const highlighted = optionElements[highlightedIndex];
    if (highlighted) {
      trigger.setAttribute('aria-activedescendant', highlighted.id);
    } else {
      trigger.removeAttribute('aria-activedescendant');
    }
  }

  function setHighlightedIndex(index: number): void {
    if (index < 0 || index >= items.length) {
      return;
    }
    highlightedIndex = index;
    syncOptionStates();
  }

  function open(): void {
    if (isOpen) {
      return;
    }
    isOpen = true;
    root.classList.add('sort-dropdown--open');
    trigger.setAttribute('aria-expanded', 'true');
    listbox.hidden = false;
    highlightedIndex = Math.max(
      0,
      items.findIndex((item) => item.id === selectedId),
    );
    syncOptionStates();
  }

  function close(): void {
    if (!isOpen) {
      return;
    }
    isOpen = false;
    root.classList.remove('sort-dropdown--open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
    listbox.hidden = true;
  }

  function selectOption(id: string): void {
    selectedId = id;
    syncTriggerLabel();
    syncOptionStates();
    close();
    trigger.focus();
  }

  function toggle(): void {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    toggle();
  });

  trigger.addEventListener('keydown', (event) => {
    switch (event.key) {
      case KEY_ENTER:
      case KEY_SPACE: {
        event.preventDefault();
        if (isOpen) {
          const highlighted = items[highlightedIndex];
          if (highlighted) {
            selectOption(highlighted.id);
          }
        } else {
          open();
        }
        break;
      }
      case KEY_ARROW_DOWN: {
        event.preventDefault();
        if (isOpen) {
          setHighlightedIndex((highlightedIndex + 1) % items.length);
        } else {
          open();
        }
        break;
      }
      case KEY_ARROW_UP: {
        event.preventDefault();
        if (isOpen) {
          setHighlightedIndex((highlightedIndex - 1 + items.length) % items.length);
        } else {
          open();
        }
        break;
      }
      case KEY_HOME: {
        if (isOpen) {
          event.preventDefault();
          setHighlightedIndex(0);
        }
        break;
      }
      case KEY_END: {
        if (isOpen) {
          event.preventDefault();
          setHighlightedIndex(items.length - 1);
        }
        break;
      }
      case KEY_ESCAPE: {
        if (isOpen) {
          event.preventDefault();
          close();
        }
        break;
      }
      default: {
        break;
      }
    }
  });

  document.addEventListener('click', (event) => {
    if (!isOpen) {
      return;
    }
    const target = event.target;
    if (target instanceof Node && !root.contains(target)) {
      close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === KEY_ESCAPE && isOpen) {
      close();
      trigger.focus();
    }
  });

  syncTriggerLabel();
  syncOptionStates();
  return root;
}
