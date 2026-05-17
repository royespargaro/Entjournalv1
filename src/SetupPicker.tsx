import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

export const LegalModal = ({ onClose, type }: { onClose: () => void, type: 'tos' | 'privacy' }) => {
  const content = {
    tos: {
      title: 'Terms of Service',
      body: (
        <div className="space-y-4 text-white/70 text-sm">
          <p>ENTJournal is for educational and journaling purposes only.</p>
          <p><strong>Not Financial Advice:</strong> This tool is not a financial advisor. All trading decisions are your own responsibility.</p>
          <p><strong>Liability:</strong> We are not liable for any trading losses incurred.</p>
          <p><strong>Data:</strong> Your data is stored securely in Firebase.</p>
          <p><strong>Usage:</strong> Free to use, may add premium features in future.</p>
          <p><strong>Governing Law:</strong> General international terms.</p>
          <p><strong>Contact:</strong> support@entjournal.com</p>
        </div>
      )
    },
    privacy: {
      title: 'Privacy Policy',
      body: (
        <div className="space-y-4 text-white/70 text-sm">
          <p><strong>Data Collected:</strong> Email, trade data, and trading preferences.</p>
          <p><strong>Usage:</strong> To provide journaling features and AI analysis.</p>
          <p><strong>Sharing:</strong> We do NOT sell your data to third parties.</p>
          <p><strong>Storage:</strong> Firebase handles data storage and security. Groq API receives trade data for AI analysis (anonymized).</p>
          <p><strong>Your Rights:</strong> You can delete your account and all data at any time.</p>
          <p><strong>Contact:</strong> privacy@entjournal.com</p>
        </div>
      )
    }
  };

  const selected = content[type];

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="bg-spotify-card p-6 rounded-3xl w-full max-w-lg border border-white/10 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center sticky top-0 bg-spotify-card pb-2 border-b border-white/5">
            <h2 className="text-white font-black uppercase tracking-widest text-lg">{selected.title}</h2>
            <button onClick={onClose} className="text-spotify-muted hover:text-white"><X size={20} /></button>
        </div>
        <div>{selected.body}</div>
        <button onClick={onClose} className="w-full bg-white text-black font-extrabold text-xs uppercase tracking-widest py-3 rounded-full hover:bg-slate-200 transition-colors">
            Close
        </button>
      </div>
    </motion.div>
  );
};
