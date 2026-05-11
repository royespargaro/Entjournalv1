export const PAIR_CONFIG = {
  'XAUUSD': { multiplier: 100, digits: 2, pipSize: 0.1 }, 
  'BTCUSD': { multiplier: 1, digits: 2, pipSize: 1 },
  'EURUSD': { multiplier: 100000, digits: 5, pipSize: 0.0001 },
  'GBPUSD': { multiplier: 100000, digits: 5, pipSize: 0.0001 },
  'NAS100': { multiplier: 20, digits: 2, pipSize: 0.1 },
  'US30': { multiplier: 10, digits: 2, pipSize: 1 },
  'ETHUSD': { multiplier: 1, digits: 2, pipSize: 1 },
};

export const CURRENCIES = {
  USD: { symbol: '$', code: 'USD', rate: 1 },
  EUR: { symbol: '€', code: 'EUR', rate: 0.93 },
  GBP: { symbol: '£', code: 'GBP', rate: 0.81 },
  JPY: { symbol: '¥', code: 'JPY', rate: 155.50 },
  AUD: { symbol: 'A$', code: 'AUD', rate: 1.54 },
  CAD: { symbol: 'C$', code: 'CAD', rate: 1.37 },
  CHF: { symbol: 'CHf', code: 'CHF', rate: 0.91 },
  CNY: { symbol: '¥', code: 'CNY', rate: 7.23 },
  INR: { symbol: '₹', code: 'INR', rate: 83.50 },
  IDR: { symbol: 'Rp', code: 'IDR', rate: 16250 },
  HKD: { symbol: 'HK$', code: 'HKD', rate: 7.82 },
  SGD: { symbol: 'S$', code: 'SGD', rate: 1.35 },
  NZD: { symbol: 'NZ$', code: 'NZD', rate: 1.66 },
  BRL: { symbol: 'R$', code: 'BRL', rate: 5.12 },
  SAR: { symbol: 'SR', code: 'SAR', rate: 3.75 },
  AED: { symbol: 'DH', code: 'AED', rate: 3.67 },
};

export const SESSIONS = [
  { name: 'Sydney', start: 21, end: 6, color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' },
  { name: 'Tokyo', start: 0, end: 9, color: 'bg-purple-500/20 text-purple-500 border-purple-500/30' },
  { name: 'London', start: 7, end: 16, color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' },
  { name: 'New York', start: 12, end: 21, color: 'bg-spotify-green/20 text-spotify-green border-spotify-green/30' }
];

export function getCurrentSessions(): string[] {
  const utcHour = new Date().getUTCHours();
  return SESSIONS.filter(s => {
    if (s.start < s.end) {
      return utcHour >= s.start && utcHour < s.end;
    } else {
      return utcHour >= s.start || utcHour < s.end;
    }
  }).map(s => s.name);
}
