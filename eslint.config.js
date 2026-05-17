import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, BarChart3, FileText, Upload } from 'lucide-react';

export const SpeedDialFAB = ({ onAction }: { onAction: (action: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { id: 'log-trade', label: 'Log Trade', subtitle: 'Record entry & exit', icon: BarChart3 },
    { id: 'log-recap', label: 'Daily Recap', subtitle: 'Reflect on today\'s performance', icon: FileText },
    { id: 'import-mt5', label: 'Import MT5', subtitle: 'Sync trades from MetaTrader 5', icon: Upload },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120]">                
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
          />
        )}
      </AnimatePresence>

      <div className="relative z-[120] flex flex-col items-center gap-3 pointer-events-none">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col gap-3 pointer-events-auto mb-4"
            >
              {actions.map((action, i) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => { onAction(action.id); setIsOpen(false); }}
                  className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4 w-[280px] shadow-2xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-spotify-green">
                    <action.icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{action.label}</h4>
                    <p className="text-[10px] text-white/40">{action.subtitle}</p>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_20px_-5px_rgba(0,200,83,0.5)] pointer-events-auto transition-transform duration-300 hover:scale-105 active:scale-95"
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <Plus size={28} strokeWidth={3} />
          </motion.div>
        </button>
      </div>
    </div>
  );
};
