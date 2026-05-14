import React, { useState, useEffect } from 'react';
import Groq from 'groq-sdk';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'motion/react';

const SentimentItem = ({ symbol }: { symbol: string }) => {
  const [sentiment, setSentiment] = useState<{ analysis: string, type: 'bullish' | 'bearish' | 'neutral' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchSentiment = async () => {
    setIsLoading(true);
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) { setIsLoading(false); return; }

    const client = new Groq({ apiKey, dangerouslyAllowBrowser: true });
    try {
      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: `Briefly analyze ${symbol} market sentiment. Output as JSON with 'analysis' (1-2 sentences) and 'type' ('bullish', 'bearish', 'neutral').` }],
        response_format: { type: 'json_object' }
      });
      setSentiment(JSON.parse(response.choices[0].message.content || '{"analysis": "...", "type": "neutral"}'));
    } catch (e) {
      setSentiment({ analysis: "Could not fetch", type: 'neutral' });
    } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchSentiment(); }, [symbol]);

  const getIndicator = (type: string) => {
    switch (type) {
      case 'bullish': return <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><TrendingUp size={16} className="text-spotify-green" /></motion.div>;
      case 'bearish': return <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><TrendingDown size={16} className="text-red-500" /></motion.div>;
      default: return <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Minus size={16} className="text-gray-400" /></motion.div>;
    }
  };

  return (
    <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-2 hover:border-white/10 transition-colors">
      <div className="flex justify-between items-center text-xs font-black tracking-widest text-white/50">
        <span>{symbol} SENTIMENT</span>
        {isLoading ? <Loader2 className="animate-spin" size={14} /> : getIndicator(sentiment?.type || 'neutral')}
      </div>
      <p 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`text-xs text-spotify-muted leading-relaxed cursor-pointer hover:text-white/80 transition-colors ${isExpanded ? '' : 'truncate'}`}
        title="Click to expand"
      >
        {sentiment?.analysis || 'Loading...'}
      </p>
    </div>
  );
};

const MarketSentiment = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SentimentItem symbol="XAUUSD" />
      <SentimentItem symbol="BTCUSD" />
    </div>
  );
};

export default MarketSentiment;
