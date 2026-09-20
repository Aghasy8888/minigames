import { submitIcon } from '../../assets/icons';
import {
  illustrationSideDesktop,
  illustrationSideMobile,
  illustrationSideTablet,
} from '../../assets/images';
import { createButton } from '../../components/button';
import {
  DEVELOPER_CTA_BODY,
  DEVELOPER_CTA_BUTTON_LABEL,
  DEVELOPER_CTA_CONTACT_TEXT,
  DEVELOPER_CTA_DESKTOP_MEDIA_QUERY,
  DEVELOPER_CTA_TABLET_MEDIA_QUERY,
  DEVELOPER_CTA_TITLE,
} from './developer-cta-data';
import './developer-cta.scss';

function syncCtaSize(button: HTMLButtonElement, matchesDesktop: boolean): void {
  button.classList.toggle('button--large', matchesDesktop);
  button.classList.toggle('button--medium', !matchesDesktop);
}

function createSubmitIcon(): HTMLImageElement {
  const icon = document.createElement('img');
  icon.src = submitIcon;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function createIllustration(): HTMLElement {
  const media = document.createElement('div');
  media.className = 'developer-cta__media';

  const picture = document.createElement('picture');
  picture.className = 'developer-cta__picture';

  const desktopSource = document.createElement('source');
  desktopSource.media = DEVELOPER_CTA_DESKTOP_MEDIA_QUERY;
  desktopSource.srcset = illustrationSideDesktop;

  const tabletSource = document.createElement('source');
  tabletSource.media = DEVELOPER_CTA_TABLET_MEDIA_QUERY;
  tabletSource.srcset = illustrationSideTablet;

  const image = document.createElement('img');
  image.className = 'developer-cta__image';
  image.src = illustrationSideMobile;
  image.alt = '';
  image.decoding = 'async';

  picture.append(desktopSource, tabletSource, image);
  media.append(picture);
  return media;
}

export function createDeveloperCta(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'developer-cta';
  section.setAttribute('aria-label', DEVELOPER_CTA_TITLE);

  const card = document.createElement('div');
  card.className = 'developer-cta__card';

  const title = document.createElement('h2');
  title.className = 'developer-cta__title';
  title.textContent = DEVELOPER_CTA_TITLE;

  const body = document.createElement('p');
  body.className = 'developer-cta__body';
  body.textContent = DEVELOPER_CTA_BODY;

  const cta = createButton({
    label: DEVELOPER_CTA_BUTTON_LABEL,
    variant: 'primary',
    size: 'medium',
    icon: createSubmitIcon(),
    iconPosition: 'start',
  });

  const desktopMediaQuery = globalThis.matchMedia(DEVELOPER_CTA_DESKTOP_MEDIA_QUERY);
  const handleDesktopChange = (event: MediaQueryListEvent | MediaQueryList): void => {
    syncCtaSize(cta, event.matches);
  };
  handleDesktopChange(desktopMediaQuery);
  desktopMediaQuery.addEventListener('change', handleDesktopChange);

  const contact = document.createElement('p');
  contact.className = 'developer-cta__contact';
  contact.textContent = DEVELOPER_CTA_CONTACT_TEXT;

  card.append(title, body, cta, contact);
  section.append(createIllustration(), card);

  return section;
}
