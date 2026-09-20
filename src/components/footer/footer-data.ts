import { chatIcon, codeIcon, rsIcon, rssFeedIcon, shareIcon } from '../../assets/icons';
import { HOME_HREF } from '../../utils/home-href';

export const FOOTER_BRAND = {
  name: 'MiniGames',
  tagline:
    'Take a short break and have fun. Hundreds of curated casual mini-games right in your web browser. No download required.',
} as const;

export interface FooterNavLink {
  readonly label: string;
  readonly href: string;
}

export interface FooterNavColumn {
  readonly title: string;
  readonly links: readonly FooterNavLink[];
}

export const FOOTER_NAV_COLUMNS: readonly FooterNavColumn[] = [
  {
    title: 'Explore',
    links: [
      { label: 'Home', href: HOME_HREF },
      { label: 'Library', href: HOME_HREF },
      { label: 'Categories', href: HOME_HREF },
      { label: 'Tournaments', href: HOME_HREF },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: HOME_HREF },
      { label: 'Contact', href: HOME_HREF },
      { label: 'Privacy Policy', href: HOME_HREF },
      { label: 'Terms of Service', href: HOME_HREF },
    ],
  },
] as const;

export interface FooterSocialLink {
  readonly label: string;
  readonly href: string;
  readonly icon: string;
}

export const FOOTER_COMMUNITY_TITLE = 'Community' as const;

export const FOOTER_SOCIAL_LINKS: readonly FooterSocialLink[] = [
  { label: 'Share', href: HOME_HREF, icon: shareIcon },
  { label: 'Chat', href: HOME_HREF, icon: chatIcon },
  { label: 'RSS feed', href: HOME_HREF, icon: rssFeedIcon },
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
