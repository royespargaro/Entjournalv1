export interface Trade {
  id: string;
  userId: string;
  type: "trade" | "recap" | "import";
  date: string;
  createdAt: any;

  // SHARED FIELDS
  pnl: number;
  session: string;
  killZone: string;
  emotion: string;
  notes: string;
  tags: string[];

  // TRADE ONLY fields
  symbol: string | null;
  direction: "Long" | "Short" | null;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  lotSize: number | null;
  setup: string | null;
  riskReward: number | null;
  result: "WIN" | "LOSS" | "BREAKEVEN" | null;

  // RECAP ONLY fields
  recapSummary: string | null;
  tradeCount: number | null;
  wins: number | null;
  losses: number | null;

  // LEGACY FIELDS (mapped by normalization)
  pair?: string | null;
  dir?: "Long" | "Short" | null;
  entry?: number | null;
  exit?: number | null;
  sl?: number | null;
  tp?: number | null;
  lot?: number | null;
  currency?: string | null;
  plan?: string | null;
  news?: string | null;
  dur?: string | null;
  reason?: string | null;
  ss?: string | null;
  anomaly?: string | null;
  time?: string | null;
}
