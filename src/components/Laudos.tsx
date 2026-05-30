import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileCheck, Upload, Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

export default function Laudos() {
  const [files, setFiles] = useState<{ id: string; name: string; date: string }[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'laudos'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
        const newFiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as { name: string, date: string } }));
        setFiles(newFiles);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'laudos'));
    return unsub;
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const newFile = {
            name: e.target.files[0].name,
            date: new Date().toLocaleDateString('pt-BR'),
        };
        await addDoc(collection(db, 'laudos'), newFile);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'laudos');
      }
    }
  };

  const deleteFile = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'laudos', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'laudos');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <label className="flex items-center gap-2 cursor-pointer bg-orange-600/90 text-white px-4 py-2 rounded-lg hover:bg-orange-500 transition-all font-bold text-xs uppercase tracking-widest">
          <Upload size={16} />
          Anexar Laudo
          <input type="file" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>

      <div className="space-y-3">
        {files.length === 0 ? (
          <div className="text-text-tertiary text-sm py-10 text-center border-2 border-dashed border-border-strong rounded-2xl">
            Nenhum laudo anexado.
          </div>
        ) : (
          files.map((file) => (
            <motion.div 
              key={file.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-surface-hover rounded-xl border border-border flex justify-between items-center hover:border-orange-500/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <FileCheck className="text-orange-400" size={20} />
                <div>
                  <span className="font-bold text-text-primary block">{file.name}</span>
                  <span className="text-xs text-text-tertiary">{file.date}</span>
                </div>
              </div>
              <button 
                onClick={() => deleteFile(file.id)}
                className="text-red-500/70 hover:text-red-400 p-2"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}