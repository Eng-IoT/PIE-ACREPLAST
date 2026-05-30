import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

const CLIENT_DOC_ID = 'main'; // Since it's a single client system

export default function ClientData() {
  const [data, setData] = useState({
    razaoSocial: '',
    cnpj: '',
    endereco: '',
    cidade: '',
    responsavel: '',
    email: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const docRef = doc(db, 'clientData', CLIENT_DOC_ID);
    const unsub = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.data() as any);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'clientData');
    });
    return unsub;
  }, []);

  const save = async () => {
    try {
      await setDoc(doc(db, 'clientData', CLIENT_DOC_ID), data);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'clientData');
    }
  };

  return (
    <div className="space-y-4">
      {isEditing ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(data).map(([key, value]) => (
            <div key={key}>
              <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-1 group-focus-within:text-orange-500/80 transition-colors">{key}</label>
              <input
                className="w-full bg-surface border border-border-strong rounded-lg p-3 text-sm text-text-primary focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 outline-none transition-all font-mono"
                value={value}
                onChange={e => setData(prev => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
          </div>
          <button onClick={save} className="bg-orange-600/90 text-white px-6 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-orange-500 border border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all duration-300">Salvar Dados</button>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          {Object.entries(data).map(([key, value]) => (
             <div key={key} className="flex justify-between py-3 border-b border-border/50 items-center">
                <span className="text-[10px] text-text-tertiary uppercase tracking-widest">{key}</span>
                <span className="text-sm font-medium text-text-primary font-mono">{value || '-'}</span>
             </div>
          ))}
          </div>
          <button onClick={() => setIsEditing(true)} className="bg-surface-active border border-border-strong text-text-primary px-6 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:border-orange-500/50 hover:text-orange-400 transition-colors">Editar Dados</button>
        </>
      )}
    </div>
  );
}
