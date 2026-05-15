export interface Trade {
  id: string;
  date: string;
  time: string;
  pair: string;
  dir: 'Long' | 'Short';
  session: string;
  entry: number;
  exit: number;
  sl: number;
  tp: number;
  lot: number;
  pnl: number;
  currency: string;
  result: 'win' | 'loss' | 'be';
  setup: string;
  emotion: string;
  news: 'no' | 'med' | 'high';
  plan: 'yes' | 'no' | 'partial';
  dur: string;
  reason: string;
  notes: string;
  ss?: string;
  tags?: string[];
  createdAt: any;
  userId: string;
  anomaly?: string;
}
