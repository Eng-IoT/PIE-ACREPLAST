import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Download, Eye, FileText, Lock, ShieldCheck } from 'lucide-react';
import { db } from '../lib/firebase';

type AccessData = {
  token?: string;
  fiscalName?: string;
  fiscalEmail?: string;
  organization?: string;
  purpose?: string;
  expiresAt?: string;
  status?: 'ativo' | 'expirado' | 'revogado';
  createdByEmail?: string;
  createdAt?: { toDate?: () => Date } | Date | string | null;
};

type PublicItem = {
  id: string;
  title?: string;
  category?: string;
  status?: string;
  summary?: string;
  fileUrl?: string;
  pdfUrl?: string;
  validationUrl?: string;
  sourceCollection?: string;
};

function isExpired(expiresAt?: string) {
  if (!expiresAt) return false;
  const date = new Date(expiresAt);
  date.setHours(23, 59, 59, 999);
  return date.getTime() < Date.now();
}

function statusClass(status?: string) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('venc') || normalized.includes('atras') || normalized.includes('crit')) return 'border-red-500/40 text-red-400 bg-red-950/10';
  if (normalized.includes('pend') || normalized.includes('aguard') || normalized.includes('aberto')) return 'border-amber-500/40 text-amber-400 bg-amber-950/10';
  if (normalized.includes('concl') || normalized.includes('ativo') || normalized.includes('conforme') || normalized.includes('assinado')) return 'border-emerald-500/40 text-emerald-400 bg-emerald-950/10';
  return 'border-border text-text-tertiary bg-surface-hover';
}

export default function FiscalizacaoPublica() {
  const { token } = useParams();
  const [access, setAccess] = useState<AccessData | null>(null);
  const [items, setItems] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    let unsubscribeItems: (() => void) | undefined;

    async function loadAccess() {
      try {
        setLoading(true);
        const accessRef = doc(db, 'inspectionAccess', token || '');
        const accessSnap = await getDoc(accessRef);
        if (!accessSnap.exists()) {
          setError('Acesso fiscal não encontrado.');
          return;
        }

        const data = accessSnap.data() as AccessData;
        setAccess(data);

        if (data.status !== 'ativo' || isExpired(data.expiresAt)) {
          setError('Este acesso está expirado ou revogado.');
          return;
        }

        await addDoc(collection(db, 'inspectionAccess', token || '', 'logs'), {
          event: 'access_opened',
          userAgent: navigator.userAgent,
          language: navigator.language,
          createdAt: serverTimestamp(),
        });

        unsubscribeItems = onSnapshot(collection(db, 'inspectionAccess', token || '', 'publicItems'), (snapshot) => {
          setItems(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PublicItem)));
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível abrir o acesso fiscal.');
      } finally {
        setLoading(false);
      }
    }

    loadAccess();
    return () => unsubscribeItems?.();
  }, [token]);

  const categories = useMemo(() => {
    const grouped = new Map<string, PublicItem[]>();
    items.forEach(item => {
      const category = item.category || 'Documentos';
      grouped.set(category, [...(grouped.get(category) || []), item]);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  if (loading) {
    return <PublicShell><div className="rounded-3xl border border-border bg-surface p-8 text-center text-text-secondary">Carregando acesso fiscal...</div></PublicShell>;
  }

  if (error) {
    return (
      <PublicShell>
        <div className="rounded-3xl border border-red-500/30 bg-red-950/10 p-8 text-center">
          <AlertTriangle className="mx-auto text-red-400 mb-3" size={38} />
          <h1 className="text-xl font-display font-bold text-text-primary">Acesso indisponível</h1>
          <p className="text-sm text-text-secondary mt-2">{error}</p>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <section className="rounded-3xl border border-border bg-surface/90 p-5 md:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-cyan-400 font-bold mb-3">
              <ShieldCheck size={16} /> Modo Fiscalização
            </div>
            <h1 className="text-2xl md:text-4xl font-display font-bold text-text-primary">PIE ACREPLAST NR-10</h1>
            <p className="text-sm text-text-secondary mt-3 max-w-3xl leading-relaxed">
              Ambiente público controlado, temporário e somente leitura para consulta documental, evidências, laudos e plano de ação.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-canvas/40 p-4 text-sm text-text-secondary min-w-[240px]">
            <p><strong className="text-text-primary">Usuário:</strong> {access?.fiscalName || 'Fiscal/Auditor'}</p>
            <p><strong className="text-text-primary">Órgão:</strong> {access?.organization || '-'}</p>
            <p><strong className="text-text-primary">Validade:</strong> {access?.expiresAt || '-'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface/90 p-5 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="text-orange-400" />
          <div>
            <h2 className="text-xl font-display font-bold text-text-primary">Pacote documental de fiscalização</h2>
            <p className="text-xs text-text-secondary">Visualização somente leitura. Alterações, exclusões e assinaturas estão bloqueadas.</p>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-text-secondary">Nenhum item foi disponibilizado neste acesso.</div>
        ) : (
          <div className="space-y-8">
            {categories.map(([category, categoryItems]) => (
              <div key={category}>
                <h3 className="text-[11px] uppercase tracking-[0.24em] text-orange-400 font-bold mb-4">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {categoryItems.map(item => (
                    <article key={item.id} className="rounded-2xl border border-border bg-canvas/40 p-4 flex flex-col min-h-[210px]">
                      <div className="flex items-start justify-between gap-3">
                        <FileText className="text-cyan-400 shrink-0" />
                        <span className={`text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${statusClass(item.status)}`}>{item.status || 'disponível'}</span>
                      </div>
                      <h4 className="font-bold text-text-primary mt-4 leading-snug">{item.title || 'Documento'}</h4>
                      <p className="text-xs text-text-secondary mt-2 line-clamp-4 flex-1">{item.summary || 'Documento disponibilizado para consulta em modo fiscalização.'}</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {(item.fileUrl || item.pdfUrl) && (
                          <a href={item.fileUrl || item.pdfUrl} target="_blank" rel="noreferrer" onClick={() => {
                            if (token) {
                              addDoc(collection(db, 'inspectionAccess', token, 'logs'), {
                                event: 'document_opened',
                                title: item.title || null,
                                category: item.category || null,
                                createdAt: serverTimestamp(),
                              }).catch(() => undefined);
                            }
                          }} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white">
                            <Download size={14} /> Abrir
                          </a>
                        )}
                        {item.validationUrl && <a href={item.validationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"><Eye size={14} /> Validar</a>}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-text-primary p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {children}
        <footer className="text-center text-[11px] text-text-tertiary py-6 uppercase tracking-[0.18em]">PIE ACREPLAST • Acesso fiscal somente leitura</footer>
      </div>
    </div>
  );
}
