import { checkIcon, dropdownArrowIcon } from '../../assets/icons';
import { SORT_TRIGGER_ARIA_LABEL, type SortOption } from './sort-dropdown-data';

function createIcon(source: string, className: string): HTMLImageElement {
  const icon = document.createElement('img');
  icon.src = source;
  icon.alt = '';
  icon.className = className;
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

export function createSortTrigger(listboxId: string, label: HTMLElement): HTMLButtonElement {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'sort-dropdown__trigger';
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-label', SORT_TRIGGER_ARIA_LABEL);
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', listboxId);
  trigger.append(label, createIcon(dropdownArrowIcon, 'sort-dropdown__arrow'));
  return trigger;
}

export function createSortListbox(listboxId: string): HTMLUListElement {
  const listbox = document.createElement('ul');
  listbox.id = listboxId;
  listbox.className = 'sort-dropdown__menu';
  listbox.setAttribute('role', 'listbox');
  listbox.hidden = true;
  return listbox;
}

export function createSortOption(item: SortOption, listboxId: string): HTMLLIElement {
  const option = document.createElement('li');
  option.className = 'sort-dropdown__option';
  option.id = `${listboxId}-option-${item.id}`;
  option.setAttribute('role', 'option');
  option.dataset.id = item.id;

  const text = document.createElement('span');
  text.className = 'sort-dropdown__option-label';
  text.textContent = item.label;

  option.append(createIcon(checkIcon, 'sort-dropdown__check'), text);
  return option;
}
