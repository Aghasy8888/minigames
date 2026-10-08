const FALLBACK_PROFILE_NAME = 'Player';

export type ProfileNameSource = {
  displayName?: string;
  email: string;
};

export function getProfileDisplayName({ displayName, email }: ProfileNameSource): string {
  const trimmedName = displayName?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const localPart = email.split('@', 2)[0];

  if (localPart) {
    return localPart;
  }

  return FALLBACK_PROFILE_NAME;
}
