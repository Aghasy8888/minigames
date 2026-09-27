import { PAGE_SUBTITLE_LIBRARY, PAGE_TITLE_LIBRARY } from './page-title-data';
import './page-title.scss';

export interface CreatePageTitleOptions {
  title?: string;
  subtitle?: string;
}

export function createPageTitle(options: CreatePageTitleOptions = {}): HTMLElement {
  const { title = PAGE_TITLE_LIBRARY, subtitle = PAGE_SUBTITLE_LIBRARY } = options;

  const section = document.createElement('section');
  section.className = 'page-title';
  section.setAttribute('aria-labelledby', 'page-title-heading');

  const heading = document.createElement('h1');
  heading.id = 'page-title-heading';
  heading.className = 'page-title__heading';
  heading.textContent = title;

  const subtitleElement = document.createElement('p');
  subtitleElement.className = 'page-title__subtitle';
  subtitleElement.textContent = subtitle;

  section.append(heading, subtitleElement);
  return section;
}
