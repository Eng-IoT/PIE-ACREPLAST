import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2, ShieldCheck, User as UserIcon } from 'lucide-react';

type UserData = {
  id: string;
  email: string;
  role: 'admin' | 'reader';
};

export default function AdminPanel() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      const usersCol = collection(db, 'users');
      const snapshot = await getDocs(usersCol);
      const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
      setUsers(userList);
      setLoading(false);
    }
    fetchUsers();
  }, []);

  const updateRole = async (userId: string, newRole: 'admin' | 'reader') => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar papel do usuário');
    }
  };

  if (loading) return <div className="p-8 flex items-center justify-center text-text-secondary"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-display font-bold text-text-primary">Administração de Usuários</h1>
      
      <div className="bg-surface border border-border rounded-xl p-6">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border text-text-tertiary text-xs uppercase font-mono tracking-wider">
              <th className="pb-4">Email</th>
              <th className="pb-4">Papel</th>
              <th className="pb-4">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(u => (
              <tr key={u.id} className="text-sm text-text-primary">
                <td className="py-4">{u.email}</td>
                <td className="py-4 font-mono">{u.role}</td>
                <td className="py-4">
                  <select 
                    value={u.role} 
                    onChange={(e) => updateRole(u.id, e.target.value as 'admin' | 'reader')}
                    className="bg-canvas border border-border rounded px-2 py-1 text-xs"
                  >
                    <option value="admin">Admin</option>
                    <option value="reader">Leitor</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-surface border border-orange-500/20 rounded-xl p-6">
        <h3 className="font-bold text-orange-500 mb-2 flex items-center gap-2"><ShieldCheck size={18}/>Nota sobre criação de usuários</h3>
        <p className="text-sm text-text-secondary">Para criar novos usuários, utilize o console do Firebase Authentication. Após a criação, o documento do usuário deve ser adicionado à coleção "users" no Firestore com o respectivo papel.</p>
      </div>
    </div>
  );
}
