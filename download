import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, BarChart3, Brain, BookOpen, Target, Download, Bell, FileText, Shield, ShieldCheck, User, Calendar, Sparkles } from 'lucide-react';
import { CURRENCIES } from '../constants';

export const MoreMenu = ({ isOpen, onClose, setActivePage, setIsRulesOpen, setIsNotificationsOpen, setIsLegalOpen, setIsExportOpen, setLegalType, logout, user, displayCurrency, setDisplayCurrency, trades, stats }: any) => {
  if (!isOpen) return null;

  const menuItems = [
    { id: 'analytics', label: 'Full\nAnalytics', icon: BarChart3 },
    { id: 'habits', label: 'Trader\nHabits', icon: Brain },
    { id: 'review', label: 'Weekly\nReview', icon: BookOpen },
    { id: 'calendar', label: 'P&L\nCalendar', icon: Calendar },
    { id: 'calculator', label: 'FX & Fib\nCalc', icon: Zap },
    { id: 'import', label: 'Import\nMT5', icon: Download },
    { id: 'insights', label: 'AI\nInsights', icon: Sparkles },
    { id: 'notifications', label: 'Notifica-\ntions', icon: Bell },
    { id: 'export', label: 'Export\nPDF', icon: FileText },
    { id: 'tos', label: 'Terms', icon: Shield },
    { id: 'privacy', label: 'Privacy', icon: ShieldCheck },
    { id: 'plan', label: 'Trading\nPlan', icon: Target },
  ];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-end"
      >
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-[#0a0a0a]/90 backdrop-blur-3xl border-t border-white/10 rounded-t-[32px] overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.8)] max-h-[70vh] flex flex-col"
        >
          <div className="p-5 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              {user?.photoURL ? (
                <img src={user.photoURL} className="w-8 h-8 rounded-full border border-white/10" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/5">
                  <User size={14} />
                </div>
              )}
              <div className="flex flex-col">
                <p className="text-xs font-bold text-white">{user?.displayName || 'Trader'}</p>
                <p className="text-[9px] text-[#00C853] font-bold tracking-widest uppercase">Free Plan</p>
              </div>
            </div>
            <button onClick={logout} className="text-[10px] uppercase font-bold tracking-widest text-white/40 hover:text-white transition-colors">Sign Out</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 gap-3">
              {menuItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                        if (item.id === 'notifications') setIsNotificationsOpen(true);
                        else if (item.id === 'export') setIsExportOpen(true);
                        else if (item.id === 'tos' || item.id === 'privacy') { setLegalType(item.id); setIsLegalOpen(true); }
                        else setActivePage(item.id);
                        onClose();
                    }}
                    className="flex flex-col items-center justify-center gap-2 bg-[#1c1c1e]/50 border border-white/5 rounded-2xl h-[80px] hover:bg-white/[0.08] active:bg-[#00C853]/10 transition-all shadow-inner"
                  >
                    <div className="text-white/70">
                        <Icon size={20} />
                    </div>
                    <span className="text-[9px] text-center text-white/60 leading-none font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="p-5 border-t border-white/10 flex items-center justify-between bg-black/20">
            <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value)}
                className="px-4 py-2 rounded-xl bg-[#1c1c1e] border border-white/10 text-[10px] text-white/70 font-semibold tracking-widest uppercase cursor-pointer hover:bg-white/5 transition-colors"
            >
                {Object.keys(CURRENCIES).map(curr => (
                    <option key={curr} value={curr} className="bg-[#0f0f0f] text-white">
                        {curr} ({CURRENCIES[curr as keyof typeof CURRENCIES].symbol})
                    </option>
                ))}
            </select>
            <p className="text-[10px] text-white/20 font-mono">ENTJournal v2.0</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
