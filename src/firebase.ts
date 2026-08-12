import { initializeApp } from 'firebase/app';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
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

const rawConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: metaEnv.VITE_FIREBASE_APP_ID,
};

// Safe default/placeholder values to prevent SDK initialization from throwing when API key or config is empty
const config = {
  apiKey: rawConfig.apiKey && rawConfig.apiKey.trim() !== '' ? rawConfig.apiKey : 'AIzaSyPlaceholderKeyToPreventStartupCrash123',
  authDomain: rawConfig.authDomain && rawConfig.authDomain.trim() !== '' ? rawConfig.authDomain : 'placeholder-project-id.firebaseapp.com',
  projectId: rawConfig.projectId && rawConfig.projectId.trim() !== '' ? rawConfig.projectId : 'placeholder-project-id',
  storageBucket: rawConfig.storageBucket && rawConfig.storageBucket.trim() !== '' ? rawConfig.storageBucket : 'placeholder-project-id.appspot.com',
  messagingSenderId: rawConfig.messagingSenderId && rawConfig.messagingSenderId.trim() !== '' ? rawConfig.messagingSenderId : '123456789012',
  appId: rawConfig.appId && rawConfig.appId.trim() !== '' ? rawConfig.appId : '1:123456789012:web:abcdef1234567890',
};

try {
  setLogLevel('silent');
} catch (e) {
  // Ignore if setLogLevel is already initialized
}

let app: any;
let db: any;
let auth: any;

try {
  app = initializeApp(config);
  const dbId = metaEnv.VITE_FIREBASE_DATABASE_ID || '(default)';
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true
  }, dbId);
  auth = getAuth(app);
} catch (error) {
  console.error("Firebase startup initialization failed, fallback mock active:", error);
  app = {};
  db = new Proxy({}, {
    get: () => () => {
      return {
        id: 'dummy',
        onSnapshot: () => () => {},
        subscribe: () => () => {},
      };
    }
  });
  auth = new Proxy({
    currentUser: null,
    app: { options: { apiKey: '' } }
  }, {
    get: (target, prop) => {
      if (prop in target) return (target as any)[prop];
      return () => Promise.resolve({});
    }
  });
}

export { db, auth };

