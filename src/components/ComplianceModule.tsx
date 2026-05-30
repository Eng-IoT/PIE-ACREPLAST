import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref } from 'firebase/storage';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  Filter,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType, storage, uploadWithRetry } from '../lib/firebase';

export type ModuleField = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'date' | 'number';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  colSpan?: 'full' | 'half';
};

export type ComplianceModuleConfig = {
  title: string;
  subtitle: string;
  collectionName: string;
  storageFolder: string;
  documentLabel: string;
  newButtonLabel: string;
  emptyMessage: string;
  fields: ModuleField[];
  statusOptions?: { label: string; value: string }[];
  guidance?: string[];
  referenceItems?: string[];
};

type StoredRecord = {
  id: string;
  status?: string;
  fileUrl?: string;
  fileName?: string;
  filePath?: string;
  createdAt?: { toDate?: () => Date } | Date | string | null;
  createdByEmail?: string | null;
  [key: string]: unknown;
};

const defaultStatusOptions = [
  { label: 'Conforme', value: 'conforme' },
  { label: 'Não conforme', value: 'nao-conforme' },
  { label: 'Pendente', value: 'pendente' },
  { label: 'Em análise', value: 'em-analise' },
];

const statusLabel: Record<string, string> = {
  conforme: 'Conforme',
  'nao-conforme': 'Não conforme',
  pendente: 'Pendente',
  'em-analise': 'Em análise',
  vencido: 'Vencido',
  ativo: 'Ativo',
};

const statusClasses: Record<string, string> = {
  conforme: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  'nao-conforme': 'bg-red-500/10 text-red-300 border-red-500/30',
  pendente: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  'em-analise': 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  vencido: 'bg-red-500/10 text-red-300 border-red-500/30',
  ativo: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
};

function sanitizeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
}

function formatDate(value: StoredRecord['createdAt']) {
  if (!value) return 'Sem data';
  try {
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toLocaleDateString('pt-BR');
    const maybeDate = value.toDate?.();
    return maybeDate ? maybeDate.toLocaleDateString('pt-BR') : 'Sem data';
  } catch {
    return 'Sem data';
  }
}

function getTimestamp(record: StoredRecord) {
  try {
    const createdAt = record.createdAt;
    if (!createdAt) return 0;
    if (createdAt instanceof Date) return createdAt.getTime();
    if (typeof createdAt === 'string') return new Date(createdAt).getTime() || 0;
    return createdAt.toDate?.().getTime() || 0;
  } catch {
    return 0;
  }
}

function getRecordTitle(record: StoredRecord, fields: ModuleField[], fallback: string) {
  const preferredNames = ['titulo', 'title', 'nome', 'documento', 'equipamento', 'procedimento', 'maquina'];
  for (const name of preferredNames) {
    const value = record[name];
    if (typeof value === 'string' && value.trim()) return value;
  }

  for (const field of fields) {
    const value = record[field.name];
    if (typeof value === 'string' && value.trim()) return value;
  }

  return record.fileName || fallback;
}

function getRecordSummary(record: StoredRecord, fields: ModuleField[]) {
  const importantFields = fields.filter(field => field.type !== 'textarea').slice(0, 4);
  return importantFields
    .map(field => {
      const value = record[field.name];
      if (!value || typeof value !== 'string') return null;
      return `${field.label}: ${value}`;
    })
    .filter(Boolean)
    .join(' • ');
}

export default function ComplianceModule({ config }: { config: ComplianceModuleConfig }) {
  const [records, setRecords] = useState<StoredRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    return Object.fromEntries(config.fields.map(field => [field.name, '']));
  });
  const [status, setStatus] = useState(config.statusOptions?.[0]?.value || defaultStatusOptions[0].value);

  const statusOptions = config.statusOptions || defaultStatusOptions;

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, config.collectionName),
      snapshot => {
        const data = snapshot.docs
          .map(item => ({ id: item.id, ...item.data() } as StoredRecord))
          .sort((a, b) => getTimestamp(b) - getTimestamp(a));
        setRecords(data);
      },
      error => handleFirestoreError(error, OperationType.LIST, config.collectionName)
    );

    return unsub;
  }, [config.collectionName]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return records.filter(record => {
      const matchesStatus = statusFilter === 'todos' || record.status === statusFilter;
      const searchableText = [
        getRecordTitle(record, config.fields, config.documentLabel),
        getRecordSummary(record, config.fields),
        record.fileName,
        record.createdByEmail,
        ...config.fields.map(field => record[field.name]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
  }, [records, searchTerm, statusFilter, config.fields, config.documentLabel]);

  const completionStats = useMemo(() => {
    const total = records.length;
    const conformes = records.filter(record => record.status === 'conforme' || record.status === 'ativo').length;
    const pendentes = records.filter(record => record.status === 'pendente' || record.status === 'em-analise').length;
    const naoConformes = records.filter(record => record.status === 'nao-conforme' || record.status === 'vencido').length;

    return { total, conformes, pendentes, naoConformes };
  }, [records]);

  const updateField = (fieldName: string, value: string) => {
    setFormValues(previous => ({ ...previous, [fieldName]: value }));
  };

  const resetForm = () => {
    setFormValues(Object.fromEntries(config.fields.map(field => [field.name, ''])));
    setStatus(config.statusOptions?.[0]?.value || defaultStatusOptions[0].value);
    setFile(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    const missingRequiredField = config.fields.find(field => field.required && !formValues[field.name]?.trim());
    if (missingRequiredField) {
      setMessage(`Preencha o campo obrigatório: ${missingRequiredField.label}.`);
      return;
    }

    setIsSaving(true);

    try {
      let fileUrl = '';
      let fileName = '';
      let filePath = '';

      if (file) {
        fileName = file.name;
        filePath = `${config.storageFolder}/${Date.now()}_${sanitizeFileName(file.name)}`;
        const storageRef = ref(storage, filePath);
        await uploadWithRetry(storageRef, file);
        fileUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, config.collectionName), {
        ...formValues,
        status,
        fileUrl,
        fileName,
        filePath,
        module: config.title,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
        createdByEmail: auth.currentUser?.email || null,
      });

      resetForm();
      setIsAdding(false);
      setMessage(`${config.documentLabel} salvo com sucesso.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, config.collectionName);
      setMessage(`Erro ao salvar ${config.documentLabel.toLowerCase()}. Verifique login, regras e Storage.`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRecord = async (record: StoredRecord) => {
    const title = getRecordTitle(record, config.fields, config.documentLabel);
    const confirmed = window.confirm(`Deseja excluir "${title}"?`);
    if (!confirmed) return;

    try {
      if (record.filePath) {
        await deleteObject(ref(storage, record.filePath)).catch(error => {
          console.warn('Arquivo não excluído do Storage:', error);
        });
      }

      await deleteDoc(doc(db, config.collectionName, record.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${config.collectionName}/${record.id}`);
      setMessage('Erro ao excluir registro. Verifique suas permissões.');
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null);
  };

  return (
    <div className="space-y-6">
      <header className="bg-surface border border-border rounded-2xl p-5 md:p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <FileText size={20} />
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-orange-400 font-mono">Módulo do Prontuário</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary tracking-tight">{config.title}</h1>
            <p className="text-sm text-text-secondary mt-2 max-w-3xl leading-relaxed">{config.subtitle}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-0 xl:min-w-[520px]">
            <StatCard label="Registros" value={completionStats.total} />
            <StatCard label="Conformes" value={completionStats.conformes} tone="ok" />
            <StatCard label="Pendentes" value={completionStats.pendentes} tone="warn" />
            <StatCard label="Críticos" value={completionStats.naoConformes} tone="danger" />
          </div>
        </div>
      </header>

      {(config.guidance?.length || config.referenceItems?.length) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {config.guidance?.length ? (
            <InfoPanel title="Orientação técnica" items={config.guidance} icon="info" />
          ) : null}
          {config.referenceItems?.length ? (
            <InfoPanel title="Itens que devem compor o prontuário" items={config.referenceItems} icon="check" />
          ) : null}
        </section>
      )}

      <section className="bg-surface/80 border border-border rounded-2xl p-4 md:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder={`Buscar em ${config.title.toLowerCase()}...`}
              className="w-full bg-surface-active border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder-text-tertiary focus:border-orange-500/60 outline-none transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={15} />
              <select
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value)}
                className="w-full sm:w-56 bg-surface-active border border-border rounded-lg py-2.5 pl-9 pr-4 text-xs text-text-primary focus:border-orange-500/60 outline-none"
              >
                <option value="todos">Todos os status</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsAdding(previous => !previous)}
              className="inline-flex items-center justify-center gap-2 bg-orange-600/90 text-white px-4 py-2.5 rounded-lg hover:bg-orange-500 transition-all font-bold text-xs uppercase tracking-widest border border-orange-400/20"
            >
              {isAdding ? <X size={16} /> : <Plus size={16} />}
              {isAdding ? 'Fechar' : config.newButtonLabel}
            </button>
          </div>
        </div>

        {message && (
          <div className="flex items-start gap-2 text-sm text-text-secondary bg-surface-active border border-border rounded-xl p-3">
            <AlertCircle size={17} className="text-orange-400 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}
      </section>

      <AnimatePresence>
        {isAdding && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface border border-border-strong rounded-2xl p-5 md:p-6 space-y-5 overflow-hidden"
          >
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                <FilePlus2 size={18} />
              </span>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-text-primary">Novo registro</h2>
                <p className="text-xs text-text-tertiary mt-1">Preencha os campos técnicos e anexe a evidência documental, quando houver.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.fields.map(field => (
                <FieldInput
                  key={field.name}
                  field={field}
                  value={formValues[field.name] || ''}
                  onChange={value => updateField(field.name, value)}
                />
              ))}

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Status</label>
                <select
                  value={status}
                  onChange={event => setStatus(event.target.value)}
                  className="w-full bg-surface-active border border-border-strong rounded-lg p-3 text-sm text-text-primary focus:border-orange-500/60 outline-none"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Anexo técnico</label>
                <label className="flex flex-col sm:flex-row sm:items-center gap-3 border border-dashed border-border-strong rounded-xl p-4 bg-surface-active cursor-pointer hover:border-orange-500/40 transition-colors">
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
                    <Upload size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-text-primary">{file ? file.name : 'Selecionar PDF, imagem ou evidência'}</span>
                    <span className="block text-xs text-text-tertiary mt-1">Aceita PDF, JPG, PNG e documentos técnicos compatíveis com o navegador.</span>
                  </span>
                  <input type="file" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end border-t border-border pt-4">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsAdding(false);
                }}
                className="px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors text-xs font-bold uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-lg bg-orange-600/90 text-white hover:bg-orange-500 transition-colors text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {isSaving ? 'Salvando...' : `Salvar ${config.documentLabel}`}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <section className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="text-text-tertiary text-sm py-12 text-center border-2 border-dashed border-border-strong rounded-2xl bg-surface/50">
            {records.length === 0 ? config.emptyMessage : 'Nenhum registro encontrado com os filtros atuais.'}
          </div>
        ) : (
          filteredRecords.map(record => (
            <RecordCard
              key={record.id}
              record={record}
              fields={config.fields}
              fallback={config.documentLabel}
              onDelete={() => deleteRecord(record)}
            />
          ))
        )}
      </section>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: ModuleField; value: string; onChange: (value: string) => void }) {
  const baseClass = 'w-full bg-surface-active border border-border-strong rounded-lg p-3 text-sm text-text-primary placeholder-text-tertiary focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all';
  const wrapperClass = field.colSpan === 'full' || field.type === 'textarea' ? 'md:col-span-2' : '';

  return (
    <div className={wrapperClass}>
      <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">
        {field.label}{field.required ? <span className="text-orange-400 ml-1">*</span> : null}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={field.placeholder}
          className={`${baseClass} min-h-28 resize-y`}
          required={field.required}
        />
      ) : field.type === 'select' ? (
        <select value={value} onChange={event => onChange(event.target.value)} className={baseClass} required={field.required}>
          <option value="">Selecione</option>
          {field.options?.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={field.type || 'text'}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={field.placeholder}
          className={baseClass}
          required={field.required}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'ok' | 'warn' | 'danger' }) {
  const toneClass = {
    default: 'text-text-primary border-border bg-surface-active',
    ok: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10',
    warn: 'text-amber-300 border-amber-500/20 bg-amber-500/10',
    danger: 'text-red-300 border-red-500/20 bg-red-500/10',
  }[tone];

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="text-2xl font-display font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-current/70 font-mono mt-1">{label}</div>
    </div>
  );
}

function InfoPanel({ title, items, icon }: { title: string; items: string[]; icon: 'info' | 'check' }) {
  return (
    <div className="bg-surface/80 border border-border rounded-2xl p-5">
      <h3 className="text-xs uppercase tracking-[0.25em] text-orange-400 font-mono mb-4 flex items-center gap-2">
        {icon === 'check' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
        {title}
      </h3>
      <ul className="space-y-2 text-sm text-text-secondary leading-relaxed">
        {items.map(item => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecordCard({ record, fields, fallback, onDelete }: { record: StoredRecord; fields: ModuleField[]; fallback: string; onDelete: () => void }) {
  const title = getRecordTitle(record, fields, fallback);
  const summary = getRecordSummary(record, fields);
  const status = typeof record.status === 'string' ? record.status : 'em-analise';
  const badgeClass = statusClasses[status] || statusClasses['em-analise'];

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border hover:border-orange-500/30 rounded-2xl p-4 md:p-5 transition-all group"
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
              {statusLabel[status] || status}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-tertiary font-mono">
              <Calendar size={12} />
              {formatDate(record.createdAt)}
            </span>
          </div>

          <h3 className="text-base md:text-lg font-bold text-text-primary truncate">{title}</h3>
          {summary && <p className="text-sm text-text-secondary mt-1 leading-relaxed">{summary}</p>}

          {typeof record.createdByEmail === 'string' && record.createdByEmail && (
            <p className="text-[11px] text-text-tertiary mt-2">Registrado por: {record.createdByEmail}</p>
          )}

          {record.fileName ? (
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-text-secondary bg-surface-active rounded-lg px-3 py-2 border border-border max-w-full">
              <FileText size={14} className="text-orange-400 shrink-0" />
              <span className="truncate">{record.fileName}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0 justify-end lg:justify-start">
          {record.fileUrl ? (
            <>
              <button
                onClick={() => window.open(record.fileUrl, '_blank')}
                className="p-2 text-text-secondary hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors border border-transparent hover:border-orange-500/20"
                title="Visualizar anexo"
              >
                <ExternalLink size={18} />
              </button>
              <a
                href={record.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-text-secondary hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors border border-transparent hover:border-cyan-500/20"
                title="Baixar anexo"
              >
                <Download size={18} />
              </a>
            </>
          ) : null}
          <button
            onClick={onDelete}
            className="p-2 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
            title="Excluir registro"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
