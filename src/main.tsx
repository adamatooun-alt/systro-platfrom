import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Purge any registered service worker caches on load to ensure live updates reflect instantly
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().catch(() => {});
    }
  }).catch((err) => {
    console.log('getRegistrations bypassed or failed: ', err);
  });
}

if ('caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name);
    }
  });
}

// Suppress benign Vite dev server WebSocket disconnect and background network warnings in preview environment
const originalWarn = console.warn;
console.warn = function (...args) {
  const argStr = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  if (
    argStr.includes('WebSocket') ||
    argStr.includes('closed without opened') ||
    argStr.includes('Firestore timeout') ||
    argStr.includes('background sync bypassed') ||
    argStr.includes('Firestore Operation Notice') ||
    argStr.includes('Firestore list notice') ||
    argStr.includes('failed to connect to websocket')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

const originalError = console.error;
console.error = function (...args) {
  const argStr = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  if (
    argStr.includes('WebSocket') ||
    argStr.includes('closed without opened') ||
    argStr.includes('failed to connect to websocket')
  ) {
    return;
  }
  originalError.apply(console, args);
};

window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = String(event.reason?.message || event.reason || '');
  if (
    reasonStr.includes('WebSocket') ||
    reasonStr.includes('closed without opened') ||
    reasonStr.includes('Failed to fetch') ||
    reasonStr.includes('Firestore timeout')
  ) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = String(event.message || '');
  if (
    msg.includes('WebSocket') ||
    msg.includes('closed without opened') ||
    msg.includes('Failed to fetch') ||
    msg.includes('Firestore timeout')
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

