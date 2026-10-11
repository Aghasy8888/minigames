// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { sendDisabledIcon, sendIcon } from '../../assets/icons';
import { createCommentComposer, type CommentComposer } from '.';

let onSubmit: Mock<(text: string) => void>;
let onInput: Mock<(text: string) => void>;
let onLogin: Mock<() => void>;

function mount(initialText?: string): CommentComposer {
  const composer = createCommentComposer({
    placeholder: 'Write a comment...',
    guestPlaceholder: 'Log in to write a comment',
    textareaAriaLabel: 'Write a comment',
    sendAriaLabel: 'Send comment',
    loginPrompt: 'Log in to join the conversation.',
    loginLabel: 'Log in',
    formatTooLong: (length) => `Too long (${length})`,
    initialText,
    onInput,
    onSubmit,
    onLogin,
  });
  document.body.append(composer.element);
  return composer;
}

function query<T extends Element>(composer: CommentComposer, selector: string): T {
  const element = composer.element.querySelector<T>(selector);
  if (!element) {
    throw new Error(`missing element: ${selector}`);
  }
  return element;
}

function textareaOf(composer: CommentComposer): HTMLTextAreaElement {
  return query<HTMLTextAreaElement>(composer, 'textarea');
}

function sendOf(composer: CommentComposer): HTMLButtonElement {
  return query<HTMLButtonElement>(composer, '.comment-composer__send');
}

function hintOf(composer: CommentComposer): HTMLElement {
  return query<HTMLElement>(composer, '.comment-composer__hint');
}

function guestNoteOf(composer: CommentComposer): HTMLElement {
  return query<HTMLElement>(composer, '.comment-composer__guest-note');
}

function avatarOf(composer: CommentComposer): HTMLElement {
  return query<HTMLElement>(composer, '.comment-composer__avatar');
}

function type(composer: CommentComposer, value: string): void {
  const textarea = textareaOf(composer);
  textarea.value = value;
  textarea.dispatchEvent(new Event('input'));
}

function pressKey(composer: CommentComposer, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  textareaOf(composer).dispatchEvent(event);
  return event;
}

/**
 * Browsers move focus to <body> when the focused control gets disabled; happy-dom keeps it on the
 * disabled control (and ignores `blur()` there), so emulate the browser.
 */
function dropFocusToBody(): void {
  vi.spyOn(document, 'activeElement', 'get').mockReturnValue(document.body);
}

function signedIn(initialText?: string): CommentComposer {
  const composer = mount(initialText);
  composer.setUser('S');
  return composer;
}

beforeEach(() => {
  onSubmit = vi.fn<(text: string) => void>();
  onInput = vi.fn<(text: string) => void>();
  onLogin = vi.fn<() => void>();
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('guest form', () => {
  it('locks the textarea and Send with a log-in placeholder', () => {
    const composer = mount();

    expect(textareaOf(composer).disabled).toBe(true);
    expect(textareaOf(composer).placeholder).toBe('Log in to write a comment');
    expect(sendOf(composer).disabled).toBe(true);
    expect(sendOf(composer).querySelector('img')?.getAttribute('src')).toBe(sendDisabledIcon);
  });

  it('names the textarea and the Send button for screen readers', () => {
    const composer = mount();

    expect(textareaOf(composer).getAttribute('aria-label')).toBe('Write a comment');
    expect(sendOf(composer).getAttribute('aria-label')).toBe('Send comment');
  });

  it('shows a generic avatar instead of an initial', () => {
    const composer = mount();
    const avatar = avatarOf(composer);

    expect(avatar.classList.contains('comment-composer__avatar--guest')).toBe(true);
    expect(avatar.querySelector('.comment-composer__avatar-fallback')).not.toBeNull();
    expect(avatar.textContent).toBe('');
  });

  it('shows the log-in prompt with a Log in button that calls onLogin', () => {
    const composer = mount();
    const loginButton = query<HTMLButtonElement>(composer, '.comment-composer__login');

    loginButton.click();

    expect(guestNoteOf(composer).hidden).toBe(false);
    expect(guestNoteOf(composer).textContent).toBe('Log in to join the conversation. Log in');
    expect(loginButton.type).toBe('button');
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('never submits, even with text in the box', () => {
    const composer = mount('Hello');

    pressKey(composer, { key: 'Enter' });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('signed-in form', () => {
  it('unlocks the textarea and shows the user initial', () => {
    const composer = signedIn();

    expect(textareaOf(composer).disabled).toBe(false);
    expect(textareaOf(composer).placeholder).toBe('Write a comment...');
    expect(avatarOf(composer).textContent).toBe('S');
    expect(avatarOf(composer).classList.contains('comment-composer__avatar--guest')).toBe(false);
    expect(guestNoteOf(composer).hidden).toBe(true);
  });

  it('goes back to the locked guest form when the user signs out', () => {
    const composer = signedIn();

    composer.setUser();

    expect(textareaOf(composer).disabled).toBe(true);
    expect(guestNoteOf(composer).hidden).toBe(false);
    expect(avatarOf(composer).textContent).toBe('');
  });

  it.each([
    { name: 'empty text', text: '', enabled: false },
    { name: 'only whitespace', text: '   \n ', enabled: false },
    { name: 'one character', text: 'a', enabled: true },
    { name: '500 characters', text: 'a'.repeat(500), enabled: true },
    { name: '500 characters plus surrounding spaces', text: ` ${'a'.repeat(500)} `, enabled: true },
    { name: '501 characters', text: 'a'.repeat(501), enabled: false },
  ])('enables Send only for valid text: $name', ({ text, enabled }) => {
    const composer = signedIn();

    type(composer, text);

    expect(sendOf(composer).disabled).toBe(!enabled);
    expect(sendOf(composer).querySelector('img')?.getAttribute('src')).toBe(
      enabled ? sendIcon : sendDisabledIcon,
    );
  });

  it('reports every edit to onInput', () => {
    const composer = signedIn();

    type(composer, 'Hi');

    expect(onInput).toHaveBeenCalledWith('Hi');
  });

  it('starts from the restored draft', () => {
    const composer = signedIn('Unsent draft');

    expect(textareaOf(composer).value).toBe('Unsent draft');
    expect(sendOf(composer).disabled).toBe(false);
  });
});

describe('too-long hint', () => {
  it('explains the limit with the trimmed length and marks the textarea invalid', () => {
    const composer = signedIn();

    type(composer, `  ${'a'.repeat(501)}  `);

    expect(hintOf(composer).textContent).toBe('Too long (501)');
    expect(textareaOf(composer).getAttribute('aria-invalid')).toBe('true');
    expect(textareaOf(composer).getAttribute('aria-describedby')).toBe(hintOf(composer).id);
  });

  it('clears once the text fits again', () => {
    const composer = signedIn();
    type(composer, 'a'.repeat(501));

    type(composer, 'a'.repeat(500));

    expect(hintOf(composer).textContent).toBe('');
    expect(textareaOf(composer).getAttribute('aria-invalid')).toBe('false');
    expect(textareaOf(composer).hasAttribute('aria-describedby')).toBe(false);
  });

  it('is announced politely and has an id unique to each composer', () => {
    const first = signedIn();
    const second = signedIn();

    expect(hintOf(first).getAttribute('aria-live')).toBe('polite');
    expect(hintOf(first).id).not.toBe(hintOf(second).id);
  });
});

describe('sending', () => {
  it('sends the text on Enter instead of adding a line', () => {
    const composer = signedIn();
    type(composer, 'Great game');

    const event = pressKey(composer, { key: 'Enter' });

    expect(event.defaultPrevented).toBe(true);
    expect(onSubmit.mock.calls).toStrictEqual([['Great game']]);
  });

  it.each([
    { name: 'Shift+Enter', init: { key: 'Enter', shiftKey: true } },
    { name: 'Enter while composing', init: { key: 'Enter', isComposing: true } },
    { name: 'another key', init: { key: 'a' } },
  ])('does not send on $name', ({ init }) => {
    const composer = signedIn();
    type(composer, 'Great game');

    const event = pressKey(composer, init);

    expect(event.defaultPrevented).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sends from the Send button', () => {
    const composer = signedIn();
    type(composer, 'Great game');

    sendOf(composer).click();

    expect(onSubmit.mock.calls).toStrictEqual([['Great game']]);
  });

  it('does not send invalid text', () => {
    const composer = signedIn();
    type(composer, ' '.repeat(3));

    query<HTMLFormElement>(composer, 'form').requestSubmit();

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('busy state', () => {
  it('locks the textarea and Send while the comment is being posted', () => {
    const composer = signedIn();
    type(composer, 'Great game');

    composer.setBusy(true);

    expect(textareaOf(composer).disabled).toBe(true);
    expect(sendOf(composer).disabled).toBe(true);
    expect(composer.element.getAttribute('aria-busy')).toBe('true');
  });

  it('does not send a second time while busy', () => {
    const composer = signedIn();
    type(composer, 'Great game');
    composer.setBusy(true);

    query<HTMLFormElement>(composer, 'form').requestSubmit();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('unlocks with the text kept when the post fails', () => {
    const composer = signedIn();
    type(composer, 'Great game');
    composer.setBusy(true);

    composer.setBusy(false);

    expect(textareaOf(composer).disabled).toBe(false);
    expect(textareaOf(composer).value).toBe('Great game');
    expect(sendOf(composer).disabled).toBe(false);
    expect(composer.element.getAttribute('aria-busy')).toBe('false');
  });

  it.each([
    { name: 'the textarea', focusTarget: textareaOf },
    { name: 'the Send button', focusTarget: sendOf },
  ])('returns focus to the textarea when $name had it before sending', ({ focusTarget }) => {
    const composer = signedIn();
    type(composer, 'Great game');
    focusTarget(composer).focus();
    composer.setBusy(true);
    dropFocusToBody();
    const focus = vi.spyOn(textareaOf(composer), 'focus');

    composer.setBusy(false);

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('does not take focus the composer never had', () => {
    const composer = signedIn();
    type(composer, 'Great game');
    composer.setBusy(true);
    const focus = vi.spyOn(textareaOf(composer), 'focus');

    composer.setBusy(false);

    expect(focus).not.toHaveBeenCalled();
  });

  it('does not steal focus the user moved elsewhere meanwhile', () => {
    const other = document.createElement('button');
    document.body.append(other);
    const composer = signedIn();
    type(composer, 'Great game');
    textareaOf(composer).focus();
    composer.setBusy(true);
    other.focus();
    const focus = vi.spyOn(textareaOf(composer), 'focus');

    composer.setBusy(false);

    expect(focus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(other);
  });

  it('does not focus the locked guest textarea after the session ended', () => {
    const composer = signedIn();
    type(composer, 'Great game');
    textareaOf(composer).focus();
    composer.setBusy(true);
    dropFocusToBody();
    composer.setUser();
    const focus = vi.spyOn(textareaOf(composer), 'focus');

    composer.setBusy(false);

    expect(focus).not.toHaveBeenCalled();
  });

  it('restores focus only once per request', () => {
    const composer = signedIn();
    type(composer, 'Great game');
    textareaOf(composer).focus();
    composer.setBusy(true);
    dropFocusToBody();
    composer.setBusy(false);
    const focus = vi.spyOn(textareaOf(composer), 'focus');

    composer.setBusy(false);

    expect(focus).not.toHaveBeenCalled();
  });
});

describe('reset', () => {
  it('clears the posted text and disables Send', () => {
    const composer = signedIn();
    type(composer, 'Great game');

    composer.reset();

    expect(textareaOf(composer).value).toBe('');
    expect(sendOf(composer).disabled).toBe(true);
  });
});
