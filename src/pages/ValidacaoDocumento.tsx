import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, FileText, Fingerprint, ShieldCheck } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

type ValidationRecord = {
  id: string;
  title?: string;
  templateTitle?: string;
  status?: string;
  hash?: string;
  documentId?: string;
  createdAt?: { toDate?: () => Date } | null;
};

const statusLabel: Record<string, string> = {
  rascunho: 'Rascunho',
  'em-preenchimento': 'Em preenchimento',
  'aguardando-aprovacao': 'Aguardando aprovação',
  aprovado: 'Aprovado',
  'aguardando-assinatura': 'Aguardando assinatura',
  assinado: 'Assinado',
  arquivado: 'Arquivado',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
};

function formatDate(value: ValidationRecord['createdAt']) {
  try {
    return value?.toDate?.().toLocaleString('pt-BR') || 'Não informado';
  } catch {
    return 'Não informado';
  }
}

export default function ValidacaoDocumento() {
  const { validationId } = useParams();
  const [record, setRecord] = useState<ValidationRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadValidationRecord() {
      if (!validationId) return;

      try {
        const validationQuery = query(collection(db, 'qrValidationLinks'), where('validationId', '==', validationId));
        const snapshot = await getDocs(validationQuery);
        const first = snapshot.docs[0];
        setRecord(first ? ({ id: first.id, ...first.data() } as ValidationRecord) : null);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'qrValidationLinks');
      } finally {
        setLoading(false);
      }
    }

    loadValidationRecord();
  }, [validationId]);

  if (loading) {
    return <div className="bg-surface border border-border rounded-2xl p-8 text-text-secondary">Validando documento...</div>;
  }

  if (!record) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center">
        <FileText className="mx-auto text-text-tertiary mb-3" size={36} />
        <h1 className="text-xl font-bold text-text-primary">Documento não encontrado</h1>
        <p className="text-text-secondary mt-2">O QR Code informado não possui registro de validação publicado.</p>
        <Link to="/documentos-inteligentes" className="inline-flex mt-5 px-4 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold uppercase tracking-widest">Voltar</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="bg-surface border border-border rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4 text-emerald-300">
          <ShieldCheck size={28} />
          <span className="text-xs uppercase tracking-[0.25em] font-mono">Validação digital</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary">Documento validado no PIE Digital</h1>
        <p className="text-text-secondary mt-3">Este registro confirma que o documento possui rastreabilidade digital, hash e controle de versão no aplicativo.</p>
      </header>

      <section className="bg-surface border border-border rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <ValidationField label="Documento" value={record.title || 'Não informado'} />
        <ValidationField label="Modelo" value={record.templateTitle || 'Não informado'} />
        <ValidationField label="Status" value={statusLabel[record.status || ''] || record.status || 'Não informado'} icon={<CheckCircle2 size={15} />} />
        <ValidationField label="Publicado em" value={formatDate(record.createdAt)} />
        <div className="md:col-span-2">
          <ValidationField label="Hash do documento" value={record.hash || 'Não informado'} icon={<Fingerprint size={15} />} />
        </div>
      </section>

      <div className="text-center">
        <Link to="/documentos-inteligentes" className="inline-flex px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover text-xs font-bold uppercase tracking-widest">Ir para Documentos Inteligentes</Link>
      </div>
    </div>
  );
}

function ValidationField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-active p-4 min-w-0">
      <p className="text-[10px] uppercase tracking-[0.22em] text-text-tertiary font-mono flex items-center gap-2">{icon} {label}</p>
      <p className="text-sm text-text-primary mt-2 break-words">{value}</p>
    </div>
  );
}
