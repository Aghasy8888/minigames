import { createButton } from '../../components/button';
import { navigate } from '../../store/navigation-store';
import { APP_PAGE } from '../../utils/app-page';
import { NOT_FOUND_CONTENT } from './not-found-data';
import './not-found-page.scss';

function createRequestedPath(): HTMLParagraphElement {
  const pathLine = document.createElement('p');
  pathLine.className = 'not-found-page__path';

  const label = document.createElement('span');
  label.className = 'not-found-page__path-label';
  label.textContent = NOT_FOUND_CONTENT.pathLabel;

  const value = document.createElement('code');
  value.className = 'not-found-page__path-value';
  value.textContent = globalThis.location.pathname;

  pathLine.append(label, ' ', value);
  return pathLine;
}

export function renderNotFoundPage(container: HTMLElement): void {
  container.className = 'not-found-page';

  const card = document.createElement('section');
  card.className = 'not-found-page__card';
  card.setAttribute('aria-labelledby', 'not-found-heading');

  const code = document.createElement('p');
  code.className = 'not-found-page__code';
  code.textContent = NOT_FOUND_CONTENT.code;

  const heading = document.createElement('h1');
  heading.id = 'not-found-heading';
  heading.className = 'not-found-page__title';
  heading.textContent = NOT_FOUND_CONTENT.title;

  const message = document.createElement('p');
  message.className = 'not-found-page__message';
  message.textContent = NOT_FOUND_CONTENT.message;

  const homeButton = createButton({
    label: NOT_FOUND_CONTENT.homeButtonLabel,
    variant: 'primary',
    size: 'large',
    onClick: () => {
      navigate(APP_PAGE.home);
    },
  });

  card.append(code, heading, message, createRequestedPath(), homeButton);
  container.replaceChildren(card);
}
