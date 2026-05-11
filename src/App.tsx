import { CURRENCIES } from '../constants';

export const convertCurrency = (amount: number, from: string, to: string) => {
  const fromRate = CURRENCIES[from as keyof typeof CURRENCIES]?.rate || 1;
  const toRate = CURRENCIES[to as keyof typeof CURRENCIES]?.rate || 1;
  // Convert to USD first, then to target
  const inUsd = amount / fromRate;
  return inUsd * toRate;
};

export const formatNum = (val: any, decimals: number = 2) => {
  if (val === undefined || val === null || val === '') return '0.00';
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(n)) return '0.00';
  return n.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

export const formatCurrency = (val: any, currency: string = 'USD') => {
  const meta = CURRENCIES[currency as keyof typeof CURRENCIES] || CURRENCIES.USD;
  const decimals = currency === 'IDR' ? 0 : 2;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0;
  const absVal = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  
  if (currency === 'IDR') {
    return `${sign}${meta.symbol}${Math.round(absVal).toLocaleString('id-ID')}`;
  }
  
  return `${sign}${meta.symbol}${formatNum(absVal, decimals)}`;
};

export const cleanMoney = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  let s = String(val).trim();
  
  // Normalize various dash characters (long dash, minus sign, etc.) to standard hyphen
  s = s.replace(/[−–—]/g, '-');
  
  // Remove all spaces (especially thousand separators like 1 000.00)
  s = s.replace(/\s+/g, ''); 
  
  // Handle (100.00) format for negatives
  if (s.startsWith('(') && s.endsWith(')')) {
    s = '-' + s.substring(1, s.length - 1);
  }
  
  // International decimal support (e.g. 1.234,56 or 1,234.56)
  if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  } else if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') < s.lastIndexOf('.')) {
      s = s.replace(/,/g, '');
    } else {
      s = s.replace(/\./g, '').replace(',', '.');
    }
  } else if (s.includes(',')) {
    s = s.replace(/,/g, '');
  }

  // Handle trailing minus (some banks/brokers)
  if (s.endsWith('-')) {
    s = '-' + s.substring(0, s.length - 1);
  }

  // Final cleanup: keep only digits, dot, and hyphen
  const cleaned = s.replace(/[^\d.\-]/g, '');
  
  // Ensure we don't end up with multiple hyphens or dots if input was weird
  const hasMinus = cleaned.startsWith('-');
  const numericPart = cleaned.replace(/-/g, '');
  const dotParts = numericPart.split('.');
  let normalizedNumeric = dotParts[0];
  if (dotParts.length > 1) {
    normalizedNumeric += '.' + dotParts.slice(1).join('');
  }
  
  const parsed = parseFloat((hasMinus ? '-' : '') + normalizedNumeric);
  return isNaN(parsed) ? 0 : parsed;
};
