// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { checkIcon } from '../../assets/icons';
import type { GameSort } from '../../services/games-api-provider';
import { createSortDropdown, type SortDropdown } from '.';

let dropdown: SortDropdown;
let onSelect: Mock<(id: GameSort) => void>;

function mount(
  selectedId: GameSort = 'rating-desc',
  options?: Parameters<typeof createSortDropdown>[0]['options'],
): void {
  dropdown = createSortDropdown({ selectedId, onSelect, options });
  document.body.append(dropdown.element);
}

function trigger(): HTMLButtonElement {
  const element = dropdown.element.querySelector<HTMLButtonElement>('.sort-dropdown__trigger');
  if (!element) {
    throw new Error('missing trigger');
  }
  return element;
}

function listbox(): HTMLUListElement {
  const element = dropdown.element.querySelector<HTMLUListElement>('[role="listbox"]');
  if (!element) {
    throw new Error('missing listbox');
  }
  return element;
}

function options(): HTMLLIElement[] {
  return [...listbox().querySelectorAll<HTMLLIElement>('[role="option"]')];
}

function option(index: number): HTMLLIElement {
  const element = options()[index];
  if (!element) {
    throw new Error(`missing option ${index}`);
  }
  return element;
}

function labelText(): string | null | undefined {
  return dropdown.element.querySelector('.sort-dropdown__label')?.textContent;
}

function isOpen(): boolean {
  return trigger().getAttribute('aria-expanded') === 'true';
}

function highlightedIndex(): number {
  return options().findIndex((element) =>
    element.classList.contains('sort-dropdown__option--highlighted'),
  );
}

function press(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  trigger().dispatchEvent(event);
  return event;
}

beforeEach(() => {
  onSelect = vi.fn<(id: GameSort) => void>();
});

afterEach(() => {
  dropdown.destroy();
  document.body.replaceChildren();
});

describe('closed', () => {
  beforeEach(() => {
    mount();
  });

  it('is a collapsed combobox that controls its listbox', () => {
    expect(trigger().type).toBe('button');
    expect(trigger().getAttribute('role')).toBe('combobox');
    expect(trigger().getAttribute('aria-label')).toBe('Sort games');
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-controls')).toBe(listbox().id);
    expect(trigger().hasAttribute('aria-activedescendant')).toBe(false);
    expect(listbox().hidden).toBe(true);
  });

  it('shows the selected sort on the trigger', () => {
    expect(labelText()).toBe('Sort by: Rating ↓');
  });

  it('lists the four sorts and marks the selected one', () => {
    expect(options().map(({ textContent }) => textContent)).toStrictEqual([
      'Rating ↑',
      'Rating ↓',
      'Name A→Z',
      'Name Z→A',
    ]);
    expect(options().map((element) => element.getAttribute('aria-selected'))).toStrictEqual([
      'false',
      'true',
      'false',
      'false',
    ]);
    expect(option(1).classList.contains('sort-dropdown__option--selected')).toBe(true);
    expect(option(1).id).toBe(`${listbox().id}-option-rating-desc`);
  });

  it('marks the check icons as decorative', () => {
    const check = option(0).querySelector('img');

    expect(check?.getAttribute('src')).toBe(checkIcon);
    expect(check?.getAttribute('alt')).toBe('');
    expect(check?.getAttribute('aria-hidden')).toBe('true');
  });

  it('gives every dropdown its own listbox id', () => {
    const first = listbox().id;
    const other = createSortDropdown({ selectedId: 'rating-desc', onSelect });

    expect(other.element.querySelector('[role="listbox"]')?.id).not.toBe(first);
    other.destroy();
  });
});

describe('fallbacks', () => {
  it('shows the first option when the selected sort is not among the options', () => {
    mount('rating-desc', [
      { id: 'name-asc', label: 'Name A→Z' },
      { id: 'name-desc', label: 'Name Z→A' },
    ]);

    expect(labelText()).toBe('Sort by: Name A→Z');
  });
});

describe('mouse', () => {
  beforeEach(() => {
    mount();
  });

  it('opens on click with the selected option highlighted', () => {
    trigger().click();

    expect(isOpen()).toBe(true);
    expect(dropdown.element.classList.contains('sort-dropdown--open')).toBe(true);
    expect(listbox().hidden).toBe(false);
    expect(highlightedIndex()).toBe(1);
    expect(trigger().getAttribute('aria-activedescendant')).toBe(option(1).id);
  });

  it('closes on a second click', () => {
    trigger().click();

    trigger().click();

    expect(isOpen()).toBe(false);
    expect(listbox().hidden).toBe(true);
    expect(trigger().hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('highlights the option under the pointer', () => {
    trigger().click();

    option(3).dispatchEvent(new MouseEvent('mouseenter'));

    expect(highlightedIndex()).toBe(3);
    expect(trigger().getAttribute('aria-activedescendant')).toBe(option(3).id);
  });

  it('reports a chosen option, closes, and returns focus to the trigger', () => {
    const focusSpy = vi.spyOn(trigger(), 'focus');
    trigger().click();

    option(2).click();

    expect(onSelect.mock.calls).toStrictEqual([['name-asc']]);
    expect(isOpen()).toBe(false);
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps showing the old sort until the new one is confirmed', () => {
    trigger().click();
    option(2).click();
    expect(labelText()).toBe('Sort by: Rating ↓');

    dropdown.setSelectedId('name-asc');

    expect(labelText()).toBe('Sort by: Name A→Z');
    expect(option(2).getAttribute('aria-selected')).toBe('true');
    expect(option(1).getAttribute('aria-selected')).toBe('false');
  });

  it('reopens with the newly selected option highlighted', () => {
    dropdown.setSelectedId('name-desc');

    trigger().click();

    expect(highlightedIndex()).toBe(3);
  });
});

describe('keyboard', () => {
  beforeEach(() => {
    mount();
  });

  it.each([
    { name: 'Enter', key: 'Enter' },
    { name: 'Space', key: ' ' },
    { name: 'ArrowDown', key: 'ArrowDown' },
    { name: 'ArrowUp', key: 'ArrowUp' },
  ])('opens on $name without moving the highlight', ({ key }) => {
    const event = press(key);

    expect(event.defaultPrevented).toBe(true);
    expect(isOpen()).toBe(true);
    expect(highlightedIndex()).toBe(1);
  });

  it.each([
    { name: 'Home', key: 'Home' },
    { name: 'End', key: 'End' },
    { name: 'Tab', key: 'Tab' },
  ])('leaves $name alone while closed', ({ key }) => {
    const event = press(key);

    expect(event.defaultPrevented).toBe(false);
    expect(isOpen()).toBe(false);
  });

  it.each([
    { name: 'ArrowDown moves down', keys: ['ArrowDown'], highlighted: 2 },
    {
      name: 'ArrowDown wraps from the last option to the first',
      keys: ['ArrowDown', 'ArrowDown', 'ArrowDown'],
      highlighted: 0,
    },
    { name: 'ArrowUp moves up', keys: ['ArrowUp'], highlighted: 0 },
    {
      name: 'ArrowUp wraps from the first option to the last',
      keys: ['ArrowUp', 'ArrowUp'],
      highlighted: 3,
    },
    { name: 'Home jumps to the first option', keys: ['Home'], highlighted: 0 },
    { name: 'End jumps to the last option', keys: ['End'], highlighted: 3 },
  ])('$name while open', ({ keys, highlighted }) => {
    press('Enter');

    for (const key of keys) {
      expect(press(key).defaultPrevented).toBe(true);
    }

    expect(highlightedIndex()).toBe(highlighted);
    expect(trigger().getAttribute('aria-activedescendant')).toBe(option(highlighted).id);
  });

  it.each([
    { name: 'Enter', key: 'Enter' },
    { name: 'Space', key: ' ' },
  ])('$name chooses the highlighted option', ({ key }) => {
    press('Enter');
    press('ArrowDown');

    press(key);

    expect(onSelect.mock.calls).toStrictEqual([['name-asc']]);
    expect(isOpen()).toBe(false);
  });

  it('ignores other keys while open', () => {
    press('Enter');

    expect(press('a').defaultPrevented).toBe(false);
    expect(isOpen()).toBe(true);
  });
});

describe('dismissing', () => {
  beforeEach(() => {
    mount();
    trigger().click();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    const focusSpy = vi.spyOn(trigger(), 'focus');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(isOpen()).toBe(false);
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('ignores Escape once closed, leaving focus where it is', () => {
    trigger().click();
    const focusSpy = vi.spyOn(trigger(), 'focus');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(isOpen()).toBe(false);
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('closes on a click outside without taking focus', () => {
    const focusSpy = vi.spyOn(trigger(), 'focus');
    const outside = document.createElement('button');
    document.body.append(outside);

    outside.click();

    expect(isOpen()).toBe(false);
    expect(focusSpy).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('stays open on a click inside the menu that misses the options', () => {
    listbox().click();

    expect(isOpen()).toBe(true);
  });

  it('stops listening to the document once destroyed', () => {
    dropdown.destroy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(isOpen()).toBe(true);
  });
});

describe('disabled', () => {
  beforeEach(() => {
    mount();
  });

  it('closes and disables the trigger', () => {
    trigger().click();

    dropdown.setDisabled(true);

    expect(trigger().disabled).toBe(true);
    expect(isOpen()).toBe(false);
  });

  it('re-enables without opening', () => {
    dropdown.setDisabled(true);

    dropdown.setDisabled(false);

    expect(trigger().disabled).toBe(false);
    expect(isOpen()).toBe(false);
  });
});
