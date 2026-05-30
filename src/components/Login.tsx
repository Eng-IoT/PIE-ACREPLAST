import { useState } from 'react';
import { login, auth } from '../lib/firebase';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(auth, email, password);
    } catch (e) {
      setError('Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-950 p-6">
      <form onSubmit={handleSubmit} className="bg-blue-900/30 p-8 rounded-2xl border border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.2)] w-full max-w-sm space-y-6 backdrop-blur-sm">
        <h2 className="text-2xl font-display font-bold text-orange-500 text-center uppercase tracking-widest">Acesso</h2>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <div>
          <label className="block text-xs font-mono text-orange-300 uppercase mb-2 tracking-wider">Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full bg-blue-950 border border-orange-500/50 rounded px-4 py-2 text-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all"
            required
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-orange-300 uppercase mb-2 tracking-wider">Senha</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full bg-blue-950 border border-orange-500/50 rounded px-4 py-2 text-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all"
            required
            disabled={loading}
          />
        </div>
        <button 
          type="submit" 
          className="w-full bg-orange-500/10 text-orange-400 border border-orange-500 rounded px-4 py-2 font-display font-bold hover:bg-orange-500/20 transition-all flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : 'ENTRAR'}
        </button>
      </form>
    </div>
  );
}
