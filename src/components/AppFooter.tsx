import { Mail, Phone, Zap } from 'lucide-react';

export default function AppFooter() {
  return (
    <footer className="mt-2 md:mt-4 rounded-2xl border border-border bg-surface/70 px-4 py-4 md:px-6 backdrop-blur-md text-text-secondary shadow-[0_18px_60px_rgba(2,6,23,0.18)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500">
            <Zap className="h-4 w-4" aria-hidden="true" />
          </div>

          <div>
            <p className="font-display text-sm font-semibold text-text-primary md:text-base">
              Desenvolvido por Joelson M. Mendes
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-tertiary">
              Especialista em Energia e IoT
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-xs font-medium text-text-secondary sm:flex-row sm:flex-wrap sm:items-center md:justify-end">
          <a
            href="tel:+5568996055488"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-hover px-3 py-2 transition hover:border-orange-500/50 hover:text-orange-500"
            aria-label="Ligar para Joelson M. Mendes"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            <span>(68) 99605-5488</span>
          </a>

          <a
            href="mailto:jmm.engiot@gmail.com"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-hover px-3 py-2 transition hover:border-orange-500/50 hover:text-orange-500"
            aria-label="Enviar e-mail para Joelson M. Mendes"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            <span>jmm.engiot@gmail.com</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
