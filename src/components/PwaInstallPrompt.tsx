import { useEffect, useMemo, useState } from 'react';
import { Download, Smartphone, X, WifiOff } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa-install-dismissed') === 'true');
  const [installed, setInstalled] = useState(isStandalone());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const ios = useMemo(() => isIos(), []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      localStorage.setItem('pwa-install-dismissed', 'true');
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function installApp() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
    }
    setInstallEvent(null);
  }

  function dismiss() {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  }

  return (
    <>
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-[420px] z-[70] rounded-2xl border border-orange-500/30 bg-surface/95 backdrop-blur-xl shadow-2xl p-4 flex items-start gap-3">
          <div className="rounded-xl bg-orange-500/10 p-2 text-orange-400 shrink-0">
            <WifiOff size={20} />
          </div>
          <div className="text-sm">
            <strong className="block text-text-primary">Modo offline ativo</strong>
            <span className="text-text-secondary">A tela principal continua disponível. Novos uploads, login e dados do Firebase precisam de internet.</span>
          </div>
        </div>
      )}

      {!installed && !dismissed && (installEvent || ios) && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-[430px] z-[60] rounded-2xl border border-cyan-400/20 bg-surface/95 backdrop-blur-xl shadow-2xl p-4">
          <div className="flex gap-3">
            <div className="rounded-xl bg-orange-500/10 p-2 text-orange-400 h-fit shrink-0">
              <Smartphone size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-[0.12em]">Instalar PIE NR-10</h3>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    Adicione o aplicativo à tela inicial para abrir em tela cheia, com ícone próprio e carregamento otimizado.
                  </p>
                </div>
                <button onClick={dismiss} className="text-text-tertiary hover:text-text-primary" aria-label="Fechar aviso de instalação">
                  <X size={18} />
                </button>
              </div>

              {installEvent ? (
                <button
                  onClick={installApp}
                  className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-orange-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Instalar aplicativo
                </button>
              ) : (
                <div className="mt-4 rounded-xl border border-border bg-canvas/40 p-3 text-xs text-text-secondary leading-relaxed">
                  No iPhone/iPad: toque em <strong>Compartilhar</strong> no Safari e escolha <strong>Adicionar à Tela de Início</strong>.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
