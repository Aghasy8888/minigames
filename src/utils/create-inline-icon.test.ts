// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { createInlineIconFactory } from './create-inline-icon';

const MARKUP = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <path d="M1 1h4" fill="#ff0000" />
    <circle cx="12" cy="12" r="4" fill="none" stroke="#00ff00" />
    <rect width="2" height="2" />
  </svg>
`;

describe('createInlineIconFactory', () => {
  it('builds an svg with the class and hidden from assistive tech', () => {
    const icon = createInlineIconFactory(MARKUP, 'icon-heart')();

    expect(icon.tagName.toLowerCase()).toBe('svg');
    expect(icon.classList.contains('icon-heart')).toBe(true);
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });

  it('switches painted fills to currentColor and leaves fill="none" and unfilled shapes alone', () => {
    const icon = createInlineIconFactory(MARKUP, 'icon-heart')();

    expect(icon.getAttribute('fill')).toBe('none');
    expect(icon.querySelector('path')?.getAttribute('fill')).toBe('currentColor');
    expect(icon.querySelector('circle')?.getAttribute('fill')).toBe('none');
    expect(icon.querySelector('circle')?.getAttribute('stroke')).toBe('#00ff00');
    expect(icon.querySelector('rect')?.hasAttribute('fill')).toBe(false);
  });

  it('returns a separate copy on every call', () => {
    const createIcon = createInlineIconFactory(MARKUP, 'icon-heart');
    const first = createIcon();
    first.classList.add('changed');

    const second = createIcon();

    expect(second).not.toBe(first);
    expect(second.classList.contains('changed')).toBe(false);
  });

  it('throws an error naming the icon when the markup has no svg', () => {
    const createIcon = createInlineIconFactory('<div></div>', 'icon-broken');

    expect(() => createIcon()).toThrow(
      'Icon markup for "icon-broken" must contain an <svg> element',
    );
  });
});
