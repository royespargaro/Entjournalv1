import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { 
  LayoutDashboard, 
  History, 
  Calendar as CalendarIcon, 
  BarChart3, 
  BookOpen, 
  PlusCircle, 
  Download, 
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  User as UserIcon,
  Loader2,
  Sparkles,
  Edit2,
  Upload,
  Zap,
  Trash2,
  Trash,
  RotateCcw,
  MoreHorizontal,
  Target,
  TrendingUp,
  TrendingDown,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import Markdown from 'react-markdown';

// --- Firebase ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  setDoc,
  serverTimestamp, 
  query, 
  orderBy,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// --- Types ---

interface Trade {
  id: string;
  date: string;
  time: string;
  pair: string;
  dir: 'Long' | 'Short';
  session: 'Asia' | 'London' | 'New York';
  entry: number;
  exit: number;
  sl: number;
  tp: number;
  lot: number;
  pnl: number;
  currency: string;
  result: 'win' | 'loss' | 'be';
  setup: string;
  emotion: string;
  news: 'no' | 'med' | 'high';
  plan: 'yes' | 'no' | 'partial';
  dur: string;
  reason: string;
  notes: string;
  ss?: string;
  tags?: string[];
  createdAt: any;
  userId: string;
}

const PAIR_CONFIG: Record<string, { multiplier: number, digits: number, pipSize: number }> = {
  'XAUUSD': { multiplier: 100, digits: 2, pipSize: 0.1 }, 
  'BTCUSD': { multiplier: 1, digits: 2, pipSize: 1 },
  'EURUSD': { multiplier: 100000, digits: 5, pipSize: 0.0001 },
  'GBPUSD': { multiplier: 100000, digits: 5, pipSize: 0.0001 },
  'NAS100': { multiplier: 20, digits: 2, pipSize: 0.1 },
  'US30': { multiplier: 10, digits: 2, pipSize: 1 },
  'ETHUSD': { multiplier: 1, digits: 2, pipSize: 1 },
};

const CURRENCIES = {
  USD: { symbol: '$', code: 'USD', rate: 1 },
  EUR: { symbol: '€', code: 'EUR', rate: 0.93 },
  GBP: { symbol: '£', code: 'GBP', rate: 0.81 },
  JPY: { symbol: '¥', code: 'JPY', rate: 155.50 },
  AUD: { symbol: 'A$', code: 'AUD', rate: 1.54 },
  CAD: { symbol: 'C$', code: 'CAD', rate: 1.37 },
  CHF: { symbol: 'CHf', code: 'CHF', rate: 0.91 },
  CNY: { symbol: '¥', code: 'CNY', rate: 7.23 },
  INR: { symbol: '₹', code: 'INR', rate: 83.50 },
  IDR: { symbol: 'Rp', code: 'IDR', rate: 16250 },
  HKD: { symbol: 'HK$', code: 'HKD', rate: 7.82 },
  SGD: { symbol: 'S$', code: 'SGD', rate: 1.35 },
  NZD: { symbol: 'NZ$', code: 'NZD', rate: 1.66 },
  BRL: { symbol: 'R$', code: 'BRL', rate: 5.12 },
  SAR: { symbol: 'SR', code: 'SAR', rate: 3.75 },
  AED: { symbol: 'DH', code: 'AED', rate: 3.67 },
};

const convertCurrency = (amount: number, from: string, to: string) => {
  const fromRate = CURRENCIES[from as keyof typeof CURRENCIES]?.rate || 1;
  const toRate = CURRENCIES[to as keyof typeof CURRENCIES]?.rate || 1;
  // Convert to USD first, then to target
  const inUsd = amount / fromRate;
  return inUsd * toRate;
};

interface Review {
  id: string; // Changed to string for Firestore ID
  week: string;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  q6: string;
  createdAt: any;
  userId: string;
}

interface TradingPlan {
  userId: string;
  yearlyTarget: number;
  monthlyTarget: number;
  weeklyTarget: number;
  dailyTarget: number;
  currency: string;
  updatedAt: any;
}

// --- Auth Context ---
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error') => void;
}>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  showToast: () => {}
});

const useAuth = () => useContext(AuthContext);

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const BottomNav = ({ activePage, setActivePage, openMore }: any) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'history', label: 'History', icon: History },
    { id: 'log', label: 'Log', icon: PlusCircle, isCenter: true },
    { id: 'calculator', label: 'Tools', icon: Zap },
    { id: 'more', label: 'Menu', icon: MoreHorizontal, isAction: true },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-10 pt-4 bg-gradient-to-t from-spotify-black via-spotify-black/40 to-transparent pointer-events-none">
      <nav className="max-w-xs mx-auto bg-white/5 backdrop-blur-3xl border border-white/5 rounded-full p-1.5 flex items-center justify-between shadow-2xl pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          
          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className="relative group p-2"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  <Icon size={20} strokeWidth={2.5} />
                </div>
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
              className="relative flex-1 flex flex-col items-center py-2 group"
            >
              <div className={`transition-all duration-500 ${isActive ? 'text-white' : 'text-spotify-muted hover:text-white/60'}`}>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
              </div>
              {isActive && (
                <motion.div 
                  layoutId="active-dot" 
                  className="absolute -bottom-1 w-1 h-1 bg-spotify-green rounded-full shadow-[0_0_8px_rgba(30,215,96,0.8)]"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

const MoreMenu = ({ isOpen, onClose, setActivePage, openRules, logout, user, displayCurrency, setDisplayCurrency }: any) => {
  if (!isOpen) return null;

  const menuItems = [
    { id: 'history', label: 'Trade History', icon: History },
    { id: 'analytics', label: 'Full Analytics', icon: BarChart3 },
    { id: 'habits', label: 'Trader Habits', icon: Brain },
    { id: 'review', label: 'Weekly Review', icon: BookOpen },
    { id: 'plan', label: 'Trading Plan', icon: Target },
    { id: 'import', label: 'Import MT5', icon: Download },
    { id: 'calculator', label: 'FX & Fib Calc', icon: Zap },
  ];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-4"
      >
        <motion.div 
          initial={{ y: 100, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 100, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-spotify-card border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-6 border-b border-white/5 space-y-4">
            <div className="flex items-center gap-4">
              {user?.photoURL ? (
                <img src={user.photoURL} className="w-10 h-10 rounded-full border border-white/10" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-spotify-green flex items-center justify-center">
                  <UserIcon size={20} className="text-black" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-white">{user?.displayName || 'Trader'}</p>
                  <span className="px-1.5 py-0.5 rounded bg-spotify-green/10 text-spotify-green text-[7px] font-black uppercase tracking-widest border border-spotify-green/20">Free Plan</span>
                </div>
                <button onClick={logout} className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors">Sign Out</button>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-spotify-muted hover:text-white bg-white/5 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {menuItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-[1.25rem] hover:bg-white/5 active:bg-white/10 active:scale-[0.98] transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-spotify-muted group-hover:text-spotify-green group-hover:bg-spotify-green/10 transition-all">
                    <Icon size={20} />
                  </div>
                  <span className="text-sm font-bold text-white/80 group-hover:text-white">{item.label}</span>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                    <ChevronRight size={14} className="text-spotify-green" />
                  </div>
                </button>
              );
            })}
            
            <button
              onClick={() => {
                setActivePage('calendar');
                onClose();
              }}
              className="w-full flex items-center gap-4 p-4 rounded-[1.25rem] hover:bg-white/5 active:bg-white/10 active:scale-[0.98] transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-spotify-muted group-hover:text-spotify-green group-hover:bg-spotify-green/10 transition-all">
                <CalendarIcon size={20} />
              </div>
              <span className="text-sm font-bold text-white/80 group-hover:text-white">P&L Calendar</span>
              <div className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                <ChevronRight size={14} className="text-spotify-green" />
              </div>
            </button>
          </div>

          <div className="p-4 border-t border-white/5 space-y-3">
            <div className="relative">
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-[10px] font-black uppercase tracking-widest text-white appearance-none cursor-pointer hover:bg-white/10 transition-all outline-none"
              >
                {Object.keys(CURRENCIES).map(curr => (
                  <option key={curr} value={curr} className="bg-spotify-darker text-white">
                    {curr} ({CURRENCIES[curr as keyof typeof CURRENCIES].symbol})
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-spotify-muted/50">
                <ChevronRight size={12} className="rotate-90" />
              </div>
            </div>

            <button 
              onClick={() => {
                openRules();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 bg-spotify-green/10 border border-spotify-green/20 rounded-2xl py-4 text-[10px] font-black tracking-[0.2em] uppercase text-spotify-green hover:bg-spotify-green hover:text-black transition-all duration-300"
            >
              <Sparkles size={14} />
              Edge Protocol
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Sidebar = ({ activePage, setActivePage, openRules, isMobileMenuOpen, setIsMobileMenuOpen, displayCurrency, setDisplayCurrency }: any) => {
  return null; // Sidebars are so 2024. We use Bottom Docks now.
};


const AuthStatus = () => {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="mb-2">
      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
        {user.photoURL ? (
          <img src={user.photoURL} className="w-8 h-8 rounded-full border border-white/10" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center">
            <UserIcon size={16} className="text-black" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-white truncate">{user.displayName || 'Trader'}</p>
          <button 
            onClick={logout}
            className="text-[9px] font-bold text-spotify-muted uppercase tracking-widest hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

const formatNum = (val: any, decimals: number = 2) => {
  if (val === undefined || val === null || val === '') return '0.00';
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(n)) return '0.00';
  return n.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

const formatCurrency = (val: any, currency: string = 'USD') => {
  const meta = CURRENCIES[currency as keyof typeof CURRENCIES] || CURRENCIES.USD;
  const decimals = currency === 'IDR' ? 0 : 2;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0;
  const absVal = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  
  if (currency === 'IDR') {
    return `${sign}${meta.symbol}${Math.round(absVal).toLocaleString('id-ID')}`;
  }
  
  return `${sign}${meta.symbol}${formatNum(absVal, decimals)}`;
};

const cleanMoney = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  
  let s = String(val).trim();
  
  // Normalize various dash characters (long dash, minus sign, etc.) to standard hyphen
  s = s.replace(/[−–—]/g, '-');
  
  // Remove all spaces (especially thousand separators like 1 000.00)
  s = s.replace(/\s+/g, ''); 
  
  // Handle (100.00) format for negatives
  if (s.startsWith('(') && s.endsWith(')')) {
    s = '-' + s.substring(1, s.length - 1);
  }
  
  // International decimal support (e.g. 1.234,56 or 1,234.56)
  if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  } else if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') < s.lastIndexOf('.')) {
      s = s.replace(/,/g, '');
    } else {
      s = s.replace(/\./g, '').replace(',', '.');
    }
  } else if (s.includes(',')) {
    s = s.replace(/,/g, '');
  }

  // Handle trailing minus (some banks/brokers)
  if (s.endsWith('-')) {
    s = '-' + s.substring(0, s.length - 1);
  }

  // Final cleanup: keep only digits, dot, and hyphen
  const cleaned = s.replace(/[^\d.\-]/g, '');
  
  // Ensure we don't end up with multiple hyphens or dots if input was weird
  const hasMinus = cleaned.startsWith('-');
  const numericPart = cleaned.replace(/-/g, '');
  const dotParts = numericPart.split('.');
  let normalizedNumeric = dotParts[0];
  if (dotParts.length > 1) {
    normalizedNumeric += '.' + dotParts.slice(1).join('');
  }
  
  const parsed = parseFloat((hasMinus ? '-' : '') + normalizedNumeric);
  return isNaN(parsed) ? 0 : parsed;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, '_connection_test', 'test'));
      } catch (error) {
        // Log but don't crash, Firestore might still be provisioning
        console.warn("Firestore connectivity check:", error);
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        showToast('Login popup blocked. Please allow popups.', 'error');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Silently handle
      } else {
        console.error("Login Error:", error);
        showToast('Login failed. Please try again.', 'error');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      showToast('Logged out');
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-spotify-black flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative"
        >
          <div className="w-20 h-20 rounded-full border border-white/[0.03] flex items-center justify-center relative overflow-hidden bg-white/[0.02]">
            <motion.div 
              animate={{ 
                rotate: 360,
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-t border-spotify-green/20"
            />
            <span className="text-xl font-black tracking-tighter text-white opacity-20">ENTJ</span>
          </div>
        </motion.div>

        <div className="mt-12 space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-white/40">Synchronizing</h2>
          <div className="flex items-center justify-center gap-1">
             {[0, 1, 2].map((i) => (
               <motion.div
                 key={i}
                 animate={{ opacity: [0.2, 1, 0.2] }}
                 transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                 className="w-1 h-1 bg-spotify-green rounded-full shadow-[0_0_8px_rgba(30,215,96,0.4)]"
               />
             ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, showToast }}>
      <AnimatePresence mode="wait">
        {!user ? (
          <LoginPage key="login" />
        ) : (
          <JournalApp key="app" />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-8 z-[120] flex items-center gap-3 px-5 py-3 rounded-md shadow-2xl border ${
              toast.type === 'success' ? 'bg-spotify-card border-spotify-green' : 'bg-red-950 border-red-500'
            } w-[90%] md:w-auto max-w-sm`}
          >
             {toast.type === 'success' ? <CheckCircle2 className="text-spotify-green" size={18} /> : <AlertCircle className="text-red-500" size={18} />}
            <span className="text-xs font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}

function LoginPage() {
  const { login } = useAuth();
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="min-h-screen bg-spotify-black flex flex-col items-center justify-center p-6 relative overflow-hidden"
    >
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-spotify-green/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-white/5 blur-[140px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-sm text-center z-10 space-y-12">
        <div className="space-y-4">
          <h1 className="text-6xl font-black tracking-tighter text-white opacity-90">ENT<span className="text-spotify-green italic">J</span></h1>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] text-spotify-muted font-black uppercase tracking-[0.5em]">Trading Journal</p>
            <div className="w-8 h-[1px] bg-white/10" />
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-xs text-white/40 font-medium leading-relaxed max-w-[200px] mx-auto">
            Professional performance tracking & analytical intelligence.
          </p>
          
          <button 
            onClick={login}
            className="w-full relative group"
          >
            <div className="absolute inset-0 bg-white blur-xl opacity-0 group-hover:opacity-10 transition-opacity duration-700" />
            <div className="relative flex items-center justify-center gap-4 bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] py-5 rounded-full transition-all duration-500 hover:scale-[1.01] active:scale-[0.99]">
              <span>Begin Session</span>
              <ChevronRight size={14} strokeWidth={3} />
            </div>
          </button>
        </div>
        
        <p className="text-[8px] text-white/20 uppercase tracking-[0.4em] font-black">Persistence v2.0</p>
      </div>
    </motion.div>
  );
}

function JournalApp() {
  const { user, showToast, logout } = useAuth();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tradingPlan, setTradingPlan] = useState<TradingPlan | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isEditingTrade, setIsEditingTrade] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [displayCurrency, setDisplayCurrency] = useState<string>(() => {
    return localStorage.getItem('entj_display_currency') || 'USD';
  });

  useEffect(() => {
    localStorage.setItem('entj_display_currency', displayCurrency);
  }, [displayCurrency]);

  useEffect(() => {
    if (!user) return;

    const tradesPath = `users/${user.uid}/trades`;
    const qTrades = query(collection(db, tradesPath), orderBy('date', 'desc'));
    const unsubscribeTrades = onSnapshot(qTrades, (snapshot) => {
      const dbTrades = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Trade));
      setTrades(prev => {
        const tempTrades = prev.filter(t => t.id.startsWith('temp-'));
        return [...tempTrades, ...dbTrades].sort((a, b) => {
          const dateComp = b.date.localeCompare(a.date);
          if (dateComp !== 0) return dateComp;
          return (b.time || '').localeCompare(a.time || '');
        });
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, tradesPath);
    });

    const reviewsPath = `users/${user.uid}/reviews`;
    const qReviews = query(collection(db, reviewsPath), orderBy('week', 'desc'));
    const unsubscribeReviews = onSnapshot(qReviews, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Review));
      setReviews(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, reviewsPath);
    });

    const planPath = `users/${user.uid}/plan/current`;
    const unsubscribePlan = onSnapshot(doc(db, planPath), (snapshot) => {
      if (snapshot.exists()) {
        setTradingPlan(snapshot.data() as TradingPlan);
      } else {
        setTradingPlan(null);
      }
    }, (error) => {
      // It's okay if it doesn't exist yet, but we should log if it's a real error
      if (error.code !== 'permission-denied' && error.code !== 'not-found') {
        console.error("Plan sync error:", error);
      }
    });

    return () => {
      unsubscribeTrades();
      unsubscribeReviews();
      unsubscribePlan();
    };
  }, [user]);

  const analyzeTrade = async (trade: Trade) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API Key is missing");
      showToast("AI Configuration Error: Missing API Key", "error");
      setIsAnalyzing(false);
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const rulesList = [
      "Always check Forex Factory calendar before any trade",
      "No trade without a stop loss placed before entry",
      "Maximum 3 trades per day",
      "Wait for liquidity sweep then M5 engulfing confirmation",
      "Move SL to breakeven after TP1 is hit",
      "$20 daily risk maximum — margin called = done for the day",
      "Minimum 1:3 R:R before entering any trade",
      "No trading when emotion is Revenge or Excited / Rushed",
      "Log every trade with entry reason — same day",
      "Weekly review every Sunday without exception"
    ];

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        config: {
          systemInstruction: "You are an elite institutional trading mentor specializing in SMC (Smart Money Concepts). Your goal is to help the user achieve professional consistency across all asset classes. Be blunt but constructive."
        },
        contents: [{ parts: [{ text: `
          Analyze this trade based on my trading rules and provide actionable insights.
          
          TRADING RULES:
          ${rulesList.map((r, i) => `${i+1}. ${r}`).join('\n')}
          
          TRADE DETAILS:
          - Pair: ${trade.pair}
          - Direction: ${trade.dir}
          - Result: ${trade.result}
          - P&L: ${trade.pnl} ${trade.currency || 'USD'}
          - Setup: ${trade.setup}
          - Emotion: ${trade.emotion}
          - News impact: ${trade.news}
          - Followed plan: ${trade.plan}
          - Reason for entry: ${trade.reason}
          - Notes: ${trade.notes}
          
          Please provide:
          1. Rule Compliance Check: Which rules were followed or broken?
          2. Performance Insight: What was good or bad about this specific execution?
          3. Actionable Improvement: One specific thing to do better next time.
          
          Keep it professional, concise, and direct (Spotify/minimalist style). Use markdown for structure.
        ` }] }]
      });

      const text = response.text;
      
      if (!text) {
        throw new Error("Empty response from AI");
      }
      
      setAiAnalysis(text);
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      showToast(`AI analysis failed: ${error.message || 'Unknown error'}`, "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Calculations ---
  const stats = useMemo(() => {
    const n = trades.length;
    const wins = trades.filter(t => t.result === 'win').length;
    const losses = trades.filter(t => t.result === 'loss').length;
    const planFollowed = trades.filter(t => t.plan === 'yes').length;
    const newsSlHits = trades.filter(t => t.news !== 'no' && t.result === 'loss').length;
    
    // Normalize all P&L to USD for internal stats
    const tradesWithUsdPnl = trades.map(t => ({
      ...t,
      usdPnl: convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', 'USD')
    }));

    const totalUsdPnl = tradesWithUsdPnl.reduce((sum, t) => sum + t.usdPnl, 0);

    const rrs = trades.filter(t => t.sl).map(t => {
      const risk = Math.abs(t.entry - t.sl);
      return risk ? Math.abs(t.exit - t.entry) / risk : 0;
    });
    const avgRR = rrs.length ? formatNum(rrs.reduce((a, b) => a + b, 0) / rrs.length, 1) : '—';
    
    const sorted = [...tradesWithUsdPnl].sort((a, b) => b.usdPnl - a.usdPnl);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    
    // Psychology Heatmap
    const psychologyRaw: Record<string, { pnl: number, count: number, wins: number }> = {};
    tradesWithUsdPnl.forEach((t: any) => {
      const e = t.emotion || 'Unknown';
      if (!psychologyRaw[e]) psychologyRaw[e] = { pnl: 0, count: 0, wins: 0 };
      psychologyRaw[e].pnl += t.usdPnl;
      psychologyRaw[e].count += 1;
      if (t.result === 'win') psychologyRaw[e].wins += 1;
    });
    const psychologyMap = Object.entries(psychologyRaw).map(([emotion, data]) => ({
      emotion,
      pnl: data.pnl,
      winRate: Math.round((data.wins / data.count) * 100),
      count: data.count
    })).sort((a, b) => b.pnl - a.pnl);

    // Session Edge
    const sessionRaw: Record<string, { pnl: number, count: number, wins: number }> = {};
    tradesWithUsdPnl.forEach((t: any) => {
      const s = t.session || 'Unknown';
      if (!sessionRaw[s]) sessionRaw[s] = { pnl: 0, count: 0, wins: 0 };
      sessionRaw[s].pnl += t.usdPnl;
      sessionRaw[s].count += 1;
      if (t.result === 'win') sessionRaw[s].wins += 1;
    });
    const sessionAnalytics = Object.entries(sessionRaw).map(([session, data]) => ({
      session,
      pnl: data.pnl,
      winRate: Math.round((data.wins / data.count) * 100),
      count: data.count
    }));

    // Expectancy & Forecasting
    const winRateVal = n ? wins / n : 0;
    const winTrades = tradesWithUsdPnl.filter((t: any) => t.result === 'win');
    const lossTrades = tradesWithUsdPnl.filter((t: any) => t.result === 'loss');
    const avgWin = winTrades.length ? (winTrades.reduce((acc: number, t: any) => acc + t.usdPnl, 0) / winTrades.length) : 0;
    const avgLoss = lossTrades.length ? (Math.abs(lossTrades.reduce((acc: number, t: any) => acc + t.usdPnl, 0)) / lossTrades.length) : 0;
    const expectancy = (winRateVal * avgWin) - ((1 - winRateVal) * avgLoss);
    
    const currentBalance = totalUsdPnl || 10000;
    const tradesPerMonth = 22;
    const projection = {
      threeMonths: currentBalance + (expectancy * tradesPerMonth * 3),
      sixMonths: currentBalance + (expectancy * tradesPerMonth * 6),
      twelveMonths: currentBalance + (expectancy * tradesPerMonth * 12)
    };

    return { n, wins, losses, pnl: totalUsdPnl, planFollowed, newsSlHits, avgRR, best, worst, psychologyMap, sessionAnalytics, expectancy, projection };
  }, [trades]);

  const addTrade = async (tradeData: any) => {
    if (!user) return;
    const tradesPath = `users/${user.uid}/trades`;
    
    // Normalize data for Firestore
    const normalized = {
      ...tradeData,
      entry: cleanMoney(tradeData.entry),
      exit: cleanMoney(tradeData.exit),
      lot: cleanMoney(tradeData.lot),
      pnl: cleanMoney(tradeData.pnl),
      sl: tradeData.sl ? cleanMoney(tradeData.sl) : null,
      tp: tradeData.tp ? cleanMoney(tradeData.tp) : null,
      userId: user.uid,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, tradesPath), normalized);
      showToast('Trade logged successfully');
      setActivePage('history');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, tradesPath);
    }
  };

  const updateTrade = async (id: string, tradeData: any) => {
    if (!user) return;
    
    // Normalize data for Firestore
    const { id: _, userId: __, createdAt: ___, ...updatePayload } = tradeData;
    const normalized = {
      ...updatePayload,
      entry: cleanMoney(tradeData.entry),
      exit: cleanMoney(tradeData.exit),
      lot: cleanMoney(tradeData.lot),
      pnl: cleanMoney(tradeData.pnl),
      sl: tradeData.sl ? cleanMoney(tradeData.sl) : null,
      tp: tradeData.tp ? cleanMoney(tradeData.tp) : null,
      updatedAt: serverTimestamp(),
    };

    if (id.startsWith('temp-')) {
      // Optimistic/Local-only update for temporary trades
      setTrades(prev => prev.map(t => t.id === id ? { ...t, ...normalized, updatedAt: new Date().toISOString() } : t));
      showToast('Temporary trade updated locally');
      setIsEditingTrade(false);
      setSelectedTrade(null);
      return;
    }

    const path = `users/${user.uid}/trades/${id}`;
    
    try {
      await updateDoc(doc(db, path), normalized);
      
      // Update local state immediately for better UX - use ISO string for local state compatibility
      setTrades(prev => prev.map(t => t.id === id ? { ...t, ...normalized, updatedAt: new Date().toISOString() } : t));
      
      showToast('Trade updated successfully');
      setIsEditingTrade(false);
      setSelectedTrade(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const saveTradingPlan = async (planData: any) => {
    if (!user) return;
    const path = `users/${user.uid}/plan/current`;
    try {
      await setDoc(doc(db, path), {
        ...planData,
        userId: user.uid,
        updatedAt: serverTimestamp()
      });
      showToast('Master plan established');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteReview = async (id: string) => {
    if (!user) return;
    if (window.confirm('Delete this weekly review?')) {
      const path = `users/${user.uid}/reviews/${id}`;
      try {
        await deleteDoc(doc(db, path));
        showToast('Review deleted');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  const deletePlan = async () => {
    if (!user) return;
    if (window.confirm('Are you sure you want to reset your trading plan? This will clear all targets.')) {
      const path = `users/${user.uid}/plan/current`;
      try {
        await deleteDoc(doc(db, path));
        showToast('Plan reset successfully');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  const deleteTrade = async (id: string) => {
    if (!user) return;
    if (window.confirm('Delete this trade?')) {
      if (id.startsWith('temp-')) {
        setTrades(prev => prev.filter(t => t.id !== id));
        return;
      }

      const path = `users/${user.uid}/trades/${id}`;
      try {
        await deleteDoc(doc(db, path));
        showToast('Trade deleted');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  const deleteMultipleTrades = async (ids: string[]) => {
    if (!user || ids.length === 0) return;
    if (window.confirm(`Delete ${ids.length} selected trades?`)) {
      const realIds = ids.filter(id => !id.startsWith('temp-'));
      const tempIds = ids.filter(id => id.startsWith('temp-'));

      if (tempIds.length > 0) {
        setTrades(prev => prev.filter(t => !tempIds.includes(t.id)));
      }
      
      if (realIds.length > 0) {
        const batch = writeBatch(db);
        realIds.forEach(id => {
          const path = `users/${user.uid}/trades/${id}`;
          batch.delete(doc(db, path));
        });
        try {
          await batch.commit();
          showToast(`Successfully deleted ${realIds.length} trades`);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/trades`);
        }
      } else if (tempIds.length > 0) {
        showToast(`${tempIds.length} temporary trades removed`);
      }
    }
  };

  const importTrades = async (newTrades: any[]) => {
    if (!user) return;
    
    // Add trades to local state immediately for instant feedback
    const optimisticTrades = newTrades.map(t => ({
      ...t,
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      userId: user.uid,
      createdAt: new Date().toISOString()
    }));
    
    setTrades(prev => [...optimisticTrades, ...prev]);

    // Firestore batch limit is 500. Split into chunks.
    const chunks = [];
    for (let i = 0; i < newTrades.length; i += 500) {
      chunks.push(newTrades.slice(i, i + 500));
    }

    try {
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(t => {
          const newDocRef = doc(collection(db, `users/${user.uid}/trades`));
          // Remove extra fields and ensure types
          const { id, tempId, ...data } = t; 
          batch.set(newDocRef, {
            ...data,
            userId: user.uid,
            sl: t.sl ?? null,
            tp: t.tp ?? null,
            createdAt: serverTimestamp()
          });
        });
        await batch.commit();
      }
      
      showToast(`Successfully imported ${newTrades.length} trades`);
      setIsImportOpen(false);
      setActivePage('history');
    } catch (error) {
      console.error('Import batch error:', JSON.stringify(error));
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/trades`);
    }
  };

  const updateMultipleTrades = async (ids: string[], updates: any) => {
    if (!user || ids.length === 0) return;
    
    const batch = writeBatch(db);
    ids.forEach(id => {
      const path = `users/${user.uid}/trades/${id}`;
      batch.update(doc(db, path), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    });

    try {
      await batch.commit();
      showToast(`${ids.length} trades updated successfully`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/trades`);
    }
  };

  return (
    <div className="min-h-screen bg-spotify-black text-white font-sans selection:bg-spotify-green selection:text-spotify-darker">
      <main className="flex-1 min-h-screen pb-32 relative overflow-x-hidden w-full">
        {/* Top Header */}
        <header className="sticky top-0 bg-spotify-black/80 backdrop-blur-xl z-40 px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-extrabold tracking-tighter text-xl uppercase">ENT<span className="text-spotify-green italic">J</span></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[8px] font-black uppercase tracking-widest text-spotify-muted mb-0.5">Ready to Trade</p>
              <p className="text-xs font-bold text-white">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            </div>
            {user?.photoURL && (
              <div className="relative group">
                <img src={user.photoURL} className="w-10 h-10 rounded-full border-2 border-white/10 group-hover:border-spotify-green transition-colors" alt="Profile" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-spotify-green rounded-full border-2 border-spotify-black" />
              </div>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="p-4 md:p-8 max-w-7xl mx-auto"
          >
            {activePage === 'dashboard' && (
              <DashboardPage stats={stats} trades={trades} onTradeClick={setSelectedTrade} displayCurrency={displayCurrency} setActivePage={setActivePage} plan={tradingPlan} />
            )}
            {activePage === 'log' && (
              <LogPage onLog={addTrade} displayCurrency={displayCurrency} />
            )}
            {activePage === 'calculator' && (
              <CalculatorPage displayCurrency={displayCurrency} />
            )}
            {activePage === 'history' && (
              <HistoryPage 
                trades={trades} 
                filter={filter} 
                setFilter={setFilter} 
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                onTradeClick={setSelectedTrade}
                onDelete={deleteTrade}
                onBulkDelete={deleteMultipleTrades}
                onBulkUpdate={updateMultipleTrades}
                onImportOpen={() => setIsImportOpen(true)}
                displayCurrency={displayCurrency}
                setIsEditingTrade={setIsEditingTrade}
              />
            )}
            {activePage === 'calendar' && (
              <CalendarPage trades={trades} displayCurrency={displayCurrency} />
            )}
            {activePage === 'habits' && (
              <HabitsPage trades={trades} displayCurrency={displayCurrency} />
            )}
            {activePage === 'analytics' && (
              <AnalyticsPage trades={trades} displayCurrency={displayCurrency} />
            )}
            {activePage === 'review' && (
              <ReviewPage reviews={reviews} onDeleteReview={deleteReview} />
            )}
            {activePage === 'plan' && (
              <PlanPage plan={tradingPlan} trades={trades} displayCurrency={displayCurrency} onSave={saveTradingPlan} onReset={deletePlan} />
            )}
            {activePage === 'import' && (
              <ImportPage onTriggerImport={() => setIsImportOpen(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav 
        activePage={activePage} 
        setActivePage={setActivePage} 
        openMore={() => setIsMoreOpen(true)} 
      />

      <MoreMenu 
        isOpen={isMoreOpen} 
        onClose={() => setIsMoreOpen(false)} 
        setActivePage={setActivePage} 
        openRules={() => setIsRulesOpen(true)}
        logout={logout}
        user={user}
        displayCurrency={displayCurrency}
        setDisplayCurrency={setDisplayCurrency}
      />

      {/* MT5 Import Modal */}
      {isImportOpen && (
        <MT5ImportModal 
          onClose={() => setIsImportOpen(false)} 
          onImport={importTrades} 
          displayCurrency={displayCurrency}
        />
      )}

      {/* Rules Modal */}
      {isRulesOpen && (
        <Modal onClose={() => setIsRulesOpen(false)} title="Trading Rules">
          <div className="space-y-1">
            {[
              "Always check Forex Factory calendar before any trade",
              "No trade without a stop loss placed before entry",
              "Maximum 3 trades per day",
              "Wait for liquidity sweep then M5 engulfing confirmation",
              "Move SL to breakeven after TP1 is hit",
              "$20 daily risk maximum — margin called = done for the day",
              "Minimum 1:3 R:R before entering any trade",
              "No trading when emotion is Revenge or Excited / Rushed",
              "Log every trade with entry reason — same day",
              "Weekly review every Sunday without exception"
            ].map((rule, idx) => (
              <div key={idx} className="flex gap-4 p-3 border-b border-white/5 last:border-0 text-spotify-muted text-xs leading-relaxed">
                <span className="font-mono text-spotify-green text-[10px] font-bold mt-0.5">{(idx + 1).toString().padStart(2, '0')}</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {selectedTrade && (
        <Modal 
          onClose={() => { setSelectedTrade(null); setIsEditingTrade(false); setAiAnalysis(null); }} 
          title={isEditingTrade ? 'Edit Trade' : `${selectedTrade.pair} ${selectedTrade.dir}`}
          showFooter={!isEditingTrade}
        >
          {isEditingTrade ? (
            <TradeForm 
              initialData={selectedTrade} 
              onSubmit={(data: any) => updateTrade(selectedTrade.id, data)}
              buttonLabel="Update Entry"
              displayCurrency={displayCurrency}
            />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <StatItem label="Date" value={selectedTrade.date} />
                <StatItem label="Time" value={selectedTrade.time} />
                <StatItem label="Lot Size" value={selectedTrade.lot} />
                <StatItem label="Entry" value={formatNum(selectedTrade.entry)} mono />
                <StatItem label="Exit" value={formatNum(selectedTrade.exit)} mono />
                <StatItem label="P&L" value={formatCurrency(convertCurrency(cleanMoney(selectedTrade.pnl), selectedTrade.currency || 'USD', displayCurrency), displayCurrency)} color={selectedTrade.pnl >= 0 ? 'text-spotify-green' : 'text-red-500'} bold />
                <StatItem label="Result" value={selectedTrade.result.toUpperCase()} />
                <StatItem label="Setup" value={selectedTrade.setup} />
              </div>

              {/* AI Analysis Section */}
              <div className="bg-spotify-green/5 border border-spotify-green/20 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-spotify-green/20 p-1.5 rounded-lg">
                      <Sparkles size={14} className="text-spotify-green" />
                    </div>
                    <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-spotify-green">Gemini AI Audit</h4>
                  </div>
                  {!aiAnalysis && !isAnalyzing && (
                    <button 
                      onClick={() => analyzeTrade(selectedTrade)}
                      className="text-[10px] font-bold text-spotify-green border border-spotify-green/30 px-3 py-1 rounded-full hover:bg-spotify-green hover:text-spotify-darker transition-all"
                    >
                      Run Analysis
                    </button>
                  )}
                </div>

                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center py-4 gap-3">
                    <Loader2 size={24} className="text-spotify-green animate-spin" />
                    <p className="text-[10px] font-bold text-spotify-muted uppercase tracking-widest animate-pulse">Consulting Mentor...</p>
                  </div>
                )}

                {aiAnalysis && (
                  <div className="text-xs text-white/80 leading-relaxed markdown-analysis prose prose-invert max-w-none">
                    <Markdown>{aiAnalysis}</Markdown>
                  </div>
                )}
                
                {!aiAnalysis && !isAnalyzing && (
                  <p className="text-[10px] text-spotify-muted italic leading-relaxed">
                    Get an AI-powered audit of this trade based on your methodology and 10 core trading rules.
                  </p>
                )}
              </div>

              {selectedTrade.reason && (
                <div>
                  <div className="text-[10px] font-bold text-spotify-muted uppercase tracking-[0.1em] mb-2">Reason for Entry</div>
                  <p className="text-sm text-spotify-muted leading-relaxed">{selectedTrade.reason}</p>
                </div>
              )}
              {selectedTrade.notes && (
                <div>
                  <div className="text-[10px] font-bold text-spotify-muted uppercase tracking-[0.1em] mb-2">Notes / Lessons</div>
                  <p className="text-sm text-spotify-muted leading-relaxed">{selectedTrade.notes}</p>
                </div>
              )}
              {selectedTrade.tags && selectedTrade.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTrade.tags.map((tag: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-spotify-green/10 text-spotify-green text-[9px] font-black uppercase tracking-widest rounded-md border border-spotify-green/20">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              {selectedTrade.ss && (
                <div className="pt-4 border-t border-white/5">
                  <div className="text-[10px] font-bold text-spotify-muted uppercase tracking-[0.1em] mb-3">Chart Snapshot</div>
                  <img src={selectedTrade.ss} className="w-full rounded-lg border border-white/10" />
                </div>
              )}
              <div className="pt-6 border-t border-white/5 flex gap-3">
                <button 
                  onClick={() => setIsEditingTrade(true)}
                  className="flex-1 bg-spotify-green text-spotify-darker font-extrabold uppercase tracking-widest text-[11px] py-3 rounded-full hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 size={14} />
                  Edit Trade
                </button>
                <button 
                  onClick={() => { deleteTrade(selectedTrade.id); setSelectedTrade(null); }}
                  className="px-6 bg-white/5 text-red-500 font-extrabold uppercase tracking-widest text-[11px] py-3 rounded-full hover:bg-red-500/10 transition-all border border-white/10"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// --- Page Components ---

function DashboardPage({ stats, trades, onTradeClick, displayCurrency, setActivePage, plan }: { stats: any, trades: any, onTradeClick: any, displayCurrency: any, setActivePage: any, plan: any }) {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0] || 'Trader';

  // Calculate monthly stats for plan progress
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthPnl = trades
    .filter((t: any) => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum: number, t: any) => sum + convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', displayCurrency), 0);

  const { greeting, sessionInfo } = useMemo(() => {
    const hour = new Date().getUTCHours();
    const min = new Date().getUTCMinutes();
    const time = hour + min / 60;

    // Sessions (UTC)
    const sessions = [];
    if (time >= 0 && time < 9) sessions.push({ name: 'Asia', color: 'text-orange-400', bg: 'bg-orange-400/10', active: true });
    if (time >= 8 && time < 17) sessions.push({ name: 'London', color: 'text-spotify-green', bg: 'bg-spotify-green/10', active: true });
    if (time >= 13 && time < 22) sessions.push({ name: 'New York', color: 'text-blue-400', bg: 'bg-blue-400/10', active: true });

    const localHour = new Date().getHours();
    const day = new Date().getDate();
    let g = "Rise and grind";
    if (localHour >= 5 && localHour < 12) {
      const msgs = ["Good morning", "Rise and grind", "Happy hunting", "Ready for pips?", "Top of the morning", "Morning"];
      g = msgs[(day + localHour) % msgs.length];
    } else if (localHour >= 12 && localHour < 18) {
      const msgs = ["Good afternoon", "Market's cooking", "Trade with intent", "Stay focused", "Afternoon pips?", "Happy trading"];
      g = msgs[(day + localHour) % msgs.length];
    } else if (localHour >= 18 && localHour < 22) {
      const msgs = ["Good evening", "Review your day", "Discipline pays", "Consistency is key", "Evening", "Reflect and refine"];
      g = msgs[(day + localHour) % msgs.length];
    } else {
      const msgs = ["Night owl mode", "Prep for London?", "Rest is trading", "Dreaming of pips?", "Midnight grind", "Sleep well"];
      g = msgs[(day + localHour) % msgs.length];
    }

    return { greeting: g, sessionInfo: sessions.filter(s => s.active) };
  }, []);

  const chartData = useMemo(() => {
    if (!trades.length) return [];
    const tradesWithUsdPnl = trades.map(t => ({
      ...t,
      usdPnl: convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', 'USD')
    }));

    const sorted = [...tradesWithUsdPnl].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    let cumulativeUsd = 0;
    return sorted.map((t, idx) => {
      cumulativeUsd += t.usdPnl;
      return {
        id: t.id,
        date: t.date,
        displayDate: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        cumulativeUsd: Number(cumulativeUsd.toFixed(2)),
        tradeUsdPnl: t.usdPnl,
        index: idx + 1
      };
    });
  }, [trades]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-2">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-4 relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-spotify-green/[0.03] via-transparent to-transparent border border-white/[0.03]">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
        <div className="space-y-3 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-spotify-green text-black text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-spotify-green/20"
          >
            <Zap size={10} fill="currentColor" />
            <span>Command Center</span>
          </motion.div>
          <h1 className="text-4xl md:text-7xl font-black tracking-[-0.05em] text-white leading-[0.9] decoration-spotify-green decoration-2 md:decoration-4 underline-offset-4">
            {greeting}, <span className="text-spotify-green italic">{firstName}</span>
          </h1>
          <div className="flex items-center gap-2 flex-wrap pt-2">
            {sessionInfo.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${s.bg} ${s.color} border border-current whitespace-nowrap flex items-center gap-1.5`}>
                  {s.active && <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1 h-1 bg-current rounded-full" />}
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl relative z-10 min-w-[240px]">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[10px] font-black text-spotify-muted uppercase tracking-[0.3em]">Portfolio</p>
            {stats.n > 0 && (
              <div className="flex items-center gap-1 text-[9px] font-black uppercase text-spotify-green">
                <ChevronUp size={10} />
                <span>Active</span>
              </div>
            )}
          </div>
          <p className={`text-4xl md:text-5xl font-black tracking-tighter ${stats.pnl >= 0 ? 'text-spotify-green' : 'text-red-500'}`}>
            {stats.pnl >= 0 ? '+' : ''}{formatCurrency(convertCurrency(stats.pnl, 'USD', displayCurrency), displayCurrency)}
          </p>
          <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">{plan ? 'Monthly Target' : 'Growth'}</p>
              <p className="text-[10px] font-mono font-bold text-white/50">
                {plan ? `${Math.round((currentMonthPnl / (plan.monthlyTarget || 1)) * 100)}%` : `+${Math.round(stats.wins / (stats.n || 1) * 100)}% WR`}
              </p>
            </div>
            {plan && (
              <div className="space-y-1">
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, (currentMonthPnl / plan.monthlyTarget) * 100))}%` }}
                    className="h-full bg-spotify-green shadow-[0_0_8px_rgba(30,215,96,0.5)]" 
                  />
                </div>
                <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-widest text-white/20">
                  <span>Daily Goal: {formatCurrency(convertCurrency(plan.monthlyTarget / 20, 'USD', displayCurrency), displayCurrency)}</span>
                  <span>{formatCurrency(convertCurrency(plan.monthlyTarget - currentMonthPnl, 'USD', displayCurrency), displayCurrency)} left</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/[0.02] rounded-3xl p-6 md:p-10 border border-white/5">
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-0.3em text-spotify-muted">Equity Timeline</h3>
            </div>
          </div>
          
          <div className="h-[250px] md:h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1DB954" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#1DB954" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700 }}
                    minTickGap={30}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700 }}
                  />
                  <Tooltip 
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const formattedPnL = formatCurrency(convertCurrency(data.tradeUsdPnl, 'USD', displayCurrency), displayCurrency);
                        const formattedCumulative = formatCurrency(convertCurrency(data.cumulativeUsd, 'USD', displayCurrency), displayCurrency);
                        
                        return (
                          <div className="bg-[#121212] border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-md">
                            <p className="text-[9px] font-black uppercase text-spotify-muted tracking-widest mb-2 pb-1.5 border-b border-white/5">
                              {new Date(data.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <div className="space-y-1.5 pt-0.5">
                              <div className="flex items-center justify-between gap-8">
                                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Trade P&L</span>
                                <span className={`text-[10px] font-black ${data.tradeUsdPnl >= 0 ? 'text-spotify-green' : 'text-red-500'}`}>
                                  {data.tradeUsdPnl >= 0 ? '+' : ''}{formattedPnL}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-8">
                                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Equity</span>
                                <span className="text-[10px] font-black text-white">{formattedCumulative}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cumulativeUsd" 
                    stroke="#1DB954" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPnl)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-spotify-muted border-2 border-dashed border-white/5 rounded-xl">
                 <p className="text-xs font-bold uppercase tracking-widest mb-1">Awaiting Data Points</p>
                 <p className="text-[10px] opacity-50">Log your first trades to chart performance</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[300px]">
            <div>
              <p className="text-[10px] font-black text-spotify-muted uppercase tracking-[0.3em] mb-6">Plan Status</p>
              {plan ? (
                <div className="space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Monthly Target</h4>
                    <p className="text-3xl font-black text-white tracking-tighter">{formatCurrency(plan.monthlyTarget, displayCurrency)}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-spotify-muted uppercase">{formatCurrency(currentMonthPnl, displayCurrency)} realized</span>
                      <span className="text-[9px] font-black text-spotify-green">{Math.round((currentMonthPnl / plan.monthlyTarget) * 100)}%</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Daily Discipline</h4>
                    <p className="text-3xl font-black text-white tracking-tighter">{formatCurrency(plan.dailyTarget, displayCurrency)}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-8">
                  <Target className="text-white/10 mb-4" size={48} />
                  <p className="text-xs font-bold text-spotify-muted uppercase tracking-widest mb-6">No trading plan established</p>
                  <button 
                    onClick={() => setActivePage('plan')}
                    className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-white"
                  >
                    Create Plan
                  </button>
                </div>
              )}
            </div>
            {plan && (
              <button 
                onClick={() => setActivePage('plan')}
                className="w-full py-4 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest text-spotify-muted hover:text-white transition-colors"
              >
                Review Blueprint
              </button>
            )}
          </div>

          <div className="bg-spotify-green/10 border border-spotify-green/20 rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[300px]">
             <div>
                <p className="text-[10px] font-black text-spotify-green uppercase tracking-[0.3em] mb-6">Psychological Edge</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-spotify-green p-3 rounded-2xl text-black">
                      <Brain size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-spotify-muted uppercase tracking-widest">Current Archetype</p>
                      <p className="text-xl font-black text-white">{trades.length > 0 ? (trades.filter((t:any) => t.plan === 'yes').length / trades.length > 0.8 ? 'The Sniper' : 'The Tactician') : 'The Novice'}</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 space-y-4 border-t border-white/5">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-spotify-muted tracking-widest">
                      <span>Rule Streak</span>
                      <span className="text-white flex items-center gap-1"><Zap size={10} className="text-spotify-green" fill="currentColor" /> {(() => {
                        let streak = 0;
                        const sorted = [...trades].sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        for (const t of sorted) {
                          if (t.plan === 'yes') streak++;
                          else break;
                        }
                        return streak;
                      })()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-spotify-muted tracking-widest">
                      <span>Plan Adherence</span>
                      <span className="text-white">{trades.length > 0 ? Math.round((trades.filter((t:any) => t.plan === 'yes').length / trades.length) * 100) : 0}%</span>
                    </div>
                  </div>
                </div>
             </div>
             <button 
                onClick={() => setActivePage('habits')}
                className="w-full py-4 bg-spotify-green text-black rounded-2xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
              >
                Habit Analysis
              </button>
          </div>
        </div>
      </div>

      <div className="bg-white/[0.02] rounded-3xl p-6 md:p-10 border border-white/5 relative overflow-hidden group">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 md:gap-y-0 relative z-10 transition-all duration-500">
          <div className="flex flex-col items-center md:items-start md:border-r border-white/5 px-4 md:px-0 md:pr-12">
            <p className="text-[9px] font-black text-spotify-muted uppercase tracking-[0.3em] mb-3">Trades</p>
            <p className="text-3xl font-black text-white tracking-tighter">{stats.n}</p>
          </div>
          <div className="flex flex-col items-center md:items-start md:border-r border-white/5 px-4 md:px-12">
            <p className="text-[9px] font-black text-spotify-muted uppercase tracking-[0.3em] mb-3">Win Rate</p>
            <p className="text-3xl font-black text-white tracking-tighter">
              {stats.n ? Math.round(stats.wins/stats.n*100) : 0}%
            </p>
          </div>
          <div className="flex flex-col items-center md:items-start md:border-r border-white/5 px-4 md:px-12">
            <p className="text-[9px] font-black text-spotify-muted uppercase tracking-[0.3em] mb-3">Discipline</p>
            <p className="text-3xl font-black text-white tracking-tighter">
              {stats.n ? Math.round(stats.planFollowed/stats.n*100) : 0}%
            </p>
          </div>
          <div className="flex flex-col items-center md:items-start px-4 md:px-12">
            <p className="text-[9px] font-black text-spotify-muted uppercase tracking-[0.3em] mb-3">Avg R:R</p>
            <p className="text-3xl font-black text-white tracking-tighter">{stats.avgRR === '—' ? '—' : `1:${stats.avgRR}`}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/[0.02] rounded-[2rem] border border-white/5 overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white">Latest Activity</h2>
          <button 
            onClick={() => setActivePage('history')}
            className="text-[10px] font-black uppercase tracking-widest text-spotify-muted hover:text-spotify-green transition-colors"
          >
            Full History
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.2em] text-spotify-muted/50 border-b border-white/5">
                <th className="px-8 py-4 font-black">Timeline</th>
                <th className="px-8 py-4 font-black">Asset</th>
                <th className="px-8 py-4 font-black text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {trades.slice(0, 5).map((t: Trade) => (
                <tr key={t.id} onClick={() => onTradeClick(t)} className="group hover:bg-white/[0.03] cursor-pointer transition-all">
                  <td className="px-8 py-5 text-[10px] font-mono text-spotify-muted">{t.date}</td>
                  <td className="px-8 py-5">
                    <p className="text-[11px] font-black text-white">{t.pair}</p>
                    <p className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${t.dir === 'Long' ? 'text-spotify-green' : 'text-red-500'}`}>{t.dir}</p>
                  </td>
                  <td className={`px-8 py-5 text-[11px] font-black text-right font-mono ${t.pnl >= 0 ? 'text-spotify-green' : 'text-red-500'}`}>
                    {t.pnl >= 0 ? '+' : ''}{formatCurrency(convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', displayCurrency), displayCurrency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trades.length === 0 && (
            <div className="p-20 text-center text-spotify-muted">
              <p className="text-sm font-bold mb-1">No trades found</p>
              <p className="text-xs">Log your first trade to see activities here.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white/[0.02] rounded-3xl p-8 border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-spotify-muted">Psychology</h3>
          </div>
          <div className="space-y-4">
            {stats.psychologyMap.length > 0 ? stats.psychologyMap.map((item: any) => (
              <div key={item.emotion} className="flex items-center justify-between group">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white group-hover:text-spotify-green transition-colors">{item.emotion}</p>
                  <p className="text-[8px] text-spotify-muted uppercase tracking-tighter">{item.winRate}% SR</p>
                </div>
                <div className={`text-[11px] font-mono font-black ${item.pnl >= 0 ? 'text-spotify-green' : 'text-red-500'}`}>
                  {item.pnl >= 0 ? '+' : ''}{formatCurrency(convertCurrency(item.pnl, 'USD', displayCurrency), displayCurrency)}
                </div>
              </div>
            )) : (
              <p className="text-center py-10 text-[10px] text-spotify-muted font-bold uppercase tracking-widest">No emotional data recorded</p>
            )}
          </div>
        </div>

        <div className="bg-white/[0.02] rounded-3xl p-8 border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-spotify-muted">Timing</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-spotify-green rounded-full animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-widest text-spotify-green">Live Monitoring</span>
            </div>
          </div>
          <div className="space-y-4">
            {stats.sessionAnalytics.length > 0 ? stats.sessionAnalytics.map((item: any) => (
              <div key={item.session} className="flex items-center justify-between group">
                <div>
                  <p className="text-[11px] font-bold text-white group-hover:text-spotify-green transition-colors">{item.session}</p>
                  <p className="text-[8px] text-spotify-muted uppercase tracking-widest mt-1">{item.winRate}% SR</p>
                </div>
                <div className={`text-[11px] font-mono font-black ${item.pnl >= 0 ? 'text-spotify-green' : 'text-red-500'}`}>
                  {item.pnl >= 0 ? '+' : ''}{formatCurrency(convertCurrency(item.pnl, 'USD', displayCurrency), displayCurrency)}
                </div>
              </div>
            )) : (
              <p className="text-center py-10 text-[10px] text-spotify-muted font-bold uppercase tracking-widest">No session data points</p>
            )}
          </div>
        </div>

        <div className="bg-white/[0.02] rounded-3xl p-8 border border-white/5 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-spotify-muted">Risk</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-[9px] font-black text-spotify-muted uppercase tracking-[0.3em] mb-2">Max Drawdown</p>
              <p className="text-2xl font-black text-white tracking-tighter">
                {formatCurrency(convertCurrency(stats.worst?.pnl || 0, 'USD', displayCurrency), displayCurrency)}
              </p>
            </div>
            
            <div className="pt-2">
              <p className="text-[9px] font-black text-spotify-muted uppercase tracking-[0.3em] mb-2">Best Session</p>
              <p className="text-2xl font-black text-spotify-green tracking-tighter">
                {stats.best ? `+${formatCurrency(convertCurrency(cleanMoney(stats.best.pnl), stats.best.currency || 'USD', displayCurrency), displayCurrency)}` : '—'}
              </p>
              <p className="text-[8px] font-bold text-spotify-muted mt-1 uppercase tracking-widest">{stats.best?.date || 'No record'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanPage({ plan, trades, displayCurrency, onSave, onReset }: any) {
  const [isEditing, setIsEditing] = useState(!plan);
  const [formData, setFormData] = useState(plan || {
    yearlyTarget: 120000,
    monthlyTarget: 10000,
    weeklyTarget: 2500,
    dailyTarget: 500,
    currency: displayCurrency
  });

  // Update formData if plan changes (e.g. after reset)
  useEffect(() => {
    if (plan) {
      setFormData(plan);
    } else {
      setFormData({
        yearlyTarget: 120000,
        monthlyTarget: 10000,
        weeklyTarget: 2500,
        dailyTarget: 500,
        currency: displayCurrency
      });
      setIsEditing(true);
    }
  }, [plan, displayCurrency]);

  const currentPnl = trades.reduce((sum: number, t: any) => sum + convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', displayCurrency), 0);

  const calculateTargets = (val: number, type: 'yearly' | 'monthly' | 'weekly' | 'daily') => {
    let monthly = val;
    if (type === 'yearly') monthly = val / 12;
    if (type === 'weekly') monthly = val * 4.33; // Average weeks in month
    if (type === 'daily') monthly = val * 21; // Trading days in month

    setFormData({
      yearlyTarget: Math.round(monthly * 12),
      monthlyTarget: Math.round(monthly),
      weeklyTarget: Math.round(monthly / 4),
      dailyTarget: Math.round(monthly / 21), // 21 trading days approx
      currency: displayCurrency
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsEditing(false);
  };

  const stats = [
    { label: 'Monthly Goal', value: formData.monthlyTarget, isMain: true },
    { label: 'Weekly Target', value: formData.weeklyTarget },
    { label: 'Daily Session Target', value: formData.dailyTarget },
    { label: 'Yearly Vision', value: formData.yearlyTarget, isVision: true },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white">Monthly <span className="text-spotify-green italic">Target</span></h1>
          <p className="text-xs font-bold text-spotify-muted uppercase tracking-[0.2em] mt-1">Anchor your discipline. Execute your blueprint.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all text-white"
          >
            {isEditing ? 'Cancel' : 'Adjust Settings'}
          </button>
          {plan && (
            <button 
              onClick={onReset}
              className="p-2 rounded-full border border-red-500/20 text-red-500/60 hover:bg-red-500/10 hover:text-red-500 transition-all"
              title="Reset Plan"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] border border-white/5 rounded-3xl p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-spotify-muted uppercase tracking-widest px-1">Monthly Target ({displayCurrency})</label>
                <input 
                  type="number" 
                  value={formData.monthlyTarget}
                  onChange={(e) => calculateTargets(parseFloat(e.target.value), 'monthly')}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-black text-white outline-none focus:border-spotify-green transition-all"
                />
              </div>
              <div className="space-y-2 opacity-50">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1">Daily Discipline (Derived)</label>
                <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-black text-white/50 cursor-not-allowed">
                  {formatCurrency(formData.dailyTarget, displayCurrency)}
                </div>
              </div>
            </div>
            
            <div className="pt-4">
              <button 
                type="submit"
                className="w-full bg-spotify-green text-black font-black uppercase tracking-[0.3em] py-5 rounded-2xl hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-spotify-green/10"
              >
                Set Blueprint
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className={`relative overflow-hidden group p-8 rounded-[2.5rem] border ${stat.isMain ? 'bg-spotify-green border-spotify-green/20' : 'bg-white/[0.02] border-white/5'}`}>
              <div className="relative z-10">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${stat.isMain ? 'text-black/60' : 'text-spotify-muted'}`}>
                  {stat.label}
                </p>
                <h3 className={`text-3xl font-black tracking-tighter ${stat.isMain ? 'text-black' : 'text-white'}`}>
                  {formatCurrency(stat.value, displayCurrency)}
                </h3>
                {stat.isVision && (
                   <p className="text-[10px] font-black text-white/20 mt-2 uppercase tracking-widest">Yearly Objective</p>
                )}
                {stat.isMain && (
                   <p className="text-[10px] font-black text-black/40 mt-2 uppercase tracking-widest">Main Blueprint</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isEditing && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-spotify-green/10 flex items-center justify-center">
              <Target className="text-spotify-green" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Execution Strategy</h2>
              <p className="text-xs text-spotify-muted font-bold uppercase tracking-widest mt-2 max-w-xs leading-relaxed">
                To realize {formatCurrency(formData.monthlyTarget, displayCurrency)} this month, commit to {formatCurrency(formData.dailyTarget, displayCurrency)} daily gain. 
                One 1:2 R:R winner is your finish line.
              </p>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-10">
            <h3 className="text-[10px] font-black text-spotify-muted uppercase tracking-[0.3em] mb-8">Overall Performance</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white/80">Total Realized</span>
                <span className={`font-mono font-black ${currentPnl >= 0 ? 'text-spotify-green' : 'text-red-500'}`}>
                  {currentPnl >= 0 ? '+' : ''}{formatCurrency(currentPnl, displayCurrency)}
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, (currentPnl / (formData.yearlyTarget || 1)) * 100))}%` }}
                  className="h-full bg-spotify-green" 
                />
              </div>
              <p className="text-[10px] font-bold text-spotify-muted uppercase text-center tracking-widest">
                {Math.round((currentPnl / (formData.yearlyTarget || 1)) * 100)}% of annual objective
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LogPage({ onLog, displayCurrency }: any) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-1">Log <span className="italic text-spotify-green">Trade</span></h1>
        <p className="text-xs font-medium text-spotify-muted">Record every detail — precision builds mastery.</p>
      </div>
      <TradeForm onSubmit={onLog} displayCurrency={displayCurrency} />
    </div>
  );
}

function CalculatorPage({ displayCurrency }: { displayCurrency: string }) {
  const [balance, setBalance] = useState(10000);
  const [risk, setRisk] = useState(1);
  const [pair, setPair] = useState('XAUUSD');
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');

  const [fibEntry, setFibEntry] = useState('');
  const [fibTarget, setFibTarget] = useState('');

  const result = useMemo(() => {
    const e = parseFloat(entry);
    const s = parseFloat(sl);
    if (!e || !s || e === s) return null;

    const config = PAIR_CONFIG[pair] || { multiplier: 1, digits: 2, pipSize: 1 };
    const pips = Math.abs(e - s) * config.pipSize;
    const riskAmount = balance * (risk / 100);
    // Rough lot calculation for major pairs/metals
    const lotSize = riskAmount / (Math.abs(e - s) * config.multiplier);

    return {
      riskAmount,
      pips: pips.toFixed(1),
      lot: lotSize.toFixed(2),
      rr: (target: number) => Math.abs(target - e) / Math.abs(e - s)
    };
  }, [balance, risk, pair, entry, sl]);

  const fibLevels = useMemo(() => {
    const low = parseFloat(fibEntry);
    const high = parseFloat(fibTarget);
    if (!low || !high) return null;

    const diff = high - low;
    const levels = [
      { label: '0.0% (Origin)', value: low },
      { label: '23.6%', value: high - (diff * 0.764) },
      { label: '38.2%', value: high - (diff * 0.618) },
      { label: '50.0% (Equilibrium)', value: high - (diff * 0.5) },
      { label: '61.8% (Golden Pocket)', value: high - (diff * 0.382) },
      { label: '78.6%', value: high - (diff * 0.214) },
      { label: '100% (Target)', value: high },
      { label: '161.8% (Extension)', value: high + (diff * 0.618) },
    ];
    return levels;
  }, [fibEntry, fibTarget]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tighter">Trading <span className="text-spotify-green italic">Calculators</span></h1>
        <p className="text-xs font-bold text-spotify-muted uppercase tracking-widest">Precision Tools for Institutional Execution.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Position Size Calculator */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-spotify-green/10 rounded-xl">
              <PlusCircle size={20} className="text-spotify-green" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Risk Management</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input label="Account Balance" type="number" value={balance} onChange={setBalance} />
            <Input label="Risk Percentage (%)" type="number" step="0.1" value={risk} onChange={setRisk} />
            <Select label="Instrument" value={pair} options={Object.keys(PAIR_CONFIG)} onChange={setPair} />
            <Input label="Entry Price" type="number" value={entry} onChange={setEntry} />
            <Input label="Stop Loss" type="number" value={sl} onChange={setSl} />
          </div>

          {result ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-6 border-t border-white/5 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-spotify-muted uppercase tracking-widest mb-1">Recommended Size</p>
                  <p className="text-5xl font-black text-spotify-green tracking-tighter">{result.lot} <span className="text-sm uppercase">Lots</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Total Risk</p>
                  <p className="text-xl font-black text-white">{formatCurrency(result.riskAmount, displayCurrency)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl">
                  <p className="text-[9px] font-black text-spotify-muted uppercase tracking-widest">Stop Loss Pips</p>
                  <p className="text-sm font-black text-white">{result.pips} pts</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl">
                  <p className="text-[9px] font-black text-spotify-muted uppercase tracking-widest">1:3 TP Target</p>
                  <p className="text-sm font-black text-spotify-green">
                    {formatNum(parseFloat(entry) + (parseFloat(entry) - parseFloat(sl)) * 3)}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Awaiting Input Parameters</p>
            </div>
          )}
        </div>

        {/* Fibonacci Calculator */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-spotify-green/10 rounded-xl">
              <Target size={20} className="text-spotify-green" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Fibonacci Retracement</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input label="Swing Low / Anchor" type="number" value={fibEntry} onChange={setFibEntry} placeholder="0.00" />
            <Input label="Swing High / Peak" type="number" value={fibTarget} onChange={setFibTarget} placeholder="0.00" />
          </div>

          {fibLevels ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {fibLevels.map((lvl) => (
                <div key={lvl.label} className="bg-white/5 p-4 rounded-xl flex items-center justify-between group hover:bg-spotify-green/5 transition-all">
                  <span className="text-[10px] font-black uppercase tracking-widest text-spotify-muted group-hover:text-spotify-green">{lvl.label}</span>
                  <span className="font-mono text-sm font-black text-white">{formatNum(lvl.value, pair === 'NAS100' || pair === 'XAUUSD' ? 2 : 5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Define Swing Anchors</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TradeForm({ initialData, onSubmit, buttonLabel = "Log Trade", displayCurrency }: any) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoLot, setIsAutoLot] = useState(!initialData);
  const defaults = {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    pair: 'XAUUSD',
    dir: 'Short',
    session: 'New York',
    entry: '',
    exit: '',
    sl: '',
    tp: '',
    lot: '0.10',
    currency: displayCurrency || 'USD',
    pnl: '',
    result: 'win',
    setup: 'MSS + FVG',
    emotion: 'Calm / Confident',
    news: 'no',
    plan: 'yes',
    dur: '',
    reason: '',
    notes: '',
    ss: '',
    tags: [] as string[],
    riskPercent: '1',
    balance: '10000'
  };

  const [form, setForm] = useState(() => {
    // Check for draft if this is a new trade
    if (!initialData) {
      const savedDraft = localStorage.getItem('trade_draft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          // If draft exists, ensure it uses current display currency if it was saved with one
          if (displayCurrency) draft.currency = displayCurrency;
          // Ensure tags is array
          if (typeof draft.tags === 'string') {
            draft.tags = draft.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
          }
          return draft;
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      }
    }

    const data = { ...defaults, ...initialData };
    if (initialData?.tags) {
      data.tags = Array.isArray(initialData.tags) ? initialData.tags : initialData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    } else {
      data.tags = [];
    }
    
    // Always honor the current display currency even when editing
    if (displayCurrency) {
      data.currency = displayCurrency;
    }
    
    return data;
  });

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!initialData && form !== defaults) {
      localStorage.setItem('trade_draft', JSON.stringify(form));
    }
  }, [form, initialData]);

  // Update form if initialData changes (e.g. switching trades while open)
  useEffect(() => {
    if (initialData) {
      const data = { ...initialData };
      if (initialData.tags) {
        data.tags = Array.isArray(initialData.tags) ? initialData.tags : initialData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      } else {
        data.tags = [];
      }
      // If we are editing, we want to maintain the Global display currency preference
      if (displayCurrency) {
        data.currency = displayCurrency;
      }
      setForm(prev => ({ ...prev, ...data }));
    }
  }, [initialData, displayCurrency]);

  // Auto-calculate Session
  useEffect(() => {
    if (form.time) {
      const hour = parseInt(form.time.split(':')[0]);
      let session: 'Asia' | 'London' | 'New York' = 'New York';
      if (hour >= 0 && hour < 9) session = 'Asia';
      else if (hour >= 8 && hour < 17) session = 'London';
      else if (hour >= 13 && hour < 22) session = 'New York';
      
      if (form.session !== session) {
        setForm(prev => ({ ...prev, session }));
      }
    }
  }, [form.time]);

  // Risk Guardian Calculation
  const riskCalculation = useMemo(() => {
    const entry = parseFloat(form.entry);
    const sl = parseFloat(form.sl);
    const balance = parseFloat(form.balance);
    const riskPercent = parseFloat(form.riskPercent);
    const pair = form.pair;

    if (isNaN(entry) || isNaN(sl) || isNaN(balance) || isNaN(riskPercent) || entry === sl) {
      return null;
    }

    const config = PAIR_CONFIG[pair] || { multiplier: 1, digits: 2 };
    const pips = Math.abs(entry - sl) * config.multiplier;
    const amountToRisk = balance * (riskPercent / 100);
    
    // lot = riskAmount / (pips * valuePerPip)
    // In our simplified model, 1 lot = multiplier USD per "unit" move. 
    // This is a rough estimation for XAUUSD where 0.1 lot = $1 per 0.1 move ($10 per $1 move)
    // multiplier is 100 for gold usually in these journals
    const recommendedLot = amountToRisk / (Math.abs(entry - sl) * config.multiplier);

    return {
      pips: pips.toFixed(1),
      amount: amountToRisk.toFixed(2),
      lot: recommendedLot.toFixed(2)
    };
  }, [form.entry, form.sl, form.balance, form.riskPercent, form.pair]);

  // Handle auto-lot calculation
  useEffect(() => {
    if (isAutoLot && riskCalculation) {
      setForm(prev => {
        if (prev.lot !== riskCalculation.lot) {
          return { ...prev, lot: riskCalculation.lot };
        }
        return prev;
      });
    }
  }, [riskCalculation, isAutoLot]);

  useEffect(() => {
    // Only auto-calculate if we have valid numbers for the math
    const entry = parseFloat(form.entry);
    const exit = parseFloat(form.exit);
    const lot = parseFloat(form.lot);
    
    if (!isNaN(entry) && !isNaN(exit) && !isNaN(lot)) {
      let calculatedPnlInUsd = 0;
      const config = PAIR_CONFIG[form.pair] || { multiplier: 1, digits: 2 };
      
      const diff = form.dir === 'Long' ? (exit - entry) : (entry - exit);
      calculatedPnlInUsd = diff * lot * config.multiplier;

      // Convert from USD to the selected form currency
      const finalPnl = convertCurrency(calculatedPnlInUsd, 'USD', form.currency);

      setForm(prev => {
        // Prevent unnecessary state updates if values are already correct
        const formattedPnl = form.currency === 'IDR' 
          ? Math.round(finalPnl).toString() 
          : formatNum(finalPnl, 2).replace(/,/g, '');
          
        if (prev.pnl === formattedPnl) return prev;

        let result = 'be';
        if (finalPnl > (form.currency === 'IDR' ? 100 : 0.01)) result = 'win';
        else if (finalPnl < (form.currency === 'IDR' ? -100 : -0.01)) result = 'loss';

        return { 
          ...prev, 
          pnl: formattedPnl,
          result: result as any
        };
      });
    }
  }, [form.entry, form.exit, form.lot, form.dir, form.pair, form.currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setError(null);
    const entryNum = cleanMoney(form.entry);
    const slNum = cleanMoney(form.sl);
    
    if (isNaN(entryNum) || entryNum === 0) {
      setError("Entry price must be a valid number");
      return;
    }
    
    if (slNum !== 0 && entryNum === slNum) {
      setError("Stop loss cannot be equal to entry price");
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        ...form,
        tags: form.tags,
        entry: entryNum,
        exit: cleanMoney(form.exit),
        pnl: cleanMoney(form.pnl),
        sl: slNum,
        tp: cleanMoney(form.tp),
        lot: cleanMoney(form.lot) || 0.01
      });
      
      if (!initialData) {
        setForm((prev: any) => ({ ...prev, entry: '', exit: '', pnl: '', dur: '', reason: '', notes: '', ss: '' }));
        localStorage.removeItem('trade_draft');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setForm({ ...form, ss: ev.target?.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-spotify-card p-6 rounded-lg space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Chart Screenshot</h3>
          <span className="text-[10px] text-spotify-muted">Visual memory is powerful reference</span>
        </div>
        
        <div 
          onClick={() => document.getElementById('ss-upload')?.click()}
          className={`border-2 border-dashed border-white/10 rounded-xl p-8 transition-all group cursor-pointer hover:bg-white/5 hover:border-spotify-green/50 ${form.ss ? 'p-0 overflow-hidden border-solid border-white/5' : ''}`}
        >
          {form.ss ? (
            <div className="relative group">
              <img src={form.ss} className="w-full max-h-[400px] object-contain bg-black" />
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setForm({ ...form, ss: '' }); }}
                className="absolute top-4 right-4 bg-black/80 p-2 rounded-full text-white hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <Camera size={40} className="text-white/20 mb-4 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-bold text-spotify-muted mb-1">Drop your TradingView screenshot here</p>
              <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Png, Jpg · Drag & Drop</p>
            </div>
          )}
          <input type="file" id="ss-upload" className="hidden" accept="image/*" onChange={handleFileUpload} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-spotify-card p-6 rounded-lg space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Risk Guardian</h3>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase text-spotify-muted">Auto-Size</span>
              <button 
                type="button"
                onClick={() => setIsAutoLot(!isAutoLot)}
                className={`w-8 h-4 rounded-full relative transition-colors ${isAutoLot ? 'bg-spotify-green' : 'bg-white/10'}`}
              >
                <motion.div 
                  animate={{ x: isAutoLot ? 16 : 2 }}
                  className="absolute top-1 left-0 w-2 h-2 bg-white rounded-full"
                />
              </button>
              <Zap size={14} className={isAutoLot ? "text-spotify-green animate-pulse" : "text-white/20"} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-left">
            <Input label="Account Balance" type="number" value={form.balance} onChange={(v:any) => setForm(prev => ({ ...prev, balance: v }))} />
            <Input label="Risk %" type="number" step="0.1" value={form.riskPercent} onChange={(v:any) => setForm(prev => ({ ...prev, riskPercent: v }))} />
          </div>

            {riskCalculation ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-spotify-green/10 border border-spotify-green/20 rounded-xl p-4 space-y-3"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-spotify-muted mb-1">Recommended Lot</p>
                    <p className="text-3xl font-black text-white tracking-tighter">{riskCalculation.lot} <span className="text-sm text-spotify-green">lots</span></p>
                  </div>
                  {!isAutoLot && (
                    <button 
                      type="button"
                      onClick={() => { setForm({ ...form, lot: riskCalculation.lot }); setIsAutoLot(true); }}
                      className="bg-spotify-green text-black text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full hover:scale-105 transition-transform"
                    >
                      Apply Size
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                  <div>
                    <p className="text-[9px] font-bold text-spotify-muted uppercase tracking-widest">Risk Amount</p>
                    <p className="text-xs font-mono font-bold text-white">${riskCalculation.amount}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-spotify-muted uppercase tracking-widest">SL Distance</p>
                    <p className="text-xs font-mono font-bold text-white">{riskCalculation.pips} pts</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white/5 rounded-xl p-6 text-center border border-white/5">
                <p className="text-[10px] font-bold text-spotify-muted uppercase tracking-widest">Enter Entry & SL to see risk</p>
              </div>
            )}
          </div>

        <div className="bg-spotify-card p-6 rounded-lg space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Trade Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Date" type="date" value={form.date} onChange={(v:any) => setForm(prev => ({ ...prev, date: v }))} />
            <Input label="Time (UTC)" type="time" value={form.time} onChange={(v:any) => setForm(prev => ({ ...prev, time: v }))} />
            <Select label="Pair" value={form.pair} options={Object.keys(PAIR_CONFIG)} onChange={(v:any) => setForm(prev => ({ ...prev, pair: v }))} />
            <Select label="Direction" value={form.dir} options={['Short', 'Long']} onChange={(v:any) => setForm(prev => ({ ...prev, dir: v as any }))} />
            <Input label="Lot Size" type="number" step="0.01" placeholder="0.10" value={form.lot} onChange={(v:any) => { setForm(prev => ({ ...prev, lot: v })); setIsAutoLot(false); }} />
            <Select label="Currency" value={form.currency} options={Object.keys(CURRENCIES)} onChange={(v:any) => setForm(prev => ({ ...prev, currency: v as any }))} />
            <Input label="Entry Price" type="number" step="0.01" placeholder="2035.50" value={form.entry} onChange={(v:any) => setForm(prev => ({ ...prev, entry: v }))} />
            <Input label="Exit Price" type="number" step="0.01" placeholder="2045.50" value={form.exit} onChange={(v:any) => setForm(prev => ({ ...prev, exit: v }))} />
            <Input label="Stop Loss" type="number" step="0.01" placeholder="2030.00" value={form.sl} onChange={(v:any) => setForm(prev => ({ ...prev, sl: v }))} />
            <Input label="Take Profit" type="number" step="0.01" placeholder="2060.00" value={form.tp} onChange={(v:any) => setForm(prev => ({ ...prev, tp: v }))} />
          </div>
        </div>

        <div className="bg-spotify-card p-6 rounded-lg space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Outcomes & Psychology</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-left">
            <Select label="Session" value={form.session} options={['Asia', 'London', 'New York']} onChange={(v:any) => setForm(prev => ({ ...prev, session: v as any }))} />
            <Select label="Result" value={form.result} options={[{ label: 'Win ✅', value: 'win' }, { label: 'Loss ❌', value: 'loss' }, { label: 'Breakeven', value: 'be' }]} onChange={(v:any) => setForm(prev => ({ ...prev, result: v as any }))} />
            <Input label={`P&L (${CURRENCIES[form.currency as keyof typeof CURRENCIES]?.symbol || '$'})`} type="number" step="0.01" placeholder="100.00" value={form.pnl} onChange={(v:any) => setForm(prev => ({ ...prev, pnl: v }))} />
            <Input label="Duration" type="text" placeholder="2h 30min" value={form.dur} onChange={(v:any) => setForm(prev => ({ ...prev, dur: v }))} />
            <Select label="Setup Type" value={form.setup} options={['MSS + FVG', 'OB Rejection', 'Liquidity Sweep + Engulfing', 'CHoCH', 'Other']} onChange={(v:any) => setForm(prev => ({ ...prev, setup: v }))} />
            <Select label="Emotion" value={form.emotion} options={['Calm / Confident', 'Excited / Rushed', 'Fearful / Hesitant', 'Revenge']} onChange={(v:any) => setForm(prev => ({ ...prev, emotion: v }))} />
            <Select label="Followed Plan?" value={form.plan} options={[{ label: 'Yes ✅', value: 'yes' }, { label: 'No ❌', value: 'no' }, { label: 'Partial', value: 'partial' }]} onChange={(v:any) => setForm(prev => ({ ...prev, plan: v as any }))} />
            <Select label="News impact" value={form.news} options={[{ label: 'No News', value: 'no' }, { label: 'Med Impact', value: 'med' }, { label: 'High Impact', value: 'high' }]} onChange={(v:any) => setForm(prev => ({ ...prev, news: v as any }))} />
            <div className="sm:col-span-2">
              <TagInput 
                label="Tags" 
                value={form.tags} 
                onChange={(tags: string[]) => setForm(prev => ({ ...prev, tags }))} 
                placeholder="Add tags... (Enter or comma to add)" 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-spotify-card p-6 rounded-lg space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Entry Logic & Learnings</h3>
        <TextArea label="Reason for Entry" value={form.reason} onChange={(v:any) => setForm(prev => ({ ...prev, reason: v }))} placeholder="Confluences, bias, timeframe analysis..." />
        <TextArea label="Notes / Lesson Learned" value={form.notes} onChange={(v:any) => setForm(prev => ({ ...prev, notes: v }))} placeholder="What did you do well? What will you do differently next time?" />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-xs font-bold text-red-500">{error}</p>
        </div>
      )}

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full bg-spotify-green hover:bg-spotify-green-hover text-spotify-darker font-extrabold uppercase tracking-widest text-sm py-4 rounded-full transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
        {buttonLabel}
      </button>
    </form>
  );
}


function MT5ImportModal({ onClose, onImport, displayCurrency }: { onClose: () => void, onImport: (trades: any[]) => void, displayCurrency: string }) {
  const [importedData, setImportedData] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [rawRowsForAI, setRawRowsForAI] = useState<any[] | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const finalizeImport = (validTrades: any[]) => {
    if (validTrades.length === 0) {
      alert("No trade entries found. Please check your file content.");
      setIsParsing(false);
      return;
    }
    setImportedData(validTrades);
    setSelectedIndices(validTrades.map((_, i) => i));
    setIsParsing(false);
  };

  const aiSmartParse = async (sampleData: any[]) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return null;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [{ parts: [{ text: `
          I have a trading report from MetaTrader 5 (MT5). The columns are messy.
          Here is a JSON sample of the first few rows:
          ${JSON.stringify(sampleData, null, 2)}
          
          Please identify the exact keys used for the following fields in the JSON objects.
          Fields: 
          1. "symbol" (the currency pair like XAUUSD, EURUSD)
          2. "type" (buy or sell)
          3. "profit" (the p/l of the trade)
          4. "time" (the open or close time)
          5. "volume" (the lot size)
          6. "price" (the entry price)
          
          Return ONLY a JSON object mapping these internal field names to the keys found in the input JSON.
          Example: {"symbol": "Item", "type": "Type", "profit": "Profit", "time": "Time", "volume": "Volume", "price": "Price"}
        ` }] }]
      });
      
      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("AI Mapping failed:", e);
    }
    return null;
  };

  const processParsedData = async (rows: any[], aiMapping?: any) => {
    const validTrades = rows
      .map((row) => {
        const findKey = (keys: string[]) => {
          if (aiMapping) {
            // First check for direct matches from AI mapping
            for (const k of keys) {
              if (aiMapping[k] && row[aiMapping[k]] !== undefined) return aiMapping[k];
            }
          }
          const rowKeys = Object.keys(row);
          // Standard heuristics
          return rowKeys.find(rk => keys.some(k => {
            const cleanRk = rk.toLowerCase().trim().replace(/[\s_.-]/g, '');
            const cleanK = k.toLowerCase().replace(/[\s_.-]/g, '');
            return cleanRk === cleanK || cleanRk.includes(cleanK) || 
                   (cleanK.length > 2 && cleanRk.startsWith(cleanK)) ||
                   (cleanRk.length > 2 && cleanK.startsWith(cleanRk));
          }));
        };

        const itemKey = findKey(['item', 'symbol', 'asset', 'pair', 'security', 'ticker', 'inst']);
        const typeKey = findKey(['type', 'direction', 'action', 'pos', 'side', 'buy/sell', 'oper']);
        const profitKey = findKey(['profit', 'p/l', 'gain', 'net', 'gross', 'pl', 'result', 'earn', 'realized']);
        const openTimeKey = findKey(['open time', 'time', 'date', 'entry time', 'created', 'stamp', 'start', 'at']);
        const openPriceKey = findKey(['open price', 'price', 'entry', 'strike', 'at open', 'open at', 'value']);
        const exitPriceKey = findKey(['close price', 'exit price', 'close', 'exit', 'out', 'out at']);
        const volumeKey = findKey(['volume', 'size', 'lot', 'amount', 'qty', 'unit', 'vol']);
        const ticketKey = findKey(['ticket', 'order', 'id', 'deal', 'ref', 'no', 'num', 'key']);
        const notesKey = findKey(['comment', 'notes', 'remark', 'msg']);
        const slKey = findKey(['s / l', 'sl', 'stop loss', 's/l']);
        const tpKey = findKey(['t / p', 'tp', 'take profit', 't/p']);

        if (!itemKey || !typeKey || !row[itemKey] || !row[typeKey]) return null;
        
        const type = String(row[typeKey]).toLowerCase();
        if (type.includes('balance') || type.includes('deposit') || type.includes('withdrawal') || type.includes('credit') || type.includes('fee')) return null;
        
        const rawProfit = row[profitKey!];
        if (rawProfit === undefined || rawProfit === null || rawProfit === '') return null;
        
        const profit = cleanMoney(rawProfit);
        const dateStr = String(row[openTimeKey!] || '');
        // Match YYYY.MM.DD HH:MM:SS or similar
        const dateMatch = dateStr.match(/(\d{4})[./-](\d{2})[./-](\d{2})/) || 
                         dateStr.match(/(\d{2})[./-](\d{2})[./-](\d{4})/);
        
        let formattedDate = new Date().toISOString().split('T')[0];
        if (dateMatch) {
          // Normalize to YYYY-MM-DD
          const [_, p1, p2, p3] = dateMatch;
          if (p1.length === 4) {
            // YYYY.MM.DD or YYYY-MM-DD
            formattedDate = `${p1}-${p2}-${p3}`;
          } else {
            // DD.MM.YYYY or MM.DD.YYYY? 
            if (p3.length === 4) {
              formattedDate = `${p3}-${p2}-${p1}`;
            }
          }
        }
        
        const timeMatch = dateStr.match(/(\d{2}):(\d{2}):(\d{2})/) || dateStr.match(/(\d{2}):(\d{2})/);
        const formattedTime = timeMatch ? timeMatch[0] : new Date().toTimeString().slice(0, 5);

        const sl = slKey ? cleanMoney(row[slKey]) : 0;
        const tp = tpKey ? cleanMoney(row[tpKey]) : 0;

        return {
          date: formattedDate,
          time: formattedTime,
          pair: String(row[itemKey]).toUpperCase().trim(),
          dir: (type.includes('buy') || type.includes('long') || type.includes('in')) ? 'Long' : 'Short',
          lot: cleanMoney(row[volumeKey!] || '0.01'),
          entry: cleanMoney(row[openPriceKey!] || '0'),
          exit: cleanMoney(row[exitPriceKey!] || row[openPriceKey!] || '0'), 
          sl: sl || null,
          tp: tp || null,
          pnl: profit,
          currency: displayCurrency,
          result: profit > 0.0001 ? 'win' : (profit < -0.0001 ? 'loss' : 'be'),
          setup: aiMapping ? 'AI Smart Import' : 'MT5 Import',
          session: 'London',
          emotion: 'Neutral',
          notes: `${row[notesKey!] || ''} (MT5 ticket ${row[ticketKey || ''] || 'N/A'})`.trim(),
          news: 'no',
          plan: 'yes',
          ss: '',
          dur: '',
          reason: 'MT5 History Export'
        };
      })
      .filter(Boolean);

    finalizeImport(validTrades);
  };

  const handleAiSmartFix = async () => {
    if (!rawRowsForAI) return;
    setIsAiProcessing(true);
    const mapping = await aiSmartParse(rawRowsForAI.slice(0, 8));
    if (mapping) {
      await processParsedData(rawRowsForAI, mapping);
    } else {
      alert("AI could not determine a better mapping.");
    }
    setIsAiProcessing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    
    // Support XLSX
    if (file.name.endsWith('.xlsx')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        let rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Find header row in Excel
        let headerIndex = -1;
        const keyWords = ['symbol', 'item', 'type', 'profit', 'time'];
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          const rowText = rows[i].join(' ').toLowerCase();
          let matches = 0;
          keyWords.forEach(kw => { if (rowText.includes(kw)) matches++; });
          if (matches >= 3) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex !== -1) {
          const headers = rows[headerIndex];
          const rawData = rows.slice(headerIndex + 1).map(row => {
            const obj: any = {};
            headers.forEach((h: any, idx: number) => {
              obj[h] = row[idx];
            });
            return obj;
          });

          // Optional: Use AI to help with mapping if user wants or if it's very messy
          // For now, let's try auto-mapping first
          setRawRowsForAI(rawData);
          processParsedData(rawData);
        } else {
          alert("Could not find headers in Excel file.");
          setIsParsing(false);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      // Check if it's an HTML file (MT5 default export)
      if (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'text/html');
          const rows = Array.from(doc.querySelectorAll('tr'));
          
          if (rows.length === 0) throw new Error("No table rows found");

          // Find the header row to map columns
          let headerRowIndex = -1;
          const searchTerms = ['symbol', 'type', 'volume', 'price', 'profit'];
          
          for (let i = 0; i < Math.min(rows.length, 50); i++) {
            const text = rows[i].textContent?.toLowerCase() || '';
            let matches = 0;
            searchTerms.forEach(term => { if (text.includes(term)) matches++; });
            if (matches >= 3) {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex === -1) {
            alert("Could not find trade table in this HTML file. Make sure you exported the 'History' report.");
            setIsParsing(false);
            return;
          }

          const headers = Array.from(rows[headerRowIndex].cells).map(c => c.textContent?.trim().toLowerCase() || '');
          const dataRows = rows.slice(headerRowIndex + 1);

          const validTrades = dataRows.map(row => {
            const cells = Array.from(row.cells).map(c => c.textContent?.trim() || '');
            if (cells.length < headers.length) return null;

            const getAllIndices = (terms: string[]) => {
              const indices: number[] = [];
              headers.forEach((h, i) => {
                if (terms.some(t => h.includes(t))) indices.push(i);
              });
              return indices;
            };

            const getVal = (terms: string[], last = false) => {
              const idxs = getAllIndices(terms);
              if (idxs.length === 0) return null;
              const idx = last ? idxs[idxs.length - 1] : idxs[0];
              return cells[idx] || null;
            };

            const symbol = getVal(['symbol', 'item']);
            const typeValue = getVal(['type'])?.toLowerCase() || '';
            const profitStr = getVal(['profit', 'p/l'], true); // Usually the last column
            const commissionStr = getVal(['commission']);
            const swapStr = getVal(['swap']);
            const timeStr = getVal(['time', 'date']); // Entry time
            const volume = getVal(['volume', 'size', 'lot']);
            const entryPrice = getVal(['price']); // First Price column
            const exitPrice = getVal(['price'], true); // Last Price column
            const slStr = getVal(['s / l', 'sl', 'stop loss', 's/l']);
            const tpStr = getVal(['t / p', 'tp', 'take profit', 't/p']);

            if (!symbol || !typeValue || !profitStr) return null;
            if (typeValue.includes('balance') || typeValue.includes('deposit') || typeValue.includes('withdrawal') || typeValue.includes('credit')) return null;

            // Robust money parsing
            const profitValue = cleanMoney(profitStr);
            const commission = cleanMoney(commissionStr || '0');
            const swap = cleanMoney(swapStr || '0');
            const netProfit = profitValue + commission + swap;

            const dateMatch = timeStr?.match(/(\d{4})[./-](\d{2})[./-](\d{2})/) || 
                             timeStr?.match(/(\d{2})[./-](\d{2})[./-](\d{4})/);
            
            let formattedDate = new Date().toISOString().split('T')[0];
            if (dateMatch) {
              const [_, p1, p2, p3] = dateMatch;
              if (p1.length === 4) {
                formattedDate = `${p1}-${p2}-${p3}`;
              } else if (p3.length === 4) {
                formattedDate = `${p3}-${p2}-${p1}`;
              }
            }

            const timeMatch = timeStr?.match(/(\d{2}):(\d{2}):(\d{2})/) || timeStr?.match(/(\d{2}):(\d{2})/);
            const formattedTime = timeMatch ? timeMatch[0] : new Date().toTimeString().slice(0, 5);

            const sl = slStr ? cleanMoney(slStr) : 0;
            const tp = tpStr ? cleanMoney(tpStr) : 0;

            return {
              date: formattedDate,
              time: formattedTime,
              pair: symbol.toUpperCase().trim(),
              dir: (typeValue.includes('buy') || typeValue.includes('long')) ? 'Long' : 'Short',
              lot: cleanMoney(volume || '0.01'),
              entry: cleanMoney(entryPrice || '0'),
              exit: cleanMoney(exitPrice || entryPrice || '0'),
              sl: sl || null,
              tp: tp || null,
              pnl: netProfit,
              currency: displayCurrency,
              result: netProfit > 0.0001 ? 'win' : (netProfit < -0.0001 ? 'loss' : 'be'),
              setup: 'MT5 HTML Import',
              session: 'London',
              emotion: 'Neutral',
              notes: `${getVal(['comment', 'notes']) || ''} (MT5 Import)`.trim(),
              news: 'no',
              plan: 'yes',
              ss: '',
              dur: '',
              reason: 'MT5 History Export'
            };
          }).filter(Boolean);

          finalizeImport(validTrades);
          return; // STOP HERE if it was HTML
        } catch (err) {
          console.error("HTML Parse Error:", err);
          alert("Failed to parse the MT5 HTML file. Try exporting as CSV if this persists.");
          setIsParsing(false);
          return;
        }
      }

      // Default CSV Parsing (Previous logic)
      const lines = content.split(/\r?\n/);
      let headerIndex = -1;
      const keyWords = ['symbol', 'item', 'type', 'profit', 'time'];
      
      for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const line = lines[i].toLowerCase();
        let matches = 0;
        keyWords.forEach(kw => { if (line.includes(kw)) matches++; });
        if (matches >= 3) {
          headerIndex = i;
          break;
        }
      }

      const csvData = headerIndex !== -1 ? lines.slice(headerIndex).join('\n') : content;

      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          setRawRowsForAI(results.data as any[]);
          processParsedData(results.data as any[]);
        },
        error: (err) => {
          console.error("CSV Parse Error:", err);
          setIsParsing(false);
          alert("Could not parse file. Please ensure it is a valid CSV.");
        }
      });
    };

    reader.onerror = () => {
      setIsParsing(false);
      alert("Error reading file.");
    };

    // Try reading as UTF-8 first, then potentially UTF-16LE if it looks messy
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const selectedTrades = importedData.filter((_, i) => selectedIndices.includes(i));
    if (selectedTrades.length === 0) return;
    setIsImporting(true);
    try {
      await onImport(selectedTrades);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal onClose={onClose} title="MT5 CSV Importer" showFooter={false}>
      <div className="space-y-6">
        <div className="bg-spotify-card border border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
          <div className="bg-spotify-green/20 p-4 rounded-full mb-4">
            <Upload size={32} className="text-spotify-green" />
          </div>
          <h4 className="text-sm font-bold text-white mb-2">Upload your MetaTrader 5 Report</h4>
          <p className="text-[10px] text-spotify-muted mb-6 max-w-[300px]">Export history from MT5 as CSV, Excel (.xlsx), or HTML. This tool automatically cleans up headers and summary rows.</p>
          <input 
            type="file" 
            accept=".csv,.html,.htm,.xlsx" 
            onChange={handleFileUpload}
            className="block w-full text-[10px] text-spotify-muted file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0 file:text-[10px] file:font-extrabold file:bg-spotify-green file:text-spotify-darker file:uppercase file:tracking-widest cursor-pointer"
          />
        </div>

        {isParsing && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 size={24} className="text-spotify-green animate-spin" />
            <p className="text-[10px] font-bold text-spotify-muted uppercase tracking-widest">Clearing the mess...</p>
          </div>
        )}

        {rawRowsForAI && !isParsing && (
          <div className="bg-spotify-green/10 border border-spotify-green/20 p-4 rounded-xl flex items-center justify-between">
            <div>
              <h5 className="text-xs font-bold text-spotify-green flex items-center gap-2">
                <Sparkles size={14} />
                AI Smart Reader
              </h5>
              <p className="text-[10px] text-spotify-muted">Import looking messy? Our AI can accurately map your MT5 report columns.</p>
            </div>
            <button 
              onClick={handleAiSmartFix}
              disabled={isAiProcessing}
              className="bg-spotify-green text-spotify-darker text-[10px] font-extrabold uppercase tracking-widest px-4 py-2 rounded-full hover:scale-105 transition-all disabled:opacity-50"
            >
              {isAiProcessing ? 'Thinking...' : 'AI Fix Mapping'}
            </button>
          </div>
        )}

        {importedData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-spotify-muted">
                Extracted Trades ({selectedIndices.length}/{importedData.length})
              </h5>
              <button 
                onClick={() => setSelectedIndices(selectedIndices.length === importedData.length ? [] : importedData.map((_, i) => i))}
                className="text-[10px] font-bold text-spotify-green hover:underline"
              >
                {selectedIndices.length === importedData.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-white/5 bg-white/[0.02]">
              <table className="w-full text-left text-[10px]">
                <thead className="sticky top-0 bg-spotify-darker border-b border-white/5">
                  <tr className="text-spotify-muted uppercase tracking-widest font-bold">
                    <th className="p-3 w-8"></th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Pair</th>
                    <th className="p-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {importedData.map((t, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <input 
                          type="checkbox" 
                          checked={selectedIndices.includes(i)}
                          onChange={() => setSelectedIndices(prev => prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i])}
                          className="accent-spotify-green w-4 h-4 rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-spotify-muted font-mono">{t.date}</td>
                      <td className="p-3 font-bold">{t.pair} <span className="opacity-50 mx-1">|</span> {t.dir}</td>
                      <td className={`p-3 text-right font-bold ${t.pnl > 0 ? 'text-spotify-green' : 'text-red-500'}`}>
                        {formatCurrency(convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', displayCurrency), displayCurrency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button 
              onClick={handleImport}
              disabled={selectedIndices.length === 0 || isImporting}
              className="w-full bg-spotify-green disabled:opacity-30 disabled:cursor-not-allowed text-spotify-darker font-extrabold uppercase tracking-widest text-[11px] py-4 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {isImporting ? 'Syncing with Firestore...' : `Confirm Import (${selectedIndices.length} items)`}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function BulkEditModal({ isOpen, onClose, onSave, count }: any) {
  const [setup, setSetup] = useState('');
  const [emotion, setEmotion] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  return (
    <Modal title={`Bulk Edit ${count} Trades`} onClose={onClose}>
      <div className="space-y-6">
        <div className="bg-spotify-green/5 border border-spotify-green/10 p-4 rounded-xl">
          <p className="text-[10px] font-bold text-spotify-green uppercase tracking-widest text-center">Batch Processing Enabled</p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-spotify-muted">Trading Setup</label>
          <select 
            value={setup} 
            onChange={(e) => setSetup(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-spotify-green transition-colors outline-none"
          >
            <option value="">Leave unchanged</option>
            <option value="MSS + FVG">MSS + FVG</option>
            <option value="OB + SMT">OB + SMT</option>
            <option value="Silver Bullet">Silver Bullet</option>
            <option value="London Open Sweep">London Open Sweep</option>
            <option value="NY PM Session">NY PM Session</option>
            <option value="Revenge Trade">Revenge Trade (Fix me!)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-spotify-muted">Trading Emotion</label>
          <select 
            value={emotion} 
            onChange={(e) => setEmotion(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-spotify-green transition-colors outline-none"
          >
            <option value="">Leave unchanged</option>
            <option value="Calm / Confident">Calm / Confident</option>
            <option value="Felt Greedy">Felt Greedy</option>
            <option value="Anxious / Scared">Anxious / Scared</option>
            <option value="FOMO Entry">FOMO Entry</option>
            <option value="Revenge Mood">Revenge Mood</option>
            <option value="Bored / Impatient">Bored / Impatient</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-spotify-muted">Common Notes</label>
          <textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Updating these notes will overwrite existing notes for all selected trades."
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm min-h-[100px] focus:border-spotify-green transition-colors outline-none font-medium"
          />
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => {
              const updates: any = {};
              if (setup) updates.setup = setup;
              if (emotion) updates.emotion = emotion;
              if (notes) updates.notes = notes;
              
              if (Object.keys(updates).length > 0) {
                if (window.confirm(`Are you sure you want to update ${count} trades? This action is permanent.`)) {
                  onSave(updates);
                }
              } else {
                onClose();
              }
            }}
            className="flex-1 bg-spotify-green text-spotify-darker font-black uppercase tracking-[0.2em] text-[11px] py-4 rounded-full hover:scale-[1.02] active:scale-98 transition-all"
          >
            Apply to {count} Trades
          </button>
        </div>
      </div>
    </Modal>
  );
}

function HabitsPage({ trades, displayCurrency }: any) {
  // Logic is now calculated in AnalyticsPage and passed? No, calculate it here or in App and pass down.
  // Actually I'll move it back to App and pass it everywhere for consistency.
  // Let's do that in a follow-up. For now, keep it here but reference the enhanced object.
  const habitStats = useMemo(() => {
    if (trades.length === 0) return null;

    // 1. Plan Adherence
    const planTrades = trades.filter((t: any) => t.plan === 'yes' || t.plan === 'partial');
    const adherenceScore = Math.round((planTrades.length / trades.length) * 100);

    // 2. Risk Consistency 
    const risks = trades.map((t: any) => parseFloat(t.riskPercent || '0'));
    const avgRisk = risks.reduce((a, b) => a + b, 0) / (risks.length || 1);
    const riskDev = Math.sqrt(risks.map(x => Math.pow(x - avgRisk, 2)).reduce((a, b) => a + b, 0) / (risks.length || 1));
    const riskScore = Math.max(0, Math.min(100, 100 - Math.round(riskDev * 50)));

    // 3. Behavioral Streak
    let currentStreak = 0;
    const sortedTrades = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const t of sortedTrades) {
      if (t.plan === 'yes') currentStreak++;
      else break;
    }

    // 4. Performance Vector 
    const wins = trades.filter((t: any) => cleanMoney(t.pnl) > 0);
    const winRate = wins.length / trades.length;
    
    // R:R Analysis
    const rrs = trades.filter((t: any) => {
      const e = cleanMoney(t.entry);
      const s = cleanMoney(t.sl);
      return e > 0 && s > 0 && e !== s;
    }).map((t: any) => {
      const e = cleanMoney(t.entry);
      const x = cleanMoney(t.exit);
      const s = cleanMoney(t.sl);
      return Math.abs(x - e) / Math.abs(e - s);
    });
    const avgRR = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 1;

    // Projection Utility
    const winTrades = trades.filter((t: any) => cleanMoney(t.pnl) > 0);
    const lossTrades = trades.filter((t: any) => cleanMoney(t.pnl) < 0);
    const avgWin = winTrades.length > 0 ? winTrades.reduce((a, b) => a + cleanMoney(b.pnl), 0) / winTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? Math.abs(lossTrades.reduce((a, b) => a + cleanMoney(b.pnl), 0) / lossTrades.length) : 0;
    const expectedValue = (avgWin * winRate) - (avgLoss * (1 - winRate));
    
    const currentBalance = trades.reduce((acc: number, t: any) => acc + convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', 'USD'), 0);
    const projectionData = Array.from({ length: 13 }, (_, i) => ({
      month: `M${i}`,
      projected: currentBalance + (expectedValue * i * 20)
    }));

    const overallScore = Math.round((adherenceScore + riskScore + (winRate * 100)) / 3);

    let persona = "The Novice";
    let personaDesc = "You are just starting. Focus on sticking to your plan above all else.";
    let level = "Lvl 1 - Conscious Incompetence";
    
    if (overallScore > 85) {
      persona = "The Sniper";
      personaDesc = "Elite discipline and exceptional risk management. You are on the path to master-level trading.";
      level = "Lvl 4 - Unconscious Competence";
    } else if (overallScore > 70) {
      persona = "The Specialist";
      personaDesc = "Consistent and steady. You have a solid grasp of your edge, keep fine-tuning.";
      level = "Lvl 3 - Conscious Competence";
    } else if (overallScore > 50) {
      persona = "The Tactician";
      personaDesc = "You have the tools but lack consistency. Discipline is your only bottleneck.";
      level = "Lvl 2 - Conscious Development";
    }

    return { 
      adherenceScore, riskScore, winRate, overallScore, 
      persona, personaDesc, level, projectionData, 
      avgRR, currentStreak 
    };
  }, [trades]);

  if (!habitStats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Brain size={48} className="text-spotify-muted mb-4 opacity-20" />
        <h2 className="text-xl font-black text-white mb-2">Not Enough Data</h2>
        <p className="text-spotify-muted text-sm max-w-xs">Log at least one trade to see your habit analysis and future projection.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase text-spotify-green tracking-[0.3em] mb-1">{habitStats.level}</p>
          <h2 className="text-4xl font-black text-white tracking-tighter">{habitStats.persona}</h2>
          <p className="text-spotify-muted text-sm mt-1 max-w-md">{habitStats.personaDesc}</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-white/5 px-6 py-4 rounded-2xl border border-white/5 text-center">
            <p className="text-[10px] font-black uppercase text-spotify-muted tracking-widest mb-1">Discipline Score</p>
            <p className={`text-4xl font-black ${habitStats.overallScore > 70 ? 'text-spotify-green' : habitStats.overallScore > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
              {habitStats.overallScore}%
            </p>
          </div>
          <div className="bg-spotify-green/10 px-6 py-4 rounded-2xl border border-spotify-green/20 text-center">
            <p className="text-[10px] font-black uppercase text-spotify-green tracking-widest mb-1">Rule Streak</p>
            <p className="text-4xl font-black text-white flex items-center justify-center gap-2">
              <Zap size={24} className="text-spotify-green" fill="currentColor" />
              {habitStats.currentStreak}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        {[
          { id: 1, name: 'Conscious Incompetence', icon: '🌑', goal: 'Follow a Plan' },
          { id: 2, name: 'Conscious Development', icon: '🌗', goal: 'Manage Risk' },
          { id: 3, name: 'Conscious Competence', icon: '🌕', goal: 'Consistency' },
          { id: 4, name: 'Unconscious Competence', icon: '✨', goal: 'Scaling' }
        ].map((stage) => {
          const stageId = stage.id;
          const currentLevelId = parseInt(habitStats.level.match(/Lvl (\d+)/)?.[1] || '0');
          const isActive = currentLevelId === stageId;
          const isPast = currentLevelId > stageId;
          
          return (
            <div key={stageId} className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${isActive ? 'bg-spotify-green text-black border-spotify-green' : isPast ? 'bg-white/10 border-white/10 opacity-60' : 'bg-white/5 border-white/5 opacity-30'}`}>
              {isActive && (
                <div className="absolute top-0 right-0 p-2 opacity-20">
                  <Target size={40} />
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-xl">{stage.icon}</span>
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Stage 0{stage.id}</p>
                  <p className="text-[10px] font-black truncate">{stage.name}</p>
                  <p className="text-[9px] font-bold opacity-60 mt-0.5">Focus: {stage.goal}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-spotify-card p-8 rounded-2xl border border-white/5">
          <h3 className="text-xl font-black text-white tracking-tight mb-6 flex items-center gap-2">
            <BookOpen size={20} className="text-spotify-green" /> Path to {habitStats.overallScore >= 85 ? 'System Mastery' : 'Next Level'}
          </h3>
          <div className="space-y-6">
            {[
              { 
                label: 'Discipline', 
                score: habitStats.adherenceScore, 
                advice: habitStats.adherenceScore < 80 ? 'You are straying from your rules. Stick to "Plan: Yes" for the next 5 trades.' : 'Exceptional focus. Your rules are your edge.'
              },
              { 
                label: 'Risk Control', 
                score: habitStats.riskScore, 
                advice: habitStats.riskScore < 70 ? 'Risk per trade is volatile. Aim for ±10% deviation only.' : 'Rock solid sizing. This prevents emotional sabotage.'
              },
              { 
                label: 'Psychology', 
                score: Math.min(100, Math.round((habitStats.currentStreak / 10) * 100)), 
                advice: habitStats.currentStreak < 3 ? 'You are in a "Revenge" or "Frustration" zone. Reset your mind.' : `On a ${habitStats.currentStreak} trade rule-following streak! Keep going.`
              }
            ].map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-spotify-muted">{item.label}</span>
                  <span className={`text-sm font-black ${item.score > 70 ? 'text-spotify-green' : item.score > 40 ? 'text-yellow-500' : 'text-red-500'}`}>{item.score}%</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${item.score > 70 ? 'bg-spotify-green' : item.score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${item.score}%` }} />
                </div>
                <p className="text-[10px] text-spotify-muted leading-relaxed font-bold italic">{item.advice}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-spotify-card p-8 rounded-2xl border border-white/5">
          <h3 className="text-xl font-black text-white tracking-tight mb-6 flex items-center gap-2">
            <Zap size={20} className="text-spotify-green" /> Daily Habit Objective
          </h3>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/5 flex items-start gap-4 mb-4">
             <div className="p-3 bg-spotify-green/20 rounded-xl">
               <Target size={24} className="text-spotify-green" />
             </div>
             <div>
               <p className="text-[10px] font-black uppercase text-spotify-green tracking-widest mb-1">Current Quest</p>
               <h4 className="text-lg font-black text-white tracking-tight">
                 {habitStats.persona === 'The Novice' ? 'The Protocol Guard' : habitStats.persona === 'The Tactician' ? 'Risk Equalizer' : 'Scaling Efficiency'}
               </h4>
               <p className="text-xs text-spotify-muted font-bold mt-1">
                 {habitStats.persona === 'The Novice' && 'Log 5 trades in a row where "Followed Plan" is marked as YES.'}
                 {habitStats.persona === 'The Tactician' && 'Maintain a standard deviation of less than 0.2% on your risk size.'}
                 {habitStats.persona === 'The Specialist' && 'Avoid trading during news sessions for the next 48 hours.'}
                 {habitStats.persona === 'The Sniper' && 'Identify one "A+" setup per day and ignore everything else.'}
               </p>
             </div>
          </div>
          <p className="text-[10px] text-spotify-muted font-black uppercase tracking-[0.2em] mt-8 mb-4">Milestone Tracker</p>
          <div className="space-y-3">
             <div className="flex items-center gap-3 group">
                <div className={`w-2 h-2 rounded-full ${habitStats.adherenceScore >= 90 ? 'bg-spotify-green shadow-[0_0_10px_rgba(29,185,84,0.5)]' : 'bg-white/10'}`} />
                <span className={`text-[11px] font-bold ${habitStats.adherenceScore >= 90 ? 'text-white' : 'text-spotify-muted'}`}>90% Rule Adherence</span>
             </div>
             <div className="flex items-center gap-3 group">
                <div className={`w-2 h-2 rounded-full ${habitStats.currentStreak >= 10 ? 'bg-spotify-green shadow-[0_0_10px_rgba(29,185,84,0.5)]' : 'bg-white/10'}`} />
                <span className={`text-[11px] font-bold ${habitStats.currentStreak >= 10 ? 'text-white' : 'text-spotify-muted'}`}>10x Discipline Streak</span>
             </div>
             <div className="flex items-center gap-3 group">
                <div className={`w-2 h-2 rounded-full ${habitStats.overallScore >= 80 ? 'bg-spotify-green shadow-[0_0_10px_rgba(29,185,84,0.5)]' : 'bg-white/10'}`} />
                <span className={`text-[11px] font-bold ${habitStats.overallScore >= 80 ? 'text-white' : 'text-spotify-muted'}`}>Tier 4 Archetype Achievement</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-spotify-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-spotify-muted tracking-widest">Plan Adherence</h3>
            <span className="text-xs font-black text-white">{habitStats.adherenceScore}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${habitStats.adherenceScore}%` }}
              className="h-full bg-spotify-green"
            />
          </div>
          <p className="text-[10px] text-spotify-muted font-bold leading-relaxed italic">Measure of how often you follow your pre-defined rules.</p>
        </div>

        <div className="bg-spotify-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-spotify-muted tracking-widest">Risk Stability</h3>
            <span className="text-xs font-black text-white">{habitStats.riskScore}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${habitStats.riskScore}%` }}
              className="h-full bg-white"
            />
          </div>
          <p className="text-[10px] text-spotify-muted font-bold leading-relaxed italic">Measures how consistently you size your positions.</p>
        </div>

        <div className="bg-spotify-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-spotify-muted tracking-widest">Edge Efficiency</h3>
            <span className="text-xs font-black text-white">{Math.round(habitStats.winRate * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${habitStats.winRate * 100}%` }}
              className="h-full bg-spotify-green/50"
            />
          </div>
          <p className="text-[10px] text-spotify-muted font-bold leading-relaxed italic">Probability of your strategy resulting in a win.</p>
        </div>
      </div>

      <div className="bg-spotify-card rounded-2xl border border-white/5 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">12-Month Equity Projection</h3>
            <p className="text-xs text-spotify-muted font-bold">Estimated growth if current habits remain unchanged</p>
          </div>
          <div className="md:text-right">
            <p className="text-[10px] font-black uppercase text-spotify-muted tracking-widest mb-1">Projected End Balance</p>
            <p className="text-2xl font-black text-spotify-green tracking-tighter">
              {formatCurrency(convertCurrency(habitStats.projectionData[12].projected, 'USD', displayCurrency), displayCurrency)}
            </p>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={habitStats.projectionData}>
              <defs>
                <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1DB954" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#1DB954" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
                tickFormatter={(val) => formatCurrency(convertCurrency(val, 'USD', displayCurrency), displayCurrency)}
              />
              <Tooltip 
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-black/90 border border-white/10 p-3 rounded-lg backdrop-blur-xl">
                        <p className="text-[10px] font-black text-spotify-muted uppercase mb-2">{data.month}</p>
                        <p className="text-sm font-black text-white">
                          {formatCurrency(convertCurrency(data.projected, 'USD', displayCurrency), displayCurrency)}
                        </p>
                        <p className="text-[9px] font-bold text-spotify-green mt-1">ESTIMATED POSITION</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="projected" 
                stroke="#1DB954" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorProj)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white/5 p-4 rounded-xl border border-white/5">
            <h4 className="text-[10px] font-black uppercase text-spotify-muted tracking-widest mb-2 flex items-center gap-2">
              <Zap size={12} className="text-spotify-green" /> Probability Filter
            </h4>
            <p className="text-xs text-white/70 font-medium leading-relaxed">
              Based on your expected value per trade. 
              The system assumes a volume of 20 trades per month maintaining current win rate and RR.
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded-xl border border-white/5">
            <h4 className="text-[10px] font-black uppercase text-spotify-muted tracking-widest mb-2 flex items-center gap-2">
              <TrendingUp size={12} className="text-spotify-green" /> Strategy Feedback
            </h4>
            <p className="text-xs text-white/70 font-medium leading-relaxed">
              Your average RR of <span className="text-white font-black">1:{habitStats.avgRR.toFixed(2)}</span> suggests you should focus on letting winners run longer to accelerate equity growth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryPage({ trades, filter, setFilter, startDate, setStartDate, endDate, setEndDate, onTradeClick, onDelete, onBulkDelete, onBulkUpdate, onImportOpen, displayCurrency, setIsEditingTrade }: any) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const filteredTrades = useMemo(() => {
    let result = trades;

    // Filter by search term (pair, setup, notes, tags)
    if (search) {
      const term = search.toLowerCase();
      result = result.filter((t: any) => 
        t.pair?.toLowerCase().includes(term) ||
        t.setup?.toLowerCase().includes(term) ||
        t.notes?.toLowerCase().includes(term) ||
        (Array.isArray(t.tags) ? t.tags.some((tag: string) => tag.toLowerCase().includes(term)) : t.tags?.toLowerCase?.().includes?.(term))
      );
    }

    // Filter by type/direction
    if (filter === 'win') result = result.filter((t: any) => t.result === 'win');
    else if (filter === 'loss') result = result.filter((t: any) => t.result === 'loss');
    else if (filter === 'short') result = result.filter((t: any) => t.dir === 'Short');
    else if (filter === 'long') result = result.filter((t: any) => t.dir === 'Long');

    // Filter by date range
    if (startDate) {
      result = result.filter((t: any) => t.date >= startDate);
    }
    if (endDate) {
      result = result.filter((t: any) => t.date <= endDate);
    }

    return result;
  }, [trades, filter, startDate, endDate, search]);

  const avgPerformance = useMemo(() => {
    const wins = trades.filter((t: any) => t.result === 'win').map((t: any) => Math.abs(convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', 'USD')));
    const losses = trades.filter((t: any) => t.result === 'loss').map((t: any) => Math.abs(convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', 'USD')));
    
    return {
      win: wins.length ? (wins.reduce((a, b) => a + b, 0) / wins.length) : 1,
      loss: losses.length ? (losses.reduce((a, b) => a + b, 0) / losses.length) : 1
    };
  }, [trades]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTrades.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTrades.map((t: any) => t.id));
    }
  };

  const toggleSelectTrade = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    await onBulkDelete(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-1">Trade <span className="italic text-spotify-green">History</span></h1>
          <p className="text-xs font-medium text-spotify-muted tracking-tight">Click any row for full technical breakdown.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center">
          <div className="w-full sm:w-auto relative group">
            <input 
              type="text"
              placeholder="Search pairs, setups, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-full py-3 pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-spotify-green focus:bg-white/[0.08] transition-all"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-spotify-muted group-focus-within:text-spotify-green transition-colors">
              <Sparkles size={14} />
            </div>
          </div>

          <button 
            onClick={onImportOpen}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-spotify-green text-spotify-darker font-extrabold uppercase tracking-widest text-[10px] px-6 py-3 rounded-full hover:scale-105 transition-all"
          >
            <Upload size={14} />
            MT5 Import
          </button>

          {selectedIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-full shadow-2xl"
            >
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-spotify-muted whitespace-nowrap">{selectedIds.length} selected</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsBulkEditOpen(true)}
                  className="bg-spotify-green text-black text-[10px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full hover:scale-105 transition-all"
                >
                  Edit
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="bg-red-500/20 text-red-500 border border-red-500/30 text-[10px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full hover:bg-red-500 hover:text-white transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          )}

          <div className="w-full sm:w-auto flex gap-2 bg-white/5 p-4 rounded-xl border border-white/5 justify-between">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-extrabold uppercase text-spotify-muted/50 tracking-widest ml-1 text-nowrap">Start Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-0 text-white text-xs font-bold outline-none cursor-pointer focus:text-spotify-green transition-colors w-full"
              />
            </div>
            <div className="w-[1px] bg-white/10 mx-2" />
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-extrabold uppercase text-spotify-muted/50 tracking-widest ml-1 text-nowrap">End Date</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-0 text-white text-xs font-bold outline-none cursor-pointer focus:text-spotify-green transition-colors w-full"
              />
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="ml-2 p-1 text-spotify-muted hover:text-white transition-colors"
                title="Clear Dates"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="w-full sm:w-auto flex gap-1 bg-white/5 p-1 rounded-full border border-white/5 overflow-x-auto no-scrollbar">
            {['all', 'win', 'loss', 'short', 'long'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest transition-all whitespace-nowrap flex-1 sm:flex-none ${
                  filter === f ? 'bg-white text-black' : 'text-spotify-muted hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-spotify-card rounded-lg overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-spotify-muted">{filteredTrades.length} Trade{filteredTrades.length !== 1 ? 's' : ''}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] md:text-[10px] uppercase tracking-widest text-spotify-muted border-b border-white/5 bg-white/[0.02]">
                <th className="px-3 md:px-5 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={filteredTrades.length > 0 && selectedIds.length === filteredTrades.length}
                    onChange={toggleSelectAll}
                    className="accent-spotify-green w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-3 md:px-5 py-4 font-bold">Date</th>
                <th className="px-3 md:px-5 py-4 font-bold">Pair</th>
                <th className="px-3 md:px-5 py-4 font-bold hidden sm:table-cell text-center">Lot</th>
                <th className="px-3 md:px-5 py-4 font-bold hidden sm:table-cell">Dir</th>
                <th className="px-3 md:px-5 py-4 font-bold hidden md:table-cell">Setup</th>
                <th className="px-3 md:px-5 py-4 font-bold hidden sm:table-cell text-right">Entry</th>
                <th className="px-3 md:px-5 py-4 font-bold hidden sm:table-cell text-right">Exit</th>
                <th className="px-3 md:px-5 py-4 font-bold text-right">P&L</th>
                <th className="px-3 md:px-5 py-4 font-bold text-center">Result</th>
                <th className="px-3 md:px-5 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((t: Trade) => (
                <tr 
                  key={t.id} 
                  onClick={() => onTradeClick(t)} 
                  className={`group hover:bg-white/5 cursor-pointer transition-colors border-b border-white/[0.03] last:border-0 ${selectedIds.includes(t.id) ? 'bg-white/[0.03]' : ''}`}
                >
                  <td className="px-3 md:px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(t.id)}
                      onChange={(e) => toggleSelectTrade(t.id, e as any)}
                      className="accent-spotify-green w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 md:px-5 py-4 text-[10px] md:text-xs font-mono text-spotify-muted">{t.date}</td>
                  <td className="px-3 md:px-5 py-4 text-[10px] md:text-xs font-bold">{t.pair}</td>
                  <td className="px-3 md:px-5 py-4 hidden sm:table-cell text-center">
                    <span className="text-[10px] font-mono text-white/60">{t.lot || '0.00'}</span>
                  </td>
                  <td className="px-3 md:px-5 py-4 hidden sm:table-cell">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] ${t.dir === 'Long' ? 'bg-spotify-green/10 text-spotify-green' : 'bg-red-500/10 text-red-500'}`}>
                      {t.dir}
                    </span>
                  </td>
                  <td className="px-3 md:px-5 py-4 hidden md:table-cell">
                    <div className="text-[11px] font-medium text-spotify-muted max-w-[120px] truncate group-hover:text-white transition-colors">{t.setup}</div>
                  </td>
                  <td className="px-3 md:px-5 py-4 text-[10px] font-mono text-right hidden sm:table-cell opacity-60">{formatNum(t.entry)}</td>
                  <td className="px-3 md:px-5 py-4 text-[10px] font-mono text-right hidden sm:table-cell opacity-60">{formatNum(t.exit)}</td>
                  <td className="px-3 md:px-5 py-4 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] md:text-xs font-mono font-bold ${t.pnl >= 0 ? 'text-spotify-green' : 'text-red-500'}`}>
                        {t.pnl >= 0 ? '+' : ''}{formatCurrency(convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', displayCurrency), displayCurrency)}
                      </span>
                      <div className="w-12 md:w-16 h-1 bg-white/[0.03] rounded-full overflow-hidden flex justify-end">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ${t.pnl >= 0 ? 'bg-spotify-green' : 'bg-red-500 opacity-60'}`}
                          style={{ 
                            width: `${Math.min(100, (Math.abs(convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', 'USD')) / (t.pnl >= 0 ? avgPerformance.win : avgPerformance.loss)) * 50)}%` 
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 md:px-5 py-4 text-center">
                    <span className={`text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-tighter ${
                      t.result === 'win' ? 'bg-spotify-green text-black shadow-[0_0_10px_rgba(29,185,84,0.3)]' : t.result === 'loss' ? 'bg-red-500 text-white' : 'bg-white/10 text-white'
                    }`}>
                      {t.result}
                    </span>
                  </td>
                  <td className="px-3 md:px-5 py-4 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onTradeClick(t); setIsEditingTrade?.(true); }}
                      className="p-2 text-spotify-muted hover:text-spotify-green hover:bg-spotify-green/10 rounded-full transition-all"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                      className="p-2 text-spotify-muted hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTrades.length === 0 && (
             <div className="p-32 text-center text-spotify-muted opacity-50">
              <p className="text-sm font-bold mb-1">No trades matching filter</p>
              <p className="text-xs font-medium uppercase tracking-[0.2em]">End of file</p>
            </div>
          )}
        </div>
      </div>

      <BulkEditModal 
        isOpen={isBulkEditOpen} 
        onClose={() => setIsBulkEditOpen(false)} 
        onSave={(updates: any) => {
          onBulkUpdate(selectedIds, updates);
          setIsBulkEditOpen(false);
          setSelectedIds([]);
        }}
        count={selectedIds.length}
      />
    </div>
  );
}

function CalendarPage({ trades, displayCurrency }: any) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<any>(null);
  
  const monthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const startOffset = (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1); // Mon-based
  
  const monthKey = viewDate.toISOString().slice(0, 7);
  const monthTrades = trades.filter((t: any) => t.date.startsWith(monthKey));
  const monthUsdPnl = monthTrades.reduce((s: number, t: any) => s + convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', 'USD'), 0);

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1));

  const days = useMemo(() => {
    const arr = [];
    // Prev month padding
    const prevMonthDays = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate();
    for(let i = startOffset - 1; i >= 0; i--) {
      arr.push({ day: prevMonthDays - i, current: false });
    }
    // Current month
    for(let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${monthKey}-${i.toString().padStart(2, '0')}`;
      const dayTrades = trades.filter((t: any) => t.date === dateStr);
      const usdPnl = dayTrades.reduce((s: number, t: any) => s + convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', 'USD'), 0);
      arr.push({ day: i, current: true, date: dateStr, trades: dayTrades, pnl: usdPnl });
    }
    // Next month padding
    const totalCells = Math.ceil(arr.length / 7) * 7;
    const padding = totalCells - arr.length;
    for(let i = 1; i <= padding; i++) {
      arr.push({ day: i, current: false });
    }
    return arr;
  }, [viewDate, trades, monthKey, startOffset, daysInMonth]);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-1">P&L <span className="italic text-spotify-green">Calendar</span></h1>
          <p className="text-xs font-medium text-spotify-muted tracking-tight">Visualize your profitability across the timeline.</p>
        </div>
      </div>

      <div className="bg-spotify-card rounded-xl overflow-hidden shadow-2xl border border-white/5">
        <div className="p-4 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-1 md:gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-full text-spotify-muted transition-colors"><ChevronLeft size={20}/></button>
            <h2 className="text-sm md:text-lg font-black tracking-tighter w-40 text-center uppercase">{monthLabel}</h2>
            <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-full text-spotify-muted transition-colors"><ChevronRight size={20}/></button>
          </div>
          <div className={`text-center sm:text-right ${monthUsdPnl >= 0 ? 'text-spotify-green' : 'text-red-500'}`}>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] opacity-50 mb-0.5 whitespace-nowrap">Monthly Result</p>
            <p className="text-xl md:text-3xl font-black tracking-tighter">{monthUsdPnl >= 0 ? '+' : ''}{formatCurrency(convertCurrency(monthUsdPnl, 'USD', displayCurrency), displayCurrency)}</p>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.01]">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="p-2 md:p-3 text-center text-[8px] md:text-[10px] font-extrabold uppercase tracking-widest text-spotify-muted">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((d, i) => (
            <div 
              key={i} 
              onClick={() => d.current && d.trades.length > 0 && setSelectedDay(d)}
              className={`min-h-[70px] md:min-h-[110px] border-r border-b border-white/5 p-1 md:p-2 transition-all flex flex-col group relative ${d.current ? 'bg-transparent cursor-pointer hover:bg-white/[0.03]' : 'bg-black/20 text-white/5'}`}
            >
              <span className={`text-[10px] md:text-xs font-bold mb-1 ${d.current ? 'text-spotify-muted group-hover:text-white' : 'text-white/10'}`}>{d.day}</span>
              
              {d.current && d.trades.length > 0 && (
                <div className={`mt-auto p-1.5 md:p-2 rounded-lg flex flex-col items-center justify-center text-center transition-transform group-hover:scale-105 ${d.pnl > 0 ? 'bg-spotify-green/10 text-spotify-green border border-spotify-green/20' : d.pnl < 0 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-white/5 text-white/50 border border-white/10'}`}>
                  <span className="text-[10px] md:text-sm font-black tracking-tighter">{formatCurrency(convertCurrency(d.pnl, 'USD', displayCurrency), displayCurrency)}</span>
                  <span className="text-[7px] md:text-[8px] font-bold uppercase opacity-70 mt-0.5">{d.trades.length} {d.trades.length === 1 ? 'Trade' : 'Trades'}</span>
                </div>
              )}
              
              {d.current && d.trades.length > 0 && (
                <div className="absolute top-2 right-2 flex gap-0.5">
                  {d.trades.slice(0, 3).map((t: any, idx: number) => (
                    <div key={idx} className={`w-1 h-1 rounded-full ${t.result === 'win' ? 'bg-spotify-green' : t.result === 'loss' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  ))}
                  {d.trades.length > 3 && <div className="w-1 h-1 rounded-full bg-white/30" />}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedDay && (
        <Modal 
          onClose={() => setSelectedDay(null)} 
          title={`${new Date(selectedDay.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`}
          showFooter={false}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-spotify-muted uppercase tracking-widest mb-1 text-center">Total P&L</p>
                <p className={`text-2xl font-black text-center ${selectedDay.pnl >= 0 ? 'text-spotify-green' : 'text-red-500'}`}>
                  {selectedDay.pnl >= 0 ? '+' : ''}{formatCurrency(convertCurrency(selectedDay.pnl, 'USD', displayCurrency), displayCurrency)}
                </p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-spotify-muted uppercase tracking-widest mb-1 text-center">Trade Count</p>
                <p className="text-2xl font-black text-center text-white">{selectedDay.trades.length}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black text-spotify-muted uppercase tracking-widest flex items-center gap-2">
                <Zap size={14} className="text-spotify-green" /> 
                Day's Transactions
              </h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {selectedDay.trades.map((t: any) => (
                  <div key={t.id} className="bg-white/5 hover:bg-white/[0.08] p-4 rounded-xl border border-white/5 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-[10px] ${t.result === 'win' ? 'bg-spotify-green/20 text-spotify-green' : t.result === 'loss' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                        {t.dir === 'Long' ? 'BUY' : 'SEL'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{t.pair}</p>
                        <p className="text-[10px] font-bold text-spotify-muted uppercase tracking-widest">{t.time} • {t.setup || 'No Setup'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${cleanMoney(t.pnl) >= 0 ? 'text-spotify-green' : 'text-red-500'}`}>
                        {cleanMoney(t.pnl) >= 0 ? '+' : ''}{formatCurrency(convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', displayCurrency), displayCurrency)}
                      </p>
                      <p className="text-[9px] font-bold text-spotify-muted uppercase tracking-widest">{t.risk || 'No Risk'}% Risk</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedDay(null)}
              className="w-full bg-white text-black font-black uppercase tracking-widest text-xs py-4 rounded-full hover:bg-spotify-green transition-all"
            >
              Close Details
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function AnalyticsPage({ trades, displayCurrency }: any) {
  const chartData = useMemo(() => {
    if (!trades.length) return null;
    
    // Win rate by session
    const sessions = ['Asia', 'London', 'New York'];
    const sessionData = sessions.map(s => {
      const ts = trades.filter((t: any) => t.session === s);
      const wr = ts.length ? Math.round(ts.filter((t: any) => t.result === 'win').length / ts.length * 100) : 0;
      const usdPnl = ts.reduce((sum: number, t: any) => sum + convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', 'USD'), 0);
      return { name: s, wr, pnl: usdPnl, count: ts.length };
    });

    // Win rate by Direction
    const shorts = trades.filter((t: any) => t.dir === 'Short');
    const longs = trades.filter((t: any) => t.dir === 'Long');
    const swr = shorts.length ? Math.round(shorts.filter((t: any) => t.result === 'win').length / shorts.length * 100) : 0;
    const lwr = longs.length ? Math.round(longs.filter((t: any) => t.result === 'win').length / longs.length * 100) : 0;

    // Emotions
    const emotionsMap: any = {};
    trades.forEach((t: any) => {
      const e = t.emotion.split('/')[0].trim();
      if (!emotionsMap[e]) emotionsMap[e] = { win: 0, total: 0 };
      emotionsMap[e].total++;
      if (t.result === 'win') emotionsMap[e].win++;
    });
    const emotionData = Object.entries(emotionsMap).map(([name, data]: any) => ({
      name,
      wr: Math.round(data.win / data.total * 100),
      count: data.total
    }));

    // Setup Performance
    const setupsMap: any = {};
    trades.forEach((t: any) => {
      if (!t.setup) return;
      if (!setupsMap[t.setup]) setupsMap[t.setup] = { win: 0, total: 0, pnl: 0 };
      setupsMap[t.setup].total++;
      setupsMap[t.setup].pnl += convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', 'USD');
      if (t.result === 'win') setupsMap[t.setup].win++;
    });
    const setupPerformanceData = Object.entries(setupsMap).map(([name, data]: any) => ({
      name,
      wr: Math.round(data.win / data.total * 100),
      pnl: data.pnl,
      count: data.total
    })).sort((a, b) => b.pnl - a.pnl);

    // Trend Breakdown by Session
    const sortedTrades = [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    let sessionCurvesUsd: any = { 'Asia': 0, 'London': 0, 'New York': 0 };
    const sessionTrendData = sortedTrades.map((t: any) => {
      if (sessions.includes(t.session)) {
        sessionCurvesUsd[t.session] += convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', 'USD');
      }
      return {
        displayDate: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Asia: sessionCurvesUsd['Asia'],
        London: sessionCurvesUsd['London'],
        'New York': sessionCurvesUsd['New York']
      };
    });

    // Trend Breakdown by Setup (Top 5)
    const topSetups = setupPerformanceData.slice(0, 5).map(s => s.name);
    let setupCurvesUsd: any = {};
    topSetups.forEach(s => setupCurvesUsd[s] = 0);
    const setupTrendData = sortedTrades.map((t: any) => {
      if (topSetups.includes(t.setup)) {
        setupCurvesUsd[t.setup] += convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', 'USD');
      }
      return {
        displayDate: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        ...Object.fromEntries(topSetups.map(s => [s, setupCurvesUsd[s]]))
      };
    });

    // Best and Worst Trades
    const tradesWithUsdPnl = trades.map((t: any) => ({
      ...t,
      usdPnl: convertCurrency(cleanMoney(t.pnl), t.currency || 'USD', 'USD')
    }));
    const bestTrade = tradesWithUsdPnl.length > 0 ? tradesWithUsdPnl.reduce((max: any, t: any) => (t.usdPnl > max.usdPnl) ? t : max, tradesWithUsdPnl[0]) : null;
    const worstTrade = tradesWithUsdPnl.length > 0 ? tradesWithUsdPnl.reduce((min: any, t: any) => (t.usdPnl < min.usdPnl) ? t : min, tradesWithUsdPnl[0]) : null;

    // Average R:R
    const tradesWithRR = trades.filter((t: any) => {
      const entry = cleanMoney(t.entry);
      const exit = cleanMoney(t.exit);
      const sl = cleanMoney(t.sl);
      return entry > 0 && exit > 0 && sl > 0 && entry !== sl;
    }).map((t: any) => {
      const entry = cleanMoney(t.entry);
      const exit = cleanMoney(t.exit);
      const sl = cleanMoney(t.sl);
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(exit - entry);
      return reward / risk;
    });
    const avgRR = tradesWithRR.length ? (tradesWithRR.reduce((a, b) => a + b, 0) / tradesWithRR.length).toFixed(2) : '0.00';

    // News Impact
    const newsImpactMap: any = { high: 0, med: 0, no: 0 };
    trades.forEach((t: any) => {
      const impact = t.news || 'no';
      if (newsImpactMap[impact] !== undefined) newsImpactMap[impact]++;
      else newsImpactMap['no']++;
    });
    const newsData = [
      { name: 'High Impact', value: newsImpactMap.high },
      { name: 'Med Impact', value: newsImpactMap.med },
      { name: 'No News', value: newsImpactMap.no }
    ];

    return { 
      sessionData, swr, lwr, emotionData, 
      shortsCount: shorts.length, longsCount: longs.length,
      setupPerformanceData, sessionTrendData, setupTrendData,
      topSetups, bestTrade, worstTrade, avgRR, newsData
    };
  }, [trades]);

  if (!chartData) return <div className="p-20 text-center text-spotify-muted">No data for analytics yet. Log more trades.</div>;

  const COLORS = ['#1DB954', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-8 md:space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-1">Ana<span className="italic text-spotify-green">lytics</span></h1>
          <p className="text-xs font-medium text-spotify-muted tracking-tight">Identify patterns in your psychology and technical execution.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Short Win Rate" value={`${chartData.swr}%`} sub={`${chartData.shortsCount} trades`} />
        <StatCard label="Long Win Rate" value={`${chartData.lwr}%`} sub={`${chartData.longsCount} trades`} />
        <StatCard label="Avg Risk:Reward" value={`1:${chartData.avgRR}`} sub="Target vs Risk" />
        <StatCard 
          label="Best Session" 
          value={chartData.sessionData.length > 0 ? [...chartData.sessionData].sort((a:any, b:any) => b.wr - a.wr)[0].name : "None"} 
          sub="Highest Win Rate" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-spotify-green/10 border border-spotify-green/20 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-spotify-green tracking-[0.2em] mb-1">Best Winning Trade</p>
            <p className="text-3xl font-black text-white">{formatCurrency(convertCurrency(chartData.bestTrade?.usdPnl || 0, 'USD', displayCurrency), displayCurrency)}</p>
            <p className="text-[10px] font-bold text-spotify-muted mt-1 uppercase tracking-widest">
              {chartData.bestTrade ? `${chartData.bestTrade.pair} • ${chartData.bestTrade.date}` : 'No trades yet'}
            </p>
          </div>
          <div className="bg-spotify-green p-3 rounded-full text-black">
            <TrendingUp size={24} />
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em] mb-1">Worst Losing Trade</p>
            <p className="text-3xl font-black text-white">{formatCurrency(convertCurrency(chartData.worstTrade?.usdPnl || 0, 'USD', displayCurrency), displayCurrency)}</p>
            <p className="text-[10px] font-bold text-spotify-muted mt-1 uppercase tracking-widest">
              {chartData.worstTrade ? `${chartData.worstTrade.pair} • ${chartData.worstTrade.date}` : 'No trades yet'}
            </p>
          </div>
          <div className="bg-red-500 p-3 rounded-full text-white">
            <TrendingDown size={24} />
          </div>
        </div>
      </div>

      {/* Equity Curves Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Session Trend */}
        <div className="bg-spotify-card p-5 md:p-8 rounded-2xl border border-white/5">
          <div className="mb-8">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-spotify-muted mb-1">Session Equity Curves</h3>
            <p className="text-sm font-bold text-white/60">P&L progress by trading window</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.sessionTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="displayDate" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700 }}
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 700 }}
                />
                <Line type="monotone" dataKey="London" stroke="#1DB954" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="New York" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Asia" stroke="#6b7280" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#1DB954]" /><span className="text-[10px] font-bold text-spotify-muted">London</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#3b82f6]" /><span className="text-[10px] font-bold text-spotify-muted">New York</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#6b7280]" /><span className="text-[10px] font-bold text-spotify-muted">Asia</span></div>
          </div>
        </div>

        {/* Setup Trend */}
        <div className="bg-spotify-card p-5 md:p-8 rounded-2xl border border-white/5">
          <div className="mb-8">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-spotify-muted mb-1">Setup Equity Curves</h3>
            <p className="text-sm font-bold text-white/60">Performance trend of top 5 setups</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.setupTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="displayDate" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700 }}
                  minTickGap={30}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700 }} />
                <Tooltip contentStyle={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} />
                {chartData.topSetups.map((setup, i) => (
                  <Line key={setup} type="monotone" dataKey={setup} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {chartData.topSetups.map((setup, i) => (
              <div key={setup} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[10px] font-bold text-spotify-muted truncate max-w-[80px]">{setup}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-spotify-card p-8 rounded-2xl">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-spotify-muted mb-8 text-center">Session Efficiency</h3>
          <div className="space-y-10">
            {chartData.sessionData.map(s => (
              <div key={s.name} className="space-y-3">
                <div className="flex items-end justify-between font-bold">
                  <span className="text-sm tracking-tight capitalize">{s.name}</span>
                  <span className="text-xl tracking-tighter font-extrabold">{s.wr}% WR</span>
                </div>
                <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden p-1">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${s.wr}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${s.pnl >= 0 ? 'bg-spotify-green' : 'bg-red-500'}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-extrabold uppercase text-spotify-muted tracking-widest">
                  <span>{s.count} trades</span>
                  <div className={s.pnl >= 0 ? 'text-spotify-green' : 'text-red-500'}>{s.pnl >= 0 ? '+' : ''}{formatCurrency(convertCurrency(s.pnl, 'USD', displayCurrency), displayCurrency)} Profit</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-spotify-card p-8 rounded-2xl flex flex-col">
           <h3 className="text-xs font-extrabold uppercase tracking-widest text-spotify-muted mb-8 text-center">Setup Rankings</h3>
           <div className="flex-1 space-y-4">
              {chartData.setupPerformanceData.slice(0, 4).map((s, idx) => (
                <div key={s.name} className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                   <div className="w-10 h-10 rounded-full bg-spotify-black flex items-center justify-center text-spotify-green font-black text-xs">
                      #{idx + 1}
                   </div>
                   <div className="flex-1">
                      <p className="text-xs font-extrabold uppercase tracking-widest text-spotify-muted group-hover:text-white transition-colors">{s.name}</p>
                      <p className="text-[10px] font-bold text-white/40">{s.count} trades · {s.wr}% Win Rate</p>
                   </div>
                   <div className="text-right">
                      <p className={`text-lg font-black tracking-tighter ${s.pnl >= 0 ? 'text-spotify-green' : 'text-red-500'}`}>
                        {s.pnl >= 0 ? '+' : ''}{formatCurrency(convertCurrency(s.pnl, 'USD', displayCurrency), displayCurrency)}
                      </p>
                   </div>
                </div>
              ))}
           </div>
           <div className="mt-8 bg-white/5 p-8 rounded-xl text-center">
              <h4 className="text-[10px] font-extrabold text-spotify-muted uppercase tracking-widest mb-6">News Impact Breakdown</h4>
              <div className="grid grid-cols-3 gap-4">
                {chartData.newsData.map((n: any) => (
                  <div key={n.name} className="space-y-1">
                    <p className={`text-2xl font-black ${n.value > 0 ? 'text-white' : 'text-white/20'}`}>{n.value}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-spotify-muted">{n.name}</p>
                  </div>
                ))}
              </div>
           </div>
           <div className="mt-8 bg-white/5 p-8 rounded-xl text-center">
              <h4 className="text-[10px] font-extrabold text-spotify-muted uppercase tracking-widest mb-4">Win Rate by Emotion</h4>
              <div className="flex flex-wrap justify-center gap-2">
                {chartData.emotionData.map(e => (
                  <div key={e.name} className="px-4 py-2 bg-spotify-black rounded-lg border border-white/5">
                    <p className="text-[8px] font-black uppercase text-spotify-muted opacity-50 tracking-widest">{e.name}</p>
                    <p className={`text-lg font-black tracking-tighter ${e.wr >= 50 ? 'text-spotify-green' : 'text-red-500'}`}>{e.wr}%</p>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function ReviewPage({ reviews, onDeleteReview }: any) {
  const { user, showToast } = useAuth();
  const [form, setForm] = useState({
    week: new Date().toISOString().split('T')[0],
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: ''
  });

  const handleSave = async () => {
    if (!user) return;
    if (!form.q1 && !form.q6) {
      showToast('Fill in at least focus and best trade', 'error');
      return;
    }
    
    const reviewsPath = `users/${user.uid}/reviews`;
    try {
      await addDoc(collection(db, reviewsPath), {
        ...form,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setForm({ week: new Date().toISOString().split('T')[0], q1: '', q2: '', q3: '', q4: '', q5: '', q6: '' });
      showToast('Weekly review recorded');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, reviewsPath);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter mb-1">Weekly <span className="italic text-spotify-green">Review</span></h1>
          <p className="text-xs font-medium text-spotify-muted">Every Sunday — this is where real growth happens.</p>
        </div>
        <input 
          type="date" 
          value={form.week} 
          onChange={e => setForm({ ...form, week: e.target.value })} 
          className="bg-spotify-card border border-white/10 rounded-full px-5 py-2 text-xs font-bold text-white outline-none focus:border-spotify-green transition-all"
        />
      </div>

      <div className="bg-spotify-card p-6 md:p-10 rounded-3xl space-y-8 shadow-2xl">
        <ReviewItem label="What was my best trade this week and why did it work?" value={form.q1} onChange={v => setForm({ ...form, q1: v })} placeholder="Architecture of the win..." />
        <ReviewItem label="What was my worst trade and what did I do wrong?" value={form.q2} onChange={v => setForm({ ...form, q2: v })} placeholder="Total unfiltered truth..." />
        <ReviewItem label="Which trading rules did I break?" value={form.q3} onChange={v => setForm({ ...form, q3: v })} placeholder="Discipline leakage..." />
        <ReviewItem label="Weekly focus for improvement next week" value={form.q6} onChange={v => setForm({ ...form, q6: v })} placeholder="One specific mission..." />
        
        <button onClick={handleSave} className="w-full bg-white text-black font-extrabold uppercase tracking-widest text-sm py-4 rounded-full transition-all hover:scale-[1.01] active:opacity-80">
          Archive Weekly Review
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/30 text-center">Previous Archives</h3>
        {reviews.map((r: Review) => (
          <div key={r.id} className="bg-spotify-card p-6 rounded-xl border border-white/5 opacity-80 hover:opacity-100 transition-opacity relative group">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-spotify-green">Archive {r.week}</span>
              <button 
                onClick={() => onDeleteReview(r.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-spotify-muted hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-white"><span className="text-spotify-muted font-normal block text-[10px] uppercase tracking-widest mb-1">Weekly Mission</span> {r.q6}</p>
              <p className="text-xs text-spotify-muted leading-relaxed italic">"{r.q1}"</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportPage({ onTriggerImport }: { onTriggerImport: () => void }) {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-1">Technical <span className="italic text-spotify-green">Import</span></h1>
        <p className="text-xs font-medium text-spotify-muted">MT5 CSV bridge implementation.</p>
      </div>

      <div className="bg-gradient-to-br from-spotify-green/10 to-transparent border border-spotify-green/20 p-8 rounded-2xl mb-8">
        <h4 className="text-sm font-extrabold uppercase tracking-widest text-spotify-green mb-6">MT5 Export Guide</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex gap-4">
              <span className="font-mono text-spotify-green font-extrabold text-[10px]">01</span>
              <p className="text-xs text-spotify-muted tracking-tight">Open MT5 → <span className="font-bold text-white">View</span> → <span className="font-bold text-white">Terminal</span></p>
            </div>
            <div className="flex gap-4">
              <span className="font-mono text-spotify-green font-extrabold text-[10px]">02</span>
              <p className="text-xs text-spotify-muted tracking-tight">Click <span className="font-bold text-white">History</span> tab at the bottom</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex gap-4">
              <span className="font-mono text-spotify-green font-extrabold text-[10px]">03</span>
              <p className="text-xs text-spotify-muted tracking-tight">Right-click → <span className="font-bold text-white">Save as Report → CSV</span></p>
            </div>
            <div className="flex gap-4">
              <span className="font-mono text-spotify-green font-extrabold text-[10px]">04</span>
              <p className="text-xs text-spotify-muted tracking-tight">Upload the CSV here for automated journal parsing.</p>
            </div>
          </div>
        </div>
      </div>

      <div 
        onClick={onTriggerImport}
        className="border-2 border-dashed border-white/10 rounded-3xl p-20 flex flex-col items-center justify-center text-center bg-spotify-card hover:border-spotify-green transition-all group cursor-pointer"
      >
        <div className="w-16 h-16 bg-white/[0.03] rounded-2xl flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-transform group-hover:text-spotify-green text-white/40">
          <Download size={32} />
        </div>
        <h3 className="text-xl font-extrabold tracking-tight mb-2">Drop your MT5 Archive here</h3>
        <p className="text-xs text-spotify-muted font-medium mb-8">MetaTrader 5 Native CSV Bridge</p>
        <button 
          className="bg-white text-black font-extrabold uppercase tracking-[0.2em] text-[10px] px-8 py-3 rounded-full hover:scale-105 active:opacity-80 transition-all"
        >
          Browse Files
        </button>
      </div>

      <div className="text-center">
        <p className="text-[9px] font-extrabold uppercase text-white/20 tracking-[0.3em]">End of Import Workflow</p>
      </div>
    </div>
  );
}

// --- Generic Components ---

function StatCard({ label, value, sub, valueColor = 'text-white' }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
      className="bg-spotify-card/40 backdrop-blur-md p-5 md:p-6 rounded-2xl transition-all duration-300 group border border-white/5 hover:border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[120px] md:min-h-[140px]"
    >
      <div className="absolute top-0 left-0 w-1 pt-0 group-hover:h-full bg-spotify-green/0 group-hover:bg-spotify-green/40 transition-all duration-500" />
      
      <div className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-spotify-muted group-hover:text-white/60 transition-colors mb-2">
        {label}
      </div>
      
      <div>
        <div className={`text-2xl md:text-3xl font-black tracking-tighter mb-1 ${valueColor} group-hover:scale-[1.02] transition-transform origin-left duration-300`}>
          {value}
        </div>
        <div className="text-[9px] md:text-[10px] font-bold text-spotify-muted opacity-60 uppercase tracking-widest">{sub}</div>
      </div>
      
      <div className="mt-4 h-[1px] w-0 group-hover:w-full bg-gradient-to-r from-spotify-green/40 to-transparent transition-all duration-700" />
    </motion.div>
  );
}

function StatItem({ label, value, mono, color = 'text-white', bold }: any) {
  return (
    <div>
      <div className="text-[9px] font-extrabold uppercase text-spotify-muted tracking-widest mb-1">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono' : 'font-bold'} ${color} ${bold ? 'font-extrabold text-lg tracking-tighter' : ''}`}>{value}</div>
    </div>
  );
}

function Modal({ children, onClose, title, showFooter = true }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-black/95 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.9, y: 40 }} 
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl bg-[#0d0d0d] rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] relative z-10 border border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-spotify-green/5 to-transparent">
          <div>
            <h2 className="text-xl md:text-3xl font-black tracking-tighter text-white mr-4 leading-tight">{title}</h2>
            <div className="h-1 w-12 bg-spotify-green mt-1 rounded-full" />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-spotify-muted transition-all hover:scale-110 active:scale-95"><X size={24} /></button>
        </div>
        <div className="p-6 md:p-10 overflow-y-auto scrollbar-hide">
          {children}
        </div>
        {showFooter && (
          <div className="px-6 md:px-10 pb-6 md:pb-10 pt-4 flex gap-4">
            <button onClick={onClose} className="flex-1 bg-white hover:bg-spotify-green text-black font-black uppercase tracking-[0.2em] text-[11px] md:text-xs py-4 rounded-full transition-all hover:scale-[1.02] active:scale-98 shadow-xl">
              Complete View
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function TagInput({ label, value, onChange, placeholder }: { label: string, value: string[], onChange: (tags: string[]) => void, placeholder?: string }) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = inputValue.trim().replace(/,$/, '');
      if (tag && !value.includes(tag)) {
        onChange([...value, tag]);
        setInputValue('');
      } else if (tag) {
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(t => t !== tagToRemove));
  };

  return (
    <div className="space-y-1.5 flex flex-col group min-w-0">
      <label className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/30 ml-1 group-focus-within:text-spotify-green transition-colors truncate">{label}</label>
      <div className="bg-white/5 border border-white/10 rounded-md px-2 py-2 flex flex-wrap gap-2 outline-none focus-within:border-spotify-green transition-all w-full min-h-[42px]">
        {value.map(tag => (
          <span 
            key={tag} 
            className="bg-spotify-green/10 text-spotify-green text-[10px] font-black px-2 py-1 rounded-md flex items-center gap-1.5 border border-spotify-green/20"
          >
            {tag}
            <button 
              type="button" 
              onClick={() => removeTag(tag)}
              className="hover:text-white transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input 
          type="text" 
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="bg-transparent border-none outline-none text-sm font-medium text-white flex-1 min-w-[80px]"
        />
      </div>
    </div>
  );
}

function Input({ label, type, value, onChange, placeholder, v }: any) {
  const val = v !== undefined ? v : value;
  return (
    <div className="space-y-1.5 flex flex-col group min-w-0">
      <label className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/30 ml-1 group-focus-within:text-spotify-green transition-colors truncate">{label}</label>
      <input 
        type={type} 
        value={val ?? ''} 
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-md px-3 py-2.5 text-sm font-medium text-white outline-none focus:border-spotify-green transition-all w-full"
      />
    </div>
  );
}

function Select({ label, value, options, onChange }: any) {
  return (
    <div className="space-y-1.5 flex flex-col group min-w-0">
      <label className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/30 ml-1 group-focus-within:text-spotify-green transition-colors truncate">{label}</label>
      <select 
        value={value ?? ''} 
        onChange={e => onChange(e.target.value)}
        className="bg-spotify-black border border-white/10 rounded-md px-3 py-2.5 text-sm font-medium text-white outline-none focus:border-spotify-green transition-all w-full appearance-none cursor-pointer"
      >
        {options.map((opt: any) => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-1.5 flex flex-col">
      <label className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/30 ml-1">{label}</label>
      <textarea 
        value={value ?? ''} 
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-md px-4 py-3 text-sm font-medium text-white outline-none focus:border-spotify-green min-h-[100px] resize-none transition-all"
      />
    </div>
  );
}

function ReviewItem({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold italic text-spotify-muted">"{label}"</label>
      <textarea 
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border-l-2 border-white/20 px-5 py-4 focus:border-spotify-green outline-none text-sm leading-relaxed transition-all min-h-[80px]"
      />
    </div>
  );
}
