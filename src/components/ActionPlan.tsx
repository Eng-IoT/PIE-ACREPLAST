import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Plus, Trash2, Calendar, User, Clock } from 'lucide-react';

type ActionItem = {
  id: string;
  name: string;
  deadline: string;
  responsible: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
};

export default function ActionPlan() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemResponsible, setNewItemResponsible] = useState('');
  const [newItemPriority, setNewItemPriority] = useState<ActionItem['priority']>('medium');
  const [newItemDeadline, setNewItemDeadline] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'actionPlan'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActionItem));
      // Sort by status, then priority, then deadline
      setItems(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'actionPlan');
      setLoading(false);
    });
    
    return unsub;
  }, []);

  const addItem = async () => {
    if (!newItemName || !newItemResponsible || !newItemDeadline) return;
    
    try {
      await addDoc(collection(db, 'actionPlan'), {
        name: newItemName,
        responsible: newItemResponsible,
        deadline: newItemDeadline,
        priority: newItemPriority,
        status: 'pending'
      });
      setNewItemName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'actionPlan');
    }
  };

  const updateStatus = async (id: string, newStatus: ActionItem['status']) => {
    try {
      await updateDoc(doc(db, 'actionPlan', id), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `actionPlan/${id}`);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'actionPlan', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `actionPlan/${id}`);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-text-secondary bg-surface-hover border-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Item */}
      <div className="bg-surface-hover border border-border-strong rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-end group focus-within:border-orange-500/30 focus-within:shadow-[0_0_20px_rgba(249,115,22,0.05)] transition-all duration-500">
        <div className="flex-1 w-full relative">
          <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-1 group-focus-within:text-orange-500/80 transition-colors">Ação Corretiva</label>
          <input 
            type="text" 
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Ex: Instalar proteção no Quadro QGPT-01..."
            className="w-full bg-surface border border-border-strong rounded-lg p-2 text-sm text-text-primary h-10 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 outline-none transition-all"
          />
        </div>
        <div className="w-full sm:w-32 relative">
          <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-1 group-focus-within:text-orange-500/80 transition-colors">Responsável</label>
          <input 
            type="text" 
            value={newItemResponsible}
            onChange={(e) => setNewItemResponsible(e.target.value)}
            placeholder="Nome"
            className="w-full bg-surface border border-border-strong rounded-lg p-2 text-sm text-text-primary h-10 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 outline-none transition-all"
          />
        </div>
        <div className="w-full sm:w-32 relative">
          <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-1 group-focus-within:text-orange-500/80 transition-colors">Prazo</label>
          <input 
            type="date" 
            value={newItemDeadline}
            onChange={(e) => setNewItemDeadline(e.target.value)}
            className="w-full bg-surface border border-border-strong rounded-lg p-2 text-sm text-text-primary h-10 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 outline-none transition-all"
          />
        </div>
        <div className="w-full sm:w-32 relative">
          <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-1 group-focus-within:text-orange-500/80 transition-colors">Prioridade</label>
          <select 
            value={newItemPriority}
            onChange={(e) => setNewItemPriority(e.target.value as ActionItem['priority'])}
            className="w-full bg-surface border border-border-strong rounded-lg p-2 text-sm text-text-primary h-10 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 outline-none transition-all"
          >
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
        </div>
        <button 
          onClick={addItem}
          disabled={!newItemName || !newItemResponsible || !newItemDeadline}
          className="w-full sm:w-auto h-10 bg-orange-600/90 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-orange-500 border border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all duration-300 disabled:opacity-30 disabled:hover:shadow-none flex items-center justify-center shrink-0"
        >
          <Plus size={16} /> <span className="sm:hidden ml-2">Adicionar Ação</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center text-text-tertiary py-8 text-sm">Carregando plano de ação...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-text-tertiary py-8 text-sm border border-dashed border-border rounded-lg">Nenhuma ação registrada.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="p-4 bg-surface-hover rounded-xl border border-border flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-sm text-text-primary">{item.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold border ${getPriorityColor(item.priority)}`}>
                    {item.priority === 'low' && 'Baixa'}
                    {item.priority === 'medium' && 'Média'}
                    {item.priority === 'high' && 'Alta'}
                    {item.priority === 'critical' && 'Crítica'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-tertiary">
                  <span className="flex items-center gap-1"><User size={12} /> {item.responsible}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(item.deadline).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={item.status}
                  onChange={(e) => updateStatus(item.id, e.target.value as ActionItem['status'])}
                  className={`bg-surface border border-border-strong rounded p-1 text-xs outline-none ${
                    item.status === 'completed' ? 'text-green-500' : 
                    item.status === 'in_progress' ? 'text-orange-400' : 'text-text-secondary'
                  }`}
                >
                  <option value="pending">A Fazer</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="completed">Concluído</option>
                </select>
                <button 
                  onClick={() => deleteItem(item.id)}
                  className="p-1.5 text-text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
