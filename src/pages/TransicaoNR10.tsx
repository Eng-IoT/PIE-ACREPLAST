import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronDown, LockKeyhole, ShieldCheck } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';

type DomainStatus = 'nao_avaliado' | 'em_andamento' | 'adequado' | 'critico';
type SavedDomain = { status?: DomainStatus; owner?: string; deadline?: string; notes?: string; requirements?: Record<string, boolean> };

const domains = [
  { id: 'gro-pgr', title: 'GRO/PGR e riscos elétricos', ref: 'NR-10: gestão de riscos ocupacionais', requirements: ['Choque, arco elétrico e campos eletromagnéticos identificados', 'Métodos, processos e novas instalações avaliados', 'Medidas de prevenção integradas ao PGR', 'Riscos adicionais e condições impeditivas registrados'] },
  { id: 'ar-pt', title: 'Análise de Risco e Permissão de Trabalho', ref: 'AR/PT rastreável', requirements: ['Local, tarefa, isolamento e simultaneidade definidos', 'Condições ambientais e impeditivas verificadas', 'Equipe, supervisão, validade e encerramento registrados', 'Emergência e comunicação previstas antes da liberação'] },
  { id: 'loto', title: 'Desenergização e LOTO', ref: 'Seccionamento, impedimento e reenergização', requirements: ['Seccionamento e impedimento de reenergização executados', 'Ausência de tensão constatada', 'Aterramento temporário/equipotencialização aplicados quando cabíveis', 'Proteções, sinalização e sequência de reenergização documentadas'] },
  { id: 'arc-flash', title: 'Energia incidente e arco elétrico', ref: 'Estudo e seleção de proteção', requirements: ['Curto-circuito e tempo de eliminação atualizados', 'Energia incidente e distância de trabalho calculadas', 'Categorias/EPI e limites de aproximação definidos', 'Etiquetas e estudo revisados após alterações'] },
  { id: 'workers', title: 'Autorização e capacitação', ref: 'Qualificação, autorização e treinamento', requirements: ['Qualificação/habilitação/capacitação classificada', 'Aptidão médica compatível e válida', 'Treinamentos inicial e periódico controlados', 'Autorização formal contém escopo, prazo e identificação'] },
  { id: 'ppe', title: 'EPI, EPC e ferramental', ref: 'Especificação, ensaio e rastreabilidade', requirements: ['Classe de tensão, categoria e CA cadastrados', 'Ensaios dielétricos e calibrações dentro da validade', 'Certificados vinculados ao equipamento', 'Inspeções pré-uso e descarte controlados'] },
  { id: 'projects', title: 'Projetos, as built e proteções', ref: 'Documentação técnica atualizada', requirements: ['Diagramas unifilares/as built atualizados', 'Aterramento e proteções especificados', 'Prevenção de reenergização prevista em projeto', 'Responsabilidade técnica e revisões rastreáveis'] },
  { id: 'inspections', title: 'Inspeções e plano de ação', ref: 'Correção com prazo e evidência', requirements: ['Inspeções periódicas têm relatório técnico', 'Não conformidades classificadas por criticidade', 'Responsável e prazo definidos para cada ação', 'Evidência antes/depois e encerramento aprovados'] },
  { id: 'emergency', title: 'Emergência e resgate', ref: 'Resposta a cenários elétricos', requirements: ['Cenários de emergência e resgate definidos', 'Meios de comunicação adequados disponíveis', 'Equipamentos de resgate inspecionados', 'Simulados, participantes e melhorias registrados'] },
  { id: 'classified', title: 'Áreas classificadas e GIR', ref: 'Controle de ignição e bloqueios críticos', requirements: ['Classificação de áreas e equipamentos Ex atualizados', 'Certificados e inspeções Ex rastreados', 'Medidas coletivas e autorização especial verificadas', 'Gatilhos de risco grave e iminente bloqueiam a liberação'] },
] as const;

const statusMeta: Record<DomainStatus, { label: string; color: string }> = {
  nao_avaliado: { label: 'Não avaliado', color: 'text-text-tertiary border-border' },
  em_andamento: { label: 'Em andamento', color: 'text-amber-400 border-amber-500/40' },
  adequado: { label: 'Adequado', color: 'text-emerald-400 border-emerald-500/40' },
  critico: { label: 'Crítico', color: 'text-red-400 border-red-500/40' },
};

export default function TransicaoNR10() {
  const { role } = useAuth();
  const editable = role === 'admin';
  const [saved, setSaved] = useState<Record<string, SavedDomain>>({});
  const [open, setOpen] = useState<string | null>(domains[0].id);

  useEffect(() => onSnapshot(collection(db, 'nr10Transition2026'), snapshot => {
    const next: Record<string, SavedDomain> = {};
    snapshot.forEach(item => { next[item.id] = item.data() as SavedDomain; });
    setSaved(next);
  }), []);

  const stats = useMemo(() => {
    const adequate = domains.filter(domain => saved[domain.id]?.status === 'adequado').length;
    const critical = domains.filter(domain => saved[domain.id]?.status === 'critico').length;
    return { adequate, critical, percent: Math.round((adequate / domains.length) * 100) };
  }, [saved]);

  const update = async (id: string, patch: SavedDomain) => {
    if (!editable) return;
    setSaved(current => ({ ...current, [id]: { ...current[id], ...patch } }));
    try {
      await setDoc(doc(db, 'nr10Transition2026', id), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `nr10Transition2026/${id}`);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-7">
      <section className="brand-hero rounded-2xl border border-red-500/30 p-4 sm:p-6 lg:p-8 overflow-hidden relative">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="rounded-xl bg-red-500/15 border border-red-500/30 p-3 shrink-0"><ShieldCheck className="text-red-400" /></div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[.22em] text-orange-400">Adequação regulatória Acreplast</p>
              <h1 className="mt-2 text-xl sm:text-2xl lg:text-3xl font-display font-bold">Transição para a NR-10 revisada</h1>
              <p className="mt-2 text-sm text-text-secondary max-w-3xl">A nova redação, publicada pela Portaria MTE nº 737/2026, entra em vigor em <strong className="text-text-primary">1º de junho de 2027</strong>. Até 31/05/2027 permanece vigente a redação anterior.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
            <Stat value={`${stats.percent}%`} label="adequação" />
            <Stat value={`${stats.adequate}/${domains.length}`} label="domínios" />
            <Stat value={`${stats.critical}`} label="críticos" danger={stats.critical > 0} />
          </div>
        </div>
        <div className="relative z-10 mt-5 h-2 rounded-full bg-black/20 overflow-hidden"><div className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-all" style={{ width: `${stats.percent}%` }} /></div>
      </section>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4 flex gap-3"><CalendarClock className="text-orange-400 shrink-0" /><div><p className="font-semibold">Período de preparação</p><p className="text-xs text-text-secondary mt-1">Use este painel para fechar lacunas antes da vigência.</p></div></div>
        <div className="rounded-xl border border-border bg-surface p-4 flex gap-3"><LockKeyhole className="text-red-400 shrink-0" /><div><p className="font-semibold">Bloqueio por risco crítico</p><p className="text-xs text-text-secondary mt-1">Itens críticos devem impedir a liberação da atividade até tratamento.</p></div></div>
      </div>

      <section className="space-y-3">
        {domains.map((domain, index) => {
          const value = saved[domain.id] || {};
          const status = value.status || 'nao_avaliado';
          const checked = domain.requirements.filter((_, reqIndex) => value.requirements?.[String(reqIndex)]).length;
          return <article key={domain.id} className={`rounded-2xl border bg-surface overflow-hidden ${status === 'critico' ? 'border-red-500/50' : 'border-border'}`}>
            <button type="button" onClick={() => setOpen(open === domain.id ? null : domain.id)} className="w-full min-h-16 p-4 sm:p-5 flex items-center gap-3 text-left">
              <span className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 grid place-items-center font-mono text-xs shrink-0">{String(index + 1).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1"><span className="font-display font-semibold block">{domain.title}</span><span className="text-xs text-text-tertiary block mt-1 truncate">{domain.ref} · {checked}/{domain.requirements.length} requisitos</span></span>
              <span className={`hidden sm:inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${statusMeta[status].color}`}>{statusMeta[status].label}</span>
              <ChevronDown className={`shrink-0 text-text-tertiary transition-transform ${open === domain.id ? 'rotate-180' : ''}`} size={18} />
            </button>
            {open === domain.id && <div className="border-t border-border p-4 sm:p-5 lg:p-6 space-y-5">
              <div className="grid md:grid-cols-3 gap-3">
                <label className="field-label">Status<select disabled={!editable} value={status} onChange={event => update(domain.id, { status: event.target.value as DomainStatus })} className="field-control">{Object.entries(statusMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></label>
                <label className="field-label">Responsável<input disabled={!editable} value={value.owner || ''} onChange={event => setSaved(current => ({ ...current, [domain.id]: { ...current[domain.id], owner: event.target.value } }))} onBlur={event => update(domain.id, { owner: event.target.value.trim() })} className="field-control" placeholder="Nome / função" /></label>
                <label className="field-label">Prazo<input disabled={!editable} type="date" value={value.deadline || ''} onChange={event => update(domain.id, { deadline: event.target.value })} className="field-control" /></label>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 sm:gap-3">
                {domain.requirements.map((requirement, reqIndex) => {
                  const key = String(reqIndex); const isChecked = Boolean(value.requirements?.[key]);
                  return <button disabled={!editable} type="button" key={requirement} onClick={() => update(domain.id, { requirements: { ...(value.requirements || {}), [key]: !isChecked } })} className={`min-h-14 rounded-xl border p-3 text-left flex gap-3 items-start transition-colors ${isChecked ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border hover:border-orange-500/30'}`}>
                    <CheckCircle2 size={18} className={`mt-0.5 shrink-0 ${isChecked ? 'text-emerald-400' : 'text-text-tertiary'}`} /><span className="text-sm leading-relaxed">{requirement}</span>
                  </button>;
                })}
              </div>
              <label className="field-label">Evidências, pendências e decisão técnica<textarea disabled={!editable} rows={3} value={value.notes || ''} onChange={event => setSaved(current => ({ ...current, [domain.id]: { ...current[domain.id], notes: event.target.value } }))} onBlur={event => update(domain.id, { notes: event.target.value.trim() })} className="field-control resize-y" placeholder="Registre documentos, números de laudo, bloqueios e próximos passos..." /></label>
              {status === 'critico' && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 flex gap-2 text-sm text-red-300"><AlertTriangle size={18} className="shrink-0" /> Risco crítico: não libere a atividade até aplicar e registrar as medidas de controle.</div>}
            </div>}
          </article>;
        })}
      </section>
      {!editable && <p className="text-xs text-text-tertiary text-center">Modo consulta. Somente administradores podem alterar a matriz de adequação.</p>}
    </div>
  );
}

function Stat({ value, label, danger = false }: { value: string; label: string; danger?: boolean }) {
  return <div className="rounded-xl border border-white/10 bg-black/15 p-3 text-center min-w-0"><div className={`text-xl sm:text-2xl font-display font-bold ${danger ? 'text-red-400' : 'text-orange-400'}`}>{value}</div><div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-text-tertiary">{label}</div></div>;
}
