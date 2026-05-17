import { Trade } from '../types';

export const evaluateHabits = (trades: Trade[], userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const userTrades = trades.filter(t => t.userId === userId);
    const todayTrades = userTrades.filter(t => t.date === today);

    // Placeholder for habit evaluation logic
    return [
        { id: 'log-trade', name: 'Log every trade', satisfied: todayTrades.length > 0 },
        // ... add more rules
    ];
};
