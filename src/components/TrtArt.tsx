import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType, uploadWithRetry } from '../lib/firebase';
import { Trash2, Search, FileText, FileUp, ExternalLink, Loader2, Plus, Calendar, Hash, FileX, Info, AlertTriangle, Check, X, ShieldAlert } from 'lucide-react';

type DocumentItem = { 
  id: string; 
  name: string; 
  url?: string;
  numero?: string;
  tipo?: 'TRT' | 'ART' | 'Outro';
  descricao?: string;
  dataEmissao?: string;
};

export default function TrtArt() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipo, setFilterTipo] = useState<'Todos' | 'TRT' | 'ART' | 'Outro'>('Todos');
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form State
  const [formTipo, setFormTipo] = useState<'TRT' | 'ART' | 'Outro'>('TRT');
  const [formNumero, setFormNumero] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formDataEmissao, setFormDataEmissao] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);

  // Deletion modals
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteAttachmentTargetId, setDeleteAttachmentTargetId] = useState<string | null>(null);

  // Target item for late attachments
  const [attachingToId, setAttachingToId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'trt-art'), (snapshot) => {
      setDocuments(snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          name: data.name || 'Sem anexo', 
          url: data.url,
          numero: data.numero || '',
          tipo: data.tipo || (data.name?.toUpperCase().includes('ART') ? 'ART' : 'TRT'),
          descricao: data.descricao || data.name || 'Sem descrição',
          dataEmissao: data.dataEmissao || ''
        } as DocumentItem;
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'trt-art');
    });
    return unsub;
  }, []);

  const deleteStorageFile = async (fileUrl?: string) => {
    if (!fileUrl) return;
    try {
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);
    } catch (error) {
      console.warn("Não foi possível excluir o arquivo do Storage:", error);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNumero.trim()) {
      alert("Por favor, preencha o número do documento.");
      return;
    }

    setIsUploading(true);
    try {
      let downloadURL = '';
      let fileName = 'Sem anexo';

      if (formFile) {
        fileName = formFile.name;
        const storageRef = ref(storage, `trt-art/${Date.now()}_${formFile.name}`);
        await uploadWithRetry(storageRef, formFile);
        downloadURL = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'trt-art'), {
        numero: formNumero,
        tipo: formTipo,
        descricao: formDescricao || `Registro de ${formTipo}`,
        dataEmissao: formDataEmissao,
        name: fileName,
        url: downloadURL || null
      });

      // Clear Form state
      setFormNumero('');
      setFormDescricao('');
      setFormDataEmissao('');
      setFormFile(null);
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'trt-art');
      alert("Erro ao salvar documentação.");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    const target = documents.find(d => d.id === id);
    try {
      if (target?.url) {
        await deleteStorageFile(target.url);
      }
      await deleteDoc(doc(db, 'trt-art', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trt-art/${id}`);
    }
  };

  const deleteAttachmentOnly = async (id: string) => {
    const target = documents.find(d => d.id === id);
    try {
      if (target?.url) {
        await deleteStorageFile(target.url);
      }
      await updateDoc(doc(db, 'trt-art', id), {
        url: null,
        name: 'Sem anexo'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trt-art/${id}`);
    }
  };

  const handleItemFileClick = (id: string) => {
    setAttachingToId(id);
    setTimeout(() => {
      itemFileInputRef.current?.click();
    }, 50);
  };

  const handleItemFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !attachingToId) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `trt-art/${Date.now()}_${file.name}`);
      await uploadWithRetry(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'trt-art', attachingToId), {
        name: file.name,
        url: downloadURL
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trt-art/${attachingToId}`);
      alert("Erro ao anexar arquivo.");
    } finally {
      setIsUploading(false);
      setAttachingToId(null);
      if (itemFileInputRef.current) itemFileInputRef.current.value = '';
    }
  };

  const filteredDocuments = documents.filter(d => {
    const matchesSearch = 
      (d.numero && d.numero.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.descricao && d.descricao.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.name && d.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = filterTipo === 'Todos' || d.tipo === filterTipo;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Search and Action Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative group w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within:text-cyan-400 transition-colors" size={16} />
          <input 
            placeholder="Buscar TRT, ART, número ou descrição..." 
            className="w-full bg-surface border border-border-strong rounded-lg p-3 pl-10 text-sm text-text-primary placeholder-text-tertiary focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto shrink-0 pb-1 md:pb-0">
          <button 
            onClick={() => setFilterTipo('Todos')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition-colors ${filterTipo === 'Todos' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-surface hover:bg-surface-hover text-text-secondary border border-border'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilterTipo('TRT')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition-colors ${filterTipo === 'TRT' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-surface hover:bg-surface-hover text-text-secondary border border-border'}`}
          >
            TRT
          </button>
          <button 
            onClick={() => setFilterTipo('ART')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition-colors ${filterTipo === 'ART' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-surface hover:bg-surface-hover text-text-secondary border border-border'}`}
          >
            ART
          </button>
          <button 
            onClick={() => setFilterTipo('Outro')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition-colors ${filterTipo === 'Outro' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-surface hover:bg-surface-hover text-text-secondary border border-border'}`}
          >
            Outro
          </button>
        </div>

        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="w-full md:w-auto bg-cyan-600/90 text-[#f0f8ff] hover:bg-cyan-500 border border-cyan-500/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shrink-0"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          {isAdding ? 'Fechar' : 'Novo Registro'}
        </button>
      </div>

      {/* Accordion Registration Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleRegister} className="bg-surface border border-border-strong rounded-xl p-6 space-y-4 shadow-lg relative">
              <div className="absolute right-4 top-4 text-[10px] text-cyan-400/50 font-mono tracking-widest">NOVO DOCUMENTO</div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Registrar TRT / ART</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Tipo de Documento</label>
                  <div className="flex bg-surface-active p-1 rounded-lg border border-border-strong">
                    {(['TRT', 'ART', 'Outro'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormTipo(t)}
                        className={`flex-1 py-2 rounded text-xs font-bold transition-all uppercase ${formTipo === t ? 'bg-cyan-500 text-[#f0f8ff] shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Nº do Documento / Registro</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/40" size={16} />
                    <input
                      type="text"
                      required
                      placeholder="Ex: CFT-1294852"
                      className="w-full bg-surface-active border border-border-strong rounded-lg p-2.5 pl-10 text-sm text-text-primary focus:border-cyan-500 outline-none transition-all"
                      value={formNumero}
                      onChange={e => setFormNumero(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Data de Emissão</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/40" size={16} />
                    <input
                      type="date"
                      className="w-full bg-surface-active border border-border-strong rounded-lg p-2.5 pl-10 text-sm text-text-primary focus:border-cyan-500 outline-none transition-all"
                      value={formDataEmissao}
                      onChange={e => setFormDataEmissao(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Descrição / Objeto do Serviço</label>
                <textarea
                  rows={2}
                  placeholder="Descrição da atividade técnica associada..."
                  className="w-full bg-surface-active border border-border-strong rounded-lg p-2.5 text-sm text-text-primary focus:border-cyan-500 outline-none transition-all resize-none"
                  value={formDescricao}
                  onChange={e => setFormDescricao(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Documento Anexo (Opcional - pode anexar depois)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${formFile ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-border hover:border-cyan-500/30'}`}
                >
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={e => e.target.files?.[0] && setFormFile(e.target.files[0])} 
                  />
                  {formFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText size={20} className="text-cyan-400" />
                      <span className="text-sm font-medium text-cyan-300 truncate max-w-sm">{formFile.name}</span>
                      <button 
                        type="button" 
                        onClick={e => { e.stopPropagation(); setFormFile(null); }} 
                        className="p-1 hover:bg-cyan-500/20 rounded text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <FileUp size={24} className="mx-auto text-text-tertiary" />
                      <p className="text-xs text-text-secondary font-medium">Clique para selecionar o PDF/Imagem para este documento</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)} 
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary border border-transparent hover:border-border rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="bg-cyan-600/90 text-white hover:bg-cyan-500 border border-cyan-500/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-30 disabled:hover:shadow-none"
                >
                  {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Salvar Documento
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invisible file input for quick direct attachments */}
      <input 
        type="file" 
        className="hidden" 
        ref={itemFileInputRef} 
        onChange={handleItemFileChange}
      />

      {/* Documents Grid */}
      {isUploading && !isAdding && (
        <div className="flex items-center justify-center gap-2 p-3 bg-cyan-950/20 text-cyan-400 border border-cyan-500/20 rounded-lg font-mono text-xs animate-pulse">
          <Loader2 size={14} className="animate-spin" />
          Enviando anexo para a nuvem...
        </div>
      )}

      {filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface border border-dashed border-border rounded-xl text-center">
          <Info size={32} className="text-text-tertiary mb-3 animate-pulse" />
          <p className="text-text-secondary font-medium mb-1">Nenhuma documentação encontrada</p>
          <p className="text-xs text-text-tertiary max-w-sm">Adicione um novo registro ou altere os termos de busca acima para atualizar os itens exibidos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDocuments.map((docItem, index) => (
            <motion.div 
              key={docItem.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-surface border border-border-strong rounded-xl p-5 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(34,211,238,0.03)] transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                    docItem.tipo === 'TRT' 
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                      : docItem.tipo === 'ART'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {docItem.tipo}
                  </span>
                  
                  {docItem.numero && (
                    <span className="text-sm font-mono text-text-primary font-semibold truncate max-w-xs" title="Nº do Registro">
                      Nº {docItem.numero}
                    </span>
                  )}

                  {docItem.dataEmissao && (
                    <span className="text-[10px] text-text-tertiary flex items-center gap-1 font-mono">
                      <Calendar size={10} />
                      Emissão: {docItem.dataEmissao}
                    </span>
                  )}
                </div>

                <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 md:line-clamp-1">{docItem.descricao}</p>

                {/* Attached File display */}
                <div className="pt-2 flex items-center gap-2">
                  {docItem.url ? (
                    <div className="flex items-center gap-2 bg-surface-active border border-border px-3 py-1.5 rounded-lg text-xs max-w-full">
                      <FileText size={14} className="text-cyan-400 shrink-0" />
                      <span className="text-text-secondary truncate max-w-[150px] md:max-w-xs font-mono text-[11px]">{docItem.name}</span>
                      <div className="flex items-center gap-1 shrink-0 ml-2 border-l border-border pl-2">
                        <a 
                          href={docItem.url} 
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          rel="noreferrer" 
                          className="p-1 text-text-secondary hover:text-cyan-400 rounded transition-colors" 
                          title="Visualizar documento anexo"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button 
                          onClick={() => setDeleteAttachmentTargetId(docItem.id)}
                          className="p-1 text-text-tertiary hover:text-red-400 rounded transition-colors"
                          title="Remover anexo técnico"
                        >
                          <FileX size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-red-400/80 font-medium px-2 py-1 bg-red-950/10 rounded border border-red-500/10 flex items-center gap-1">
                        <ShieldAlert size={10} />
                        Sem arquivo
                      </span>
                      <button
                        onClick={() => handleItemFileClick(docItem.id)}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1 bg-cyan-950/20 border border-cyan-500/20 px-2.5 py-1 rounded hover:bg-cyan-900/30 transition-all shadow-sm"
                      >
                        <FileUp size={10} />
                        Anexar arquivo
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action columns */}
              <div className="flex items-center justify-end shrink-0 gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border md:pl-4">
                <button 
                  onClick={() => setDeleteTargetId(docItem.id)} 
                  className="p-2.5 text-text-tertiary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20" 
                  title="Excluir Registro"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Record Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface p-6 rounded-xl w-full max-w-sm border border-border-strong shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle size={24} className="shrink-0" />
              <h3 className="text-text-primary text-base font-bold uppercase tracking-wide">Excluir Registro?</h3>
            </div>
            <p className="text-text-secondary mb-6 text-xs leading-relaxed">
              Tem certeza que deseja apagar permanentemente este registro de TRT/ART? Quaisquer arquivos e documentos anexados também serão excluídos automaticamente de forma irreversível.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteTargetId(null)} 
                className="flex-1 px-4 py-2 bg-surface-active border border-border-strong text-text-primary rounded-lg hover:bg-surface transition text-xs font-bold uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button 
                onClick={() => { deleteDocument(deleteTargetId); setDeleteTargetId(null); }}
                className="flex-1 px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] transition-all text-xs font-bold uppercase tracking-widest"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete ATTACHMENT ONLY Confirmation Modal */}
      {deleteAttachmentTargetId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface p-6 rounded-xl w-full max-w-sm border border-border-strong shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <FileX size={24} className="shrink-0" />
              <h3 className="text-text-primary text-base font-bold uppercase tracking-wide">Remover Anexo?</h3>
            </div>
            <p className="text-text-secondary mb-6 text-xs leading-relaxed">
              Tem certeza que deseja apagar apenas o arquivo PDF/Imagem anexado a esta documentação? O registro nos metadados continuará existindo e você poderá anexar um novo arquivo a qualquer momento.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteAttachmentTargetId(null)} 
                className="flex-1 px-4 py-2 bg-surface-active border border-border-strong text-text-primary rounded-lg hover:bg-surface transition text-xs font-bold uppercase tracking-wider"
              >
                Manter Anexo
              </button>
              <button 
                onClick={() => { deleteAttachmentOnly(deleteAttachmentTargetId); setDeleteAttachmentTargetId(null); }}
                className="flex-1 px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] transition-all text-xs font-bold uppercase tracking-widest"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
