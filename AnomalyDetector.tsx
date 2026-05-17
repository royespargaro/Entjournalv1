import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface EdgeProtocolModalProps {
  onClose: () => void;
}

export const EdgeProtocolModal: React.FC<EdgeProtocolModalProps> = ({ onClose }) => {
  const rules = [
    "Never risk more than 1% of account per trade",
    "No trade without a stop loss — placed before entry",
    "Only trade with the higher timeframe trend confirmed",
    "Wait for a clear setup — no setup, no trade",
    "Minimum 1:1 R:R before entering any trade",
    "Maximum 3 trades per day — stop after 2 consecutive losses",
    "No trading when feeling revenge, rushed, or emotionally reactive",
    "Move stop loss to breakeven after 50% of TP is reached",
    "Check economic calendar before every session — avoid high impact news",
    "Log every trade with entry reason on the same day — no exceptions",
    "Weekly review every Sunday — stats, mistakes, and lessons",
    "Never add to a losing position",
    "One strategy at a time — master it before switching",
    "Respect your trading plan — deviation is a loss even if it wins",
    "End of day: close all trades — never hold impulsively overnight"
  ];

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0f0f0f]/90 border border-white/10 p-6 rounded-none max-w-lg w-full max-h-[80vh] overflow-y-auto space-y-6"
      >
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white tracking-widest uppercase">Edge Protocol</h2>
            <button onClick={onClose} className="text-white/50 hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4 font-mono">
          {rules.map((rule, i) => (
             <div key={i} className="flex gap-4 text-[11px] text-white/70">
                <span className="text-white/30 font-bold">{String(i + 1).padStart(2, '0')}.</span>
                <p className="leading-relaxed">{rule}</p>
             </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full bg-white text-black font-extrabold text-xs uppercase tracking-widest py-3 hover:bg-slate-200 transition-colors">
            Acknowledged
        </button>
      </motion.div>
    </div>
  );
};
