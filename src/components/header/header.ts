import { closeIcon, hamburgerButtonIcon } from '../../assets/icons';
import { logoImage } from '../../assets/images';
import { useNavLink } from '../../hooks/use-nav-link';
import {
  AUTH_DIALOG_MODE,
  openAuthDialog,
  type AuthDialogMode,
} from '../../store/auth-dialog-store';
import { subscribeNavigation } from '../../store/navigation-store';
import {
  SESSION_END_REASON,
  SESSION_STATUS,
  endSession,
  subscribeSession,
  type SessionState,
} from '../../store/session-store';
import { HOME_LINK, MAIN_NAV_ITEMS, syncActiveNavLinks } from '../../utils/nav-items';
import { lockScroll, unlockScroll } from '../../utils/scroll-lock';
import { createButton } from '../button';
import { createMobileNav } from '../mobile-nav';
import { createUserProfile } from '../user-profile';
import './header.scss';

const { login, register } = AUTH_DIALOG_MODE;
const { authenticated } = SESSION_STATUS;
const { logout } = SESSION_END_REASON;

const MENU_TRANSITION_MS = 250;
const ACTIVE_LINK_CLASS = 'header__nav-link--active';

function createLogo(): HTMLAnchorElement {
  const logoLink = document.createElement('a');
  logoLink.className = 'header__logo';
  useNavLink(logoLink, HOME_LINK);

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

  for (const item of MAIN_NAV_ITEMS) {
    const listItem = document.createElement('li');
    listItem.className = 'header__nav-item';

    const link = document.createElement('a');
    link.className = 'header__nav-link';
    link.textContent = item.label;
    useNavLink(link, item);

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
      openAuthDialog(login);
    },
  });
  logInButton.classList.add('header__log-in');

  const signUpButton = createButton({
    label: 'Sign Up',
    variant: 'primary',
    size: 'medium',
    onClick: () => {
      openAuthDialog(register);
    },
  });
  signUpButton.classList.add('header__sign-up');

  const profileSlot = document.createElement('div');
  profileSlot.className = 'header__profile';

  const logOutButton = createButton({
    label: 'Log Out',
    variant: 'secondary',
    size: 'medium',
    onClick: () => {
      void endSession({ reason: logout });
    },
  });
  logOutButton.classList.add('header__log-out');

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

  const nav = createNav();
  actions.append(nav, logInButton, signUpButton, profileSlot, logOutButton, menuButton);
  inner.append(createLogo(), actions);
  header.append(inner, mobileNav);

  const navLinks = nav.querySelectorAll<HTMLAnchorElement>('.header__nav-link');
  subscribeNavigation((page) => {
    syncActiveNavLinks(navLinks, page, ACTIVE_LINK_CLASS);
  });

  function applySession(session: SessionState): void {
    const isAuthenticated = session.status === authenticated;
    header.classList.toggle('header--authenticated', isAuthenticated);

    if (isAuthenticated) {
      const { email, displayName, avatarUrl } = session;
      profileSlot.replaceChildren(createUserProfile({ email, displayName, avatarUrl }));
      return;
    }

    profileSlot.replaceChildren();
  }

  subscribeSession(applySession);

  return header;
}
