import { initializeApp } from 'firebase/app';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseAppletConfig from '../firebase-applet-config.json';

const getMetaEnv = () => {
  const globalEnv = (typeof window !== 'undefined' && (window as any).ENV) || {};
  const viteEnv = (import.meta as any).env || {};
  
  const merged = { ...viteEnv };
  
  for (const key of Object.keys(globalEnv)) {
    if (globalEnv[key] && typeof globalEnv[key] === 'string' && globalEnv[key].trim().length > 0) {
      merged[key] = globalEnv[key].trim();
    }
  }
  return merged;
};

const metaEnv = getMetaEnv();

const config = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
};

try {
  setLogLevel('silent');
} catch (e) {
  // Ignore if setLogLevel is already initialized
}

const app = initializeApp(config);

const dbId = metaEnv.VITE_FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId || '(default)';

const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, dbId);

const auth = getAuth(app);

export { db, auth };

