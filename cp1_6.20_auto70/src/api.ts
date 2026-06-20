import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface LoginResponse {
  token: string;
  email: string;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  open: number;
  high: number;
  low: number;
  prev_close: number;
  volume: number;
  order_book?: {
    asks: { price: number; quantity: number }[];
    bids: { price: number; quantity: number }[];
  };
}

export interface Portfolio {
  cash: number;
  holdings: Holding[];
  total_value: number;
  total_assets: number;
  total_cost: number;
  total_profit: number;
  total_profit_percent: number;
  today_pl: number;
}

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  cost_basis: number;
  current_price: number;
  market_value: number;
  profit: number;
  profit_percent: number;
}

export const login = (email: string, password: string) =>
  api.post<LoginResponse>('/login', { email, password }).then(res => res.data);

export const register = (email: string, password: string) =>
  api.post('/register', { email, password }).then(res => res.data);

export const getQuote = (symbol: string) =>
  api.get<StockQuote>(`/quote/${symbol}`).then(res => res.data);

export const getMarket = (q?: string) =>
  api.get<StockQuote[]>('/market', { params: q ? { q } : {} }).then(res => res.data);

export const getKline = (symbol: string) =>
  api.get<number[][]>(`/kline/${symbol}`).then(res => res.data);

export const placeOrder = (data: { symbol: string; type: 'buy' | 'sell'; price: number; quantity: number }) =>
  api.post('/order', data).then(res => res.data);

export const getPortfolio = () =>
  api.get<Portfolio>('/portfolio').then(res => res.data);

export const getWatchlist = () =>
  api.get<StockQuote[]>('/watchlist').then(res => res.data);

export const addWatchlist = (symbol: string) =>
  api.post('/watchlist', { symbol }).then(res => res.data);

export const removeWatchlist = (symbol: string) =>
  api.delete(`/watchlist/${symbol}`).then(res => res.data);

export default api;
