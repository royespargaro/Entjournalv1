import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Brain } from 'lucide-react';

interface OnboardingModalProps {
  finishOnboarding: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ finishOnboarding }) => {
  const [step, setStep] = useState(0);
  const steps = [
    { title: "Welcome to ENTJ", content: "Your professional trading journal interface. Let's get you set up." },
    { title: "Log Trades", content: "Tap the central '+' button in the navigation to log your trades, emotion, and setup." },
    { title: "Set Goals", content: "Navigate to 'Trading Plan' to set your weekly and monthly growth targets." },
    { title: "Analytics", content: "Use the 'Analytics' section to visualize your performance and improve your edge." }
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a0a0a] backdrop-blur-md flex items-center justify-center p-6 text-center font-mono">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0f0f0f]/80 border border-white/10 p-10 rounded-none max-w-sm w-full space-y-8"
      >
        <div className="flex justify-center mb-6">
           <Brain className="text-white" size={48} strokeWidth={1} />
        </div>
        
        <div className="space-y-4">
           <h2 className="text-xl font-bold text-white tracking-widest uppercase">{steps[step].title}</h2>
           <div className="h-[2px] w-12 bg-white mx-auto" />
           <p className="text-xs text-white/50 leading-relaxed tracking-wider pt-2">{steps[step].content}</p>
        </div>
        
        <div className="flex gap-2 justify-center py-4">
          {steps.map((_, i) => (
             <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === step ? 'bg-white' : 'bg-white/10'}`} />
          ))}
        </div>

        <button 
          onClick={() => step < steps.length - 1 ? setStep(step + 1) : finishOnboarding()}
          className="w-full bg-white text-black font-extrabold text-xs uppercase tracking-widest py-4 hover:bg-slate-200 transition-colors"
        >
          {step < steps.length - 1 ? 'Next Step' : 'Initialize Journal'}
        </button>
      </motion.div>
    </div>
  );
};
