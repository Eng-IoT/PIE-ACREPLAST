import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref } from 'firebase/storage';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileSignature,
  FileText,
  History,
  Loader2,
  PenLine,
  Plus,
  QrCode,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { auth, db, handleFirestoreError, OperationType, storage, uploadWithRetry } from '../lib/firebase';

type SmartStatus =
  | 'rascunho'
  | 'em-preenchimento'
  | 'aguardando-aprovacao'
  | 'aprovado'
  | 'aguardando-assinatura'
  | 'assinado'
  | 'arquivado'
  | 'vencido'
  | 'cancelado';

type SmartFieldType = 'text' | 'textarea' | 'date' | 'select' | 'number';

type SmartField = {
  name: string;
  label: string;
  type?: SmartFieldType;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  colSpan?: 'full' | 'half';
};

type SmartTemplate = {
  id: string;
  title: string;
  shortName: string;
  category: string;
  description: string;
  collectionRef?: string;
  autoActionPlan?: boolean;
  storageFolder: string;
  defaultValidityMonths?: number;
  fields: SmartField[];
};

type SmartDocument = {
  id: string;
  templateId: string;
  templateTitle: string;
  category: string;
  status: SmartStatus;
  version: number;
  title?: string;
  responsible?: string;
  dueDate?: string;
  values?: Record<string, string>;
  signatureDataUrl?: string;
  signatureBy?: string | null;
  signatureAt?: string;
  pdfUrl?: string;
  pdfFilePath?: string;
  validationId?: string;
  validationUrl?: string;
  hash?: string;
  createdByEmail?: string | null;
  createdAt?: { toDate?: () => Date } | Date | string | null;
  updatedAt?: { toDate?: () => Date } | Date | string | null;
};

const smartTemplates: SmartTemplate[] = [
  {
    id: 'checklist-inspecao-eletrica',
    title: 'Checklist Inteligente de Inspeção Elétrica',
    shortName: 'Checklist Elétrico',
    category: 'Inspeção / Evidência',
    description: 'Registra condição de quadros, máquinas, cabos, identificação, aterramento e gera plano de ação quando houver não conformidade.',
    storageFolder: 'documentos-inteligentes/checklist-eletrico',
    autoActionPlan: true,
    fields: [
      { name: 'local', label: 'Local / setor', required: true, placeholder: 'Ex: Sala elétrica, produção, QGBT 380 V' },
      { name: 'equipamento', label: 'Quadro / equipamento / TAG', required: true, placeholder: 'Ex: TAG-23, QGBT-01, Máquina extrusora' },
      { name: 'condicao', label: 'Condição observada', type: 'textarea', required: true, colSpan: 'full' },
      { name: 'criticidade', label: 'Criticidade', type: 'select', required: true, options: [
        { label: 'Baixa', value: 'baixa' },
        { label: 'Média', value: 'media' },
        { label: 'Alta', value: 'alta' },
        { label: 'Crítica', value: 'critica' },
      ] },
      { name: 'risco', label: 'Risco associado', type: 'textarea', required: true, colSpan: 'full' },
      { name: 'recomendacao', label: 'Ação recomendada', type: 'textarea', required: true, colSpan: 'full' },
      { name: 'responsavelAcao', label: 'Responsável pela ação', placeholder: 'Nome ou setor responsável' },
      { name: 'prazoAcao', label: 'Prazo da ação', type: 'date' },
    ],
  },
  {
    id: 'apr-digital',
    title: 'APR Digital - Análise Preliminar de Risco',
    shortName: 'APR Digital',
    category: 'Procedimento / Segurança',
    description: 'Formaliza riscos, medidas de controle, equipe envolvida, autorização e assinatura para serviços elétricos.',
    storageFolder: 'documentos-inteligentes/apr-digital',
    fields: [
      { name: 'atividade', label: 'Atividade', required: true, placeholder: 'Ex: Manutenção preventiva no QGBT' },
      { name: 'local', label: 'Local de execução', required: true },
      { name: 'equipe', label: 'Equipe envolvida', type: 'textarea', required: true, colSpan: 'full' },
      { name: 'riscos', label: 'Riscos identificados', type: 'textarea', required: true, colSpan: 'full' },
      { name: 'medidasControle', label: 'Medidas de controle', type: 'textarea', required: true, colSpan: 'full' },
      { name: 'epis', label: 'EPI/EPC obrigatórios', type: 'textarea', colSpan: 'full' },
      { name: 'dataExecucao', label: 'Data de execução', type: 'date', required: true },
      { name: 'responsavel', label: 'Responsável pela liberação', required: true },
    ],
  },
  {
    id: 'pt-eletrica',
    title: 'PT Digital - Permissão de Trabalho Elétrico',
    shortName: 'PT Digital',
    category: 'Autorização / Segurança',
    description: 'Controla autorização formal para serviços elétricos, liberação, bloqueio, condição segura e encerramento.',
    storageFolder: 'documentos-inteligentes/pt-eletrica',
    fields: [
      { name: 'numeroPt', label: 'Número da PT', placeholder: 'Ex: PT-2026-001' },
      { name: 'servico', label: 'Serviço autorizado', required: true },
      { name: 'local', label: 'Local / equipamento', required: true },
      { name: 'dataInicio', label: 'Data de início', type: 'date', required: true },
      { name: 'dataFim', label: 'Data prevista de encerramento', type: 'date' },
      { name: 'fontesEnergia', label: 'Fontes de energia envolvidas', type: 'textarea', colSpan: 'full' },
      { name: 'condicoesSeguras', label: 'Condições de segurança verificadas', type: 'textarea', colSpan: 'full' },
      { name: 'responsavelLiberacao', label: 'Responsável pela liberação', required: true },
    ],
  },
  {
    id: 'loto-digital',
    title: 'LOTO Digital - Bloqueio e Etiquetagem',
    shortName: 'LOTO Digital',
    category: 'Bloqueio / Segurança',
    description: 'Registra fontes bloqueadas, dispositivos de bloqueio, etiquetas, teste de ausência de tensão e liberação final.',
    storageFolder: 'documentos-inteligentes/loto-digital',
    fields: [
      { name: 'equipamento', label: 'Equipamento / circuito bloqueado', required: true },
      { name: 'fontesBloqueadas', label: 'Fontes bloqueadas', type: 'textarea', required: true, colSpan: 'full' },
      { name: 'dispositivosBloqueio', label: 'Dispositivos de bloqueio utilizados', type: 'textarea', colSpan: 'full' },
      { name: 'testeAusenciaTensao', label: 'Teste de ausência de tensão realizado?', type: 'select', required: true, options: [
        { label: 'Sim', value: 'sim' },
        { label: 'Não', value: 'nao' },
        { label: 'Não aplicável', value: 'nao-aplicavel' },
      ] },
      { name: 'responsavelBloqueio', label: 'Responsável pelo bloqueio', required: true },
      { name: 'dataBloqueio', label: 'Data do bloqueio', type: 'date', required: true },
      { name: 'observacoes', label: 'Observações', type: 'textarea', colSpan: 'full' },
    ],
  },
  {
    id: 'laudo-ensaios-digital',
    title: 'Laudo de Ensaios Elétricos Digital',
    shortName: 'Laudo de Ensaios',
    category: 'Laudo / Medição',
    description: 'Registra medições, instrumentos, resultados, parecer técnico e gera PDF final assinado.',
    storageFolder: 'documentos-inteligentes/laudo-ensaios',
    defaultValidityMonths: 12,
    fields: [
      { name: 'tipoEnsaio', label: 'Tipo de ensaio', type: 'select', required: true, options: [
        { label: 'Resistência de isolamento', value: 'resistencia-isolamento' },
        { label: 'Continuidade do PE', value: 'continuidade-pe' },
        { label: 'Medição de aterramento', value: 'aterramento' },
        { label: 'Teste de DR/IDR', value: 'dr-idr' },
        { label: 'Termografia', value: 'termografia' },
        { label: 'Qualidade de energia', value: 'qualidade-energia' },
      ] },
      { name: 'equipamento', label: 'Equipamento / circuito ensaiado', required: true },
      { name: 'instrumento', label: 'Instrumento utilizado', placeholder: 'Ex: Megômetro, terrômetro, câmera termográfica' },
      { name: 'numeroSerie', label: 'Nº série / certificado', placeholder: 'Identificação do instrumento' },
      { name: 'valoresMedidos', label: 'Valores medidos', type: 'textarea', required: true, colSpan: 'full' },
      { name: 'parecerTecnico', label: 'Parecer técnico', type: 'textarea', required: true, colSpan: 'full' },
      { name: 'responsavelTecnico', label: 'Responsável técnico', required: true },
    ],
  },
  {
    id: 'termo-designacao-pie',
    title: 'Termo de Designação do Responsável pelo PIE',
    shortName: 'Designação PIE',
    category: 'Documento obrigatório',
    description: 'Formaliza a pessoa responsável pela organização, guarda, atualização e disponibilidade do prontuário.',
    storageFolder: 'documentos-inteligentes/designacao-pie',
    defaultValidityMonths: 12,
    fields: [
      { name: 'empresa', label: 'Empresa', required: true, placeholder: 'Acreplast Ind. e Com. de Embalagens LTDA' },
      { name: 'cnpj', label: 'CNPJ', placeholder: '04.045.309/0001-59' },
      { name: 'responsavelPie', label: 'Responsável designado pelo PIE', required: true },
      { name: 'funcao', label: 'Função / cargo', required: true },
      { name: 'responsavelTecnico', label: 'Responsável técnico', placeholder: 'Nome e registro profissional' },
      { name: 'dataDesignacao', label: 'Data da designação', type: 'date', required: true },
      { name: 'atribuicoes', label: 'Atribuições e responsabilidades', type: 'textarea', colSpan: 'full' },
    ],
  },
  {
    id: 'autorizacao-trabalhador-nr10',
    title: 'Autorização Digital de Trabalhador NR-10',
    shortName: 'Autorização NR-10',
    category: 'Trabalhadores / Autorização',
    description: 'Controla autorização formal de trabalhadores, treinamentos, validade e assinatura do responsável.',
    storageFolder: 'documentos-inteligentes/autorizacao-nr10',
    defaultValidityMonths: 24,
    fields: [
      { name: 'trabalhador', label: 'Nome do trabalhador', required: true },
      { name: 'funcao', label: 'Função', required: true },
      { name: 'treinamento', label: 'Treinamento', type: 'select', required: true, options: [
        { label: 'NR-10 Básico', value: 'nr10-basico' },
        { label: 'NR-10 SEP', value: 'nr10-sep' },
        { label: 'Reciclagem NR-10', value: 'reciclagem-nr10' },
      ] },
      { name: 'validadeCertificado', label: 'Validade do certificado', type: 'date', required: true },
      { name: 'atividadesAutorizadas', label: 'Atividades autorizadas', type: 'textarea', required: true, colSpan: 'full' },
      { name: 'restricoes', label: 'Restrições / observações', type: 'textarea', colSpan: 'full' },
      { name: 'responsavelAutorizacao', label: 'Responsável pela autorização', required: true },
    ],
  },
  {
    id: 'controle-epi-epc-digital',
    title: 'Controle Digital de EPI/EPC/Ferramental',
    shortName: 'Controle EPI/EPC',
    category: 'EPI / EPC / Ferramental',
    description: 'Registra entrega, validade, CA/certificado, condição, teste de isolação e ciência do trabalhador.',
    storageFolder: 'documentos-inteligentes/controle-epi-epc',
    fields: [
      { name: 'item', label: 'Item entregue / controlado', required: true, placeholder: 'Ex: Luva isolante classe 00' },
      { name: 'tipo', label: 'Tipo', type: 'select', required: true, options: [
        { label: 'EPI', value: 'epi' },
        { label: 'EPC', value: 'epc' },
        { label: 'Ferramental isolado', value: 'ferramental-isolado' },
        { label: 'Instrumento de medição', value: 'instrumento-medicao' },
      ] },
      { name: 'caCertificado', label: 'CA / certificado / patrimônio' },
      { name: 'validade', label: 'Validade', type: 'date' },
      { name: 'trabalhadorResponsavel', label: 'Trabalhador responsável' },
      { name: 'condicao', label: 'Condição do item', type: 'select', options: [
        { label: 'Apto', value: 'apto' },
        { label: 'Apto com observação', value: 'apto-observacao' },
        { label: 'Reprovado', value: 'reprovado' },
        { label: 'Vencido', value: 'vencido' },
      ] },
      { name: 'observacoes', label: 'Observações', type: 'textarea', colSpan: 'full' },
    ],
  },
  {
    id: 'evidencias-tag',
    title: 'Registro Inteligente de Evidências por TAG',
    shortName: 'Evidências TAG',
    category: 'Evidências / Plano de ação',
    description: 'Controla foto antes, orientação técnica, responsável, correção, foto depois, aprovação e encerramento da TAG.',
    storageFolder: 'documentos-inteligentes/evidencias-tag',
    autoActionPlan: true,
    fields: [
      { name: 'tag', label: 'TAG da evidência', required: true, placeholder: 'Ex: TAG-23' },
      { name: 'local', label: 'Local / equipamento', required: true },
      { name: 'descricao', label: 'Descrição da evidência', type: 'textarea', required: true, colSpan: 'full' },
      { name: 'risco', label: 'Risco associado', type: 'textarea', required: true, colSpan: 'full' },
      { name: 'orientacao', label: 'Orientação de adequação', type: 'textarea', required: true, colSpan: 'full' },
      { name: 'responsavelAcao', label: 'Responsável pela correção' },
      { name: 'prazoAcao', label: 'Prazo da correção', type: 'date' },
      { name: 'statusCorrecao', label: 'Status da correção', type: 'select', options: [
        { label: 'Pendente', value: 'pendente' },
        { label: 'Em execução', value: 'em-execucao' },
        { label: 'Corrigido', value: 'corrigido' },
        { label: 'Aprovado', value: 'aprovado' },
      ] },
    ],
  },
];

const statusLabels: Record<SmartStatus, string> = {
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

const statusClasses: Record<SmartStatus, string> = {
  rascunho: 'bg-slate-500/10 text-text-secondary border-border',
  'em-preenchimento': 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  'aguardando-aprovacao': 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  aprovado: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  'aguardando-assinatura': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  assinado: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  arquivado: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  vencido: 'bg-red-500/10 text-red-300 border-red-500/30',
  cancelado: 'bg-red-500/10 text-red-300 border-red-500/30',
};

function emptyValues(template: SmartTemplate) {
  return Object.fromEntries(template.fields.map(field => [field.name, '']));
}

function sanitizeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
}

function getTemplate(templateId: string) {
  return smartTemplates.find(template => template.id === templateId) || smartTemplates[0];
}

function getDocumentTitle(document: SmartDocument) {
  const values = document.values || {};
  return (
    document.title ||
    values.titulo ||
    values.atividade ||
    values.equipamento ||
    values.tag ||
    values.trabalhador ||
    values.item ||
    document.templateTitle
  );
}

function formatDate(value: SmartDocument['createdAt']) {
  if (!value) return 'Sem data';
  try {
    if (typeof value === 'string') return new Date(value).toLocaleDateString('pt-BR');
    if (value instanceof Date) return value.toLocaleDateString('pt-BR');
    return value.toDate?.().toLocaleDateString('pt-BR') || 'Sem data';
  } catch {
    return 'Sem data';
  }
}

function getTimestamp(document: SmartDocument) {
  const value = document.updatedAt || document.createdAt;
  try {
    if (!value) return 0;
    if (typeof value === 'string') return new Date(value).getTime() || 0;
    if (value instanceof Date) return value.getTime();
    return value.toDate?.().getTime() || 0;
  } catch {
    return 0;
  }
}

async function sha256(text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function getValidationUrl(id: string) {
  const baseUrl = import.meta.env.APP_URL || import.meta.env.VITE_APP_URL || window.location.origin;
  return `${baseUrl.replace(/\/$/, '')}/validar-documento/${id}`;
}

function getStatusCount(documents: SmartDocument[], status: SmartStatus) {
  return documents.filter(document => document.status === status).length;
}

export default function DocumentosInteligentes() {
  const [documents, setDocuments] = useState<SmartDocument[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(smartTemplates[0].id);
  const [values, setValues] = useState<Record<string, string>>(emptyValues(smartTemplates[0]));
  const [attachments, setAttachments] = useState<FileList | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | SmartStatus>('todos');
  const [templateFilter, setTemplateFilter] = useState('todos');
  const [signingDocument, setSigningDocument] = useState<SmartDocument | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);
  const signatureRef = useRef<SignatureCanvas | null>(null);

  const selectedTemplate = useMemo(() => getTemplate(selectedTemplateId), [selectedTemplateId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'smartDocuments'),
      snapshot => {
        const data = snapshot.docs
          .map(item => ({ id: item.id, ...item.data() } as SmartDocument))
          .sort((a, b) => getTimestamp(b) - getTimestamp(a));
        setDocuments(data);
      },
      error => handleFirestoreError(error, OperationType.LIST, 'smartDocuments')
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    setValues(emptyValues(selectedTemplate));
    setAttachments(null);
  }, [selectedTemplate]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(document => {
      const statusMatches = statusFilter === 'todos' || document.status === statusFilter;
      const templateMatches = templateFilter === 'todos' || document.templateId === templateFilter;
      return statusMatches && templateMatches;
    });
  }, [documents, statusFilter, templateFilter]);

  async function addAudit(documentId: string, action: string, details?: Record<string, unknown>) {
    await addDoc(collection(db, 'auditLogs'), {
      module: 'Documentos Inteligentes',
      documentId,
      action,
      details: details || {},
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid || null,
      createdByEmail: auth.currentUser?.email || null,
    });
  }

  async function createActionPlanFromDocument(documentId: string, template: SmartTemplate, formValues: Record<string, string>) {
    if (!template.autoActionPlan) return;

    const priorityMap: Record<string, string> = {
      baixa: 'low',
      media: 'medium',
      alta: 'high',
      critica: 'critical',
    };

    await addDoc(collection(db, 'actionPlan'), {
      name: formValues.recomendacao || formValues.orientacao || `Tratar pendência do documento ${template.shortName}`,
      description: formValues.condicao || formValues.descricao || formValues.risco || '',
      responsible: formValues.responsavelAcao || 'Responsável técnico',
      deadline: formValues.prazoAcao || '',
      priority: priorityMap[formValues.criticidade] || 'medium',
      status: 'pending',
      source: 'smartDocuments',
      sourceDocumentId: documentId,
      createdAt: serverTimestamp(),
      createdByEmail: auth.currentUser?.email || null,
    });
  }

  async function handleCreateDocument(event: FormEvent, nextStatus: SmartStatus) {
    event.preventDefault();
    setMessage('');

    const missingRequiredField = selectedTemplate.fields.find(field => field.required && !values[field.name]?.trim());
    if (missingRequiredField) {
      setMessage(`Preencha o campo obrigatório: ${missingRequiredField.label}.`);
      return;
    }

    setIsSaving(true);

    try {
      const uploadedFiles: { name: string; url: string; path: string; type: string; size: number }[] = [];

      if (attachments?.length) {
        for (const file of Array.from(attachments)) {
          const filePath = `${selectedTemplate.storageFolder}/anexos/${Date.now()}_${sanitizeFileName(file.name)}`;
          const storageRef = ref(storage, filePath);
          await uploadWithRetry(storageRef, file);
          const url = await getDownloadURL(storageRef);
          uploadedFiles.push({ name: file.name, url, path: filePath, type: file.type, size: file.size });
        }
      }

      const dueDate = values.validade || values.proximaRevisao || values.validadeCertificado || values.prazoAcao || '';
      const docRef = await addDoc(collection(db, 'smartDocuments'), {
        templateId: selectedTemplate.id,
        templateTitle: selectedTemplate.title,
        category: selectedTemplate.category,
        status: nextStatus,
        version: 1,
        title: values.titulo || values.atividade || values.equipamento || values.tag || values.trabalhador || values.item || selectedTemplate.title,
        responsible: values.responsavel || values.responsavelTecnico || values.responsavelAutorizacao || values.responsavelAcao || values.responsavelPie || '',
        dueDate,
        values,
        attachments: uploadedFiles,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
        createdByEmail: auth.currentUser?.email || null,
      });

      await addAudit(docRef.id, 'Documento criado', { status: nextStatus, templateId: selectedTemplate.id });
      await createActionPlanFromDocument(docRef.id, selectedTemplate, values);

      setMessage(`Documento inteligente criado como ${statusLabels[nextStatus]}.`);
      setValues(emptyValues(selectedTemplate));
      setAttachments(null);
      setIsFormOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'smartDocuments');
      setMessage('Erro ao criar documento inteligente. Verifique login, regras do Firestore e Storage.');
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(documentItem: SmartDocument, nextStatus: SmartStatus, action: string) {
    try {
      await updateDoc(doc(db, 'smartDocuments', documentItem.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      await addAudit(documentItem.id, action, { from: documentItem.status, to: nextStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `smartDocuments/${documentItem.id}`);
      setMessage('Erro ao atualizar status do documento.');
    }
  }

  async function signDocument() {
    if (!signingDocument) return;

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setMessage('Assine no campo antes de confirmar.');
      return;
    }

    try {
      const signatureDataUrl = signatureRef.current.toDataURL('image/png');
      const signatureAt = new Date().toISOString();

      await updateDoc(doc(db, 'smartDocuments', signingDocument.id), {
        signatureDataUrl,
        signatureBy: auth.currentUser?.email || null,
        signatureAt,
        status: 'assinado',
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'digitalSignatures'), {
        documentId: signingDocument.id,
        signatureBy: auth.currentUser?.email || null,
        signatureAt,
        type: 'assinatura-na-tela',
        createdAt: serverTimestamp(),
      });

      await addAudit(signingDocument.id, 'Documento assinado', { signatureBy: auth.currentUser?.email || null });
      setSigningDocument(null);
      setMessage('Documento assinado com sucesso. Agora você pode gerar o PDF final.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `smartDocuments/${signingDocument.id}`);
      setMessage('Erro ao assinar documento.');
    }
  }

  async function generatePdf(documentItem: SmartDocument) {
    setIsGeneratingPdf(documentItem.id);
    setMessage('');

    try {
      const template = getTemplate(documentItem.templateId);
      const validationId = documentItem.validationId || documentItem.id;
      const validationUrl = getValidationUrl(validationId);
      const values = documentItem.values || {};
      const hash = await sha256(JSON.stringify({ ...documentItem, updatedAt: undefined, createdAt: undefined }));

      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 14;
      let y = 18;

      const addTextBlock = (label: string, text: string) => {
        if (!text) return;
        if (y > 260) {
          pdf.addPage();
          y = 18;
        }
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(label, margin, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        const lines = pdf.splitTextToSize(text, pageWidth - margin * 2);
        pdf.text(lines, margin, y);
        y += lines.length * 4.5 + 4;
      };

      pdf.setFillColor(249, 115, 22);
      pdf.rect(0, 0, pageWidth, 10, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(15);
      pdf.text('PIE ACREPLAST NR-10', margin, y);
      y += 8;
      pdf.setFontSize(11);
      pdf.text(template.title, margin, y);
      y += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Status: ${statusLabels[documentItem.status]} | Versão: ${documentItem.version || 1}`, margin, y);
      y += 6;
      pdf.text(`Emitido por: ${documentItem.createdByEmail || auth.currentUser?.email || 'Não informado'}`, margin, y);
      y += 6;
      pdf.text(`Hash: ${hash.slice(0, 32)}...`, margin, y);
      y += 8;

      pdf.setDrawColor(220);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 7;

      for (const field of template.fields) {
        addTextBlock(field.label, values[field.name] || 'Não informado');
      }

      if (documentItem.signatureDataUrl) {
        if (y > 220) {
          pdf.addPage();
          y = 18;
        }
        pdf.setFont('helvetica', 'bold');
        pdf.text('Assinatura digital registrada no aplicativo', margin, y);
        y += 4;
        pdf.addImage(documentItem.signatureDataUrl, 'PNG', margin, y, 70, 28);
        y += 32;
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Assinado por: ${documentItem.signatureBy || 'Não informado'}`, margin, y);
        y += 5;
        pdf.text(`Data/hora: ${documentItem.signatureAt ? new Date(documentItem.signatureAt).toLocaleString('pt-BR') : 'Não informado'}`, margin, y);
        y += 8;
      }

      addTextBlock('Validação por QR Code', validationUrl);

      const blob = pdf.output('blob');
      const fileName = `${sanitizeFileName(template.shortName)}_${documentItem.id}.pdf`;
      const filePath = `${template.storageFolder}/pdf-final/${fileName}`;
      const storageRef = ref(storage, filePath);
      const file = new File([blob], fileName, { type: 'application/pdf' });
      await uploadWithRetry(storageRef, file);
      const pdfUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'smartDocuments', documentItem.id), {
        pdfUrl,
        pdfFilePath: filePath,
        validationId,
        validationUrl,
        hash,
        status: documentItem.status === 'assinado' ? 'arquivado' : documentItem.status,
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'smartDocumentVersions'), {
        documentId: documentItem.id,
        version: documentItem.version || 1,
        pdfUrl,
        pdfFilePath: filePath,
        hash,
        createdAt: serverTimestamp(),
        createdByEmail: auth.currentUser?.email || null,
      });

      await addDoc(collection(db, 'qrValidationLinks'), {
        documentId: documentItem.id,
        validationId,
        title: getDocumentTitle(documentItem),
        templateTitle: template.title,
        status: documentItem.status === 'assinado' ? 'arquivado' : documentItem.status,
        hash,
        isPublic: true,
        createdAt: serverTimestamp(),
      });

      await addAudit(documentItem.id, 'PDF final gerado', { pdfFilePath: filePath, validationId });
      setMessage('PDF final gerado, versionado e arquivado com QR Code de validação.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `smartDocuments/${documentItem.id}`);
      setMessage('Erro ao gerar PDF final. Verifique Storage e permissões.');
    } finally {
      setIsGeneratingPdf(null);
    }
  }

  async function deleteSmartDocument(documentItem: SmartDocument) {
    if (!window.confirm(`Excluir o documento "${getDocumentTitle(documentItem)}"?`)) return;

    try {
      if (documentItem.pdfFilePath) {
        await deleteObject(ref(storage, documentItem.pdfFilePath)).catch(() => undefined);
      }
      await deleteDoc(doc(db, 'smartDocuments', documentItem.id));
      await addAudit(documentItem.id, 'Documento excluído');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `smartDocuments/${documentItem.id}`);
      setMessage('Erro ao excluir documento inteligente.');
    }
  }

  return (
    <div className="space-y-6">
      <header className="bg-surface border border-border rounded-2xl p-5 md:p-7 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-72 h-72 bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col xl:flex-row gap-6 xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] uppercase tracking-[0.25em] font-mono mb-4">
              <Sparkles size={14} /> Novo módulo digital
            </div>
            <h1 className="text-2xl md:text-4xl font-display font-bold text-text-primary tracking-tight">Documentos Digitais Inteligentes</h1>
            <p className="text-sm md:text-base text-text-secondary mt-3 leading-relaxed">
              Crie, preencha, aprove, assine, gere PDF final, versionamento e QR Code para documentos do Prontuário NR-10 sem depender de papel.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 xl:min-w-[560px]">
            <SmartStat label="Total" value={documents.length} />
            <SmartStat label="Aprovação" value={getStatusCount(documents, 'aguardando-aprovacao')} tone="warn" />
            <SmartStat label="Assinados" value={getStatusCount(documents, 'assinado') + getStatusCount(documents, 'arquivado')} tone="ok" />
            <SmartStat label="Rascunhos" value={getStatusCount(documents, 'rascunho')} />
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InfoCard title="Fluxo inteligente" icon={<FileSignature size={18} />} items={['Rascunho', 'Aprovação técnica', 'Assinatura na tela', 'PDF final + QR Code']} />
        <InfoCard title="Integrações automáticas" icon={<ClipboardCheck size={18} />} items={['Plano de ação para não conformidades', 'Histórico de auditoria', 'Storage para anexos e PDFs']} />
        <InfoCard title="Modelos prontos" icon={<FileText size={18} />} items={['APR, PT e LOTO', 'Ensaios elétricos', 'TAGs, EPI/EPC e autorização NR-10']} />
      </section>

      <section className="bg-surface/80 border border-border rounded-2xl p-4 md:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <select
              value={templateFilter}
              onChange={event => setTemplateFilter(event.target.value)}
              className="bg-surface-active border border-border rounded-lg py-2.5 px-3 text-sm text-text-primary focus:border-orange-500/60 outline-none flex-1"
            >
              <option value="todos">Todos os modelos</option>
              {smartTemplates.map(template => <option key={template.id} value={template.id}>{template.shortName}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value as 'todos' | SmartStatus)}
              className="bg-surface-active border border-border rounded-lg py-2.5 px-3 text-sm text-text-primary focus:border-orange-500/60 outline-none flex-1"
            >
              <option value="todos">Todos os status</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <button
            onClick={() => setIsFormOpen(previous => !previous)}
            className="inline-flex items-center justify-center gap-2 bg-orange-600/90 text-white px-4 py-2.5 rounded-lg hover:bg-orange-500 transition-all font-bold text-xs uppercase tracking-widest border border-orange-400/20"
          >
            {isFormOpen ? <X size={16} /> : <Plus size={16} />}
            {isFormOpen ? 'Fechar' : 'Novo documento inteligente'}
          </button>
        </div>

        {message && (
          <div className="flex items-start gap-2 text-sm text-text-secondary bg-surface-active border border-border rounded-xl p-3">
            <AlertTriangle size={17} className="text-orange-400 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}
      </section>

      <AnimatePresence>
        {isFormOpen && (
          <motion.form
            onSubmit={event => handleCreateDocument(event, 'rascunho')}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface border border-border-strong rounded-2xl p-5 md:p-6 space-y-5 overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-3">
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide">Modelo inteligente</label>
                <select
                  value={selectedTemplateId}
                  onChange={event => setSelectedTemplateId(event.target.value)}
                  className="w-full bg-surface-active border border-border-strong rounded-lg p-3 text-sm text-text-primary focus:border-orange-500/60 outline-none"
                >
                  {smartTemplates.map(template => <option key={template.id} value={template.id}>{template.title}</option>)}
                </select>
                <div className="rounded-xl border border-border bg-surface-active p-4">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-orange-400 font-mono mb-2">{selectedTemplate.category}</p>
                  <h2 className="text-base font-bold text-text-primary">{selectedTemplate.shortName}</h2>
                  <p className="text-sm text-text-secondary mt-2 leading-relaxed">{selectedTemplate.description}</p>
                  {selectedTemplate.autoActionPlan && (
                    <p className="mt-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                      Este modelo cria item automático no Plano de Ação quando salvo.
                    </p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTemplate.fields.map(field => (
                  <SmartFieldInput
                    key={field.name}
                    field={field}
                    value={values[field.name] || ''}
                    onChange={value => setValues(previous => ({ ...previous, [field.name]: value }))}
                  />
                ))}

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Anexos e evidências</label>
                  <input
                    type="file"
                    multiple
                    onChange={event => setAttachments(event.target.files)}
                    className="w-full bg-surface-active border border-border-strong rounded-lg p-3 text-sm text-text-primary focus:border-orange-500/60 outline-none"
                  />
                  <p className="text-xs text-text-tertiary mt-2">Inclua fotos antes/depois, PDFs, certificados, evidências e relatórios complementares.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end border-t border-border pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                Salvar rascunho
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={event => handleCreateDocument(event as unknown as FormEvent, 'aguardando-aprovacao')}
                className="px-5 py-2.5 rounded-lg bg-orange-600/90 text-white hover:bg-orange-500 transition-colors text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Enviar para aprovação
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredDocuments.length === 0 ? (
          <div className="xl:col-span-2 border border-dashed border-border rounded-2xl p-10 text-center bg-surface/60">
            <FileText className="mx-auto text-text-tertiary mb-3" />
            <p className="text-text-secondary">Nenhum documento inteligente encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          filteredDocuments.map(documentItem => (
            <article key={documentItem.id} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-orange-400 font-mono">{documentItem.category}</p>
                  <h3 className="text-lg font-bold text-text-primary mt-1">{getDocumentTitle(documentItem)}</h3>
                  <p className="text-sm text-text-secondary mt-1">{documentItem.templateTitle}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border self-start ${statusClasses[documentItem.status]}`}>
                  {statusLabels[documentItem.status]}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <MiniMeta label="Versão" value={`Rev. ${documentItem.version || 1}`} />
                <MiniMeta label="Criado por" value={documentItem.createdByEmail || 'Não informado'} />
                <MiniMeta label="Atualização" value={formatDate(documentItem.updatedAt || documentItem.createdAt)} />
                <MiniMeta label="Responsável" value={documentItem.responsible || 'Não informado'} />
              </div>

              {documentItem.validationUrl && (
                <div className="flex flex-col sm:flex-row gap-4 items-start border border-border rounded-xl p-4 bg-surface-active">
                  <QRCodeSVG value={documentItem.validationUrl} size={82} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-text-primary"><QrCode size={16} /> QR Code de validação</div>
                    <p className="text-xs text-text-secondary mt-1 break-all">{documentItem.validationUrl}</p>
                    {documentItem.hash && <p className="text-[10px] text-text-tertiary mt-2 break-all">Hash: {documentItem.hash}</p>}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {(documentItem.status === 'rascunho' || documentItem.status === 'em-preenchimento') && (
                  <ActionButton icon={<Send size={15} />} label="Enviar aprovação" onClick={() => updateStatus(documentItem, 'aguardando-aprovacao', 'Enviado para aprovação')} />
                )}
                {documentItem.status === 'aguardando-aprovacao' && (
                  <ActionButton icon={<ShieldCheck size={15} />} label="Aprovar" onClick={() => updateStatus(documentItem, 'aguardando-assinatura', 'Aprovado tecnicamente')} />
                )}
                {(documentItem.status === 'aguardando-assinatura' || documentItem.status === 'aprovado') && (
                  <ActionButton icon={<PenLine size={15} />} label="Assinar" onClick={() => setSigningDocument(documentItem)} />
                )}
                {(documentItem.status === 'assinado' || documentItem.status === 'arquivado') && (
                  <ActionButton
                    icon={isGeneratingPdf === documentItem.id ? <Loader2 size={15} className="animate-spin" /> : <FileCheck2 size={15} />}
                    label={documentItem.pdfUrl ? 'Atualizar PDF' : 'Gerar PDF final'}
                    onClick={() => generatePdf(documentItem)}
                    disabled={isGeneratingPdf === documentItem.id}
                  />
                )}
                {documentItem.pdfUrl && (
                  <a href={documentItem.pdfUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2">
                    <FileText size={15} /> Abrir PDF
                  </a>
                )}
                {documentItem.status !== 'arquivado' && documentItem.status === 'assinado' && (
                  <ActionButton icon={<Archive size={15} />} label="Arquivar" onClick={() => updateStatus(documentItem, 'arquivado', 'Documento arquivado')} />
                )}
                <ActionButton icon={<Trash2 size={15} />} label="Excluir" onClick={() => deleteSmartDocument(documentItem)} danger />
              </div>
            </article>
          ))
        )}
      </section>

      <AnimatePresence>
        {signingDocument && (
          <motion.div className="fixed inset-0 z-[80] bg-black/70 p-4 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-surface border border-border-strong rounded-2xl p-5 w-full max-w-2xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Assinatura digital na tela</h2>
                  <p className="text-sm text-text-secondary mt-1">Documento: {getDocumentTitle(signingDocument)}</p>
                </div>
                <button onClick={() => setSigningDocument(null)} className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover"><X size={18} /></button>
              </div>

              <div className="rounded-xl border border-border bg-white p-2">
                <SignatureCanvas
                  ref={signatureRef}
                  penColor="black"
                  canvasProps={{ className: 'w-full h-56 rounded-lg bg-white' }}
                />
              </div>

              <p className="text-xs text-text-tertiary leading-relaxed">
                Esta assinatura registra ciência/aprovação dentro do aplicativo. Para laudos conclusivos, ART/TRT ou documentos que exigirem validade externa, mantenha também assinatura GOV.BR, ICP-Brasil ou certificado aplicável.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button onClick={() => signatureRef.current?.clear()} className="px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover text-xs font-bold uppercase tracking-widest">Limpar</button>
                <button onClick={signDocument} className="px-5 py-2.5 rounded-lg bg-orange-600/90 text-white hover:bg-orange-500 text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> Confirmar assinatura
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SmartFieldInput({ field, value, onChange }: { field: SmartField; value: string; onChange: (value: string) => void }) {
  const className = field.colSpan === 'full' ? 'md:col-span-2' : '';
  const baseClass = 'w-full bg-surface-active border border-border-strong rounded-lg p-3 text-sm text-text-primary placeholder-text-tertiary focus:border-orange-500/60 outline-none';

  return (
    <div className={className}>
      <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">
        {field.label} {field.required && <span className="text-orange-400">*</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea value={value} onChange={event => onChange(event.target.value)} placeholder={field.placeholder} className={`${baseClass} min-h-28 resize-y`} />
      ) : field.type === 'select' ? (
        <select value={value} onChange={event => onChange(event.target.value)} className={baseClass}>
          <option value="">Selecione</option>
          {field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : (
        <input type={field.type || 'text'} value={value} onChange={event => onChange(event.target.value)} placeholder={field.placeholder} className={baseClass} />
      )}
    </div>
  );
}

function SmartStat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'ok' | 'warn' }) {
  const color = tone === 'ok' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : 'text-text-primary';
  return (
    <div className="bg-surface-active border border-border rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary font-mono">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function InfoCard({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 text-orange-400 font-bold text-sm uppercase tracking-[0.15em] mb-3">{icon} {title}</div>
      <ul className="space-y-2 text-sm text-text-secondary">
        {items.map(item => <li key={item} className="flex gap-2"><span className="text-orange-400">•</span><span>{item}</span></li>)}
      </ul>
    </div>
  );
}

function MiniMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-active p-3 min-w-0">
      <p className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary font-mono">{label}</p>
      <p className="text-xs text-text-primary mt-1 truncate">{value}</p>
    </div>
  );
}

function ActionButton({ icon, label, onClick, danger, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
        danger
          ? 'border-red-500/30 text-red-300 hover:bg-red-500/10'
          : 'border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover'
      }`}
    >
      {icon} {label}
    </button>
  );
}
