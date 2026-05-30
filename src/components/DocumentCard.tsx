import { motion } from 'motion/react';
import { FileText, Trash2, ExternalLink } from 'lucide-react';

export default function DocumentCard({ name, date, tag, onDelete, onLink }: { name: string, date: string, tag: string, onDelete: () => void, onLink?: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-surface rounded-xl border border-border group flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center hover:border-orange-500/30 hover:shadow-[0_0_15px_rgba(249,115,22,0.1)] transition-all"
    >
      <div className={`flex items-center gap-4 min-w-0 ${onLink ? 'cursor-pointer' : ''}`} onClick={onLink}>
        <div className="p-3 bg-surface-active rounded-lg text-orange-400 border border-border-strong group-hover:border-orange-500/30 shrink-0">
          <FileText size={20} />
        </div>
        <div className="min-w-0">
          <span className="font-bold text-text-primary block truncate">{name}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] uppercase tracking-wider font-mono bg-surface-active px-2 py-0.5 rounded text-text-tertiary">{tag}</span>
            <span className="text-xs text-text-secondary truncate">{date}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:shrink-0 justify-end sm:justify-start">
        {onLink && (
          <button onClick={onLink} className="p-2 text-text-secondary hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors border border-transparent hover:border-orange-500/20" title="Visualizar">
            <ExternalLink size={18} />
          </button>
        )}
        <button onClick={onDelete} className="p-2 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20" title="Remover">
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}
