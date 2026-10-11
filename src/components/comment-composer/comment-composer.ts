import { personIcon, sendDisabledIcon, sendIcon } from '../../assets/icons';
import { useAutoResizeTextarea } from '../../hooks/use-auto-resize-textarea';
import { checkCommentText } from '../../utils/comment-text';
import './comment-composer.scss';

export type CommentComposerOptions = {
  placeholder: string;
  guestPlaceholder: string;
  textareaAriaLabel: string;
  sendAriaLabel: string;
  loginPrompt: string;
  loginLabel: string;
  formatTooLong: (length: number) => string;
  initialText?: string;
  onInput?: (text: string) => void;
  onSubmit: (text: string) => void;
  onLogin: () => void;
};

export type CommentComposer = {
  element: HTMLElement;
  /** Clears the text after a successful post. */
  reset: () => void;
  /** Signed-in initial, or `undefined` for the locked guest form. */
  setUser: (initial?: string) => void;
  /** Locks the textarea and Send while a request is pending. */
  setBusy: (busy: boolean) => void;
};

let nextHintId = 0;

/** Comment form: Enter sends, Shift+Enter adds a line. Renders state; never sends on its own. */
export function createCommentComposer(options: CommentComposerOptions): CommentComposer {
  const { placeholder, guestPlaceholder, formatTooLong, onInput, onSubmit, onLogin } = options;
  let userInitial: string | undefined;
  let isBusy = false;
  let restoreFocus = false;

  const root = document.createElement('div');
  root.className = 'comment-composer';

  const form = document.createElement('form');
  form.className = 'comment-composer__form';
  form.noValidate = true;

  const avatar = document.createElement('span');
  avatar.className = 'comment-composer__avatar';
  avatar.setAttribute('aria-hidden', 'true');

  const guestAvatar = document.createElement('span');
  guestAvatar.className = 'comment-composer__avatar-fallback';
  guestAvatar.style.maskImage = `url("${personIcon}")`;

  const textarea = document.createElement('textarea');
  textarea.className = 'comment-composer__textarea';
  textarea.rows = 1;
  textarea.value = options.initialText ?? '';
  textarea.setAttribute('aria-label', options.textareaAriaLabel);

  const sendButton = document.createElement('button');
  sendButton.type = 'submit';
  sendButton.className = 'comment-composer__send';
  sendButton.setAttribute('aria-label', options.sendAriaLabel);

  const sendIconElement = document.createElement('img');
  sendIconElement.alt = '';
  sendIconElement.className = 'comment-composer__send-icon';
  sendIconElement.setAttribute('aria-hidden', 'true');
  sendButton.append(sendIconElement);

  const hint = document.createElement('p');
  hint.className = 'comment-composer__hint';
  hint.id = `comment-composer-hint-${++nextHintId}`;
  hint.setAttribute('aria-live', 'polite');

  const guestNote = document.createElement('p');
  guestNote.className = 'comment-composer__guest-note';

  const loginButton = document.createElement('button');
  loginButton.type = 'button';
  loginButton.className = 'comment-composer__login';
  loginButton.textContent = options.loginLabel;
  loginButton.addEventListener('click', onLogin);

  guestNote.append(`${options.loginPrompt} `, loginButton);
  form.append(avatar, textarea, sendButton);
  root.append(form, hint, guestNote);

  const autoResize = useAutoResizeTextarea(textarea);

  function canSubmit(): boolean {
    return !isBusy && userInitial !== undefined && checkCommentText(textarea.value).isValid;
  }

  function sync(): void {
    const isGuest = userInitial === undefined;
    const { isTooLong } = checkCommentText(textarea.value);
    const isSendDisabled = !canSubmit();

    root.setAttribute('aria-busy', String(isBusy));
    guestNote.hidden = !isGuest;

    avatar.classList.toggle('comment-composer__avatar--guest', isGuest);
    avatar.replaceChildren(userInitial ?? guestAvatar);

    textarea.disabled = isGuest || isBusy;
    textarea.placeholder = isGuest ? guestPlaceholder : placeholder;

    hint.textContent = isTooLong ? formatTooLong(textarea.value.trim().length) : '';
    textarea.setAttribute('aria-invalid', String(isTooLong));
    if (isTooLong) {
      textarea.setAttribute('aria-describedby', hint.id);
    } else {
      textarea.removeAttribute('aria-describedby');
    }

    sendButton.disabled = isSendDisabled;
    sendIconElement.src = isSendDisabled ? sendDisabledIcon : sendIcon;
  }

  textarea.addEventListener('input', () => {
    onInput?.(textarea.value);
    sync();
  });

  textarea.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
      return;
    }

    event.preventDefault();
    form.requestSubmit();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (canSubmit()) {
      onSubmit(textarea.value);
    }
  });

  function setBusy(busy: boolean): void {
    if (busy) {
      const { activeElement } = document;
      restoreFocus = activeElement === textarea || activeElement === sendButton;
    }

    isBusy = busy;
    sync();

    // Disabling the controls while sending drops focus to <body>
    const shouldRefocus = restoreFocus && document.activeElement === document.body;

    if (!busy && shouldRefocus && !textarea.disabled) {
      restoreFocus = false;
      textarea.focus();
    }
  }

  function setUser(initial?: string): void {
    userInitial = initial;
    sync();
  }

  function reset(): void {
    textarea.value = '';
    autoResize.resize();
    sync();
  }

  sync();

  // A restored draft needs the grown height once the composer is in the DOM
  if (textarea.value !== '') {
    queueMicrotask(autoResize.resize);
  }

  return { element: root, reset, setUser, setBusy };
}
