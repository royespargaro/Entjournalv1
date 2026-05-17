import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Calendar, History, MoreHorizontal, Plus, BarChart3, FileText, Upload } from 'lucide-react';

interface BottomNavProps {
  activePage: string;
  setActivePage: (id: string) => void;
  openMore: () => void;
  onAction: (action: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activePage, setActivePage, openMore, onAction }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const actions = [
    { id: 'log-trade', label: 'Log Trade', subtitle: 'Record entry & exit', icon: BarChart3 },
    { id: 'log-recap', label: 'Daily Recap', subtitle: 'Reflect on today\'s performance', icon: FileText },
    { id: 'import-mt5', label: 'Import MT5', subtitle: 'Sync trades from MetaTrader 5', icon: Upload },
  ];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'spacer', label: '', icon: () => null, isCenter: true },
    { id: 'history', label: 'History', icon: History },
    { id: 'more', label: 'More', icon: MoreHorizontal, isAction: true },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-8 pt-4 pointer-events-none">
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
          />
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto relative">
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="absolute bottom-24 left-0 right-0 flex flex-col gap-2 pointer-events-auto"
            >
              {actions.map((action, i) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => { onAction(action.id); setIsMenuOpen(false); }}
                  className="bg-[#1c1c1e]/90 backdrop-blur-xl border border-white/5 p-4 rounded-3xl flex items-center gap-4 shadow-xl hover:bg-white/5 transition-colors text-left mx-4"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-spotify-green">
                    <action.icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{action.label}</h4>
                    <p className="text-[10px] text-white/50">{action.subtitle}</p>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <nav className="bg-[#1c1c1e]/80 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-2 flex items-center justify-between shadow-2xl pointer-events-auto relative z-[100]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            
            if (item.isCenter) {
              return (
                <button
                  key="spacer"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105 active:scale-95"
                >
                  <motion.div
                    animate={{ rotate: isMenuOpen ? 45 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Plus size={28} strokeWidth={3} />
                  </motion.div>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isAction) openMore();
                  else setActivePage(item.id);
                }}
                className="relative flex-1 flex flex-col items-center py-2 group min-h-[44px]"
                aria-label={item.label}
              >
                <div className={`transition-all duration-300 ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] mt-1 font-medium transition-colors ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
