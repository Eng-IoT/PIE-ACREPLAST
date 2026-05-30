import { useState, useRef, useEffect } from 'react';
import { Camera, X, PenTool, Save, RotateCcw, WifiOff } from 'lucide-react';
import { collection, updateDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import SignatureCanvas from 'react-signature-canvas';

type Status = 'conforme' | 'nao-conforme';
type Item = { id: string; name: string; status: Status; evidenceUrl?: string };

export default function NR10Checklist() {
  const [items, setItems] = useState<Item[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sigPad = useRef<SignatureCanvas>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'checklistItems'), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, status: doc.data().status, evidenceUrl: doc.data().evidenceUrl } as Item)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'checklistItems');
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsubSig = onSnapshot(doc(db, 'settings', 'checklistSignature'), (docSnap) => {
      if (docSnap.exists()) {
        setSignature(docSnap.data().signatureUrl);
      } else {
        setSignature(null);
      }
    });
    return unsubSig;
  }, []);

  const toggleStatus = async (id: string, currentStatus: Status) => {
    try {
      const newStatus = currentStatus === 'conforme' ? 'nao-conforme' : 'conforme';
      await updateDoc(doc(db, 'checklistItems', id), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `checklistItems/${id}`);
    }
  };

  const captureEvidence = async (id: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      stream.getTracks().forEach(track => track.stop());
      await updateDoc(doc(db, 'checklistItems', id), { evidenceUrl: dataUrl });
    } catch (error) {
      console.error(error);
      alert('Não foi possível acessar a câmera.');
    }
  };

  const saveSignature = async () => {
    if (sigPad.current?.isEmpty()) return;
    const url = sigPad.current?.getTrimmedCanvas().toDataURL('image/png');
    
    try {
      await setDoc(doc(db, 'settings', 'checklistSignature'), { signatureUrl: url });
      setSignature(url || null);
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/checklistSignature');
    }
  };

  const clearSignature = async () => {
    sigPad.current?.clear();
    try {
      await setDoc(doc(db, 'settings', 'checklistSignature'), { signatureUrl: null });
      setSignature(null);
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/checklistSignature');
    }
  };

  return (
    <div className="space-y-6">
      {isOffline && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg flex items-center gap-3">
          <WifiOff size={18} className="text-yellow-500 flex-shrink-0" />
          <div>
            <div className="text-[11px] font-bold text-yellow-500 uppercase tracking-widest leading-none mb-1">Modo Offline</div>
            <div className="text-xs text-yellow-500/80">O checklist pode ser usado normalmente. Os dados serão sincronizados quando a conexão retornar.</div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="p-3 bg-surface-hover rounded-lg border border-border space-y-2">
              <div className="flex justify-between items-center">
              <span className="text-xs text-text-secondary font-mono">{item.name}</span>
              <button onClick={() => toggleStatus(item.id, item.status)} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface ${item.status === 'conforme' ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20 hover:shadow-[0_0_15px_rgba(74,222,128,0.2)] focus:ring-green-500/50' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(248,113,113,0.2)] focus:ring-red-500/50'}`}>
                  {item.status === 'conforme' ? (
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]"></span>CONFORME</span>
                  ) : (
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.8)] animate-pulse"></span>NÃO CONFORME</span>
                  )}
              </button>
              </div>
              {item.evidenceUrl ? (
                  <div className="relative group">
                      <img src={item.evidenceUrl} alt="Evidence" className="w-full h-24 object-cover rounded" />
                      <button onClick={() => updateDoc(doc(db, 'checklistItems', item.id), { evidenceUrl: null })} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={12} />
                      </button>
                  </div>
              ) : (
                  <button onClick={() => captureEvidence(item.id)} className="w-full py-2 bg-surface-hover border border-dashed border-border-strong rounded flex justify-center items-center gap-2 text-text-tertiary hover:text-text-secondary transition-colors">
                      <Camera size={16} />
                      <span className="text-[10px]">Capturar Evidência</span>
                  </button>
              )}
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border-strong rounded-2xl p-6 transition-all duration-300 hover:border-orange-500/30">
        <div className="flex items-center gap-3 mb-6">
          <PenTool size={20} className="text-orange-500" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-text-primary">Assinatura do Técnico Responsável</h3>
        </div>
        
        {signature ? (
          <div className="space-y-4">
             <div className="bg-surface-hover rounded-lg p-4 flex justify-center border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]">
               <img src={signature} alt="Assinatura" className="h-24 mix-blend-screen" style={{ filter: 'drop-shadow(0 0 2px rgba(249, 115, 22, 0.5))' }} />
             </div>
             <button onClick={clearSignature} className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors">
                <RotateCcw size={14} /> Refazer Assinatura
             </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-surface-hover border border-border-strong rounded-lg overflow-hidden touch-none relative group">
              <div className="absolute inset-0 border-2 border-dashed border-orange-500/10 group-hover:border-orange-500/30 transition-colors pointer-events-none rounded-lg" />
              <SignatureCanvas 
                ref={sigPad}
                penColor="#f97316"
                canvasProps={{ className: 'w-full h-32 cursor-crosshair' }}
                backgroundColor="transparent"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => sigPad.current?.clear()} className="flex-1 flex items-center justify-center gap-2 py-2 bg-surface-hover text-text-secondary border border-border-strong hover:border-text-secondary/50 hover:bg-surface-active rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors">
                <X size={14} /> Limpar
              </button>
              <button onClick={saveSignature} className="flex-1 flex items-center justify-center gap-2 py-2 bg-orange-600/90 text-white hover:bg-orange-500 border border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                <Save size={14} /> Salvar Assinatura
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
