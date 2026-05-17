import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';

export const AnomalyDetector = ({ trades }: { trades: any[] }) => {
  const anomalies = useMemo(() => {
    if (trades.length < 5) return [];

    const anomaliesFound = [];
    
    // Check for excessive daily loss
    const dailyLosses = trades.reduce((acc, t) => {
        const date = t.date;
        if (!acc[date]) acc[date] = 0;
        if (t.pnl < 0) acc[date] += Math.abs(t.pnl);
        return acc;
    }, {} as Record<string, number>);
    
    if(Object.values(dailyLosses).some((loss: number) => loss > 100)) { // Assuming 100 is a significant daily loss
        anomaliesFound.push(`You had sessions with significant losses (>$100). Consider taking a break when daily limit hit.`);
    }

    // Check for "Revenge Trading"
    const revengeTrades = trades.filter(t => t.emotion.toLowerCase().includes('revenge'));
    if (revengeTrades.length > 2) {
        anomaliesFound.push(`Revenge trading detected. Too many trades logged as 'Revenge' emotion.`);
    }

    return anomaliesFound;
  }, [trades]);

  if (anomalies.length === 0) return null;

  return (
      <div className="bg-red-950/20 border border-red-500/30 p-6 rounded-3xl space-y-4 mb-4">
        <h3 className="text-lg font-black text-red-500 flex items-center gap-2">
            <AlertCircle size={18} />
            AI Anomaly Detector
        </h3>
        {anomalies.map((a, i) => <p key={i} className="text-sm text-red-100">{a}</p>)}
      </div>
  );
};
