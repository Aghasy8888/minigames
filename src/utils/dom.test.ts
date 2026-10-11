// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';

import { clearChildren, qs } from './dom';

afterEach(() => {
  document.body.replaceChildren();
});

describe('qs', () => {
  it('finds the first match in the document by default', () => {
    document.body.innerHTML = '<p class="note">first</p><p class="note">second</p>';

    expect(qs<HTMLParagraphElement>('.note')?.textContent).toBe('first');
  });

  it('searches only inside the given root', () => {
    document.body.innerHTML =
      '<p class="note">outside</p><section><p class="note">inside</p></section>';
    const section = document.querySelector('section') ?? document.body;

    expect(qs('.note', section)?.textContent).toBe('inside');
  });

  it('returns null when nothing matches', () => {
    expect(qs('.missing')).toBeNull();
  });
});

describe('clearChildren', () => {
  it('removes every child element and text node', () => {
    const list = document.createElement('ul');
    list.innerHTML = '<li>one</li>text<li>two</li>';

    clearChildren(list);

    expect(list.childNodes).toHaveLength(0);
  });
});
