import { createButton } from '../button';
import './empty-state.scss';

export type CreateEmptyStateAction = {
  label: string;
  onClick: () => void;
};

export type CreateEmptyStateOptions = {
  title: string;
  message: string;
  action?: CreateEmptyStateAction;
};

export function createEmptyState({ title, message, action }: CreateEmptyStateOptions): HTMLElement {
  const root = document.createElement('section');
  root.className = 'empty-state';
  root.setAttribute('role', 'status');

  const heading = document.createElement('h3');
  heading.className = 'empty-state__title';
  heading.textContent = title;

  const text = document.createElement('p');
  text.className = 'empty-state__message';
  text.textContent = message;

  root.append(heading, text);

  if (action) {
    const actionButton = createButton({
      label: action.label,
      variant: 'secondary',
      onClick: action.onClick,
    });
    actionButton.classList.add('empty-state__action');
    root.append(actionButton);
  }

  return root;
}
