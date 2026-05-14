import React from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Target, PlusCircle, History, MoreHorizontal, BarChart3 } from 'lucide-react';

interface BottomNavProps {
  activePage: string;
  setActivePage: (id: string) => void;
  openMore: () => void;
  onOpenInsights: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activePage, setActivePage, openMore, onOpenInsights }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'daily-plan', label: 'War Room', icon: Target },
    { id: 'log', label: 'Log', icon: PlusCircle, isCenter: true },
    { id: 'insights', label: 'Insights', icon: BarChart3, isAction: true },
    { id: 'more', label: 'Menu', icon: MoreHorizontal, isAction: true },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent pointer-events-none">
      <nav className="max-w-md mx-auto bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-2 flex items-center justify-between shadow-2xl pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          
          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className="relative group p-1"
                aria-label={item.label}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  <Icon size={24} strokeWidth={2.5} />
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'insights') onOpenInsights();
                else if (item.isAction) openMore();
                else setActivePage(item.id);
              }}
              className="relative flex-1 flex flex-col items-center py-3 group min-h-[44px]"
              aria-label={item.label}
            >
              <div className={`transition-all duration-300 ${isActive ? 'text-white' : 'text-white/40 hover:text-white/80'}`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              {isActive && (
                <motion.div 
                  layoutId="active-dot" 
                  className="absolute bottom-1 w-1.5 h-1.5 bg-white rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
