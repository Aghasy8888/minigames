import { beforeEach, describe, expect, it, vi } from 'vitest';

const FAKE_APP = { name: 'fake-app' };
const FAKE_AUTH = { name: 'fake-auth' };

const firebase = vi.hoisted(() => {
  class FakeFirebaseError extends Error {
    readonly code: string;

    constructor(code: string) {
      super(`Firebase: Error (${code}).`);
      this.name = 'FirebaseError';
      this.code = code;
    }
  }

  return {
    FakeFirebaseError,
    initializeApp: vi.fn(),
    getAuth: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    updateProfile: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
    setCustomParameters: vi.fn(),
  };
});

vi.mock('firebase/app', () => ({
  FirebaseError: firebase.FakeFirebaseError,
  initializeApp: firebase.initializeApp,
}));

vi.mock('firebase/auth', () => ({
  getAuth: firebase.getAuth,
  signInWithEmailAndPassword: firebase.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: firebase.createUserWithEmailAndPassword,
  updateProfile: firebase.updateProfile,
  signInWithPopup: firebase.signInWithPopup,
  signOut: firebase.signOut,
  GoogleAuthProvider: class {
    setCustomParameters = firebase.setCustomParameters;
  },
}));

const FIREBASE_ENV = {
  VITE_FIREBASE_API_KEY: 'api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'minigames.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'minigames',
  VITE_FIREBASE_STORAGE_BUCKET: 'minigames.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '1234',
  VITE_FIREBASE_APP_ID: 'app-id',
};

const EMAIL = 'student@rs.school';
const PASSWORD = 'Abc12!';

type FakeUser = { email?: string; displayName?: string; photoURL?: string };

function credential(user: FakeUser): { user: FakeUser } {
  return { user };
}

let firebaseAuth: typeof import('./firebase-auth');

beforeEach(async () => {
  for (const [name, value] of Object.entries(FIREBASE_ENV)) {
    vi.stubEnv(name, value);
  }

  firebase.initializeApp.mockReset().mockReturnValue(FAKE_APP);
  firebase.getAuth.mockReset().mockReturnValue(FAKE_AUTH);
  for (const mock of [
    firebase.signInWithEmailAndPassword,
    firebase.createUserWithEmailAndPassword,
    firebase.updateProfile,
    firebase.signInWithPopup,
    firebase.signOut,
    firebase.setCustomParameters,
  ]) {
    mock.mockReset();
  }

  // The Firebase Auth instance is cached in module state; a fresh module starts uninitialized.
  vi.resetModules();
  firebaseAuth = await import('./firebase-auth');
});

describe('getFirebaseAuth', () => {
  it('initializes Firebase from the VITE_FIREBASE_* variables', () => {
    expect(firebaseAuth.getFirebaseAuth()).toBe(FAKE_AUTH);

    expect(firebase.initializeApp).toHaveBeenCalledWith({
      apiKey: 'api-key',
      authDomain: 'minigames.firebaseapp.com',
      projectId: 'minigames',
      storageBucket: 'minigames.appspot.com',
      messagingSenderId: '1234',
      appId: 'app-id',
    });
    expect(firebase.getAuth).toHaveBeenCalledWith(FAKE_APP);
  });

  it('initializes only once', () => {
    firebaseAuth.getFirebaseAuth();
    firebaseAuth.initFirebaseAuth();

    expect(firebase.initializeApp).toHaveBeenCalledTimes(1);
  });

  it.each(Object.keys(FIREBASE_ENV))('throws, naming %s, when it is empty', (name) => {
    vi.stubEnv(name, '');

    expect(() => firebaseAuth.initFirebaseAuth()).toThrow(`Firebase config is missing: ${name}`);
    expect(firebase.initializeApp).not.toHaveBeenCalled();
  });
});

describe('signInWithEmail', () => {
  it('signs in with the email and password and returns the full profile', async () => {
    firebase.signInWithEmailAndPassword.mockResolvedValue(
      credential({ email: EMAIL, displayName: 'Jane Doe', photoURL: 'https://img/jane.png' }),
    );

    await expect(firebaseAuth.signInWithEmail(EMAIL, PASSWORD)).resolves.toStrictEqual({
      email: EMAIL,
      displayName: 'Jane Doe',
      avatarUrl: 'https://img/jane.png',
    });
    expect(firebase.signInWithEmailAndPassword).toHaveBeenCalledWith(FAKE_AUTH, EMAIL, PASSWORD);
  });

  it('leaves out displayName and avatarUrl when the account has none', async () => {
    firebase.signInWithEmailAndPassword.mockResolvedValue(credential({ email: EMAIL }));

    await expect(firebaseAuth.signInWithEmail(EMAIL, PASSWORD)).resolves.toStrictEqual({
      email: EMAIL,
    });
  });

  it('rejects with a readable message when the account has no email', async () => {
    firebase.signInWithEmailAndPassword.mockResolvedValue(credential({ displayName: 'Jane' }));

    await expect(firebaseAuth.signInWithEmail(EMAIL, PASSWORD)).rejects.toThrow(
      'Could not sign you in. Please try again.',
    );
  });

  it.each([
    { code: 'auth/invalid-credential', message: 'Incorrect email or password.' },
    { code: 'auth/user-not-found', message: 'Incorrect email or password.' },
    { code: 'auth/wrong-password', message: 'Incorrect email or password.' },
    { code: 'auth/invalid-email', message: 'Enter a valid email address.' },
    { code: 'auth/user-disabled', message: 'This account has been disabled.' },
    {
      code: 'auth/too-many-requests',
      message: 'Too many attempts. Please wait a moment and try again.',
    },
    {
      code: 'auth/network-request-failed',
      message: 'Network error. Check your connection and try again.',
    },
    { code: 'auth/internal-error', message: 'Could not sign you in. Please try again.' },
  ])('maps $code to readable copy without the raw code', async ({ code, message }) => {
    firebase.signInWithEmailAndPassword.mockRejectedValue(new firebase.FakeFirebaseError(code));

    const pending = firebaseAuth.signInWithEmail(EMAIL, PASSWORD);

    await expect(pending).rejects.toThrow(message);
    await expect(pending).rejects.not.toThrow(/auth\//);
  });

  it('uses the generic message for an error that is not from Firebase', async () => {
    firebase.signInWithEmailAndPassword.mockRejectedValue(new TypeError('x is undefined'));

    await expect(firebaseAuth.signInWithEmail(EMAIL, PASSWORD)).rejects.toThrow(
      'Could not sign you in. Please try again.',
    );
  });
});

describe('registerWithEmail', () => {
  const registration = { email: EMAIL, password: PASSWORD, displayName: 'Alex2026' };

  it('creates the account, saves the username, and returns it in the profile', async () => {
    const user: FakeUser = { email: EMAIL };
    firebase.createUserWithEmailAndPassword.mockResolvedValue(credential(user));
    firebase.updateProfile.mockReturnValue(Promise.resolve());

    await expect(firebaseAuth.registerWithEmail(registration)).resolves.toStrictEqual({
      email: EMAIL,
      displayName: 'Alex2026',
    });
    expect(firebase.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      FAKE_AUTH,
      EMAIL,
      PASSWORD,
    );
    expect(firebase.updateProfile).toHaveBeenCalledWith(user, { displayName: 'Alex2026' });
  });

  it('still returns the profile when saving the username fails', async () => {
    firebase.createUserWithEmailAndPassword.mockResolvedValue(credential({ email: EMAIL }));
    firebase.updateProfile.mockRejectedValue(
      new firebase.FakeFirebaseError('auth/network-request-failed'),
    );

    await expect(firebaseAuth.registerWithEmail(registration)).resolves.toStrictEqual({
      email: EMAIL,
      displayName: 'Alex2026',
    });
  });

  it.each([
    { code: 'auth/email-already-in-use', message: 'An account with this email already exists.' },
    { code: 'auth/weak-password', message: 'Password is too weak. Use at least 6 characters.' },
    {
      code: 'auth/operation-not-allowed',
      message: 'This sign-in method is not available right now.',
    },
  ])('maps $code and never saves a username', async ({ code, message }) => {
    firebase.createUserWithEmailAndPassword.mockRejectedValue(new firebase.FakeFirebaseError(code));

    await expect(firebaseAuth.registerWithEmail(registration)).rejects.toThrow(message);
    expect(firebase.updateProfile).not.toHaveBeenCalled();
  });
});

describe('signInWithGoogle', () => {
  it('opens the account chooser popup and returns the profile with the avatar', async () => {
    firebase.signInWithPopup.mockResolvedValue(
      credential({ email: EMAIL, displayName: 'Jane Doe', photoURL: 'https://img/jane.png' }),
    );

    await expect(firebaseAuth.signInWithGoogle()).resolves.toStrictEqual({
      email: EMAIL,
      displayName: 'Jane Doe',
      avatarUrl: 'https://img/jane.png',
    });
    expect(firebase.setCustomParameters).toHaveBeenCalledWith({ prompt: 'select_account' });
    expect(firebase.signInWithPopup).toHaveBeenCalledWith(
      FAKE_AUTH,
      expect.objectContaining({ setCustomParameters: firebase.setCustomParameters }),
    );
  });

  it.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'])(
    'reports %s as a cancellation, not a failure',
    async (code) => {
      firebase.signInWithPopup.mockRejectedValue(new firebase.FakeFirebaseError(code));

      const pending = firebaseAuth.signInWithGoogle();

      await expect(pending).rejects.toBeInstanceOf(firebaseAuth.AuthCancelledError);
      await expect(pending).rejects.toMatchObject({
        name: 'AuthCancelledError',
        message: 'Sign-in was canceled.',
      });
    },
  );

  it.each([
    {
      code: 'auth/popup-blocked',
      message:
        'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.',
    },
    {
      code: 'auth/account-exists-with-different-credential',
      message:
        'This email is already linked to another sign-in method. Try logging in with email and password.',
    },
    {
      code: 'auth/unauthorized-domain',
      message: 'Google sign-in is not available on this site right now.',
    },
  ])('maps $code to a failure, not a cancellation', async ({ code, message }) => {
    firebase.signInWithPopup.mockRejectedValue(new firebase.FakeFirebaseError(code));

    const pending = firebaseAuth.signInWithGoogle();

    await expect(pending).rejects.toThrow(message);
    await expect(pending).rejects.not.toBeInstanceOf(firebaseAuth.AuthCancelledError);
  });
});

describe('signOutFirebase', () => {
  it('signs out of the initialized Firebase Auth', async () => {
    firebase.signOut.mockReturnValue(Promise.resolve());

    await firebaseAuth.signOutFirebase();

    expect(firebase.signOut).toHaveBeenCalledWith(FAKE_AUTH);
  });

  it('rejects with readable copy when sign-out fails', async () => {
    firebase.signOut.mockRejectedValue(
      new firebase.FakeFirebaseError('auth/network-request-failed'),
    );

    await expect(firebaseAuth.signOutFirebase()).rejects.toThrow(
      'Network error. Check your connection and try again.',
    );
  });
});
