import { Menu, Eye, Sun, Moon, Check, X, Edit2 } from 'lucide-react';
import NotificationBell from './NotificationBell';

interface NavbarProps {
  setIsMobileMenuOpen: (open: boolean) => void;
  companyName: string;
  isEditingCompany: boolean;
  setIsEditingCompany: (editing: boolean) => void;
  editCompanyName: string;
  setEditCompanyName: (name: string) => void;
  saveCompanyName: () => Promise<void>;
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  engineerName: string;
  isEditingEngineer: boolean;
  setIsEditingEngineer: (editing: boolean) => void;
  editEngineerName: string;
  setEditEngineerName: (name: string) => void;
  saveEngineerName: () => Promise<void>;
}

export default function Navbar({
  setIsMobileMenuOpen,
  companyName,
  isEditingCompany,
  setIsEditingCompany,
  editCompanyName,
  setEditCompanyName,
  saveCompanyName,
  isHighContrast,
  toggleHighContrast,
  theme,
  toggleTheme,
  engineerName,
  isEditingEngineer,
  setIsEditingEngineer,
  editEngineerName,
  setEditEngineerName,
  saveEngineerName,
}: NavbarProps) {
  return (
    <header className="h-20 border-b border-border flex items-center justify-between px-4 md:px-10 bg-surface/50 backdrop-blur-md relative z-20" id="header-navbar">
      <div className="flex items-center gap-4">
        <button 
          id="navbar-mobile-menu-btn"
          className="md:hidden text-text-secondary hover:text-text-primary" 
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={24} />
        </button>
        <div className="flex flex-col group">
          <div className="flex items-center gap-2">
            {isEditingCompany ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  id="navbar-edit-company-input"
                  className="bg-surface border border-border-strong rounded px-2 py-1 text-lg md:text-3xl font-serif font-light text-text-primary w-[250px] md:w-[450px] outline-none focus:border-orange-500"
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveCompanyName()}
                  autoFocus
                />
                <button 
                  id="navbar-save-company-btn"
                  onClick={saveCompanyName} 
                  className="text-green-500 hover:text-green-400 p-1 rounded hover:bg-surface-active"
                >
                  <Check size={16} />
                </button>
                <button 
                  id="navbar-cancel-company-btn"
                  onClick={() => setIsEditingCompany(false)} 
                  className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-surface-active"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <h1 
                  id="navbar-company-title"
                  onClick={() => { setEditCompanyName(companyName); setIsEditingCompany(true); }}
                  className="text-lg md:text-3xl font-display font-bold text-orange-400 tracking-widest uppercase truncate max-w-[250px] md:max-w-xl drop-shadow-[0_0_8px_rgba(249,115,22,0.3)] cursor-pointer hover:text-orange-300 transition-colors"
                  title="Clique para editar"
                >
                  {companyName}
                </h1>
              </>
            )}
          </div>
          <span className="text-[8px] md:text-[10px] text-text-tertiary uppercase tracking-[0.2em] md:tracking-[0.3em] truncate max-w-[200px] md:max-w-none">Prontuário Exclusivo do Cliente</span>
        </div>
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <NotificationBell />
        <button 
          id="navbar-high-contrast-btn"
          onClick={toggleHighContrast} 
          className={`transition-colors ${isHighContrast ? 'text-orange-400' : 'text-text-secondary hover:text-text-primary'}`} 
          title="Alto Contraste"
        >
          <Eye size={20} />
        </button>
        <button 
          id="navbar-theme-btn"
          onClick={toggleTheme} 
          className="text-text-secondary hover:text-text-primary transition-colors" 
          title="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <div className="text-right hidden sm:block group">
          <div className="text-[10px] text-text-tertiary uppercase">Resp. Técnico</div>
          {isEditingEngineer ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                id="navbar-edit-engineer-input"
                className="bg-surface border border-border-strong rounded px-2 py-1 text-xs font-medium text-text-primary w-[150px] outline-none focus:border-orange-500"
                value={editEngineerName}
                onChange={(e) => setEditEngineerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveEngineerName()}
                autoFocus
              />
              <button 
                id="navbar-save-engineer-btn"
                onClick={saveEngineerName} 
                className="text-green-500 hover:text-green-400 p-0.5 rounded hover:bg-surface-active"
              >
                <Check size={12} />
              </button>
              <button 
                id="navbar-cancel-engineer-btn"
                onClick={() => setIsEditingEngineer(false)} 
                className="text-red-500 hover:text-red-400 p-0.5 rounded hover:bg-surface-active"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="text-xs font-medium" id="navbar-engineer-value">{engineerName}</div>
              <button 
                id="navbar-edit-engineer-btn"
                onClick={() => { setEditEngineerName(engineerName); setIsEditingEngineer(true); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-orange-500/50 hover:text-orange-400"
                title="Editar nome"
              >
                <Edit2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
