import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType, uploadWithRetry } from '../lib/firebase';
import { Trash2, Search, FileText, FileUp, ExternalLink, Loader2 } from 'lucide-react';
import DocumentCard from './DocumentCard';

type Project = { id: string; name: string; url?: string };

export default function ElectricalProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'electrical-projects'), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, url: doc.data().url } as Project)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'electrical-projects');
    });
    return unsub;
  }, []);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `electrical-projects/${Date.now()}_${file.name}`);
      await uploadWithRetry(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'electrical-projects'), { 
        name: file.name,
        url: downloadURL
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'electrical-projects');
      alert("Erro ao enviar projeto: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'electrical-projects', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `electrical-projects/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within:text-cyan-400 transition-colors" size={16} />
        <input 
          placeholder="Buscar projeto/esquema..." 
          className="w-full bg-surface border border-border-strong rounded-lg p-2 pl-10 text-sm text-text-primary placeholder-text-tertiary focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all font-mono"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="space-y-3">
        {filteredProjects.map((proj) => (
          <DocumentCard 
            key={proj.id}
            name={proj.name}
            date="---"
            tag="Projeto"
            onDelete={() => setDeleteTargetId(proj.id)}
            onLink={() => proj.url && window.open(proj.url, '_blank')}
          />
        ))}
      </div>
      
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={addProject}
      />
      <div className="pt-4 border-t border-border/50">
        <button 
          onClick={() => fileInputRef.current?.click()} 
          disabled={isUploading}
          className="w-full sm:w-auto bg-cyan-600/90 text-white hover:bg-cyan-500 border border-cyan-500/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] px-6 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-30 disabled:hover:shadow-none"
        >
          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
          {isUploading ? 'Enviando...' : 'Fazer Upload Projeto'}
        </button>
      </div>

      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface p-6 rounded-xl w-full max-w-sm border border-border-strong shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <h3 className="text-text-primary text-lg font-bold mb-2">Atenção Necessária</h3>
            <p className="text-text-secondary mb-6 text-sm">Tem certeza que deseja excluir esta documentação? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTargetId(null)} className="flex-1 px-4 py-2 border border-border-strong text-text-primary rounded-lg hover:bg-surface-hover transition text-sm">Cancelar</button>
              <button 
                onClick={() => { deleteProject(deleteTargetId); setDeleteTargetId(null); }}
                className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all text-sm font-bold uppercase tracking-widest">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
