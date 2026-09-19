import { logoImage } from '../../assets/images';
import { createButton } from '../button';
import './mobile-nav.scss';

const NAV_ITEMS: readonly string[] = ['Home', 'Library', 'Tournaments', 'Community'];

export interface CreateMobileNavOptions {
  onNavigate?: () => void;
}

function noopClick(): void {}

export function createMobileNav(options: CreateMobileNavOptions = {}): HTMLElement {
  const { onNavigate } = options;

  const panel = document.createElement('div');
  panel.className = 'mobile-nav';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Mobile navigation');
  panel.setAttribute('aria-hidden', 'true');
  panel.inert = true;

  const top = document.createElement('div');
  top.className = 'mobile-nav__top';

  const logoLink = document.createElement('a');
  logoLink.className = 'mobile-nav__logo';
  logoLink.href = '#/';
  logoLink.addEventListener('click', () => {
    onNavigate?.();
  });

  const logoMark = document.createElement('img');
  logoMark.className = 'mobile-nav__logo-mark';
  logoMark.src = logoImage;
  logoMark.alt = '';
  logoMark.width = 32;
  logoMark.height = 32;

  const logoText = document.createElement('span');
  logoText.className = 'mobile-nav__logo-text';
  logoText.textContent = 'MiniGames';

  logoLink.append(logoMark, logoText);
  top.append(logoLink);

  const navigation = document.createElement('nav');
  navigation.className = 'mobile-nav__nav';
  navigation.setAttribute('aria-label', 'Mobile');

  const list = document.createElement('ul');
  list.className = 'mobile-nav__list';

  for (const item of NAV_ITEMS) {
    const listItem = document.createElement('li');
    listItem.className = 'mobile-nav__item';

    const link = document.createElement('a');
    link.className = 'mobile-nav__link';
    link.href = '#/';
    link.textContent = item;
    link.addEventListener('click', () => {
      onNavigate?.();
    });

    if (item === 'Home') {
      link.classList.add('mobile-nav__link--active');
      link.setAttribute('aria-current', 'page');
    }

    listItem.append(link);
    list.append(listItem);
  }

  navigation.append(list);

  const actions = document.createElement('div');
  actions.className = 'mobile-nav__actions';

  const logInButton = createButton({
    label: 'Log In',
    variant: 'secondary',
    size: 'medium',
    className: 'button--ghost-on-dark button--menu-auth',
    onClick: noopClick,
  });

  const signUpButton = createButton({
    label: 'Sign Up',
    variant: 'primary',
    size: 'medium',
    className: 'button--menu-auth',
    onClick: noopClick,
  });

  actions.append(logInButton, signUpButton);
  panel.append(top, navigation, actions);

  return panel;
}
