import { FirebaseError, initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';

const FIREBASE_ENVIRONMENT_KEYS = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
} as const satisfies Partial<Record<keyof FirebaseOptions, string>>;

const { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId } =
  FIREBASE_ENVIRONMENT_KEYS;

type FirebaseEnvironmentKey =
  (typeof FIREBASE_ENVIRONMENT_KEYS)[keyof typeof FIREBASE_ENVIRONMENT_KEYS];

let auth: Auth | undefined;

function readEnvironmentValue(name: FirebaseEnvironmentKey): string {
  const value: unknown = import.meta.env[name];

  if (typeof value !== 'string' || value === '') {
    throw new Error(`Firebase config is missing: ${name}`);
  }
  return value;
}

function readFirebaseConfig(): FirebaseOptions {
  return {
    apiKey: readEnvironmentValue(apiKey),
    authDomain: readEnvironmentValue(authDomain),
    projectId: readEnvironmentValue(projectId),
    storageBucket: readEnvironmentValue(storageBucket),
    messagingSenderId: readEnvironmentValue(messagingSenderId),
    appId: readEnvironmentValue(appId),
  };
}

export type AuthProfile = {
  email: string;
  displayName?: string;
  avatarUrl?: string;
};

export type RegisterWithEmailOptions = {
  email: string;
  password: string;
  displayName: string;
};

/** Thrown when the user closes or cancels the provider sign-in flow; not a failure. */
export class AuthCancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthCancelledError';
  }
}

const FIREBASE_AUTH_MESSAGES: Readonly<Record<string, string>> = {
  'auth/account-exists-with-different-credential':
    'This email is already linked to another sign-in method. Try logging in with email and password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/operation-not-allowed': 'This sign-in method is not available right now.',
  'auth/popup-blocked':
    'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/unauthorized-domain': 'Google sign-in is not available on this site right now.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/wrong-password': 'Incorrect email or password.',
};

const CANCELLED_AUTH_CODES: ReadonlySet<string> = new Set([
  'auth/cancelled-popup-request',
  'auth/popup-closed-by-user',
  'auth/user-cancelled',
]);

const FALLBACK_AUTH_MESSAGE = 'Could not sign you in. Please try again.';
const CANCELLED_AUTH_MESSAGE = 'Sign-in was canceled.';
const MISSING_EMAIL_MESSAGE = 'Sign-in did not return an email address.';

function toAuthError(error: unknown): Error {
  if (error instanceof FirebaseError) {
    if (CANCELLED_AUTH_CODES.has(error.code)) {
      return new AuthCancelledError(CANCELLED_AUTH_MESSAGE);
    }

    return new Error(FIREBASE_AUTH_MESSAGES[error.code] ?? FALLBACK_AUTH_MESSAGE);
  }

  return new Error(FALLBACK_AUTH_MESSAGE);
}

function toAuthProfile(user: User, fallbackDisplayName?: string): AuthProfile {
  const { email, displayName: profileName, photoURL } = user;

  if (!email) {
    throw new Error(MISSING_EMAIL_MESSAGE);
  }

  const displayName = profileName ?? fallbackDisplayName;
  const avatarUrl = photoURL ?? undefined;

  return {
    email,
    ...(displayName ? { displayName } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
  };
}

/** Throws when the Firebase config is missing from the environment. */
export function getFirebaseAuth(): Auth {
  auth ??= getAuth(initializeApp(readFirebaseConfig()));
  return auth;
}

/** Throws when the Firebase config is missing from the environment. */
export function initFirebaseAuth(): void {
  getFirebaseAuth();
}

export async function signInWithEmail(email: string, password: string): Promise<AuthProfile> {
  try {
    const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    return toAuthProfile(user);
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function registerWithEmail({
  email,
  password,
  displayName,
}: RegisterWithEmailOptions): Promise<AuthProfile> {
  try {
    const { user } = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);

    try {
      await updateProfile(user, { displayName });
    } catch {
      return toAuthProfile(user, displayName);
    }

    return toAuthProfile(user, displayName);
  } catch (error) {
    throw toAuthError(error);
  }
}

/** Must be called straight from a click handler, before any other await, or the popup is blocked. */
export async function signInWithGoogle(): Promise<AuthProfile> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const { user } = await signInWithPopup(getFirebaseAuth(), provider);
    return toAuthProfile(user);
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(getFirebaseAuth());
  } catch (error) {
    throw toAuthError(error);
  }
}
