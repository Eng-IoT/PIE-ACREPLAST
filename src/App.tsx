/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { doc, onSnapshot, setDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { AuthProvider, useAuth } from './components/AuthContext';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import DadosCliente from './components/DadosCliente';
import DocumentList from './components/DocumentList';
import NR10Checklist from './components/NR10Checklist';
import ChecklistStatusChart from './components/ChecklistStatusChart';
import ReportPage from './components/ReportPage';
import RelatoriosTecnicos from './components/RelatoriosTecnicos';
import Laudos from './components/Laudos';
import Workers from './components/Workers';
import ElectricalProjects from './components/ElectricalProjects';
import TrtArt from './components/TrtArt';
import ActionPlan from './components/ActionPlan';
import SpdaAterramento from './components/SpdaAterramento';
import ComplianceSummary from './components/ComplianceSummary';
import WorkerStatus from './components/WorkerStatus';
import Skeleton from './components/Skeleton';
import { Worker, ActionPlanItem } from './types';
import PendingAlerts from './components/PendingAlerts';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import LaudoEnsaiosEletricos from './pages/LaudoEnsaiosEletricos';
import LaudosNR12 from './pages/LaudosNR12';
import DocumentosObrigatoriosNR10 from './pages/DocumentosObrigatoriosNR10';
import EpiEpcFerramental from './pages/EpiEpcFerramental';
import ProcedimentosNR10 from './pages/ProcedimentosNR10';
import AreasClassificadas from './pages/AreasClassificadas';
import InspecoesEletricas from './pages/InspecoesEletricas';
import RelatorioTecnicoConsolidado from './pages/RelatorioTecnicoConsolidado';
import DocumentosInteligentes from './pages/DocumentosInteligentes';
import ValidacaoDocumento from './pages/ValidacaoDocumento';

export default function App() {
  const { user, loading, role } = useAuth();
  
  const [showReport, setShowReport] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('pie-theme');
    return savedTheme === 'light' ? 'light' : 'dark';
  });
  const [companyName, setCompanyName] = useState('SIDERÚRGICA NORTE S.A.');
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [isHighContrast, setIsHighContrast] = useState(false);
  
  const [engineerName, setEngineerName] = useState('Eng. Roberto S. Mendonça');
  const [isEditingEngineer, setIsEditingEngineer] = useState(false);
  const [editEngineerName, setEditEngineerName] = useState('');
  
  const [compliance, setCompliance] = useState('0');
  const [actionPlanCount, setActionPlanCount] = useState(0);
  const [actionPlanData, setActionPlanData] = useState<ActionPlanItem[]>([]);
  const [workersCount, setWorkersCount] = useState(0);
  const [workersData, setWorkersData] = useState<Worker[]>([]);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [isLoading, setIsLoading] = useState({
    compliance: true,
    actionPlan: true,
    workers: true,
    documents: true
  });

  const workerIdMatch = new URLSearchParams(window.location.search).get('worker');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-light', theme === 'light');

    const themeColor = theme === 'light' ? '#f8fafc' : '#020617';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    const unsubCompany = onSnapshot(doc(db, 'settings', 'companyProfile'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().name) {
        setCompanyName(docSnap.data().name);
      }
    });

    const unsubEngineer = onSnapshot(doc(db, 'settings', 'engineerProfile'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().name) {
        setEngineerName(docSnap.data().name);
      }
    });

    const unsubChecklist = onSnapshot(collection(db, 'checklistItems'), (snapshot) => {
        let conforme = 0;
        snapshot.docs.forEach(doc => {
            if (doc.data().status === 'conforme') conforme++;
        });
        const total = snapshot.size;
        setCompliance(total > 0 ? ((conforme / total) * 100).toFixed(1) : '100');
        setIsLoading(prev => ({ ...prev, compliance: false }));
    });

    const unsubActionPlan = onSnapshot(collection(db, 'actionPlan'), (snapshot) => {
        setActionPlanCount(snapshot.size);
        setActionPlanData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActionPlanItem)));
        setIsLoading(prev => ({ ...prev, actionPlan: false }));
    });

    const unsubWorkers = onSnapshot(collection(db, 'workers'), (snapshot) => {
        setWorkersCount(snapshot.size);
        setWorkersData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Worker)));
        setIsLoading(prev => ({ ...prev, workers: false }));
    });
    
    const unsubDocuments = onSnapshot(collection(db, 'documents'), (snapshot) => {
        setDocumentsCount(snapshot.size);
        setIsLoading(prev => ({ ...prev, documents: false }));
    });

    return () => {
        unsubCompany();
        unsubEngineer();
        unsubChecklist();
        unsubActionPlan();
        unsubWorkers();
        unsubDocuments();
    };
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-canvas">Carregando...</div>;
  if (!user) return <Login />;

  const saveCompanyName = async () => {
    if (!editCompanyName.trim()) {
      setIsEditingCompany(false);
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'companyProfile'), { name: editCompanyName.trim() }, { merge: true });
      setIsEditingCompany(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/companyProfile');
    }
  };

  const saveEngineerName = async () => {
    if (!editEngineerName.trim()) {
      setIsEditingEngineer(false);
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'engineerProfile'), { name: editEngineerName.trim() }, { merge: true });
      setIsEditingEngineer(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/engineerProfile');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('pie-theme', newTheme);
    setTheme(newTheme);
  };

  const toggleHighContrast = () => {
    const newHC = !isHighContrast;
    setIsHighContrast(newHC);
    if (newHC) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  };

  if (workerIdMatch) return <WorkerStatus workerId={workerIdMatch} />;
  
  if (showReport) return <ReportPage close={() => setShowReport(false)} />;

  return (
    <Router>
      <div className={`flex h-screen overflow-hidden bg-canvas text-text-primary font-sans selection:bg-orange-500/30`}>
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <Sidebar 
          isMobileMenuOpen={isMobileMenuOpen} 
          setIsMobileMenuOpen={setIsMobileMenuOpen} 
        />

        <main className="flex-1 flex h-screen min-w-0 flex-col overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
          <Navbar
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            companyName={companyName}
            isEditingCompany={isEditingCompany}
            setIsEditingCompany={setIsEditingCompany}
            editCompanyName={editCompanyName}
            setEditCompanyName={setEditCompanyName}
            saveCompanyName={saveCompanyName}
            isHighContrast={isHighContrast}
            toggleHighContrast={toggleHighContrast}
            theme={theme}
            toggleTheme={toggleTheme}
            engineerName={engineerName}
            isEditingEngineer={isEditingEngineer}
            setIsEditingEngineer={setIsEditingEngineer}
            editEngineerName={editEngineerName}
            setEditEngineerName={setEditEngineerName}
            saveEngineerName={saveEngineerName}
          />

          <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-10 main-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 md:space-y-10"
              >
                <Routes>
                  <Route path="/client-data" element={<Section title="Dados do Cliente"><DadosCliente /></Section>} />
                  <Route path="/admin" element={role === 'admin' ? <Section title="Admin"><AdminPanel /></Section> : <Navigate to="/dashboard" />} />
                  <Route path="/laudos-ensaios-eletricos" element={<LaudoEnsaiosEletricos />} />
                  <Route path="/laudos-nr12" element={<LaudosNR12 />} />
                  <Route path="/documentos-obrigatorios-nr10" element={<DocumentosObrigatoriosNR10 />} />
                  <Route path="/epi-epc-ferramental" element={<EpiEpcFerramental />} />
                  <Route path="/procedimentos-nr10" element={<ProcedimentosNR10 />} />
                  <Route path="/areas-classificadas" element={<AreasClassificadas />} />
                  <Route path="/inspecoes-eletricas" element={<InspecoesEletricas />} />
                  <Route path="/relatorio-tecnico-consolidado" element={<RelatorioTecnicoConsolidado />} />
                  <Route path="/documentos-inteligentes" element={<DocumentosInteligentes />} />
                  <Route path="/validar-documento/:validationId" element={<ValidacaoDocumento />} />
                  <Route path="/dashboard" element={
                    <>
                      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <PendingAlerts workers={workersData} actionPlan={actionPlanData} />
                      </section>
                      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {isLoading.compliance ? <Skeleton className="h-32" /> : <MetricCard title="Conformidade" value={compliance} unit="%" />}
                        {isLoading.actionPlan ? <Skeleton className="h-32" /> : <MetricCard title="Plano de Ação" value={`${actionPlanCount}`} unit="itens" />}
                        {isLoading.workers ? <Skeleton className="h-32" /> : <MetricCard title="Trabalhadores" value={`${workersCount}`} unit="ativos" />}
                        {isLoading.documents ? <Skeleton className="h-32" /> : <MetricCard title="Documentos" value={`${documentsCount}`} unit="files" />}
                      </section>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 auto-rows-min">
                        <Section title="Resumo de Conformidade" className="xl:col-span-2">
                          <ComplianceSummary />
                        </Section>
                        <Section title="Dados do Cliente" className="xl:col-span-1">
                          <DadosCliente />
                        </Section>
                        <Section title="Distribuição do Checklist" className="xl:col-span-1">
                          <ChecklistStatusChart />
                        </Section>
                        <Section title="Últimas Não Conformidades" className="xl:col-span-2">
                          <NR10Checklist />
                        </Section>
                        <Section title="Status do Prontuário" className="xl:col-span-1">
                          <DocumentList />
                        </Section>
                        <Section title="Trabalhadores Autorizados" className="xl:col-span-2">
                          <Workers />
                        </Section>
                        <Section title="Relatório Técnico PDF" className="xl:col-span-3">
                          {role === 'admin' && (
                            <button 
                              onClick={() => setShowReport(true)}
                              className="w-full py-4 bg-orange-500/10 text-orange-400 rounded-sm border border-orange-500 hover:bg-orange-500/20 transition-all font-mono font-bold uppercase tracking-[0.2em] text-xs shadow-[0_0_15px_rgba(249,115,22,0.2)] hover:shadow-[0_0_25px_rgba(249,115,22,0.4)]"
                            >
                              Gerar PDF do Sistema Final
                            </button>
                          )}
                        </Section>
                      </div>
                    </>
                  } />
                  <Route path="/documents" element={<Section title="Prontuário Técnico"><DocumentList /></Section>} />
                  <Route path="/relatorios" element={<Section title="Relatórios Técnicos"><RelatoriosTecnicos /></Section>} />
                  <Route path="/laudos" element={<Section title="Laudos"><Laudos /></Section>} />
                  <Route path="/checklist" element={<Section title="Checklist NR-10"><NR10Checklist /></Section>} />
                  <Route path="/action-plan" element={<Section title="Plano de Ação"><ActionPlan /></Section>} />
                  <Route path="/workers" element={<Section title="Trabalhadores"><Workers /></Section>} />
                  <Route path="/projects" element={<Section title="Projetos e Esquemas Elétricos"><ElectricalProjects /></Section>} />
                  <Route path="/spda" element={<Section title="SPDA e Aterramento"><SpdaAterramento /></Section>} />
                  <Route path="/trt-art" element={<Section title="TRT / ART"><TrtArt /></Section>} />
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </Router>
  );
}



function MetricCard({ title, value, unit, subtitle }: { title: string, value: string, unit: string, subtitle?: string }) {
  return (
    <div className="group bg-surface hover:bg-surface-hover backdrop-blur-md border border-border hover:border-orange-500/50 p-7 lg:p-8 rounded-2xl transition-all relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
      <div className="text-[11px] text-text-tertiary font-mono font-bold uppercase tracking-[0.2em] mb-3 relative z-10 flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm bg-orange-500/50 inline-block animate-pulse"></span>
        {title}
      </div>
      <div className="text-4xl lg:text-5xl font-display font-bold tracking-tighter text-text-primary relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{value}<span className="text-xl lg:text-2xl text-orange-400 font-mono ml-2 opacity-80">{unit}</span></div>
      {subtitle && <div className="text-[11px] font-mono text-orange-500 mt-4 relative z-10 uppercase tracking-widest">{subtitle}</div>}
    </div>
  );
}

function Section({ title, children, className = '' }: { title: string, children: React.ReactNode, className?: string }) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`group bg-surface/80 backdrop-blur-md rounded-2xl border border-border hover:border-orange-500/30 p-7 lg:p-9 h-full flex flex-col relative overflow-hidden transition-colors ${className}`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-orange-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <h2 className="text-[11px] font-mono uppercase tracking-[0.3em] font-medium text-orange-400 flex items-center gap-4 mb-8 pb-4 border-b border-border/30 relative z-10">
        <div className="flex gap-1.5">
          <span className="w-1.5 h-3.5 rounded-sm bg-orange-500 shrink-0" />
          <span className="w-1.5 h-3.5 rounded-sm bg-orange-500/50 shrink-0" />
        </div>
        {title}
      </h2>
      <div className="flex-1 relative z-10 flex flex-col">
        {children}
      </div>
    </motion.section>
  );
}
