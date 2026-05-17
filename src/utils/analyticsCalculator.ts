import { Trade } from '../types';

export const calculateStats = (trades: Trade[]) => {
    const tradeEntries = trades.filter(t => t.type === 'trade');
    const grossProfit = tradeEntries.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = tradeEntries.filter(t => t.pnl < 0).reduce((sum, t) => sum + Math.abs(t.pnl), 0);
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);

    return {
        totalPnL,
        winRate: tradeEntries.length > 0 ? (tradeEntries.filter(t => t.result === 'WIN').length / tradeEntries.length) * 100 : 0,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : 0,
        avgRR: tradeEntries.length > 0 ? (tradeEntries.reduce((sum, t) => sum + (t.riskReward || 0), 0) / tradeEntries.length) : 0,
        bestTrade: tradeEntries.length > 0 ? tradeEntries.reduce((max, t) => (t.pnl > max.pnl) ? t : max, tradeEntries[0]) : null,
        worstTrade: tradeEntries.length > 0 ? tradeEntries.reduce((min, t) => (t.pnl < min.pnl) ? t : min, tradeEntries[0]) : null,
        totalEntries: trades.length,
        tradeCount: tradeEntries.length,
        recapCount: trades.filter(t => t.type === 'recap').length,
        importCount: trades.filter(t => t.type === 'import').length
    };
};
