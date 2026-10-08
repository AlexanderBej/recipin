import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { imageHandler, references } from '../lib/restaurant-images';

function admin() {
  const existing = getApps().find((app) => app.name === 'food-hub-images');
  if (existing) return existing;
  const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '{}');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || credentials.project_id !== projectId)
    throw new Error('Missing server Firebase configuration.');
  return initializeApp({ credential: cert(credentials), projectId }, 'food-hub-images');
}

export default imageHandler({
  verifyToken: (token) => getAuth(admin()).verifyIdToken(token, true),
  restaurant: async (id) => {
    const snapshot = await getFirestore(admin()).collection('restaurants').doc(id).get();
    return snapshot.exists ? snapshot.data()! : null;
  },
  referenced: async (fileId, url) => {
    const snapshot = await getFirestore(admin()).collection('restaurants').get();
    return snapshot.docs.some((item) => references(item.data(), fileId, url));
  },
  fetch: (...args) => fetch(...args),
  privateKey: () => process.env.IMAGEKIT_PRIVATE_KEY ?? '',
});
