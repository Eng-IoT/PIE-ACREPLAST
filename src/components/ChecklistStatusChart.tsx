import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

export default function ChecklistStatusChart() {
  const [data, setData] = useState<{name: string, value: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'checklistItems'), (snapshot) => {
      let conforme = 0;
      let naoConforme = 0;
      
      snapshot.docs.forEach(doc => {
        const itemData = doc.data();
        if (itemData.status === 'conforme') conforme++;
        else naoConforme++;
      });
      
      setData([
        { name: 'Conforme', value: conforme },
        { name: 'Não Conforme', value: naoConforme }
      ]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'checklistItems');
      setLoading(false);
    });
    
    return unsub;
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin text-orange-500" /></div>;
  }

  const COLORS = ['#fb923c', '#f87171']; // orange-400, red-400

  return (
    <div className="h-full w-full min-h-[250px] relative">
        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none z-10">
            <span className="text-3xl font-display font-medium text-text-primary drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{data.reduce((a,b)=>a+b.value, 0)}</span>
            <span className="text-[10px] font-mono text-orange-500 uppercase tracking-widest">Itens</span>
        </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={90}
            paddingAngle={8}
            dataKey="value"
            stroke="none"
            cornerRadius={4}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? '#fb923c' : '#f87171'} style={{ filter: `drop-shadow(0 0 5px ${index === 0 ? 'rgba(249,115,22,0.5)' : 'rgba(248,113,113,0.5)'})` }} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(249,115,22,0.3)', color: '#fff', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', boxShadow: '0 0 15px rgba(249,115,22,0.1)', backdropFilter: 'blur(8px)' }}
            itemStyle={{ color: '#fb923c' }}
          />
          <Legend 
            wrapperStyle={{ color: 'var(--text-secondary)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
