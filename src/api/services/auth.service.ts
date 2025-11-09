import { signInWithPopup, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { UserProfile } from '@api/models';
import { auth, db, googleProvider } from '@lib/firebase';

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user; // FirebaseUser
}

export const ensureUserProfile = async (userAuth: User, overrides: Partial<UserProfile> = {}) => {
  if (!userAuth) return;

  const ref = doc(db, 'users', userAuth.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const payload: UserProfile = {
      displayName: userAuth.displayName,
      email: userAuth.email,
      photoURL: userAuth.photoURL,
      createdAt: new Date(),
      onboardingCompleted: false,
      ...overrides,
    };
    await setDoc(ref, payload);
  }

  return ref;
};
