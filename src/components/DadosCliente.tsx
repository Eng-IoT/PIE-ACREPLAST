import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, storage, handleFirestoreError, OperationType, uploadWithRetry } from '../lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { Loader2, Upload, FileText } from 'lucide-react';

const CLIENT_DOC_ID = 'main';

export default function DadosCliente() {
  const [data, setData] = useState({
    razaoSocial: '',
    cnpj: '',
    segmento: '',
    classeRisco: 'Médio',
    responsavelTecnico: '',
    registroProfissional: '',
    endereco: '',
    artUrl: '',
    artName: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const docRef = doc(db, 'clientData', CLIENT_DOC_ID);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.data() as any);
      }
      setIsLoaded(true);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'clientData');
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const handler = setTimeout(save, 1000);
    return () => clearTimeout(handler);
  }, [data]);

  const save = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'clientData', CLIENT_DOC_ID), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'clientData');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArtUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
        const storageRef = ref(storage, `client/${CLIENT_DOC_ID}/art_${Date.now()}_${file.name}`);
        await uploadWithRetry(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        setData(prev => ({ ...prev, artUrl: downloadURL, artName: file.name }));
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'clientData');
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl p-6 md:p-8 border border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-2">Razão social / Cliente</label>
          <input
            className="w-full bg-surface-active border border-border rounded-lg p-3 text-sm text-text-primary focus:border-orange-500 outline-none transition-all"
            value={data.razaoSocial}
            onChange={e => setData(prev => ({ ...prev, razaoSocial: e.target.value }))}
            placeholder="Cliente Modelo"
          />
        </div>
        <div>
          <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-2">CNPJ</label>
          <input
            className="w-full bg-surface-active border border-border rounded-lg p-3 text-sm text-text-primary focus:border-orange-500 outline-none transition-all"
            value={data.cnpj}
            onChange={e => setData(prev => ({ ...prev, cnpj: e.target.value }))}
            placeholder="00.000.000/0001-00"
          />
        </div>
        <div>
          <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-2">Segmento</label>
          <input
            className="w-full bg-surface-active border border-border rounded-lg p-3 text-sm text-text-primary focus:border-orange-500 outline-none transition-all"
            value={data.segmento}
            onChange={e => setData(prev => ({ ...prev, segmento: e.target.value }))}
            placeholder="Indústria, comércio, serviço..."
          />
        </div>
        <div>
          <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-2">Classe de risco</label>
          <select
            className="w-full bg-surface-active border border-border rounded-lg p-3 text-sm text-text-primary focus:border-orange-500 outline-none transition-all"
            value={data.classeRisco}
            onChange={e => setData(prev => ({ ...prev, classeRisco: e.target.value }))}
          >
            <option>Baixo</option>
            <option>Médio</option>
            <option>Alto</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-2">Responsável técnico</label>
          <input
            className="w-full bg-surface-active border border-border rounded-lg p-3 text-sm text-text-primary focus:border-orange-500 outline-none transition-all"
            value={data.responsavelTecnico}
            onChange={e => setData(prev => ({ ...prev, responsavelTecnico: e.target.value }))}
            placeholder="Eng. Responsável"
          />
        </div>
        <div>
          <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-2">CREA/CRT/TRT</label>
          <input
            className="w-full bg-surface-active border border-border rounded-lg p-3 text-sm text-text-primary focus:border-orange-500 outline-none transition-all"
            value={data.registroProfissional}
            onChange={e => setData(prev => ({ ...prev, registroProfissional: e.target.value }))}
            placeholder="Registro profissional"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-2">Endereço</label>
          <textarea
            className="w-full bg-surface-active border border-border rounded-lg p-3 text-sm text-text-primary focus:border-orange-500 outline-none transition-all min-h-[100px]"
            value={data.endereco}
            onChange={e => setData(prev => ({ ...prev, endereco: e.target.value }))}
            placeholder="Endereço completo"
          />
        </div>
        <div className="md:col-span-2">
            <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-2">ART / TRT</label>
            <div className="flex items-center gap-4">
                <label className={`flex items-center gap-2 cursor-pointer bg-surface-active border border-border text-text-primary px-4 py-3 rounded-lg hover:border-orange-500 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {isUploading ? 'Enviando...' : 'Selecionar arquivo ART/TRT'}
                    <input type="file" className="hidden" onChange={handleArtUpload} disabled={isUploading}/>
                </label>
                {data.artUrl && (
                    <a href={data.artUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-text-primary hover:text-orange-500 text-sm">
                        <FileText size={16} />
                        {data.artName || 'Visualizar arquivo'}
                    </a>
                )}
            </div>
        </div>
      </div>
      <button 
        onClick={save} 
        disabled={isSaving || isUploading}
        className="mt-6 bg-orange-600 text-white px-8 py-3 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-orange-500 transition-all shadow-lg shadow-orange-900/20 flex items-center gap-2"
      >
        {(isSaving || isUploading) && <Loader2 size={16} className="animate-spin" />}
        Salvar dados do cliente
      </button>
    </div>
  );
}
