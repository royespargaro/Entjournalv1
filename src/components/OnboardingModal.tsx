import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { db } from '../App';
import { doc, setDoc, serverTimestamp, User } from 'firebase/firestore';

interface OnboardingModalProps {
  finishOnboarding: () => void;
  user: User;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ finishOnboarding, user }) => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    assets: 'Both',
    experience: 'Beginner',
    monthlyTarget: 1000,
    dailyLossLimit: 100,
    maxTradesPerDay: 3
  });
  
  const [rules, setRules] = useState([
    "1. Always check Forex Factory calendar before any trade",
    "2. No trade without a stop loss placed before entry",
    "3. Maximum 3 trades per day",
    "4. Wait for liquidity sweep then M5 engulfing confirmation",
    "5. Move SL to breakeven after TP1 is hit",
    "6. $20 daily risk maximum",
    "7. Minimum 1:3 R:R before entering any trade",
    "8. No trading when emotion is Revenge or Excited",
    "9. Log every trade with entry reason",
    "10. Weekly review every Sunday",
    "11. Never increase lot size after a loss",
    "12. Only trade during Kill Zones",
    "13. Wait for structural break before entry",
    "14. Respect daily loss limit",
    "15. Stay focused, stay disciplined"
  ]);

  const saveOnboarding = async () => {
    try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            profile,
            rules,
            onboardingComplete: true,
            updatedAt: serverTimestamp()
        }, { merge: true });
        finishOnboarding();
    } catch (e) {
        console.error("Error saving onboarding:", e);
    }
  };

  const steps = [
    { title: `Welcome to ENTJournal, ${user.displayName || 'Trader'}`, content: "The only free AI-powered journal built for SMC traders." },
    { title: "Trading Profile", content: "..." }, // Simplified for initial edit
    { title: "Trading Rules", content: "..." },
    { title: "Ready?", content: "..." }
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a0a0a] backdrop-blur-md flex items-center justify-center p-6 text-center font-mono">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0f0f0f]/80 border border-white/10 p-10 rounded-none max-w-sm w-full space-y-8"
      >
        <div className="flex justify-between items-center text-white/50 text-[10px] uppercase tracking-widest">
            <span>Step {step + 1} of 4</span>
            {step > 0 && <button onClick={() => setStep(s => s - 1)} className="hover:text-white"><ChevronLeft size={16}/></button>}
        </div>

        <div className="space-y-4">
           <h2 className="text-xl font-bold text-white tracking-widest uppercase">{steps[step].title}</h2>
           <div className="h-[2px] w-12 bg-white mx-auto" />
           <p className="text-xs text-white/50 leading-relaxed tracking-wider pt-2">{steps[step].content}</p>
        </div>

        <div className="py-6">
            {step === 0 && <div className="text-white/20"><Brain size={64}/></div>}
            {step === 1 && (
                <div className="space-y-3 text-left">
                    <select className="w-full bg-[#1a1a1a] border border-white/10 p-3 text-white text-xs" value={profile.assets} onChange={e => setProfile({...profile, assets: e.target.value})}>
                        <option>XAUUSD</option><option>BTCUSD</option><option>Both</option>
                    </select>
                    <input type="number" placeholder="Monthly Profit Target ($)" className="w-full bg-[#1a1a1a] border border-white/10 p-3 text-white text-xs" value={profile.monthlyTarget} onChange={e => setProfile({...profile, monthlyTarget: parseInt(e.target.value)})}/>
                </div>
            )}
            {step === 2 && (
               <div className="h-64 overflow-y-auto space-y-2 pr-2 text-left">
                   {rules.map((rule, i) => (
                       <input key={i} value={rule} onChange={e => {
                           const newRules = [...rules];
                           newRules[i] = e.target.value;
                           setRules(newRules);
                       }} className="w-full bg-[#1a1a1a] border border-white/10 p-2 text-white text-[10px]" />
                   ))}
               </div>
            )}
            {step === 3 && <div className="text-spotify-green font-black text-lg">Ready to transform your trading?</div>}
        </div>

        <button 
          onClick={() => step < steps.length - 1 ? setStep(step + 1) : saveOnboarding()}
          className="w-full bg-white text-black font-extrabold text-xs uppercase tracking-widest py-4 hover:bg-slate-200 transition-colors"
        >
          {step < steps.length - 1 ? 'Next Step →' : 'Initialize Journal'}
        </button>
      </motion.div>
    </div>
  );
};
