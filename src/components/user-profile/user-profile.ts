import { getProfileDisplayName } from '../../utils/get-profile-display-name';
import { getProfileInitials } from '../../utils/get-profile-initials';
import './user-profile.scss';

export type UserProfileData = {
  email: string;
  displayName?: string;
  avatarUrl?: string;
};

export type UserProfileAvatarPosition = 'start' | 'end';

export type CreateUserProfileOptions = UserProfileData & {
  avatarPosition?: UserProfileAvatarPosition;
  className?: string;
};

export function createUserProfile({
  email,
  displayName,
  avatarUrl,
  avatarPosition = 'end',
  className,
}: CreateUserProfileOptions): HTMLElement {
  const root = document.createElement('div');
  root.className = ['user-profile', className].filter(Boolean).join(' ');

  const name = getProfileDisplayName({ email, displayName });

  const nameElement = document.createElement('span');
  nameElement.className = 'user-profile__name';
  nameElement.textContent = name;

  const avatar = document.createElement('span');
  avatar.className = 'user-profile__avatar';
  avatar.setAttribute('aria-hidden', 'true');

  const initials = document.createElement('span');
  initials.className = 'user-profile__initials';
  initials.textContent = getProfileInitials(name);
  avatar.append(initials);

  if (avatarUrl) {
    const image = document.createElement('img');
    image.className = 'user-profile__image';
    image.src = avatarUrl;
    image.alt = '';
    image.addEventListener('error', () => {
      image.remove();
    });
    avatar.append(image);
  }

  if (avatarPosition === 'start') {
    root.append(avatar, nameElement);
  } else {
    root.append(nameElement, avatar);
  }

  return root;
}
