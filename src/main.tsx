import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Purge any registered service worker caches on load to ensure live updates reflect instantly
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
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
window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = String(event.reason?.message || event.reason || '');
  if (
    reasonStr.includes('WebSocket') ||
    reasonStr.includes('closed without opened') ||
    reasonStr.includes('Failed to fetch')
  ) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = String(event.message || '');
  if (
    msg.includes('WebSocket') ||
    msg.includes('closed without opened') ||
    msg.includes('Failed to fetch')
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

