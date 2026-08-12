import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register the PWA service worker and ensure auto-updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('Service Worker registered successfully:', registration.scope);
      
      // Check for updates on every page load
      registration.update();
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New update available, wait for it to activate
              console.log('New update available. Service worker is installing...');
            }
          };
        }
      };
    }).catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
  });

  // Automatically refresh the page when the new service worker takes control (via skipWaiting)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
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

