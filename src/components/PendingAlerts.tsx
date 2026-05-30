import { motion } from 'motion/react';
import { AlertTriangle, ClipboardList, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Worker = { id: string; name: string; certificateValidity: string };
type Action = { id: string; status: string; description: string; priority?: string };

export default function PendingAlerts({ workers, actionPlan }: { workers: Worker[], actionPlan: Action[] }) {
  const navigate = useNavigate();

  const isExpiringSoon = (dateStr: string) => {
    if (!dateStr) return false;
    const expDate = new Date(dateStr);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30; // Expiring in 30 days
  };

  const expiredCertificates = workers.filter(w => isExpiringSoon(w.certificateValidity));
  const criticalActions = actionPlan.filter(a => a.status === 'Pendente' && a.priority === 'Alta');

  if (expiredCertificates.length === 0 && criticalActions.length === 0) return null;

  return (
    <section className="bg-surface/50 border border-orange-500/20 rounded-2xl p-6 mb-8">
      <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-orange-400 mb-6 flex items-center gap-2">
        <AlertTriangle size={16} />
        Alertas Pendentes
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {expiredCertificates.length > 0 && (
          <div className="bg-surface rounded-lg p-4 border border-border">
            <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} />
              Certificados Vencendo ({expiredCertificates.length})
            </h3>
            <ul className="space-y-2">
              {expiredCertificates.slice(0, 3).map(w => (
                <li key={w.id} className="text-xs text-text-secondary flex justify-between items-center cursor-pointer hover:text-orange-400" onClick={() => navigate('/workers')}>
                  {w.name}
                  <span className="font-mono">{new Date(w.certificateValidity).toLocaleDateString('pt-BR')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {criticalActions.length > 0 && (
          <div className="bg-surface rounded-lg p-4 border border-border">
            <h3 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2">
              <ClipboardList size={16} />
              Ações Críticas ({criticalActions.length})
            </h3>
            <ul className="space-y-2">
              {criticalActions.slice(0, 3).map(a => (
                <li key={a.id} className="text-xs text-text-secondary flex justify-between items-center cursor-pointer hover:text-orange-400" onClick={() => navigate('/action-plan')}>
                  {a.description}
                  <ChevronRight size={14} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
