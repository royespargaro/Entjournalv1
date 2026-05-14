import React, { useState } from 'react';
import Groq from 'groq-sdk';
import { Loader2, Sparkles, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';

interface Trade {
  id: string;
  date: string;
  profit: number;
  setup: string;
}

const MonthlyInsights = ({ trades }: { trades: Trade[] }) => {
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-spotify-card p-6 rounded-3xl shadow-lg border border-spotify-darker space-y-4"
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <BarChart3 size={18} className="text-spotify-green" />
          Monthly AI Insights
        </h3>
        <button 
          onClick={generateInsights} 
          disabled={isLoading} 
          className="text-xs bg-spotify-green/10 text-spotify-green font-bold px-3 py-1 rounded-full hover:bg-spotify-green/20 transition-colors"
        >
          {isLoading ? <Loader2 className="animate-spin" size={14} /> : 'Generate Reports'}
        </button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-spotify-green" /></div>
      ) : insights ? (
        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{insights}</div>
      ) : <p className="text-xs text-spotify-muted italic">Click Generate to see your monthly analysis.</p>}
    </motion.div>
  );
};

export default MonthlyInsights;
