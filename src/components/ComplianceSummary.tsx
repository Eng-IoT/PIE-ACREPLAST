import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShieldAlert, AlertTriangle, Download, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ComplianceSummary() {
  const [criticalPending, setCriticalPending] = useState(0);
  const [complianceLevel, setComplianceLevel] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let actionPlanUnsub = () => {};
    let checklistUnsub = () => {};

    try {
      actionPlanUnsub = onSnapshot(collection(db, 'actionPlan'), (snapshot) => {
        let criticalCount = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.priority === 'critical' && data.status !== 'completed') {
            criticalCount++;
          }
        });
        setCriticalPending(criticalCount);
      });

      checklistUnsub = onSnapshot(collection(db, 'checklistItems'), (snapshot) => {
        let conforme = 0;
        let total = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === 'conforme') {
            conforme++;
            total++;
          } else if (data.status === 'nao_conforme') {
            total++;
          }
        });
        
        const level = total === 0 ? 0 : Math.round((conforme / total) * 100);
        setComplianceLevel(level);
        setLoading(false);
      });

    } catch (error) {
      handleFirestoreError(error as Error, OperationType.GET, 'complianceSummary');
      setLoading(false);
    }

    return () => {
      actionPlanUnsub();
      checklistUnsub();
    };
  }, []);

  const exportData = {
    nivelConformidade: `${complianceLevel}%`,
    acoesCriticasPendentes: criticalPending,
    dataGeracao: new Date().toISOString()
  };

  const exportToJSON = () => {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resumo_conformidade.json';
    a.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Resumo de Conformidade', 14, 22);
    doc.setFontSize(11);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
    
    autoTable(doc, {
      startY: 36,
      head: [['Métrica', 'Valor']],
      body: [
        ['Nível de Conformidade', exportData.nivelConformidade],
        ['Ações Críticas Pendentes', exportData.acoesCriticasPendentes.toString()],
      ],
      theme: 'grid',
    });
    
    doc.save('resumo_conformidade.pdf');
  };

  const chartData = [
    { name: 'Conforme', value: complianceLevel, color: '#22c55e' }, // green-500
    { name: 'Ñ Conforme', value: 100 - complianceLevel, color: '#ef4444' } // red-500
  ];

  if (loading) {
    return <div className="text-[10px] text-text-tertiary uppercase tracking-widest text-center py-4">Carregando...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center gap-4">
        <div className="text-[10px] text-text-tertiary uppercase tracking-widest font-mono">Resumo Executivo</div>
        <div className="flex gap-2">
            <button onClick={exportToJSON} className="p-2 bg-surface-active border border-border rounded-lg text-text-secondary hover:text-orange-400 hover:border-orange-500/50 transition-all transition-colors" title="Exportar JSON">
                <Download size={16} />
            </button>
            <button onClick={exportToPDF} className="p-2 bg-surface-active border border-border rounded-lg text-text-secondary hover:text-orange-400 hover:border-orange-500/50 transition-all transition-colors" title="Exportar PDF">
                <FileText size={16} />
            </button>
        </div>
      </div>
      <div className="flex items-center gap-4 p-4 rounded-xl border border-red-500/50 bg-red-500/5 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-red-500/20 via-transparent to-transparent opacity-80" />
        <div className="p-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg relative z-10 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <AlertTriangle size={24} className={criticalPending > 0 ? "animate-pulse" : ""} />
        </div>
        <div className="relative z-10">
          <div className="text-[10px] text-red-200/60 font-mono uppercase tracking-[0.2em] mb-1">Ações Críticas Pendentes</div>
          <div className="text-3xl font-display font-bold text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">{criticalPending}</div>
        </div>
      </div>
      
      <div className="p-4 rounded-xl border border-border bg-surface-active/50 flex flex-col items-center relative overflow-hidden">
         <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
         <div className="flex items-center gap-3 mb-4 w-full border-b border-border/50 pb-2">
           <ShieldAlert size={16} className={complianceLevel >= 80 ? 'text-green-400' : 'text-cyan-400'} />
           <div className="text-[10px] text-cyan-500 font-mono uppercase tracking-[0.2em]">Nível de Conformidade</div>
           <div className="ml-auto text-lg font-mono font-bold text-text-primary drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{complianceLevel}%</div>
         </div>
         <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#38bdf8', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'rgba(34,211,238,0.05)'}} contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(34,211,238,0.2)', fontSize: '10px', fontFamily: 'monospace', borderRadius: '4px' }} />
                <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={8}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
}
