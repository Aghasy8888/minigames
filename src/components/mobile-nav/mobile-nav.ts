import { logoImage } from '../../assets/images';
import { useNavLink } from '../../hooks/use-nav-link';
import { AUTH_DIALOG_MODE, type AuthDialogMode } from '../../store/auth-dialog-store';
import { subscribeNavigation } from '../../store/navigation-store';
import {
  SESSION_END_REASON,
  SESSION_STATUS,
  endSession,
  subscribeSession,
  type SessionState,
} from '../../store/session-store';
import { HOME_LINK, MAIN_NAV_ITEMS, syncActiveNavLinks } from '../../utils/nav-items';
import { createButton } from '../button';
import { createUserProfile } from '../user-profile';
import './mobile-nav.scss';

const { login, register } = AUTH_DIALOG_MODE;
const { authenticated } = SESSION_STATUS;
const { logout } = SESSION_END_REASON;

const ACTIVE_LINK_CLASS = 'mobile-nav__link--active';

export interface CreateMobileNavOptions {
  onNavigate?: () => void;
  onAuthRequest?: (mode: AuthDialogMode) => void;
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
  useNavLink(logoLink, HOME_LINK, onNavigate);

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

  for (const item of MAIN_NAV_ITEMS) {
    const listItem = document.createElement('li');
    listItem.className = 'mobile-nav__item';

    const link = document.createElement('a');
    link.className = 'mobile-nav__link';
    link.textContent = item.label;
    useNavLink(link, item, onNavigate);

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
      onAuthRequest?.(login);
    },
  });

  const signUpButton = createButton({
    label: 'Sign Up',
    variant: 'primary',
    size: 'medium',
    className: 'button--menu-auth',
    onClick: () => {
      onAuthRequest?.(register);
    },
  });

  const logOutButton = createButton({
    label: 'Log Out',
    variant: 'secondary',
    size: 'medium',
    className: 'button--ghost-on-dark button--menu-auth',
    onClick: () => {
      onNavigate?.();
      void endSession({ reason: logout });
    },
  });

  const guestActions = [logInButton, signUpButton];

  actions.append(...guestActions);
  panel.append(top, navigation, actions);

  const navLinks = navigation.querySelectorAll<HTMLAnchorElement>('.mobile-nav__link');
  subscribeNavigation((page) => {
    syncActiveNavLinks(navLinks, page, ACTIVE_LINK_CLASS);
  });

  function applySession(session: SessionState): void {
    if (session.status === authenticated) {
      const { email, displayName, avatarUrl } = session;
      actions.replaceChildren(
        createUserProfile({
          email,
          displayName,
          avatarUrl,
          avatarPosition: 'start',
          className: 'user-profile--on-dark',
        }),
        logOutButton,
      );
      return;
    }

    actions.replaceChildren(...guestActions);
  }

  subscribeSession(applySession);

  return panel;
}
