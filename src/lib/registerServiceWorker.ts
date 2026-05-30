export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.info('Service Worker registrado:', registration.scope);
      })
      .catch(error => {
        console.warn('Não foi possível registrar o Service Worker:', error);
      });
  });
}
