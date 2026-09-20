import { closeIcon, hamburgerButtonIcon } from '../../assets/icons';
import { logoImage } from '../../assets/images';
import { openAuthDialog, type AuthDialogMode } from '../../store/auth-dialog-store';
import { lockScroll, unlockScroll } from '../../utils/scroll-lock';
import { createButton } from '../button';
import { createMobileNav } from '../mobile-nav';
import './header.scss';

const NAV_ITEMS: readonly string[] = ['Home', 'Library', 'Tournaments', 'Community'];
const MENU_TRANSITION_MS = 250;

function createLogo(): HTMLAnchorElement {
  const logoLink = document.createElement('a');
  logoLink.className = 'header__logo';
  logoLink.href = '/';

  const logoMark = document.createElement('img');
  logoMark.className = 'header__logo-mark';
  logoMark.src = logoImage;
  logoMark.alt = '';
  logoMark.width = 30;
  logoMark.height = 30;

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
    link.href = '/';
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
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-controls', 'mobile-nav');

  const hamburgerImage = document.createElement('img');
  hamburgerImage.className = 'header__menu-icon header__menu-icon--hamburger';
  hamburgerImage.src = hamburgerButtonIcon;
  hamburgerImage.alt = '';
  hamburgerImage.width = 32;
  hamburgerImage.height = 32;

  const closeImage = document.createElement('img');
  closeImage.className = 'header__menu-icon header__menu-icon--close';
  closeImage.src = closeIcon;
  closeImage.alt = '';
  closeImage.width = 10;
  closeImage.height = 10;

  const iconFrame = document.createElement('span');
  iconFrame.className = 'header__menu-frame';
  iconFrame.setAttribute('aria-hidden', 'true');
  iconFrame.append(hamburgerImage, closeImage);

  menuButton.append(iconFrame);
  return menuButton;
}

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
    onClick: () => {
      openAuthDialog('login');
    },
  });
  logInButton.classList.add('header__log-in');

  const signUpButton = createButton({
    label: 'Sign Up',
    variant: 'primary',
    size: 'medium',
    onClick: () => {
      openAuthDialog('register');
    },
  });
  signUpButton.classList.add('header__sign-up');

  const menuButton = createMenuButton();
  let isMenuOpen = false;
  let closeTimerId: ReturnType<typeof globalThis.setTimeout> | undefined;

  const requestAuth = (mode: AuthDialogMode): void => {
    closeMenu();
    openAuthDialog(mode);
  };

  const mobileNav = createMobileNav({
    onNavigate: () => {
      closeMenu();
    },
    onAuthRequest: requestAuth,
  });
  mobileNav.id = 'mobile-nav';

  const handleEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  };

  function openMenu(): void {
    if (isMenuOpen) {
      return;
    }

    globalThis.clearTimeout(closeTimerId);
    isMenuOpen = true;
    header.classList.add('header--menu-open');
    menuButton.classList.add('header__menu--open');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'Close menu');
    mobileNav.classList.add('mobile-nav--open');
    mobileNav.setAttribute('aria-hidden', 'false');
    mobileNav.inert = false;
    lockScroll();
    document.addEventListener('keydown', handleEscape);
  }

  function closeMenu(): void {
    if (!isMenuOpen) {
      return;
    }

    isMenuOpen = false;
    header.classList.remove('header--menu-open');
    menuButton.classList.remove('header__menu--open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
    mobileNav.classList.remove('mobile-nav--open');
    unlockScroll();
    document.removeEventListener('keydown', handleEscape);

    closeTimerId = globalThis.setTimeout(() => {
      if (!isMenuOpen) {
        mobileNav.setAttribute('aria-hidden', 'true');
        mobileNav.inert = true;
      }
    }, MENU_TRANSITION_MS);
  }

  function toggleMenu(): void {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  menuButton.addEventListener('click', toggleMenu);

  // Keep in sync with $breakpoints 'tablet' in tokens.scss (769px → above 768 PP)
  const tabletMediaQuery = globalThis.matchMedia('(min-width: 769px)');
  const handleTabletChange = (event: MediaQueryListEvent | MediaQueryList): void => {
    if (event.matches) {
      closeMenu();
    }
  };
  handleTabletChange(tabletMediaQuery);
  tabletMediaQuery.addEventListener('change', handleTabletChange);

  actions.append(createNav(), logInButton, signUpButton, menuButton);
  inner.append(createLogo(), actions);
  header.append(inner, mobileNav);

  return header;
}
