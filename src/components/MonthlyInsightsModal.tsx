import React, { useState } from 'react';
import Groq from 'groq-sdk';
import { Loader2, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Trade {
  id: string;
  date: string;
  profit: number;
  setup: string;
}

export const MonthlyInsightsModal = ({ trades, onClose }: { trades: Trade[], onClose: () => void }) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateInsights = async () => {
    setIsLoading(true);
    const lastMonthTrades = trades.filter(t => {
      const d = new Date(t.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() - 1 || (now.getMonth() === 0 && d.getMonth() === 11);
    });

    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      console.error("Groq API key missing");
      setIsLoading(false);
      return;
    }

    const client = new Groq({ apiKey, dangerouslyAllowBrowser: true });

    try {
      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ 
          role: 'user', 
          content: `Analyze these trades from the last month: ${JSON.stringify(lastMonthTrades)}. Provide a 3-point bulleted summary of performance trends, setup profitability, and psychological patterns. Keep it concise.`
        }]
      });
      setInsights(response.choices[0].message.content || 'No insights generated.');
    } catch (e) {
      console.error(e);
      setInsights("Could not generate insights.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#181818] w-full max-w-lg p-8 rounded-3xl shadow-2xl border border-white/10 space-y-6"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="text-spotify-green" />
              Monthly AI Insights
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-spotify-muted hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <button 
            onClick={generateInsights} 
            disabled={isLoading || insights !== null} 
            className="w-full bg-spotify-green/10 text-spotify-green font-bold py-3 rounded-full hover:bg-spotify-green/20 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin inline mr-2" size={18} /> : insights ? 'Insights Generated' : 'Generate Monthly Analysis'}
          </button>
          
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-spotify-green" size={24} /></div>
          ) : insights && (
            <div className="text-md text-gray-300 leading-relaxed whitespace-pre-line bg-black/20 p-4 rounded-xl">{insights}</div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
