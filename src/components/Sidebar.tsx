import { NavLink as RouterNavLink } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { LayoutDashboard, ShieldCheck, Building, FileText, FileCheck, BookOpenText, CheckSquare, ClipboardList, Users, Zap, FileDown, X, ShieldAlert, Wrench, FileCog, MapPinned, ClipboardCheck, FileBarChart2 } from 'lucide-react';

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) {
  const { role } = useAuth();

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border flex flex-col transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 md:relative md:translate-x-0 md:w-72 overflow-x-hidden min-w-[240px]`}>
      <div className="p-4 md:p-8 flex items-center justify-between gap-3 border-b border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent opacity-50" />
        <div className="flex items-center gap-2 md:gap-3 relative z-10 min-w-0">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 md:w-14 md:h-14 rounded object-contain shrink-0 max-w-[120px]" id="sidebar-logo" />
          <span className="font-display font-medium text-xs md:text-lg tracking-[0.1em] text-text-primary truncate">PIE<span className="text-orange-400">CONTROL</span></span>
        </div>
        <button 
          id="sidebar-close-btn"
          className="md:hidden text-text-secondary hover:text-orange-400 relative z-10" 
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto overflow-x-hidden w-full">
        <div className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary px-4 mb-4">Navegação</div>
        <SideNavItem icon={<LayoutDashboard size={18}/>} label="Visão Geral" to="/dashboard" id="nav-dashboard" />
        {role === 'admin' && <SideNavItem icon={<ShieldCheck size={18}/>} label="Admin" to="/admin" id="nav-admin" />}
        <SideNavItem icon={<Building size={18}/>} label="Dados do Cliente" to="/client-data" id="nav-client-data" />
        <SideNavItem icon={<BookOpenText size={18}/>} label="Documentos NR-10" to="/documentos-obrigatorios-nr10" id="nav-nr10-docs" />
        <SideNavItem icon={<FileCheck size={18}/>} label="Ensaios Elétricos" to="/laudos-ensaios-eletricos" id="nav-ensaios" />
        <SideNavItem icon={<ShieldAlert size={18}/>} label="Laudos NR-12" to="/laudos-nr12" id="nav-nr12" />
        <SideNavItem icon={<ClipboardCheck size={18}/>} label="Inspeções Elétricas" to="/inspecoes-eletricas" id="nav-inspecoes" />
        <SideNavItem icon={<Building size={18}/>} label="SPDA e Aterramento" to="/spda" id="nav-spda" />
        <SideNavItem icon={<Wrench size={18}/>} label="EPI/EPC/Ferramental" to="/epi-epc-ferramental" id="nav-epi-epc" />
        <SideNavItem icon={<FileCog size={18}/>} label="Procedimentos NR-10" to="/procedimentos-nr10" id="nav-procedimentos" />
        <SideNavItem icon={<MapPinned size={18}/>} label="Áreas Classificadas" to="/areas-classificadas" id="nav-areas-classificadas" />
        <SideNavItem icon={<Zap size={18}/>} label="Projetos Elétricos" to="/projects" id="nav-projects" />
        <SideNavItem icon={<FileDown size={18}/>} label="TRT / ART" to="/trt-art" id="nav-trt-art" />
        <SideNavItem icon={<Users size={18}/>} label="Trabalhadores" to="/workers" id="nav-workers" />
        <SideNavItem icon={<CheckSquare size={18}/>} label="Checklist NR-10" to="/checklist" id="nav-checklist" />
        <SideNavItem icon={<ClipboardList size={18}/>} label="Plano de Ação" to="/action-plan" id="nav-action-plan" />
        <SideNavItem icon={<FileBarChart2 size={18}/>} label="Relatório Consolidado" to="/relatorio-tecnico-consolidado" id="nav-relatorio-consolidado" />
        <SideNavItem icon={<FileText size={18}/>} label="Relatórios Técnicos" to="/relatorios" id="nav-relatorios" />
        <SideNavItem icon={<FileCheck size={18}/>} label="Laudos Gerais" to="/laudos" id="nav-laudos" />
        <SideNavItem icon={<BookOpenText size={18}/>} label="Prontuário Técnico" to="/documents" id="nav-documents" />
      </nav>
    </aside>
  );
}

interface SideNavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  id?: string;
}

function SideNavItem({ icon, label, to, id }: SideNavItemProps) {
  return (
    <RouterNavLink 
      to={to} 
      id={id}
      className={({ isActive }) =>
        `w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-sm transition-all font-sans font-medium text-[10px] md:text-xs uppercase tracking-[0.1em] md:tracking-[0.2em] border-l-2 ${
          isActive
            ? 'bg-orange-500/10 text-orange-500 border-orange-500'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover border-transparent hover:border-border-strong'
        }`
      }
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </RouterNavLink>
  );
}
