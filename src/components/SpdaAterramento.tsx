import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, storage, uploadWithRetry } from '../lib/firebase';
import { Plus, Trash2, Calendar, FileText, Download, TrendingDown, TrendingUp, Minus, UploadCloud, FileCheck2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { getDownloadURL, ref } from 'firebase/storage';

type SpdaReport = {
  id: string;
  date: string;
  validity: string;
  responsible: string;
  ohmicValue: number;
  status: 'valid' | 'expired' | 'attention';
  url: string;
  fileName?: string;
  filePath?: string;
  createdAt?: unknown;
  createdBy?: string | null;
  createdByEmail?: string | null;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-active/90 border border-cyan-500/30 p-3 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.2)] backdrop-blur-md">
        <p className="text-cyan-400 font-mono text-[10px] uppercase tracking-widest mb-1">{`Data: ${label}`}</p>
        <p className="text-text-primary font-display font-medium text-sm drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
          Resistência: <span className="text-cyan-400 font-bold">{`${payload[0].value} Ω`}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function SpdaAterramento() {
  const [reports, setReports] = useState<SpdaReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for new report
  const [newDate, setNewDate] = useState('');
  const [newValidity, setNewValidity] = useState('');
  const [newResponsible, setNewResponsible] = useState('');
  const [newOhmic, setNewOhmic] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'spdaReports'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpdaReport));
      setReports(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'spdaReports');
      setLoading(false);
    });
    
    return unsub;
  }, []);

  const addReport = async () => {
    if (!newDate || !newValidity || !newResponsible || !newOhmic) return;

    setSaving(true);
    setFeedback('');
    
    // Calculate naive status based on date
    const today = new Date();
    const validityDate = new Date(newValidity);
    let status: SpdaReport['status'] = 'valid';
    
    if (validityDate < today) {
      status = 'expired';
    } else {
      const diffTime = Math.abs(validityDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (diffDays <= 30) status = 'attention';
    }

    try {
      let url = '';
      let fileName = '';
      let filePath = '';

      if (newFile) {
        fileName = newFile.name;
        filePath = `spda-aterramento/relatorios-medicao/${Date.now()}_${newFile.name}`;
        const storageRef = ref(storage, filePath);
        await uploadWithRetry(storageRef, newFile);
        url = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'spdaReports'), {
        date: newDate,
        validity: newValidity,
        responsible: newResponsible,
        ohmicValue: parseFloat(newOhmic),
        status,
        url,
        fileName,
        filePath,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
        createdByEmail: auth.currentUser?.email || null,
      });
      setNewDate('');
      setNewValidity('');
      setNewResponsible('');
      setNewOhmic('');
      setNewFile(null);
      setFeedback('Relatório de medição cadastrado com sucesso.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'spdaReports');
      setFeedback('Erro ao salvar. Verifique login, permissões do Storage e regras do Firebase.');
    } finally {
      setSaving(false);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'spdaReports', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `spdaReports/${id}`);
    }
  };

  const chartData = [...reports].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(r => ({
    date: new Date(r.date).toLocaleDateString('pt-BR'),
    ohmicValue: r.ohmicValue
  }));

  let trendIndicator = null;
  if (chartData.length >= 2) {
    const current = chartData[chartData.length - 1].ohmicValue;
    const previous = chartData[chartData.length - 2].ohmicValue;
    if (current < previous) {
      trendIndicator = (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 text-[10px] font-mono tracking-widest uppercase shadow-[0_0_10px_rgba(74,222,128,0.2)]">
          <TrendingDown size={12} /> Melhorando
        </div>
      );
    } else if (current > previous) {
      trendIndicator = (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 text-[10px] font-mono tracking-widest uppercase shadow-[0_0_10px_rgba(248,113,113,0.2)]">
          <TrendingUp size={12} /> Degradando
        </div>
      );
    } else {
      trendIndicator = (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 text-[10px] font-mono tracking-widest uppercase">
          <Minus size={12} /> Estável
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Resumo / Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-4 rounded-xl transition-all duration-300 hover:bg-surface-hover hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(34,211,238,0.05)] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/50 scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300"></div>
          <div className="text-[10px] text-text-tertiary uppercase tracking-widest mb-1 group-hover:text-cyan-400 transition-colors">Última Medição</div>
          <div className="text-xl font-medium text-text-primary">
            {reports.length > 0 ? <span className="text-cyan-400 font-mono drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]">{reports[0].ohmicValue}</span> : '--'} <span className="text-xs text-cyan-600 font-mono">Ω</span>
          </div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-xl transition-all duration-300 hover:bg-surface-hover hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(34,211,238,0.05)] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/50 scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300"></div>
          <div className="text-[10px] text-text-tertiary uppercase tracking-widest mb-1 group-hover:text-cyan-400 transition-colors">Status SPDA</div>
          <div className="text-sm font-bold mt-1">
            {reports.length > 0 ? (
              reports[0].status === 'valid' ? <span className="text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.3)]">Regular</span> :
              reports[0].status === 'attention' ? <span className="text-orange-400 drop-shadow-[0_0_5px_rgba(251,146,60,0.3)]">Vencendo</span> :
              <span className="text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.3)]">Vencido</span>
            ) : <span className="text-text-tertiary">Sem Dados</span>}
          </div>
        </div>
      </div>

      {reports.length > 0 && (
        <div className="bg-surface-active/30 border border-cyan-500/20 p-4 rounded-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
          <div className="text-[10px] text-cyan-500 font-mono uppercase tracking-[0.2em] mb-4 relative z-10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-cyan-500 animate-pulse"></span>
            Evolução da Resistência Ôhmica
          </div>
          <motion.div 
            className="h-64 w-full relative z-10 transition-all duration-300 hover:scale-105 origin-center shadow-[0_0_15px_rgba(34,211,238,0.05)] hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            {trendIndicator}
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(34,211,238,0.5)" tick={{ fill: '#38bdf8', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis stroke="rgba(34,211,238,0.5)" tick={{ fill: '#38bdf8', fontSize: 10, fontFamily: 'monospace' }} unit="Ω" />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(34,211,238,0.2)', strokeWidth: 2, fill: 'transparent', strokeDasharray: '3 3' }} />
                <Line type="monotone" dataKey="ohmicValue" stroke="#22d3ee" strokeWidth={2} dot={{ r: 4, fill: '#0f172a', stroke: '#22d3ee', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#22d3ee', stroke: '#fff' }} name="Resistência (Ω)" style={{filter: 'drop-shadow(0 0 5px rgba(34,211,238,0.5))'}} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}

      {/* Add New */}
      <div className="bg-surface-hover border border-border-strong rounded-xl p-4 group focus-within:border-cyan-500/30 focus-within:shadow-[0_0_20px_rgba(34,211,238,0.05)] transition-all duration-500">
        <div className="flex items-start gap-3 mb-4 pb-4 border-b border-border">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
            <UploadCloud size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-[0.12em]">Novo relatório de medição</h3>
            <p className="text-xs text-text-tertiary mt-1">Cadastre a medição de aterramento/SPDA e anexe o relatório técnico em PDF, imagem ou documento.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-end">
          <div className="relative">
            <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-1 group-focus-within:text-cyan-500/80 transition-colors">Data Medição</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-surface border border-border-strong rounded-lg p-2 text-sm text-text-primary h-10 focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 outline-none transition-all" />
          </div>
          <div className="relative">
            <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-1 group-focus-within:text-cyan-500/80 transition-colors">Validade (1 Ano)</label>
            <input type="date" value={newValidity} onChange={e => setNewValidity(e.target.value)} className="w-full bg-surface border border-border-strong rounded-lg p-2 text-sm text-text-primary h-10 focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 outline-none transition-all" />
          </div>
          <div className="relative">
            <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-1 group-focus-within:text-cyan-500/80 transition-colors">Resp. Técnico</label>
            <input type="text" value={newResponsible} onChange={e => setNewResponsible(e.target.value)} placeholder="Engenheiro / Técnico" className="w-full bg-surface border border-border-strong rounded-lg p-2 text-sm text-text-primary h-10 focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 outline-none transition-all" />
          </div>
          <div className="relative">
            <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-1 group-focus-within:text-cyan-500/80 transition-colors">Maior Resistência (Ω)</label>
            <input type="number" step="0.1" value={newOhmic} onChange={e => setNewOhmic(e.target.value)} placeholder="Ex: 8.5" className="w-full bg-surface border border-border-strong rounded-lg p-2 text-sm text-text-primary h-10 focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 outline-none transition-all font-mono" />
          </div>
          <div className="relative md:col-span-2 xl:col-span-1">
            <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-1 group-focus-within:text-cyan-500/80 transition-colors">Anexar relatório</label>
            <label className="w-full h-10 bg-surface border border-border-strong rounded-lg px-3 text-xs text-text-secondary flex items-center gap-2 cursor-pointer hover:border-cyan-500/50 hover:bg-surface-active transition-all overflow-hidden">
              <UploadCloud size={15} className="text-cyan-500 shrink-0" />
              <span className="truncate">{newFile ? newFile.name : 'PDF, imagem ou DOCX'}</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={e => setNewFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
          <button 
            onClick={addReport}
            disabled={!newDate || !newValidity || !newResponsible || !newOhmic || saving}
            className="w-full sm:w-auto h-10 bg-cyan-600/90 hover:bg-cyan-500 border border-cyan-500/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 disabled:opacity-30 disabled:hover:shadow-none disabled:hover:bg-cyan-600/90 flex items-center justify-center gap-1 active:scale-95"
          >
            <Plus size={16} /> {saving ? 'Salvando...' : 'Adicionar relatório'}
          </button>
          {feedback && <p className="text-xs text-text-secondary">{feedback}</p>}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-text-tertiary py-8 text-sm">Carregando laudos...</div>
      ) : reports.length === 0 ? (
        <div className="text-center text-text-tertiary py-8 text-sm border border-dashed border-border rounded-lg">Nenhum laudo de SPDA registrado.</div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, index) => (
            <motion.div 
              key={report.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="p-4 bg-surface-hover rounded-xl border border-border flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:-translate-y-1 hover:border-cyan-500/30 hover:shadow-[0_8px_20px_rgba(34,211,238,0.05)] transition-all duration-300 group"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-surface border border-border flex items-center justify-center transition-colors
                  ${report.status === 'valid' ? 'text-green-500 group-hover:border-green-500/30 group-hover:bg-green-500/5' : 
                    report.status === 'attention' ? 'text-orange-500 group-hover:border-orange-500/30 group-hover:bg-orange-500/5' : 
                    'text-red-500 group-hover:border-red-500/30 group-hover:bg-red-500/5'}
                `}>
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm text-text-primary group-hover:text-cyan-500 transition-colors">Laudo SPDA e Aterramento</h3>
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold border transition-colors
                      ${report.status === 'valid' ? 'text-green-500 border-green-500/20 bg-green-500/10 group-hover:border-green-500/40' : 
                        report.status === 'attention' ? 'text-orange-500 border-orange-500/20 bg-orange-500/10 group-hover:border-orange-500/40' : 
                        'text-red-500 border-red-500/20 bg-red-500/10 group-hover:border-red-500/40'}
                    `}>
                      {report.status === 'valid' ? 'Válido' : report.status === 'attention' ? 'Vence em breve' : 'Vencido'}
                    </span>
                  </div>
                  <div className="text-xs text-text-tertiary mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="flex items-center gap-1"><Calendar size={12} /> Realizado: <span className="text-text-secondary">{new Date(report.date).toLocaleDateString('pt-BR')}</span></span>
                    <span className="flex items-center gap-1">Válido até: <span className="text-text-secondary">{new Date(report.validity).toLocaleDateString('pt-BR')}</span></span>
                    {report.url ? (
                      <span className="flex items-center gap-1 text-cyan-500"><FileCheck2 size={12} /> Relatório anexado</span>
                    ) : (
                      <span className="flex items-center gap-1 text-orange-500"><FileText size={12} /> Sem anexo</span>
                    )}
                  </div>
                  {report.fileName && (
                    <div className="text-[11px] text-text-tertiary mt-1 truncate max-w-md">Arquivo: <span className="text-text-secondary">{report.fileName}</span></div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-[10px] uppercase text-text-tertiary tracking-widest">Resistência</div>
                  <div className="text-sm font-mono text-cyan-400 drop-shadow-[0_0_2px_rgba(34,211,238,0.3)]">{report.ohmicValue} <span className="text-cyan-700">Ω</span></div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] uppercase text-text-tertiary tracking-widest">Responsável</div>
                  <div className="text-sm text-text-secondary">{report.responsible}</div>
                </div>
                <div className="flex gap-2">
                  {report.url ? (
                    <a
                      href={report.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-text-secondary hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                      title="Abrir ou baixar relatório de medição"
                    >
                      <Download size={16} />
                    </a>
                  ) : (
                    <button className="p-2 text-text-tertiary opacity-40 cursor-not-allowed" title="Nenhum relatório anexado" disabled>
                      <Download size={16} />
                    </button>
                  )}
                  <button onClick={() => deleteReport(report.id)} className="p-2 text-text-tertiary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20" title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
