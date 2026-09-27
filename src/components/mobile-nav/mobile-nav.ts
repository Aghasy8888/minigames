import { logoImage } from '../../assets/images';
import { navigate, subscribeNavigation, type AppPage } from '../../store/navigation-store';
import type { AuthDialogMode } from '../../store/auth-dialog-store';
import { HOME_HREF } from '../../utils/home-href';
import { hrefForNavLabel, pageForNavLabel } from '../../utils/nav-target';
import { createButton } from '../button';
import './mobile-nav.scss';

const NAV_ITEMS: readonly string[] = ['Home', 'Library', 'Tournaments', 'Community'];
const ACTIVE_LINK_CLASS = 'mobile-nav__link--active';

export interface CreateMobileNavOptions {
  onNavigate?: () => void;
  onAuthRequest?: (mode: AuthDialogMode) => void;
}

function syncActiveNavLinks(root: ParentNode, page: AppPage): void {
  const links = root.querySelectorAll<HTMLAnchorElement>('.mobile-nav__link');

  for (const link of links) {
    const label = link.textContent ?? '';
    const representsCurrent =
      (label === 'Home' && page === 'home') || (label === 'Library' && page === 'library');

    link.classList.toggle(ACTIVE_LINK_CLASS, representsCurrent);

    if (representsCurrent) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

export function createMobileNav(options: CreateMobileNavOptions = {}): HTMLElement {
  const { onNavigate, onAuthRequest } = options;

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
  logoLink.href = HOME_HREF;
  logoLink.addEventListener('click', (event) => {
    event.preventDefault();
    navigate('home');
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
    link.href = hrefForNavLabel(item);
    link.textContent = item;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigate(pageForNavLabel(item));
      onNavigate?.();
    });

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
    onClick: () => {
      onAuthRequest?.('login');
    },
  });

  const signUpButton = createButton({
    label: 'Sign Up',
    variant: 'primary',
    size: 'medium',
    className: 'button--menu-auth',
    onClick: () => {
      onAuthRequest?.('register');
    },
  });

  actions.append(logInButton, signUpButton);
  panel.append(top, navigation, actions);

  subscribeNavigation((page) => {
    syncActiveNavLinks(navigation, page);
  });

  return panel;
}
