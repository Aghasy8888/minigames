import { logoImage } from '../../assets/images';
import { navigate } from '../../store/navigation-store';
import { HOME_HREF } from '../../utils/home-href';
import { pageForAppHref } from '../../utils/nav-target';
import {
  EXTERNAL_LINK_REL,
  EXTERNAL_LINK_TARGET,
  FOOTER_BRAND,
  FOOTER_COMMUNITY_TITLE,
  FOOTER_COPYRIGHT,
  FOOTER_CREDITS,
  FOOTER_DESIGNED_WITH_LOVE,
  FOOTER_NAV_COLUMNS,
  FOOTER_SOCIAL_LINKS,
  type FooterCreditLink,
  type FooterNavColumn,
  type FooterSocialLink,
} from './footer-data';
import './footer.scss';

function bindSpaNavigation(link: HTMLAnchorElement, href: string): void {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    navigate(pageForAppHref(href));
  });
}

function createBrand(): HTMLElement {
  const brand = document.createElement('div');
  brand.className = 'footer__brand';

  const logoLink = document.createElement('a');
  logoLink.className = 'footer__logo';
  logoLink.href = HOME_HREF;
  bindSpaNavigation(logoLink, HOME_HREF);

  const logoMark = document.createElement('img');
  logoMark.className = 'footer__logo-mark';
  logoMark.src = logoImage;
  logoMark.alt = '';
  logoMark.width = 32;
  logoMark.height = 32;

  const logoText = document.createElement('span');
  logoText.className = 'footer__logo-text';
  logoText.textContent = FOOTER_BRAND.name;

  logoLink.append(logoMark, logoText);

  const tagline = document.createElement('p');
  tagline.className = 'footer__tagline';
  tagline.textContent = FOOTER_BRAND.tagline;

  brand.append(logoLink, tagline);
  return brand;
}

function createNavColumn(column: FooterNavColumn): HTMLElement {
  const columnElement = document.createElement('div');
  columnElement.className = 'footer__column';

  const title = document.createElement('h3');
  title.className = 'footer__column-title';
  title.textContent = column.title;

  const list = document.createElement('ul');
  list.className = 'footer__link-list';

  for (const item of column.links) {
    const listItem = document.createElement('li');
    listItem.className = 'footer__link-item';

    const link = document.createElement('a');
    link.className = 'footer__link';
    link.href = item.href;
    link.textContent = item.label;
    bindSpaNavigation(link, item.href);

    listItem.append(link);
    list.append(listItem);
  }

  columnElement.append(title, list);
  return columnElement;
}

function createSocialLink(social: FooterSocialLink): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = 'footer__social';
  link.href = social.href;
  link.setAttribute('aria-label', social.label);
  bindSpaNavigation(link, social.href);

  const icon = document.createElement('img');
  icon.className = 'footer__social-icon';
  icon.src = social.icon;
  icon.alt = '';
  icon.width = 16;
  icon.height = 16;

  link.append(icon);
  return link;
}

function createCommunityColumn(): HTMLElement {
  const column = document.createElement('div');
  column.className = 'footer__column footer__column--community';

  const title = document.createElement('h3');
  title.className = 'footer__column-title';
  title.textContent = FOOTER_COMMUNITY_TITLE;

  const socials = document.createElement('div');
  socials.className = 'footer__socials';

  for (const social of FOOTER_SOCIAL_LINKS) {
    socials.append(createSocialLink(social));
  }

  column.append(title, socials);
  return column;
}

function createColumns(): HTMLElement {
  const columns = document.createElement('div');
  columns.className = 'footer__columns';

  for (const column of FOOTER_NAV_COLUMNS) {
    columns.append(createNavColumn(column));
  }

  columns.append(createCommunityColumn());
  return columns;
}

function createCreditLink(credit: FooterCreditLink): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = `footer__credit footer__credit--${credit.modifier}`;
  link.href = credit.href;

  if (credit.external) {
    link.target = EXTERNAL_LINK_TARGET;
    link.rel = EXTERNAL_LINK_REL;
  }

  const iconFrame = document.createElement('span');
  iconFrame.className = 'footer__credit-icon';
  iconFrame.setAttribute('aria-hidden', 'true');

  const icon = document.createElement('img');
  icon.className = 'footer__credit-icon-img';
  icon.src = credit.icon;
  icon.alt = '';
  icon.width = 14;
  icon.height = 14;

  iconFrame.append(icon);

  const label = document.createElement('span');
  label.className = 'footer__credit-label';
  label.textContent = credit.label;

  link.append(iconFrame, label);
  return link;
}

function createBottom(): HTMLElement {
  const bottom = document.createElement('div');
  bottom.className = 'footer__bottom';

  const copyright = document.createElement('p');
  copyright.className = 'footer__copyright';
  copyright.textContent = FOOTER_COPYRIGHT;

  const credits = document.createElement('div');
  credits.className = 'footer__credits';

  for (const credit of FOOTER_CREDITS) {
    credits.append(createCreditLink(credit));
  }

  const designed = document.createElement('p');
  designed.className = 'footer__designed';
  designed.textContent = FOOTER_DESIGNED_WITH_LOVE;

  bottom.append(copyright, credits, designed);
  return bottom;
}

export function createFooter(): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'footer';

  const inner = document.createElement('div');
  inner.className = 'footer__inner';

  const top = document.createElement('div');
  top.className = 'footer__top';
  top.append(createBrand(), createColumns());

  inner.append(top, createBottom());
  footer.append(inner);
  return footer;
}
