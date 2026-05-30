import { useState, useEffect } from 'react';
import { Upload, Search, Loader2 } from 'lucide-react';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import DocumentCard from './DocumentCard';

type Relatorio = { id: string; name: string; date: string; url?: string };

export default function RelatoriosTecnicos() {
  const [files, setFiles] = useState<Relatorio[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'relatorios'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
        const newFiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as { name: string, date: string, url?: string } }));
        setFiles(newFiles);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'relatorios'));
    return unsub;
  }, []);

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
        const storageRef = ref(storage, `relatorios/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        const newFile = {
            name: file.name,
            date: new Date().toLocaleDateString('pt-BR'),
            url: downloadURL,
        };
        await addDoc(collection(db, 'relatorios'), newFile);
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'relatorios');
    } finally {
        setIsUploading(false);
    }
  };

  const deleteFile = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'relatorios', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'relatorios');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
          <input 
            type="text"
            placeholder="Buscar relatório..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-active border border-border rounded-lg py-2 pl-10 pr-4 text-sm text-text-primary focus:border-orange-500/50 outline-none transition-all"
          />
        </div>
        <label className={`flex items-center gap-2 cursor-pointer bg-orange-600/90 text-white px-4 py-2 rounded-lg hover:bg-orange-500 transition-all font-bold text-xs uppercase tracking-widest shrink-0 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {isUploading ? 'Enviando...' : 'Anexar Relatório'}
          <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading}/>
        </label>
      </div>

      <div className="space-y-3">
        {filteredFiles.length === 0 ? (
          <div className="text-text-tertiary text-sm py-10 text-center border-2 border-dashed border-border-strong rounded-2xl">
            {files.length === 0 ? 'Nenhum relatório técnico anexado.' : 'Nenhum relatório encontrado.'}
          </div>
        ) : (
          filteredFiles.map((file) => (
            <DocumentCard 
              key={file.id}
              name={file.name}
              date={file.date}
              tag="Técnico"
              onDelete={() => deleteFile(file.id)}
              onLink={() => file.url && window.open(file.url, '_blank')}
            />
          ))
        )}
      </div>
    </div>
  );
}
