import { heroBgImage } from '../../assets/images';
import { navigate } from '../../store/navigation-store';
import { createButton } from '../button';
import {
  HERO_CTA_LABEL,
  HERO_DESCRIPTION_LONG,
  HERO_DESCRIPTION_SHORT,
  HERO_DESKTOP_MEDIA_QUERY,
  HERO_TITLE,
} from './hero-data';
import './hero.scss';

function syncCtaSize(button: HTMLButtonElement, matchesDesktop: boolean): void {
  button.classList.toggle('button--large', matchesDesktop);
  button.classList.toggle('button--medium', !matchesDesktop);
}

export function createHero(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'hero';
  section.setAttribute('aria-label', 'Introduction');

  const media = document.createElement('div');
  media.className = 'hero__media';
  media.setAttribute('aria-hidden', 'true');

  const overlay = document.createElement('div');
  overlay.className = 'hero__overlay';

  const imageWrap = document.createElement('div');
  imageWrap.className = 'hero__image-wrap';

  const image = document.createElement('img');
  image.className = 'hero__image';
  image.src = heroBgImage;
  image.alt = '';
  image.decoding = 'async';

  imageWrap.append(image);
  media.append(overlay, imageWrap);

  const inner = document.createElement('div');
  inner.className = 'hero__inner';

  const card = document.createElement('div');
  card.className = 'hero__card';

  const title = document.createElement('h1');
  title.className = 'hero__title';
  title.textContent = HERO_TITLE;

  const descriptionShort = document.createElement('p');
  descriptionShort.className = 'hero__description hero__description--short';
  descriptionShort.textContent = HERO_DESCRIPTION_SHORT;

  const descriptionLong = document.createElement('p');
  descriptionLong.className = 'hero__description hero__description--long';
  descriptionLong.textContent = HERO_DESCRIPTION_LONG;

  const cta = createButton({
    label: HERO_CTA_LABEL,
    variant: 'primary',
    size: 'medium',
    onClick: () => {
      navigate('library');
    },
  });

  // Keep in sync with $breakpoints 'desktop' in tokens.scss (1200px)
  const desktopMediaQuery = globalThis.matchMedia(HERO_DESKTOP_MEDIA_QUERY);
  const handleDesktopChange = (event: MediaQueryListEvent | MediaQueryList): void => {
    syncCtaSize(cta, event.matches);
  };
  handleDesktopChange(desktopMediaQuery);
  desktopMediaQuery.addEventListener('change', handleDesktopChange);

  card.append(title, descriptionShort, descriptionLong, cta);
  inner.append(card);
  section.append(media, inner);

  return section;
}
