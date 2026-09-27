import { sendDisabledIcon, sendIcon } from '../../assets/icons';
import { useAutoResizeTextarea } from '../../hooks/use-auto-resize-textarea';
import './comment-composer.scss';

export type CommentComposerOptions = {
  userInitial: string;
  placeholder: string;
  textareaAriaLabel: string;
  sendAriaLabel: string;
};

export type CommentComposer = {
  element: HTMLFormElement;
  reset: () => void;
};

export function createCommentComposer(options: CommentComposerOptions): CommentComposer {
  const form = document.createElement('form');
  form.className = 'comment-composer';
  form.noValidate = true;

  const avatar = document.createElement('span');
  avatar.className = 'comment-composer__avatar';
  avatar.textContent = options.userInitial;
  avatar.setAttribute('aria-hidden', 'true');

  const textarea = document.createElement('textarea');
  textarea.className = 'comment-composer__textarea';
  textarea.rows = 1;
  textarea.placeholder = options.placeholder;
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

  const autoResize = useAutoResizeTextarea(textarea);

  function syncSendState(): void {
    const isEmpty = textarea.value.trim() === '';
    sendButton.disabled = isEmpty;
    sendIconElement.src = isEmpty ? sendDisabledIcon : sendIcon;
  }

  textarea.addEventListener('input', syncSendState);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  function reset(): void {
    textarea.value = '';
    autoResize.resize();
    syncSendState();
  }

  syncSendState();
  form.append(avatar, textarea, sendButton);

  return { element: form, reset };
}
