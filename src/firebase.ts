import { initializeApp } from 'firebase/app';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};

const rawApiKey = metaEnv.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey;
const apiKey = (rawApiKey && typeof rawApiKey === 'string' && rawApiKey.trim().length > 0)
  ? rawApiKey.trim()
  : 'AIzaSyB_placeholder_key_for_app_init';

const config = {
  apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain || 'systro-app.firebaseapp.com',
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || 'systro-app',
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || 'systro-app.appspot.com',
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId || '1234567890',
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId || '1:1234567890:web:1234567890',
};

// Suppress verbose internal Firestore logs on connection retry
try {
  setLogLevel('silent');
} catch (e) {
  // Ignore if setLogLevel is already initialized
}

const app = initializeApp(config);

// Use initializeFirestore with experimentalForceLongPolling: true to resolve connectivity issues in sandboxed environments and iframe proxies
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, metaEnv.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '(default)');

const auth = getAuth(app);

export { db, auth };
