import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShieldCheck, ShieldAlert, User, Briefcase, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

export default function WorkerStatus({ workerId }: { workerId: string }) {
  const [worker, setWorker] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWorker = async () => {
      try {
        const docRef = doc(db, 'workers', workerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setWorker({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError(true);
        }
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchWorker();
  }, [workerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-text-primary p-6">
        <div className="text-sm font-mono animate-pulse">Consultando base de dados...</div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-text-primary p-6">
        <ShieldAlert size={48} className="text-red-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Trabalhador não encontrado</h1>
        <p className="text-text-secondary text-center text-sm">
          O registro solicitado não existe ou foi removido do sistema.
        </p>
      </div>
    );
  }

  const isStatusActive = worker.status === 'Ativo';
  
  // Calculate if expiring soon (less than 30 days)
  let isExpiringSoon = false;
  if (worker.certificateValidity) {
     const validityDate = new Date(worker.certificateValidity);
     const today = new Date();
     const diffTime = validityDate.getTime() - today.getTime();
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
     isExpiringSoon = diffDays <= 30 && diffDays > 0;
  }

  const isValid = worker.certificateValidity && new Date(worker.certificateValidity) >= new Date();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-surface border border-border p-6 rounded-2xl shadow-2xl relative overflow-hidden"
      >
        <div className={`absolute top-0 left-0 w-full h-2 ${isStatusActive && isValid ? 'bg-green-500' : 'bg-red-500'}`} />
        
        <div className="flex flex-col items-center text-center mb-6 pt-4">
          <div className="w-20 h-20 bg-surface-hover rounded-full border border-border flex items-center justify-center mb-4">
            <User size={40} className="text-text-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">{worker.name}</h1>
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <Briefcase size={14} />
            <span>{worker.role}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface-active p-4 rounded-xl border border-border">
            <div className="text-[10px] text-text-tertiary uppercase tracking-widest font-bold mb-1">Status Global</div>
            <div className="flex items-center gap-2">
              {isStatusActive && isValid ? (
                <>
                  <ShieldCheck size={20} className="text-green-500" />
                  <span className="text-green-500 font-bold uppercase">Autorizado</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={20} className="text-red-500" />
                  <span className="text-red-500 font-bold uppercase">Não Autorizado</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-surface-active p-4 rounded-xl border border-border">
             <div className="text-[10px] text-text-tertiary uppercase tracking-widest font-bold mb-1 flex items-center justify-between">
                <span>Validade do Certificado</span>
                <Calendar size={14} />
             </div>
             <div className="font-mono text-sm mt-1">{worker.certificateValidity ? new Date(worker.certificateValidity).toLocaleDateString('pt-BR') : 'N/A'}</div>
             {isExpiringSoon && (
               <div className="mt-2 text-xs text-orange-500 font-medium">Aviso: Expedindo em menos de 30 dias</div>
             )}
             {!isValid && worker.certificateValidity && (
                <div className="mt-2 text-xs text-red-500 font-bold">Certificado Vencido</div>
             )}
          </div>
          
          <div className="bg-surface-active p-4 rounded-xl border border-border">
             <div className="text-[10px] text-text-tertiary uppercase tracking-widest font-bold mb-1">Empresa</div>
             <div className="text-sm">Consulta de Validação de Prontuário</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
