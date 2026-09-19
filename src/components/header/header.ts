import { hamburgerButtonIcon } from '../../assets/icons';
import { logoImage } from '../../assets/images';
import { createButton } from '../button';
import './header.scss';

const NAV_ITEMS: readonly string[] = ['Home', 'Library', 'Tournaments', 'Community'];

function createLogo(): HTMLAnchorElement {
  const logoLink = document.createElement('a');
  logoLink.className = 'header__logo';
  logoLink.href = '#/';

  const logoMark = document.createElement('img');
  logoMark.className = 'header__logo-mark';
  logoMark.src = logoImage;
  logoMark.alt = '';
  logoMark.width = 32;
  logoMark.height = 32;

  const logoText = document.createElement('span');
  logoText.className = 'header__logo-text';
  logoText.textContent = 'MiniGames';

  logoLink.append(logoMark, logoText);
  return logoLink;
}

function createNav(): HTMLElement {
  const navigation = document.createElement('nav');
  navigation.className = 'header__nav';
  navigation.setAttribute('aria-label', 'Main');

  const list = document.createElement('ul');
  list.className = 'header__nav-list';

  for (const item of NAV_ITEMS) {
    const listItem = document.createElement('li');
    listItem.className = 'header__nav-item';

    const link = document.createElement('a');
    link.className = 'header__nav-link';
    link.href = '#/';
    link.textContent = item;

    if (item === 'Home') {
      link.classList.add('header__nav-link--active');
      link.setAttribute('aria-current', 'page');
    }

    listItem.append(link);
    list.append(listItem);
  }

  navigation.append(list);
  return navigation;
}

function createMenuButton(): HTMLButtonElement {
  const menuButton = document.createElement('button');
  menuButton.type = 'button';
  menuButton.className = 'header__menu';
  menuButton.setAttribute('aria-label', 'Open menu');
  menuButton.addEventListener('click', noopClick);

  const menuIcon = document.createElement('img');
  menuIcon.className = 'header__menu-icon';
  menuIcon.src = hamburgerButtonIcon;
  menuIcon.alt = '';
  menuIcon.width = 32;
  menuIcon.height = 32;

  menuButton.append(menuIcon);
  return menuButton;
}

function noopClick(): void {}

export function createHeader(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'header';

  const inner = document.createElement('div');
  inner.className = 'header__inner';

  const actions = document.createElement('div');
  actions.className = 'header__actions';

  const logInButton = createButton({
    label: 'Log In',
    variant: 'secondary',
    size: 'medium',
    onClick: noopClick,
  });
  logInButton.classList.add('header__log-in');

  const signUpButton = createButton({
    label: 'Sign Up',
    variant: 'primary',
    size: 'medium',
    onClick: noopClick,
  });
  signUpButton.classList.add('header__sign-up');

  const menuButton = createMenuButton();

  actions.append(createNav(), logInButton, signUpButton, menuButton);
  inner.append(createLogo(), actions);
  header.append(inner);

  return header;
}
