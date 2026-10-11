// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';

import { personIcon } from '../../assets/icons';
import { createUserProfile, type CreateUserProfileOptions } from '.';

const EMAIL = 'jane@example.com';
const AVATAR_URL = 'https://lh3.googleusercontent.com/a/jane';

function mount(options: Partial<CreateUserProfileOptions> = {}): HTMLElement {
  const profile = createUserProfile({ email: EMAIL, ...options });
  document.body.append(profile);
  return profile;
}

function nameOf(profile: HTMLElement): string | null | undefined {
  return profile.querySelector('.user-profile__name')?.textContent;
}

function avatarOf(profile: HTMLElement): HTMLElement {
  const avatar = profile.querySelector<HTMLElement>('.user-profile__avatar');
  if (!avatar) {
    throw new Error('missing avatar');
  }
  return avatar;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('name', () => {
  it.each([
    {
      name: 'the trimmed display name',
      displayName: '  Jane Doe  ',
      email: EMAIL,
      shown: 'Jane Doe',
    },
    {
      name: 'the email local part without a display name',
      displayName: undefined,
      email: EMAIL,
      shown: 'jane',
    },
    {
      name: 'the email local part for a blank display name',
      displayName: ' '.repeat(3),
      email: EMAIL,
      shown: 'jane',
    },
    {
      name: 'a generic name when the email has no local part',
      displayName: undefined,
      email: '@example.com',
      shown: 'Player',
    },
  ])('shows $name', ({ displayName, email, shown }) => {
    const profile = mount({ displayName, email });

    expect(nameOf(profile)).toBe(shown);
  });

  it('renders the name as text, never as markup', () => {
    const profile = mount({ displayName: '<img src=x>' });

    expect(profile.querySelector('img[src="x"]')).toBeNull();
    expect(nameOf(profile)).toBe('<img src=x>');
  });
});

describe('avatar', () => {
  it.each([
    { name: 'two words', displayName: 'Jane Doe', initials: 'JD' },
    { name: 'one word', displayName: 'jane', initials: 'J' },
  ])(
    'shows initials for $name and hides the avatar from screen readers',
    ({ displayName, initials }) => {
      const profile = mount({ displayName });
      const avatar = avatarOf(profile);

      expect(avatar.getAttribute('aria-hidden')).toBe('true');
      expect(avatar.querySelector('.user-profile__initials')?.textContent).toBe(initials);
      expect(avatar.querySelector('.user-profile__fallback')).toBeNull();
    },
  );

  it('shows a generic person icon when the name has no letters or digits', () => {
    const profile = mount({ displayName: '***' });
    const fallback = avatarOf(profile).querySelector<HTMLElement>('.user-profile__fallback');

    expect(fallback?.style.maskImage).toBe(`url("${personIcon}")`);
    expect(avatarOf(profile).querySelector('.user-profile__initials')).toBeNull();
  });

  it('adds the profile photo over the initials without sending a referrer', () => {
    const profile = mount({ displayName: 'Jane Doe', avatarUrl: AVATAR_URL });
    const image = avatarOf(profile).querySelector<HTMLImageElement>('.user-profile__image');

    expect(image?.getAttribute('src')).toBe(AVATAR_URL);
    expect(image?.getAttribute('alt')).toBe('');
    expect(image?.referrerPolicy).toBe('no-referrer');
    expect(avatarOf(profile).querySelector('.user-profile__initials')?.textContent).toBe('JD');
  });

  it('drops a photo that fails to load and keeps the initials', () => {
    const profile = mount({ displayName: 'Jane Doe', avatarUrl: AVATAR_URL });

    avatarOf(profile).querySelector('img')?.dispatchEvent(new Event('error'));

    expect(avatarOf(profile).querySelector('img')).toBeNull();
    expect(avatarOf(profile).querySelector('.user-profile__initials')?.textContent).toBe('JD');
  });

  it('has no photo without an avatar URL', () => {
    const profile = mount({ displayName: 'Jane Doe' });

    expect(avatarOf(profile).querySelector('img')).toBeNull();
  });
});

describe('layout', () => {
  it.each([
    {
      name: 'after the name by default',
      avatarPosition: undefined,
      order: ['user-profile__name', 'user-profile__avatar'],
    },
    {
      name: 'after the name for "end"',
      avatarPosition: 'end' as const,
      order: ['user-profile__name', 'user-profile__avatar'],
    },
    {
      name: 'before the name for "start"',
      avatarPosition: 'start' as const,
      order: ['user-profile__avatar', 'user-profile__name'],
    },
  ])('places the avatar $name', ({ avatarPosition, order }) => {
    const profile = mount({ avatarPosition });

    expect([...profile.children].map(({ className }) => className)).toStrictEqual(order);
  });

  it.each([
    {
      name: 'only the block class without a modifier',
      className: undefined,
      expected: 'user-profile',
    },
    {
      name: 'the given modifier after the block class',
      className: 'user-profile--compact',
      expected: 'user-profile user-profile--compact',
    },
  ])('uses $name', ({ className, expected }) => {
    expect(mount({ className }).className).toBe(expected);
  });
});
