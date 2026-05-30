import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType, uploadWithRetry } from '../lib/firebase';
import { Trash2, Search, FileUp, File, ExternalLink, Loader2, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import DocumentCard from './DocumentCard';

type Document = { id: string; name: string; url?: string };

export default function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'documents'), (snapshot) => {
      setDocuments(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, url: doc.data().url })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'documents');
    });
    return unsub;
  }, []);

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Upload to Storage with retry
      const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`);
      await uploadWithRetry(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // 2. Save metadata to Firestore
      await addDoc(collection(db, 'documents'), { 
        name: file.name,
        url: downloadURL 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'documents');
      alert("Erro ao enviar documento.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'documents', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `documents/${id}`);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(249, 115, 22); // Orange-500
    doc.text('Relatório Completo - Prontuário Técnico', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(150);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
    
    const tableColumn = ["Nome do Documento", "Link (URL)"];
    const tableRows = documents.map(d => [
      d.name, 
      d.url || 'N/A'
    ]);
    
    autoTable(doc, {
      startY: 36,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3, font: 'courier' },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], lineColor: [249, 115, 22] },
      alternateRowStyles: { fillColor: [20, 30, 50] }
    });
    
    doc.save('prontuario_tecnico_completo.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500/50 group-focus-within:text-orange-400 transition-colors" size={16} />
        <input 
          placeholder="Buscar documento..." 
          className="w-full bg-surface border border-border-strong rounded-lg p-2 pl-10 text-sm text-text-primary placeholder-text-tertiary focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all font-mono"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="space-y-3">
        {filteredDocuments.map((docItem) => (
          <DocumentCard 
            key={docItem.id}
            name={docItem.name}
            date="---"
            tag="Documento"
            onDelete={() => setDeleteTargetId(docItem.id)}
            onLink={() => docItem.url && window.open(docItem.url, '_blank')}
          />
        ))}
      </div>
      
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={addDocument}
      />
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/50">
        <button 
          onClick={() => fileInputRef.current?.click()} 
          disabled={isUploading}
          className="flex-1 bg-orange-600/90 text-white hover:bg-orange-500 border border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] px-4 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-30 disabled:hover:shadow-none"
        >
          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
          {isUploading ? 'Enviando...' : 'Fazer Upload'}
        </button>
        <button 
          onClick={generatePDF} 
          disabled={isUploading || documents.length === 0}
          className="flex-1 bg-surface-active text-text-primary border border-border-strong hover:border-orange-500/50 hover:text-orange-400 px-4 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-surface-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Printer size={16} />
          Imprimir Completo
        </button>
      </div>

      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface p-6 rounded-xl w-full max-w-sm border border-border-strong shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <h3 className="text-text-primary text-lg font-bold mb-2">Atenção Necessária</h3>
            <p className="text-text-secondary mb-6 text-sm">Tem certeza que deseja excluir esta documentação? Esta ação não pode ser desfeita e afetará as inspeções futuras.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTargetId(null)} className="flex-1 px-4 py-2 border border-border-strong text-text-primary rounded-lg hover:bg-surface-hover transition text-sm">Cancelar</button>
              <button 
                onClick={() => { deleteDocument(deleteTargetId); setDeleteTargetId(null); }}
                className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all text-sm font-bold uppercase tracking-widest">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
