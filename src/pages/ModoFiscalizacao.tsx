import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  FileSearch,
  Link2,
  Lock,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  UserCheck,
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

type AccessStatus = 'ativo' | 'expirado' | 'revogado';

type InspectionAccess = {
  id: string;
  token?: string;
  fiscalName?: string;
  fiscalEmail?: string;
  organization?: string;
  purpose?: string;
  expiresAt?: string;
  status?: AccessStatus;
  publicUrl?: string;
  createdAt?: { toDate?: () => Date } | Date | string | null;
};

type PublicItem = {
  title: string;
  category: string;
  sourceCollection: string;
  sourceId: string;
  status?: string;
  summary?: string;

  // Campos padrão usados pela tela pública de fiscalização
  fileUrl?: string;
  fileName?: string;
  pdfUrl?: string;
  validationUrl?: string;

  // Campos alternativos para manter compatibilidade entre módulos diferentes
  arquivoUrl?: string;
  anexoUrl?: string;
  documentUrl?: string;
  reportUrl?: string;
  relatorioUrl?: string;
  relatorioMedicaoUrl?: string;
  measurementReportUrl?: string;
  measurementFileUrl?: string;
  downloadUrl?: string;
  storageUrl?: string;
  url?: string;
};

const PUBLIC_COLLECTIONS = [
  { name: 'nr10Documents', category: 'Documentos NR-10', limit: 30 },
  { name: 'documents', category: 'Prontuário Técnico', limit: 30 },
  { name: 'smartDocuments', category: 'Documentos Inteligentes', limit: 40 },
  { name: 'electricalTestReports', category: 'Ensaios Elétricos', limit: 20 },
  { name: 'spdaReports', category: 'SPDA e Aterramento', limit: 20 },
  { name: 'nr12Reports', category: 'Laudos NR-12', limit: 20 },
  { name: 'trt-art', category: 'TRT / ART', limit: 20 },
  { name: 'actionPlan', category: 'Plano de Ação', limit: 50 },
  { name: 'workers', category: 'Trabalhadores Autorizados', limit: 50 },
  { name: 'ppeTools', category: 'EPI/EPC/Ferramental', limit: 30 },
  { name: 'procedures', category: 'Procedimentos NR-10', limit: 30 },
];

function normalize(value: unknown) {
  return String(value || '').trim();
}

function getTitle(data: Record<string, unknown>, fallback: string) {
  return normalize(data.title)
    || normalize(data.titulo)
    || normalize(data.name)
    || normalize(data.nome)
    || normalize(data.templateTitle)
    || fallback;
}

function getSummary(data: Record<string, unknown>) {
  return normalize(data.description)
    || normalize(data.descricao)
    || normalize(data.observacoes)
    || normalize(data.summary)
    || normalize(data.message)
    || normalize(data.condicao)
    || normalize(data.recomendacao)
    || normalize(data.responsible)
    || normalize(data.responsavelTecnico)
    || normalize(data.responsavel)
    || '';
}

function getNestedString(data: Record<string, unknown>, path: string) {
  const parts = path.split('.');
  let current: unknown = data;

  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) return '';
    current = (current as Record<string, unknown>)[part];
  }

  return normalize(current);
}

function getFirstUrlFromArray(value: unknown) {
  if (!Array.isArray(value)) return '';

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const url = normalize(record.fileUrl)
      || normalize(record.url)
      || normalize(record.downloadUrl)
      || normalize(record.pdfUrl)
      || normalize(record.arquivoUrl)
      || normalize(record.anexoUrl)
      || normalize(record.relatorioUrl)
      || normalize(record.relatorioMedicaoUrl);

    if (url) return url;
  }

  return '';
}

function getFirstNameFromArray(value: unknown) {
  if (!Array.isArray(value)) return '';

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const name = normalize(record.fileName)
      || normalize(record.name)
      || normalize(record.nome)
      || normalize(record.arquivoNome)
      || normalize(record.anexoNome)
      || normalize(record.relatorioNome);

    if (name) return name;
  }

  return '';
}

function getFileUrl(data: Record<string, unknown>) {
  return normalize(data.fileUrl)
    || normalize(data.pdfUrl)
    || normalize(data.url)
    || normalize(data.arquivoUrl)
    || normalize(data.anexoUrl)
    || normalize(data.documentUrl)
    || normalize(data.reportUrl)
    || normalize(data.relatorioUrl)
    || normalize(data.relatorioMedicaoUrl)
    || normalize(data.measurementReportUrl)
    || normalize(data.measurementFileUrl)
    || normalize(data.downloadUrl)
    || normalize(data.storageUrl)
    || getNestedString(data, 'pdf.url')
    || getNestedString(data, 'pdf.fileUrl')
    || getNestedString(data, 'finalPdf.url')
    || getNestedString(data, 'finalPdf.fileUrl')
    || getNestedString(data, 'arquivo.url')
    || getNestedString(data, 'anexo.url')
    || getFirstUrlFromArray(data.attachments)
    || getFirstUrlFromArray(data.anexos)
    || getFirstUrlFromArray(data.files)
    || getFirstUrlFromArray(data.evidencias)
    || '';
}

function getFileName(data: Record<string, unknown>) {
  return normalize(data.fileName)
    || normalize(data.pdfName)
    || normalize(data.arquivoNome)
    || normalize(data.anexoNome)
    || normalize(data.documentName)
    || normalize(data.reportName)
    || normalize(data.relatorioNome)
    || normalize(data.relatorioMedicaoNome)
    || normalize(data.measurementReportName)
    || normalize(data.measurementFileName)
    || getNestedString(data, 'pdf.name')
    || getNestedString(data, 'pdf.fileName')
    || getNestedString(data, 'finalPdf.name')
    || getNestedString(data, 'finalPdf.fileName')
    || getNestedString(data, 'arquivo.name')
    || getNestedString(data, 'anexo.name')
    || getFirstNameFromArray(data.attachments)
    || getFirstNameFromArray(data.anexos)
    || getFirstNameFromArray(data.files)
    || getFirstNameFromArray(data.evidencias)
    || '';
}

function getStatus(data: Record<string, unknown>) {
  return normalize(data.status)
    || normalize(data.situacao)
    || normalize(data.state)
    || normalize(data.resultado)
    || 'disponível';
}

function getValidationUrl(data: Record<string, unknown>) {
  return normalize(data.validationUrl)
    || normalize(data.validacaoUrl)
    || normalize(data.qrValidationUrl)
    || normalize(data.publicValidationUrl)
    || '';
}

function buildPublicItem(config: { name: string; category: string }, docId: string, data: Record<string, unknown>): PublicItem {
  const fileUrl = getFileUrl(data);
  const fileName = getFileName(data);

  return {
    title: getTitle(data, `${config.category} ${docId.slice(0, 6)}`),
    category: normalize(data.category) || normalize(data.categoria) || config.category,
    sourceCollection: config.name,
    sourceId: docId,
    status: getStatus(data),
    summary: getSummary(data).slice(0, 600) || 'Documento disponibilizado para consulta em modo fiscalização.',

    // Campos padrão
    fileUrl,
    fileName,
    pdfUrl: fileUrl,
    validationUrl: getValidationUrl(data),

    // Campos alternativos para a tela pública reconhecer anexos de todos os módulos.
    // Isso corrige principalmente SPDA, que salva o relatório no campo "url".
    url: fileUrl,
    arquivoUrl: fileUrl,
    anexoUrl: fileUrl,
    documentUrl: fileUrl,
    reportUrl: fileUrl,
    relatorioUrl: fileUrl,
    relatorioMedicaoUrl: fileUrl,
    measurementReportUrl: fileUrl,
    measurementFileUrl: fileUrl,
    downloadUrl: fileUrl,
    storageUrl: fileUrl,
  };
}

function formatDate(value?: InspectionAccess['createdAt'] | string) {
  if (!value) return '-';
  const date = typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function'
    ? value.toDate()
    : new Date(value as string | Date);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pt-BR');
}

function isExpired(expiresAt?: string) {
  if (!expiresAt) return false;
  const date = new Date(expiresAt);
  date.setHours(23, 59, 59, 999);
  return date.getTime() < Date.now();
}

export default function ModoFiscalizacao() {
  const [form, setForm] = useState({
    fiscalName: '',
    fiscalEmail: '',
    organization: '',
    purpose: 'Auditoria / fiscalização documental do PIE NR-10',
    validityDays: '7',
  });
  const [accessList, setAccessList] = useState<InspectionAccess[]>([]);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'inspectionAccess'), (snapshot) => {
      setAccessList(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as InspectionAccess)));
    });
    return () => unsub();
  }, []);

  const stats = useMemo(() => {
    const active = accessList.filter(item => item.status === 'ativo' && !isExpired(item.expiresAt)).length;
    const expired = accessList.filter(item => item.status === 'expirado' || isExpired(item.expiresAt)).length;
    const revoked = accessList.filter(item => item.status === 'revogado').length;
    return { active, expired, revoked };
  }, [accessList]);

  const buildPublicSnapshot = async (token: string) => {
    const items: PublicItem[] = [];

    for (const config of PUBLIC_COLLECTIONS) {
      const snapshot = await getDocs(collection(db, config.name));

      snapshot.docs.slice(0, config.limit).forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        items.push(buildPublicItem(config, docSnap.id, data));
      });
    }

    await Promise.all(items.map(item => addDoc(collection(db, 'inspectionAccess', token, 'publicItems'), {
      ...item,
      createdAt: serverTimestamp(),
    })));

    return items.length;
  };

  const createAccess = async () => {
    if (!form.fiscalName.trim()) {
      setMessage('Informe o nome do fiscal, auditor ou cliente.');
      return;
    }

    try {
      setCreating(true);
      setMessage('Criando acesso e preparando pacote público de fiscalização...');

      const token = crypto.randomUUID();
      const expires = new Date();
      expires.setDate(expires.getDate() + Number(form.validityDays || 7));
      const publicUrl = `${window.location.origin}/fiscalizacao/${token}`;

      await setDoc(doc(db, 'inspectionAccess', token), {
        token,
        fiscalName: form.fiscalName.trim(),
        fiscalEmail: form.fiscalEmail.trim(),
        organization: form.organization.trim(),
        purpose: form.purpose.trim(),
        expiresAt: expires.toISOString().slice(0, 10),
        expiresAtTimestamp: expires,
        status: 'ativo',
        publicUrl,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
        createdByEmail: auth.currentUser?.email || null,
        permissions: {
          readOnly: true,
          canDownload: true,
          canEdit: false,
          canDelete: false,
          canSign: false,
        },
      });

      const itemCount = await buildPublicSnapshot(token);

      await addDoc(collection(db, 'notifications'), {
        title: 'Acesso fiscal criado',
        message: `Acesso de ${form.validityDays} dia(s) criado para ${form.fiscalName}. ${itemCount} item(ns) foram disponibilizados em modo somente leitura.`,
        type: 'success',
        targetRole: 'admin',
        userId: 'all',
        link: '/modo-fiscalizacao',
        readBy: [],
        createdAt: serverTimestamp(),
      });

      if (form.fiscalEmail.trim()) {
        await addDoc(collection(db, 'emailQueue'), {
          to: form.fiscalEmail.trim(),
          subject: 'Acesso fiscal ao PIE ACREPLAST NR-10',
          html: `<h2>Acesso fiscal ao PIE ACREPLAST</h2><p>Olá, ${form.fiscalName}.</p><p>Use o link abaixo para acessar os documentos em modo somente leitura:</p><p><a href="${publicUrl}">${publicUrl}</a></p><p>Validade: ${expires.toLocaleDateString('pt-BR')}.</p>`,
          text: `Acesso fiscal ao PIE ACREPLAST: ${publicUrl}. Validade: ${expires.toLocaleDateString('pt-BR')}.`,
          status: 'pendente',
          type: 'inspection-access',
          createdAt: serverTimestamp(),
          createdByEmail: auth.currentUser?.email || null,
        });
      }

      setForm({ fiscalName: '', fiscalEmail: '', organization: '', purpose: 'Auditoria / fiscalização documental do PIE NR-10', validityDays: '7' });
      setMessage(`Acesso criado com sucesso. ${itemCount} item(ns) foram preparados para visualização.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inspectionAccess');
      setMessage('Erro ao criar acesso fiscal. Confira as regras do Firestore.');
    } finally {
      setCreating(false);
    }
  };

  const revokeAccess = async (item: InspectionAccess) => {
    await updateDoc(doc(db, 'inspectionAccess', item.id), {
      status: 'revogado',
      revokedAt: serverTimestamp(),
      revokedByEmail: auth.currentUser?.email || null,
    });
    setMessage('Acesso fiscal revogado.');
  };

  const copyLink = async (url?: string) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setMessage('Link copiado para a área de transferência.');
  };

  const sortedAccess = useMemo(() => [...accessList].reverse(), [accessList]);

  return (
    <main className="space-y-6 md:space-y-8">
      <section className="rounded-3xl border border-border bg-surface/80 p-5 md:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-cyan-400 font-bold mb-3">
            <ShieldCheck size={16} /> Modo Fiscalização
          </div>
          <h1 className="text-2xl md:text-4xl font-display font-bold text-text-primary">Acesso seguro, temporário e somente leitura</h1>
          <p className="text-sm text-text-secondary mt-3 max-w-3xl leading-relaxed">
            Crie links controlados para fiscais, auditores e clientes visualizarem documentos, evidências, laudos e plano de ação sem permissão para editar, excluir ou assinar.
          </p>
        </div>
        {message && <div className="relative z-10 mt-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-300">{message}</div>}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatusCard title="Acessos ativos" value={stats.active} icon={<UserCheck />} tone="emerald" />
        <StatusCard title="Expirados" value={stats.expired} icon={<CalendarDays />} tone="amber" />
        <StatusCard title="Revogados" value={stats.revoked} icon={<ShieldOff />} tone="red" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 rounded-3xl border border-border bg-surface/80 p-5 md:p-7">
          <div className="flex items-center gap-3 mb-5">
            <Link2 className="text-cyan-400" />
            <div>
              <h2 className="font-display font-bold text-xl text-text-primary">Criar acesso fiscal</h2>
              <p className="text-xs text-text-secondary">O link será preparado com pacote público de leitura.</p>
            </div>
          </div>
          <div className="space-y-3">
            <input value={form.fiscalName} onChange={(e) => setForm(prev => ({ ...prev, fiscalName: e.target.value }))} placeholder="Nome do fiscal/auditor" className="w-full rounded-xl border border-border bg-canvas/50 p-3 text-sm" />
            <input type="email" value={form.fiscalEmail} onChange={(e) => setForm(prev => ({ ...prev, fiscalEmail: e.target.value }))} placeholder="E-mail do fiscal/auditor" className="w-full rounded-xl border border-border bg-canvas/50 p-3 text-sm" />
            <input value={form.organization} onChange={(e) => setForm(prev => ({ ...prev, organization: e.target.value }))} placeholder="Órgão / empresa" className="w-full rounded-xl border border-border bg-canvas/50 p-3 text-sm" />
            <textarea value={form.purpose} onChange={(e) => setForm(prev => ({ ...prev, purpose: e.target.value }))} placeholder="Finalidade do acesso" className="w-full rounded-xl border border-border bg-canvas/50 p-3 text-sm min-h-24" />
            <select value={form.validityDays} onChange={(e) => setForm(prev => ({ ...prev, validityDays: e.target.value }))} className="w-full rounded-xl border border-border bg-canvas/50 p-3 text-sm">
              <option value="1">24 horas</option>
              <option value="7">7 dias</option>
              <option value="15">15 dias</option>
              <option value="30">30 dias</option>
            </select>
            <button onClick={createAccess} disabled={creating} className="w-full rounded-xl bg-cyan-600 text-white p-3 font-bold text-xs uppercase tracking-[0.16em] flex items-center justify-center gap-2 disabled:opacity-60">
              {creating ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}
              Criar link fiscal
            </button>
          </div>
        </div>

        <div className="xl:col-span-2 rounded-3xl border border-border bg-surface/80 p-5 md:p-7">
          <div className="flex items-center gap-3 mb-5">
            <FileSearch className="text-orange-400" />
            <div>
              <h2 className="font-display font-bold text-xl text-text-primary">Acessos criados</h2>
              <p className="text-xs text-text-secondary">Controle de validade, revogação, QR Code e link público.</p>
            </div>
          </div>

          <div className="space-y-4">
            {sortedAccess.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-text-secondary">Nenhum acesso fiscal criado.</div>
            ) : sortedAccess.map(item => {
              const expired = isExpired(item.expiresAt);
              const currentStatus = item.status === 'ativo' && expired ? 'expirado' : item.status || 'ativo';
              return (
                <div key={item.id} className="rounded-2xl border border-border bg-canvas/40 p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-text-primary">{item.fiscalName || 'Fiscal sem nome'}</h3>
                        <span className={`text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${currentStatus === 'ativo' ? 'border-emerald-500/40 text-emerald-400' : currentStatus === 'revogado' ? 'border-red-500/40 text-red-400' : 'border-amber-500/40 text-amber-400'}`}>{currentStatus}</span>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">{item.fiscalEmail || 'sem e-mail'} • {item.organization || 'sem organização'}</p>
                      <p className="text-xs text-text-tertiary mt-1">Expira em: {formatDate(item.expiresAt)}</p>
                      <p className="text-[11px] text-text-tertiary mt-2 truncate">{item.publicUrl}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {item.publicUrl && <QRCodeSVG value={item.publicUrl} size={82} bgColor="transparent" fgColor="currentColor" className="text-text-primary" />}
                      <div className="flex flex-col gap-2">
                        <button onClick={() => copyLink(item.publicUrl)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:border-cyan-500/50"><Copy size={14} /> Copiar</button>
                        {item.publicUrl && <a href={item.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:border-orange-500/50"><Eye size={14} /> Ver</a>}
                        {currentStatus === 'ativo' && <button onClick={() => revokeAccess(item)} className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 text-red-400 px-3 py-2 text-xs hover:bg-red-500/10"><ShieldOff size={14} /> Revogar</button>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusCard({ title, value, icon, tone }: { title: string; value: number; icon: React.ReactNode; tone: 'emerald' | 'amber' | 'red' }) {
  const toneClass = {
    emerald: 'text-emerald-400 bg-emerald-950/10 border-emerald-500/30',
    amber: 'text-amber-400 bg-amber-950/10 border-amber-500/30',
    red: 'text-red-400 bg-red-950/10 border-red-500/30',
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-text-primary font-display font-bold text-3xl">{value}</div>
        <div>{icon}</div>
      </div>
      <div className="text-[11px] uppercase tracking-[0.2em] mt-3 text-text-secondary">{title}</div>
    </div>
  );
}
