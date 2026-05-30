import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Trash2, Plus, AlertTriangle, Download, FileText, QrCode, X, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';

type Worker = { 
  id: string; 
  name: string; 
  role: string; 
  status: string; 
  certificateValidity: string;
  statusHistory?: { date: string; status: string }[];
};

export default function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [newWorker, setNewWorker] = useState({ name: '', role: '', status: 'Ativo', certificateValidity: '' });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [qrWorker, setQrWorker] = useState<Worker | null>(null);
  const [scannedWorker, setScannedWorker] = useState<Worker | null>(null);
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isScanning) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: {width: 250, height: 250} },
        /* verbose= */ false);
      scannerRef.current.render((decodedText) => {
        setIsScanning(false);
        if (scannerRef.current) {
          scannerRef.current.clear();
        }
        try {
            const url = new URL(decodedText);
            const workerId = url.searchParams.get('worker');
            const foundWorker = workers.find(w => w.id === workerId);
            if (foundWorker) {
                setScannedWorker(foundWorker);
            } else {
                alert("Trabalhador não encontrado.");
            }
        } catch (e) {
            console.error("Invalid QR code", e);
        }
      }, (error) => {
        console.warn(error);
      });
    } else {
        if (scannerRef.current) {
            scannerRef.current.clear();
        }
    }
    return () => {
        if (scannerRef.current) {
            scannerRef.current.clear();
        }
    };
  }, [isScanning, workers]);

  const isExpiringSoon = (dateStr: string) => {
    const expDate = new Date(dateStr);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'workers'), (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Worker)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'workers');
    });
    return unsub;
  }, []);

  const exportToCSV = () => {
    const headers = ["Nome", "Cargo", "Status", "Validade Certificado"];
    const rows = workers.map(w => [w.name, w.role, w.status, w.certificateValidity]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trabalhadores.csv';
    a.click();
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Lista de Pessoal Autorizado', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
    
    const tableColumn = ["Nome", "Cargo", "Status", "Validade do Certificado"];
    const tableRows = workers.map(w => [
      w.name, 
      w.role, 
      w.status, 
      w.certificateValidity ? new Date(w.certificateValidity).toLocaleDateString('pt-BR') : 'N/A'
    ]);
    
    autoTable(doc, {
      startY: 36,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    doc.save('pessoal_autorizado.pdf');
  };

  const addWorker = async () => {
    if (!newWorker.name || !newWorker.role || !newWorker.certificateValidity) return;
    
    const validityDate = new Date(newWorker.certificateValidity);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (validityDate < today) {
      alert('A data de validade não pode ser anterior a hoje.');
      return;
    }

    try {
      await addDoc(collection(db, 'workers'), { ...newWorker, statusHistory: [{ date: new Date().toISOString(), status: newWorker.status }] });
      setNewWorker({ name: '', role: '', status: 'Ativo', certificateValidity: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'workers');
    }
  };

  const deleteWorker = async (id: string) => {
      try {
        await deleteDoc(doc(db, 'workers', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `workers/${id}`);
      }
  };

  return (
    <div className="space-y-6 text-text-secondary">
      <div className="grid grid-cols-1 gap-4 p-5 bg-surface-hover border border-border-strong rounded-2xl">
        <label className="text-[11px] text-text-tertiary uppercase tracking-widest font-mono">Adicionar Pessoal</label>
        <div className="flex flex-col sm:flex-row gap-4">
            <input placeholder="Nome" className="flex-1 bg-surface border border-border-strong p-3 rounded-lg text-sm text-text-primary focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" value={newWorker.name} onChange={e => setNewWorker({...newWorker, name: e.target.value})} />
            <input placeholder="Cargo" className="flex-1 bg-surface border border-border-strong p-3 rounded-lg text-sm text-text-primary focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" value={newWorker.role} onChange={e => setNewWorker({...newWorker, role: e.target.value})} />
            <input type="date" title="Validade Certificado" className="w-full sm:w-auto bg-surface border border-border-strong p-3 rounded-lg text-sm text-text-primary focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" value={newWorker.certificateValidity} onChange={e => setNewWorker({...newWorker, certificateValidity: e.target.value})} />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-2 border-t border-border/50 pt-5">
          <button onClick={addWorker} className="bg-orange-600/90 text-white rounded-lg p-3 flex items-center justify-center gap-2 hover:bg-orange-500 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all duration-300 uppercase font-bold text-[11px] tracking-widest">
              <Plus size={16}/> <span className="hidden sm:inline">Adicionar</span>
          </button>
          <button onClick={exportToCSV} className="bg-surface-active text-text-primary border border-border hover:border-orange-500/50 hover:text-orange-400 rounded-lg p-3 flex items-center justify-center gap-2 hover:bg-surface-hover transition-all uppercase font-bold text-[11px] tracking-widest">
              <Download size={16}/> CSV
          </button>
          <button onClick={generatePDF} className="bg-surface-active text-text-primary border border-border hover:border-orange-500/50 hover:text-orange-400 rounded-lg p-3 flex items-center justify-center gap-2 hover:bg-surface-hover transition-all uppercase font-bold text-[11px] tracking-widest">
              <FileText size={16}/> PDF
          </button>
          <button onClick={() => setIsScanning(true)} className="bg-surface-active text-text-primary border border-border hover:border-orange-500/50 hover:text-orange-400 rounded-lg p-3 flex items-center justify-center gap-2 hover:bg-surface-hover transition-all uppercase font-bold text-[11px] tracking-widest">
              <Camera size={16}/> Scan
          </button>
        </div>
      </div>

      {isScanning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white p-2 rounded-2xl w-full max-w-sm relative shadow-2xl">
            <button onClick={() => setIsScanning(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 z-10 p-2">
              <X size={24} />
            </button>
            <div id="reader" className="w-full"></div>
          </div>
        </div>
      )}

      <div className="space-y-4 mt-6">
        {workers.map((w, index) => (
          <React.Fragment key={w.id}>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="p-5 bg-surface-hover rounded-2xl border border-transparent hover:border-orange-500/30 hover:shadow-[0_0_15px_rgba(249,115,22,0.05)] transition-all group flex justify-between items-center text-sm"
            >
              <div>
                  <span className="font-bold text-text-primary group-hover:text-orange-100 transition-colors block">{w.name}</span>
                  <span className="text-text-secondary font-mono text-xs mt-1 block">{w.role}</span>
              </div>
              <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${w.status === 'Ativo' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>{w.status}</span>
                  <span className="text-text-tertiary flex items-center justify-end gap-1 mt-3 text-xs font-mono">
                    <span className="hidden sm:inline">Validade: </span>{w.certificateValidity ? new Date(w.certificateValidity).toLocaleDateString('pt-BR') : '-'}
                    {isExpiringSoon(w.certificateValidity) && <AlertTriangle size={14} className="text-yellow-500 ml-1 animate-pulse" />}
                  </span>
              </div>
              <div className="flex flex-col gap-3 opacity-80 group-hover:opacity-100">
                <button 
                    onClick={() => setExpandedWorkerId(expandedWorkerId === w.id ? null : w.id)}
                    className="p-2 text-text-secondary hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors border border-transparent hover:border-orange-500/20"
                    title="Histórico de Status"
                >
                    {expandedWorkerId === w.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button onClick={() => setQrWorker(w)} className="p-2 text-text-secondary hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors border border-transparent hover:border-orange-500/20" title="Gerar QR Code">
                    <QrCode size={16} />
                </button>
                <button onClick={() => setDeleteTargetId(w.id)} className="p-2 text-text-tertiary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20" title="Remover">
                    <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
            <AnimatePresence>
              {expandedWorkerId === w.id && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="bg-surface p-4 rounded-b-2xl border border-t-0 border-border-strong text-xs"
                >
                    <h4 className="text-text-tertiary uppercase tracking-widest font-mono mb-3">Histórico de Alterações</h4>
                    {w.statusHistory && w.statusHistory.length > 0 ? (
                        <ul className="space-y-2">
                            {w.statusHistory.map((h, i) => (
                                <li key={i} className="flex justify-between items-center text-text-secondary font-mono">
                                    <span>{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                                    <span className={`px-2 py-0.5 rounded-full ${h.status === 'Ativo' ? 'text-green-500' : 'text-red-500'}`}>{h.status}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-text-tertiary italic">Nenhum histórico.</p>
                    )}
                </motion.div>
              )}
            </AnimatePresence>
          </React.Fragment>
        ))}
      </div>
      
      {qrWorker && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl w-full max-w-sm flex flex-col items-center relative text-black shadow-2xl">
            <button onClick={() => setQrWorker(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold mb-2 text-center text-gray-800">{qrWorker.name}</h3>
            <p className="text-sm text-gray-500 font-medium mb-6 uppercase tracking-widest">{qrWorker.role}</p>
            <div className="bg-gray-100 p-4 rounded-xl mb-6">
              <QRCodeSVG value={`${window.location.origin}/?worker=${qrWorker.id}`} size={200} />
            </div>
            <p className="text-xs text-gray-500 text-center">Escaneie o código QR para verificar<br/>o status e a validade do certificado.</p>
          </div>
        </div>
      )}

      {scannedWorker && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-surface p-8 rounded-2xl w-full max-w-sm flex flex-col items-center relative border border-border-strong shadow-2xl">
            <button onClick={() => setScannedWorker(null)} className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold mb-2 text-center text-text-primary">{scannedWorker.name}</h3>
            <p className="text-sm text-text-secondary font-medium mb-6 uppercase tracking-widest">{scannedWorker.role}</p>
            <div className={`px-6 py-3 rounded-full text-sm uppercase tracking-wider font-bold mb-6 ${scannedWorker.status === 'Ativo' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                {scannedWorker.status}
            </div>
            <p className="text-sm text-text-secondary mb-2">Validade do Certificado:</p>
            <p className="text-lg font-mono text-text-primary">{scannedWorker.certificateValidity ? new Date(scannedWorker.certificateValidity).toLocaleDateString('pt-BR') : '-'}</p>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-surface p-6 rounded-lg w-full max-w-sm border border-border-strong shadow-xl">
            <h3 className="text-text-primary text-lg font-bold mb-4">Confirmar exclusão</h3>
            <p className="text-text-secondary mb-6 text-sm">Tem certeza que deseja remover este trabalhador? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteTargetId(null)} className="flex-1 px-4 py-2 bg-surface-active text-text-primary rounded hover:bg-white/20 transition text-sm">Cancelar</button>
              <button 
                onClick={() => { deleteWorker(deleteTargetId); setDeleteTargetId(null); }}
                className="flex-1 px-4 py-2 bg-red-600 text-text-primary rounded hover:bg-red-700 transition text-sm font-bold uppercase tracking-widest">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
