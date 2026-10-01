import { chatIcon, codeIcon, rsIcon, rssFeedIcon, shareIcon } from '../../assets/icons';
import { APP_PAGE } from '../../utils/app-page';
import type { NavItem } from '../../utils/nav-items';

export const FOOTER_BRAND = {
  name: 'MiniGames',
  tagline:
    'Take a short break and have fun. Hundreds of curated casual mini-games right in your web browser. No download required.',
} as const;

export interface FooterNavColumn {
  readonly title: string;
  readonly links: readonly NavItem[];
}

export const FOOTER_NAV_COLUMNS: readonly FooterNavColumn[] = [
  {
    title: 'Explore',
    links: [
      { label: 'Home', page: APP_PAGE.home },
      { label: 'Library', page: APP_PAGE.library },
      { label: 'Categories' },
      { label: 'Tournaments' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us' },
      { label: 'Contact' },
      { label: 'Privacy Policy' },
      { label: 'Terms of Service' },
    ],
  },
] as const;

export interface FooterSocialLink extends NavItem {
  readonly icon: string;
}

export const FOOTER_COMMUNITY_TITLE = 'Community' as const;

export const FOOTER_SOCIAL_LINKS: readonly FooterSocialLink[] = [
  { label: 'Share', icon: shareIcon },
  { label: 'Chat', icon: chatIcon },
  { label: 'RSS feed', icon: rssFeedIcon },
] as const;

export const FOOTER_COPYRIGHT = '© 2026 MiniGames. All rights reserved.' as const;
export const FOOTER_DESIGNED_WITH_LOVE = 'Designed with love' as const;

export interface FooterCreditLink {
  readonly label: string;
  readonly href: string;
  readonly icon: string;
  readonly external: boolean;
  readonly modifier: 'rs' | 'github';
}

export const FOOTER_CREDITS: readonly FooterCreditLink[] = [
  {
    label: 'RS School',
    href: 'https://rs.school/courses/short-track',
    icon: rsIcon,
    external: true,
    modifier: 'rs',
  },
  {
    label: '@Aghasy8888',
    href: 'https://github.com/Aghasy8888',
    icon: codeIcon,
    external: true,
    modifier: 'github',
  },
] as const;

export const EXTERNAL_LINK_REL = 'noopener noreferrer' as const;
export const EXTERNAL_LINK_TARGET = '_blank' as const;
