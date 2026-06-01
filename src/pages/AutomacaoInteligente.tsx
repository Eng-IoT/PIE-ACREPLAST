import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock,
  Mail,
  PlayCircle,
  QrCode,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

type NotificationType = 'info' | 'warning' | 'critical' | 'success';

type AutomationRecord = {
  id: string;
  title?: string;
  message?: string;
  type?: NotificationType;
  read?: boolean;
  createdAt?: { toDate?: () => Date } | Date | string | null;
  status?: string;
  to?: string;
  subject?: string;
  html?: string;
  equipmentName?: string;
  tag?: string;
  qrUrl?: string;
  token?: string;
};

type ScanIssue = {
  key: string;
  title: string;
  message: string;
  type: NotificationType;
  sourceCollection: string;
  sourceId: string;
  link: string;
  dueDate?: string;
};

const WATCHED_COLLECTIONS = [
  { name: 'documents', label: 'Prontuário Técnico', link: '/documents' },
  { name: 'nr10Documents', label: 'Documentos NR-10', link: '/documentos-obrigatorios-nr10' },
  { name: 'smartDocuments', label: 'Documentos Inteligentes', link: '/documentos-inteligentes' },
  { name: 'electricalTestReports', label: 'Ensaios Elétricos', link: '/laudos-ensaios-eletricos' },
  { name: 'spdaReports', label: 'SPDA e Aterramento', link: '/spda' },
  { name: 'nr12Reports', label: 'Laudos NR-12', link: '/laudos-nr12' },
  { name: 'ppeTools', label: 'EPI/EPC/Ferramental', link: '/epi-epc-ferramental' },
  { name: 'workers', label: 'Trabalhadores', link: '/workers' },
  { name: 'actionPlan', label: 'Plano de Ação', link: '/action-plan' },
];

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function getDateValue(data: Record<string, unknown>) {
  const possibleKeys = [
    'dueDate', 'validityDate', 'validUntil', 'expirationDate', 'validade', 'dataValidade',
    'certificateValidity', 'validadeCertificado', 'prazoAcao', 'deadline', 'prazo', 'dataFim',
  ];
  for (const key of possibleKeys) {
    const raw = data[key];
    if (!raw) continue;
    if (typeof raw === 'object' && raw !== null && 'toDate' in raw && typeof (raw as { toDate?: unknown }).toDate === 'function') {
      return (raw as { toDate: () => Date }).toDate();
    }
    const date = new Date(String(raw));
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function getTitle(data: Record<string, unknown>, fallback: string) {
  return normalizeText(data.title) || normalizeText(data.titulo) || normalizeText(data.name) || normalizeText(data.nome) || normalizeText(data.templateTitle) || fallback;
}

function formatDate(date?: Date | null) {
  if (!date) return 'sem data';
  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(value: AutomationRecord['createdAt']) {
  if (!value) return 'Agora';
  const date = typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function'
    ? value.toDate()
    : new Date(value as string | Date);
  if (Number.isNaN(date.getTime())) return 'Agora';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function daysBetweenToday(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatus(data: Record<string, unknown>) {
  return normalizeText(data.status || data.situacao || data.state).toLowerCase();
}

function isActionOpen(status: string) {
  const closedStatuses = ['concluido', 'concluída', 'concluida', 'feito', 'finalizado', 'arquivado', 'cancelado', 'conforme', 'fechado'];
  return !closedStatuses.some(item => status.includes(item));
}

async function scanDeadlines(): Promise<ScanIssue[]> {
  const issues: ScanIssue[] = [];

  for (const config of WATCHED_COLLECTIONS) {
    const snapshot = await getDocs(collection(db, config.name));
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      const title = getTitle(data, `${config.label} ${docSnap.id.slice(0, 6)}`);
      const status = getStatus(data);
      const date = getDateValue(data);

      if (config.name === 'actionPlan' && !isActionOpen(status)) return;
      if (!date) {
        if (['smartDocuments', 'nr10Documents', 'documents'].includes(config.name) && status.includes('aguardando')) {
          issues.push({
            key: `${config.name}-${docSnap.id}-pending`,
            title: 'Documento aguardando ação',
            message: `${title} está com status "${status}" e precisa de acompanhamento.`,
            type: 'warning',
            sourceCollection: config.name,
            sourceId: docSnap.id,
            link: config.link,
          });
        }
        return;
      }

      const days = daysBetweenToday(date);
      if (days < 0) {
        issues.push({
          key: `${config.name}-${docSnap.id}-expired`,
          title: `${config.label} vencido`,
          message: `${title} venceu em ${formatDate(date)}. Regularize ou atualize o documento.`,
          type: 'critical',
          sourceCollection: config.name,
          sourceId: docSnap.id,
          link: config.link,
          dueDate: date.toISOString().slice(0, 10),
        });
      } else if (days <= 15) {
        issues.push({
          key: `${config.name}-${docSnap.id}-due-soon`,
          title: `${config.label} próximo do vencimento`,
          message: `${title} vence em ${days} dia(s), em ${formatDate(date)}.`,
          type: days <= 5 ? 'critical' : 'warning',
          sourceCollection: config.name,
          sourceId: docSnap.id,
          link: config.link,
          dueDate: date.toISOString().slice(0, 10),
        });
      }
    });
  }

  return issues;
}

export default function AutomacaoInteligente() {
  const [notifications, setNotifications] = useState<AutomationRecord[]>([]);
  const [emails, setEmails] = useState<AutomationRecord[]>([]);
  const [logs, setLogs] = useState<AutomationRecord[]>([]);
  const [qrCodes, setQrCodes] = useState<AutomationRecord[]>([]);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [qrForm, setQrForm] = useState({ equipmentName: '', tag: '', location: '' });

  useEffect(() => {
    const unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      setNotifications(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AutomationRecord)));
    });
    const unsubEmails = onSnapshot(collection(db, 'emailQueue'), (snapshot) => {
      setEmails(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AutomationRecord)));
    });
    const unsubLogs = onSnapshot(collection(db, 'automationLogs'), (snapshot) => {
      setLogs(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AutomationRecord)));
    });
    const unsubQrCodes = onSnapshot(collection(db, 'equipmentQrCodes'), (snapshot) => {
      setQrCodes(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as AutomationRecord)));
    });

    return () => {
      unsubNotifications();
      unsubEmails();
      unsubLogs();
      unsubQrCodes();
    };
  }, []);

  const stats = useMemo(() => {
    const critical = notifications.filter(item => item.type === 'critical').length;
    const warning = notifications.filter(item => item.type === 'warning').length;
    const queuedEmails = emails.filter(item => item.status === 'pendente' || !item.status).length;
    return { critical, warning, queuedEmails, qrCount: qrCodes.length };
  }, [emails, notifications, qrCodes]);

  const executeDeadlineCheck = async () => {
    try {
      setRunning(true);
      setMessage('Verificando documentos, planos de ação, trabalhadores e laudos...');
      const issues = await scanDeadlines();

      await Promise.all(issues.map(issue => addDoc(collection(db, 'notifications'), {
        ...issue,
        targetRole: 'admin',
        userId: 'all',
        readBy: [],
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
        createdByEmail: auth.currentUser?.email || null,
        automationSource: 'deadline-check',
      })));

      if (issues.length > 0 && emailTo.trim()) {
        await addDoc(collection(db, 'emailQueue'), {
          to: emailTo.trim(),
          subject: `PIE ACREPLAST - ${issues.length} alerta(s) de vencimento e pendência`,
          html: `<h2>Alertas do PIE ACREPLAST</h2><p>Foram encontrados ${issues.length} alerta(s).</p><ul>${issues.map(issue => `<li><strong>${issue.title}</strong>: ${issue.message}</li>`).join('')}</ul>`,
          text: issues.map(issue => `${issue.title}: ${issue.message}`).join('\n'),
          status: 'pendente',
          type: 'deadline-alert',
          createdAt: serverTimestamp(),
          createdByEmail: auth.currentUser?.email || null,
        });
      }

      await addDoc(collection(db, 'automationLogs'), {
        title: 'Verificação automática executada',
        message: `${issues.length} alerta(s) encontrados e ${issues.length} notificação(ões) criadas.`,
        type: issues.length ? 'warning' : 'success',
        status: 'concluido',
        createdAt: serverTimestamp(),
        createdByEmail: auth.currentUser?.email || null,
      });

      setMessage(issues.length ? `${issues.length} alerta(s) criados com sucesso.` : 'Nenhuma pendência crítica encontrada.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'automationLogs/notifications');
      setMessage('Erro ao executar automação. Verifique as permissões do Firestore.');
    } finally {
      setRunning(false);
    }
  };

  const generateWeeklyReport = async () => {
    try {
      setRunning(true);
      const issues = await scanDeadlines();
      const report = {
        title: 'Relatório Semanal Automático do PIE',
        summary: {
          critical: issues.filter(issue => issue.type === 'critical').length,
          warning: issues.filter(issue => issue.type === 'warning').length,
          total: issues.length,
        },
        issues,
        createdAt: serverTimestamp(),
        createdByEmail: auth.currentUser?.email || null,
      };
      const reportRef = await addDoc(collection(db, 'weeklyReports'), report);

      if (emailTo.trim()) {
        await addDoc(collection(db, 'emailQueue'), {
          to: emailTo.trim(),
          subject: 'Relatório semanal do PIE ACREPLAST',
          html: `<h2>Relatório semanal do PIE</h2><p>Total de alertas: ${issues.length}</p><p>Críticos: ${report.summary.critical}</p><p>Atenção: ${report.summary.warning}</p>`,
          text: `Relatório semanal do PIE\nTotal de alertas: ${issues.length}\nCríticos: ${report.summary.critical}\nAtenção: ${report.summary.warning}`,
          status: 'pendente',
          type: 'weekly-report',
          reportId: reportRef.id,
          createdAt: serverTimestamp(),
          createdByEmail: auth.currentUser?.email || null,
        });
      }

      await addDoc(collection(db, 'automationLogs'), {
        title: 'Relatório semanal gerado',
        message: `Relatório criado com ${issues.length} alerta(s).`,
        type: 'success',
        status: 'concluido',
        reportId: reportRef.id,
        createdAt: serverTimestamp(),
        createdByEmail: auth.currentUser?.email || null,
      });

      setMessage('Relatório semanal criado e e-mail colocado na fila, se destinatário foi informado.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'weeklyReports/emailQueue');
      setMessage('Erro ao gerar relatório semanal.');
    } finally {
      setRunning(false);
    }
  };

  const queueTestEmail = async () => {
    if (!emailTo.trim()) {
      setMessage('Informe um e-mail destinatário antes de criar o teste.');
      return;
    }
    try {
      await addDoc(collection(db, 'emailQueue'), {
        to: emailTo.trim(),
        subject: 'Teste de e-mail automático - PIE ACREPLAST',
        html: '<h2>PIE ACREPLAST</h2><p>Este é um teste da automação de envio de e-mail.</p>',
        text: 'PIE ACREPLAST - teste da automação de envio de e-mail.',
        status: 'pendente',
        type: 'test',
        createdAt: serverTimestamp(),
        createdByEmail: auth.currentUser?.email || null,
      });
      setMessage('E-mail de teste criado na fila. Configure RESEND_API_KEY na Vercel para envio real.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'emailQueue');
      setMessage('Erro ao criar e-mail na fila.');
    }
  };

  const sendEmailNow = async (email: AutomationRecord) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.html?.replace(/<[^>]*>/g, ' '),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || 'Falha no envio pela API.');
      await updateDoc(doc(db, 'emailQueue', email.id), {
        status: 'enviado',
        sentAt: serverTimestamp(),
        providerId: payload?.id || null,
      });
      await addDoc(collection(db, 'emailLogs'), {
        emailQueueId: email.id,
        to: email.to,
        subject: email.subject,
        status: 'enviado',
        createdAt: serverTimestamp(),
      });
      setMessage('E-mail enviado pela API da Vercel.');
    } catch (error) {
      await updateDoc(doc(db, 'emailQueue', email.id), {
        status: 'erro',
        errorMessage: error instanceof Error ? error.message : String(error),
        updatedAt: serverTimestamp(),
      });
      setMessage('Não foi possível enviar o e-mail agora. Verifique RESEND_API_KEY na Vercel.');
    }
  };

  const createEquipmentQrCode = async () => {
    if (!qrForm.equipmentName.trim()) {
      setMessage('Informe o nome do quadro, máquina ou equipamento.');
      return;
    }
    try {
      const token = crypto.randomUUID();
      const qrUrl = `${window.location.origin}/equipamento/${token}`;
      await addDoc(collection(db, 'equipmentQrCodes'), {
        token,
        qrUrl,
        equipmentName: qrForm.equipmentName.trim(),
        tag: qrForm.tag.trim(),
        location: qrForm.location.trim(),
        status: 'ativo',
        createdAt: serverTimestamp(),
        createdByEmail: auth.currentUser?.email || null,
      });
      setQrForm({ equipmentName: '', tag: '', location: '' });
      setMessage('QR Code criado. Cole esse QR no quadro, máquina ou equipamento correspondente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'equipmentQrCodes');
      setMessage('Erro ao criar QR Code.');
    }
  };

  const sortedNotifications = useMemo(() => [...notifications].sort((a, b) => new Date(String(b.createdAt || 0)).getTime() - new Date(String(a.createdAt || 0)).getTime()).slice(0, 8), [notifications]);
  const sortedEmails = useMemo(() => [...emails].reverse().slice(0, 8), [emails]);
  const sortedLogs = useMemo(() => [...logs].reverse().slice(0, 8), [logs]);

  return (
    <main className="space-y-6 md:space-y-8">
      <section className="rounded-3xl border border-border bg-surface/80 p-5 md:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-orange-400 font-bold mb-3">
              <Sparkles size={16} /> Automação Inteligente do PIE
            </div>
            <h1 className="text-2xl md:text-4xl font-display font-bold text-text-primary">Alertas, e-mails, vencimentos e QR Codes</h1>
            <p className="text-sm text-text-secondary mt-3 max-w-3xl leading-relaxed">
              Este módulo verifica pendências do prontuário, cria notificações internas, gera fila de e-mails, registra logs e prepara QR Codes para quadros, máquinas e documentos.
            </p>
          </div>
          <button
            onClick={executeDeadlineCheck}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-orange-600 text-white font-bold uppercase tracking-[0.14em] text-xs disabled:opacity-60"
          >
            {running ? <RefreshCw size={18} className="animate-spin" /> : <PlayCircle size={18} />}
            Executar agora
          </button>
        </div>
        {message && <div className="relative z-10 mt-5 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-300">{message}</div>}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<ShieldAlert />} title="Críticos" value={stats.critical} tone="red" />
        <StatCard icon={<AlertTriangle />} title="Atenção" value={stats.warning} tone="amber" />
        <StatCard icon={<Mail />} title="E-mails na fila" value={stats.queuedEmails} tone="cyan" />
        <StatCard icon={<QrCode />} title="QR Codes" value={stats.qrCount} tone="orange" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-3xl border border-border bg-surface/80 p-5 md:p-7">
          <div className="flex items-center gap-3 mb-5">
            <CalendarClock className="text-orange-400" />
            <div>
              <h2 className="font-display font-bold text-xl text-text-primary">Verificação e relatório automático</h2>
              <p className="text-xs text-text-secondary">Use esta área para criar alertas e relatórios semanais.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="md:col-span-2 text-sm text-text-secondary">
              E-mail do supervisor/responsável para receber relatórios
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="supervisor@empresa.com.br"
                className="mt-2 w-full rounded-xl border border-border bg-canvas/50 p-3 text-text-primary outline-none focus:border-orange-500"
              />
            </label>

            <button onClick={generateWeeklyReport} disabled={running} className="rounded-2xl border border-border bg-surface-hover p-4 text-left hover:border-orange-500/50 transition-colors">
              <CheckCircle2 className="text-emerald-400 mb-3" />
              <h3 className="font-bold text-text-primary">Gerar relatório semanal</h3>
              <p className="text-xs text-text-secondary mt-1">Cria um resumo técnico e coloca o e-mail na fila de envio.</p>
            </button>

            <button onClick={queueTestEmail} className="rounded-2xl border border-border bg-surface-hover p-4 text-left hover:border-orange-500/50 transition-colors">
              <Send className="text-cyan-400 mb-3" />
              <h3 className="font-bold text-text-primary">Criar e-mail de teste</h3>
              <p className="text-xs text-text-secondary mt-1">Valida a fila de e-mail antes de enviar para cliente.</p>
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface/80 p-5 md:p-7">
          <div className="flex items-center gap-3 mb-5">
            <QrCode className="text-orange-400" />
            <div>
              <h2 className="font-display font-bold text-xl text-text-primary">QR por equipamento</h2>
              <p className="text-xs text-text-secondary">Crie QR para quadros, máquinas e painéis.</p>
            </div>
          </div>
          <div className="space-y-3">
            <input value={qrForm.equipmentName} onChange={(e) => setQrForm(prev => ({ ...prev, equipmentName: e.target.value }))} placeholder="Nome do equipamento" className="w-full rounded-xl border border-border bg-canvas/50 p-3 text-sm" />
            <input value={qrForm.tag} onChange={(e) => setQrForm(prev => ({ ...prev, tag: e.target.value }))} placeholder="TAG / Código" className="w-full rounded-xl border border-border bg-canvas/50 p-3 text-sm" />
            <input value={qrForm.location} onChange={(e) => setQrForm(prev => ({ ...prev, location: e.target.value }))} placeholder="Localização" className="w-full rounded-xl border border-border bg-canvas/50 p-3 text-sm" />
            <button onClick={createEquipmentQrCode} className="w-full rounded-xl bg-orange-600 text-white p-3 font-bold text-xs uppercase tracking-[0.16em]">Criar QR Code</button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Últimas notificações" icon={<Bell className="text-orange-400" />}>
          <div className="space-y-3">
            {sortedNotifications.length === 0 ? <Empty text="Nenhuma notificação criada." /> : sortedNotifications.map(item => <RecordLine key={item.id} item={item} />)}
          </div>
        </Panel>
        <Panel title="Fila de e-mail" icon={<Mail className="text-cyan-400" />}>
          <div className="space-y-3">
            {sortedEmails.length === 0 ? <Empty text="Nenhum e-mail na fila." /> : sortedEmails.map(item => (
              <div key={item.id} className="rounded-2xl border border-border bg-canvas/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-text-primary">{item.subject || 'E-mail sem assunto'}</h4>
                    <p className="text-xs text-text-secondary mt-1">Para: {item.to || 'não informado'}</p>
                    <span className="inline-flex mt-2 rounded-full border border-border px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{item.status || 'pendente'}</span>
                  </div>
                  {(item.status === 'pendente' || !item.status) && (
                    <button onClick={() => sendEmailNow(item)} className="rounded-lg bg-cyan-600 text-white px-3 py-2 text-xs font-bold">Enviar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="QR Codes criados" icon={<QrCode className="text-orange-400" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {qrCodes.length === 0 ? <Empty text="Nenhum QR Code criado." /> : qrCodes.slice(-6).reverse().map(item => (
              <div key={item.id} className="rounded-2xl border border-border bg-canvas/40 p-4 flex gap-4 items-center">
                {item.qrUrl && <QRCodeSVG value={item.qrUrl} size={78} bgColor="transparent" fgColor="currentColor" className="text-text-primary shrink-0" />}
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-text-primary truncate">{item.equipmentName}</h4>
                  <p className="text-xs text-text-secondary">{item.tag}</p>
                  <p className="text-[10px] text-text-tertiary truncate mt-1">{item.qrUrl}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Logs de automação" icon={<Activity className="text-emerald-400" />}>
          <div className="space-y-3">
            {sortedLogs.length === 0 ? <Empty text="Nenhum log registrado." /> : sortedLogs.map(item => <RecordLine key={item.id} item={item} />)}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function StatCard({ icon, title, value, tone }: { icon: React.ReactNode; title: string; value: number; tone: 'red' | 'amber' | 'cyan' | 'orange' }) {
  const toneClass = {
    red: 'text-red-400 bg-red-950/10 border-red-500/30',
    amber: 'text-amber-400 bg-amber-950/10 border-amber-500/30',
    cyan: 'text-cyan-400 bg-cyan-950/10 border-cyan-500/30',
    orange: 'text-orange-400 bg-orange-950/10 border-orange-500/30',
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

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-surface/80 p-5 md:p-7">
      <div className="flex items-center gap-3 mb-5">
        {icon}
        <h2 className="font-display font-bold text-xl text-text-primary">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function RecordLine({ item }: { item: AutomationRecord }) {
  return (
    <div className="rounded-2xl border border-border bg-canvas/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-bold text-sm text-text-primary truncate">{item.title || item.subject || 'Registro'}</h4>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">{item.message || item.status || item.to}</p>
        </div>
        <div className="text-[10px] text-text-tertiary whitespace-nowrap flex items-center gap-1"><Clock size={12} /> {formatDateTime(item.createdAt)}</div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-text-secondary text-center w-full">{text}</div>;
}
