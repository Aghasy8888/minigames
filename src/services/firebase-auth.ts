import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

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

/** Throws when the Firebase config is missing from the environment. */
export function getFirebaseAuth(): Auth {
  auth ??= getAuth(initializeApp(readFirebaseConfig()));
  return auth;
}

/** Throws when the Firebase config is missing from the environment. */
export function initFirebaseAuth(): void {
  getFirebaseAuth();
}
