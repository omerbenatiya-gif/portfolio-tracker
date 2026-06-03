export interface Asset {
  id: number;
  name: string;
  ticker: string;
  type: 'crypto' | 'stock' | 'etf' | 'other';
  quantity: number;
  avg_cost_usd: number;
  btc_address: string | null;
  created_at: string;
}

export interface Deposit {
  id: number;
  date: string;
  amount_ils: number | null;
  amount_usd: number | null;
  note: string | null;
  created_at: string;
}

export interface PriceData {
  ticker: string;
  priceUsd: number;
  changePercent24h: number;
}

export interface PricesResponse {
  prices: Record<string, PriceData>;
  usdToIls: number;
}

export interface PortfolioSnapshot {
  id: number;
  date: string;
  total_value_usd: number;
  total_value_ils: number;
  created_at: string;
}
