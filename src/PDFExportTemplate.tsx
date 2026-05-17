import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Zap, ClipboardList, Target, TrendingDown, Calendar } from 'lucide-react';
import { db } from '../App';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface NotificationSettingsProps {
  user: any;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ user, onClose, showToast }) => {
  const [prefs, setPrefs] = useState({
    sessionReminders: true,
    dailyGoal: true,
    streakAlert: true,
    maxLoss: true,
    weeklyReview: true,
  });

  useEffect(() => {
    const loadPrefs = async () => {
      const docRef = doc(db, 'users', user.uid, 'settings', 'notifications');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setPrefs(snap.data() as any);
      }
    };
    loadPrefs();
  }, [user.uid]);

  const toggle = async (key: string) => {
    const newPrefs = { ...prefs, [key]: !prefs[key as keyof typeof prefs] };
    setPrefs(newPrefs);
    await setDoc(doc(db, 'users', user.uid, 'settings', 'notifications'), {
        ...newPrefs,
        updatedAt: serverTimestamp()
    }, { merge: true });
  };
  
  const [permission, setPermission] = useState(Notification.permission);

  useEffect(() => {
    const checkPermission = () => setPermission(Notification.permission);
    checkPermission();
    // Simplified polling since permission can change outside our control
    const interval = setInterval(checkPermission, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const testNotification = () => {
    if (Notification.permission === 'granted') {
        new Notification('ENTJournal Test', {
            body: 'Notifications are working! 🎯',
            icon: '/icon-192.png'
        });
        showToast("Test notification sent.");
    } else {
        Notification.requestPermission().then(p => {
            setPermission(p);
            if (p === 'granted') {
                new Notification('ENTJournal Test', {
                    body: 'Notifications are working! 🎯',
                    icon: '/icon-192.png'
                });
                showToast("Test notification sent.");
            } else {
                showToast("Permission denied.", 'error');
            }
        });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="bg-spotify-card p-6 rounded-3xl w-full max-w-sm border border-white/10 space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2"><Bell size={16}/> Notifications</h2>
            
            <button 
                onClick={() => permission !== 'granted' && Notification.requestPermission().then(setPermission)}
                className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-full px-3 py-1"
            >
                <div className={`w-2 h-2 rounded-full ${permission === 'granted' ? 'bg-spotify-green' : 'bg-red-500'}`} />
                <span className="text-[9px] font-bold text-white/70 uppercase">
                    {permission === 'granted' ? 'Notifications enabled' : 'Click to enable'}
                </span>
            </button>
            <button onClick={onClose} className="text-spotify-muted hover:text-white"><X size={20} /></button>
        </div>
        
        <div className="space-y-4">
            {[
                { key: 'sessionReminders', label: 'Session Kill Zones', icon: Zap },
                { key: 'dailyGoal', label: 'Daily Goal Reminder', icon: ClipboardList },
                { key: 'streakAlert', label: 'Streak Alert', icon: Target },
                { key: 'maxLoss', label: 'Max Loss Warning', icon: TrendingDown },
                { key: 'weeklyReview', label: 'Weekly Review', icon: Calendar },
            ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                        <item.icon size={16} className="text-spotify-green"/>
                        <span className="text-xs font-bold text-white">{item.label}</span>
                    </div>
                    <button onClick={() => toggle(item.key)} className={`w-10 h-6 rounded-full transition-colors ${prefs[item.key as keyof typeof prefs] ? 'bg-spotify-green' : 'bg-white/10'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${prefs[item.key as keyof typeof prefs] ? 'translate-x-[20px]' : 'translate-x-[4px]'}`}/>
                    </button>
                </div>
            ))}
        </div>

        <button onClick={testNotification} className="w-full bg-white text-black font-extrabold text-xs uppercase tracking-widest py-3 rounded-full hover:bg-slate-200 transition-colors">
            Test Notification
        </button>
      </div>
    </motion.div>
  );
};
