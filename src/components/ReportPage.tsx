import { useState, useEffect } from 'react';
import { doc, getDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function ReportPage({ close }: { close: () => void }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      const clientSnap = await getDoc(doc(db, 'clientData', 'main'));
      const docsSnap = await getDocs(collection(db, 'documents'));
      const checkSnap = await getDocs(collection(db, 'checklistItems'));

      setData({
        client: clientSnap.exists() ? clientSnap.data() : {},
        documents: docsSnap.docs.map(d => d.data()),
        checklist: checkSnap.docs.map(d => d.data())
      });
    }
    fetchData();
  }, []);

  if (!data) return <div className="p-10 text-text-primary">Carregando relatório...</div>;

  return (
    <div className="p-10 bg-white text-black min-h-screen print:p-0 print:m-0">
      <div className="flex justify-between print:hidden mb-10 max-w-4xl mx-auto">
        <button onClick={close} className="bg-surface-hover text-text-primary px-6 py-2 rounded-lg font-mono text-sm uppercase tracking-widest border border-border-strong hover:bg-surface-active transition-colors">Voltar</button>
        <button onClick={() => window.print()} className="bg-cyan-600 text-white px-6 py-2 rounded-lg font-mono text-sm uppercase tracking-widest hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all">Imprimir PDF</button>
      </div>

      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center border-b-2 border-black pb-6 mb-10 print:break-after-avoid">
          <div>
            <h1 className="text-3xl font-display font-bold text-black uppercase tracking-tight">Prontuário Técnico</h1>
            <p className="text-sm font-mono text-gray-600 mt-1 uppercase tracking-widest">NR-10 • Data: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          <div className="w-24 h-12 border-2 border-black flex items-center justify-center font-bold text-xs uppercase text-black font-mono">PIE SYS</div>
        </header>
      
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-lg font-bold border-b border-black mb-4">Dados do Cliente</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {Object.entries(data.client || {}).map(([key, value]) => (
            <p key={key}><span className="font-semibold capitalize">{key}:</span> {String(value)}</p>
          ))}
        </div>
      </section>

      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-lg font-bold border-b border-black mb-4">Documentação Técnica</h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {data.documents.map((d: any, i:number) => <li key={i}>{d.name}</li>)}
        </ul>
      </section>

      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-lg font-bold border-b border-black mb-4">Checklist NR-10</h2>
        <ul className="list-disc pl-5 text-sm space-y-1 font-mono">
          {data.checklist.map((c: any, i:number) => (
             <li key={i} className="mb-1">
                {c.name}: <span className={c.status === 'conforme' ? 'text-green-700 font-bold uppercase' : 'text-red-700 font-bold uppercase'}>{c.status === 'conforme' ? 'Conforme' : 'Não Conforme'}</span>
             </li>
          ))}
        </ul>
      </section>
      </div>
    </div>
  );
}
