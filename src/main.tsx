import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { configureRouting, detectRouting } from './lib/router';
import './styles/index.css';

configureRouting(detectRouting());

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

/* Offline support: registered only for a real production origin. */
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is a progressive enhancement — never block the app */
    });
  });
}
