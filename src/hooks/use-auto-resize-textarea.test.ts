// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoResizeTextarea } from './use-auto-resize-textarea';

let textarea: HTMLTextAreaElement;
let heightWhenMeasured: string[];

/** happy-dom has no layout, so the content height is stubbed; borders and max-height are real styles. */
function setContentHeight(height: number): void {
  vi.spyOn(textarea, 'scrollHeight', 'get').mockImplementation(() => {
    heightWhenMeasured.push(textarea.style.height);
    return height;
  });
}

beforeEach(() => {
  textarea = document.createElement('textarea');
  textarea.style.borderTopWidth = '1px';
  textarea.style.borderBottomWidth = '2px';
  textarea.style.maxHeight = '120px';
  document.body.append(textarea);
  heightWhenMeasured = [];
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('useAutoResizeTextarea', () => {
  it.each([
    { name: 'short content', content: 60, height: '63px', overflowY: 'hidden' },
    { name: 'content exactly at the limit', content: 117, height: '120px', overflowY: 'hidden' },
    { name: 'content past the limit', content: 300, height: '120px', overflowY: 'auto' },
  ])('fits $name', ({ content, height, overflowY }) => {
    setContentHeight(content);

    useAutoResizeTextarea(textarea).resize();

    expect(textarea.style.height).toBe(height);
    expect(textarea.style.overflowY).toBe(overflowY);
  });

  it('grows without a limit when there is no max-height', () => {
    textarea.style.maxHeight = 'none';
    setContentHeight(500);

    useAutoResizeTextarea(textarea).resize();

    expect(textarea.style.height).toBe('503px');
    expect(textarea.style.overflowY).toBe('hidden');
  });

  it('measures with the height reset to auto so it can also shrink', () => {
    textarea.style.height = '120px';
    setContentHeight(40);

    useAutoResizeTextarea(textarea).resize();

    expect(heightWhenMeasured).toStrictEqual(['auto']);
    expect(textarea.style.height).toBe('43px');
  });

  it('resizes on every input', () => {
    setContentHeight(60);
    useAutoResizeTextarea(textarea);

    textarea.dispatchEvent(new Event('input'));

    expect(textarea.style.height).toBe('63px');
  });
});
