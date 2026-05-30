import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './components/AuthContext';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import { registerServiceWorker } from './lib/registerServiceWorker';
import App from './App.tsx';
import './index.css';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <PwaInstallPrompt />
    </AuthProvider>
  </StrictMode>,
);

window.requestAnimationFrame(() => {
  const splash = document.getElementById('pwa-splash');
  if (!splash) return;

  setTimeout(() => {
    splash.classList.add('is-hidden');
    setTimeout(() => splash.remove(), 320);
  }, 450);
});
