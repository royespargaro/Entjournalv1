import React from 'react';
import { motion } from 'motion/react';
import { X, FileText, FileSpreadsheet, Database } from 'lucide-react';
import { exportToPDF, exportToCSV, exportToJSON } from '../utils/exportUtils';

export const ExportModal = ({ onClose, trades, user }: { onClose: () => void, trades: any[], user: any }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="bg-spotify-card p-6 rounded-3xl w-full max-w-sm border border-white/10 space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-white font-black uppercase tracking-widest text-lg">Export Data</h2>
            <button onClick={onClose} className="text-spotify-muted hover:text-white"><X size={20} /></button>
        </div>
        
        <div className="space-y-3">
            <button onClick={() => { exportToPDF(trades, user?.displayName || 'Trader', 'All Time', 'equity-curve-chart'); onClose(); }} className="w-full bg-white/5 hover:bg-white/10 text-white p-4 rounded-2xl flex items-center gap-3">
                <FileText className="text-spotify-green"/> PDF Report
            </button>
            <button onClick={() => { exportToCSV(trades); onClose(); }} className="w-full bg-white/5 hover:bg-white/10 text-white p-4 rounded-2xl flex items-center gap-3">
                <FileSpreadsheet className="text-spotify-green"/> CSV Export
            </button>
            <button onClick={() => { exportToJSON({ trades, profile: user }); onClose(); }} className="w-full bg-white/5 hover:bg-white/10 text-white p-4 rounded-2xl flex items-center gap-3">
                <Database className="text-spotify-green"/> JSON Backup
            </button>
        </div>
      </div>
    </motion.div>
  );
};
