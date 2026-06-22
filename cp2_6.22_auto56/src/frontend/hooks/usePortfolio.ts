import { useState, useEffect, useCallback } from 'react';

export interface Account {
  id: string;
  name: string;
  type: 'savings' | 'stock' | 'fund';
  initialAmount: number;
  balance: number;
  createdAt: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: string;
  createdAt: number;
  currentPrice: number;
  marketValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

export interface RiskData {
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  concentration: number;
  radar: Array<{
    dimension: string;
    value: number;
    fullMark: number;
  }>;
}

export function usePortfolio() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketQuotes, setMarketQuotes] = useState<StockQuote[]>([]);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      setAccounts(data);
    } catch (e) {
      console.error('Failed to fetch accounts', e);
    }
  }, []);

  const fetchTransactions = useCallback(async (accountId?: string) => {
    try {
      const stockAccounts = accountId
        ? [accountId]
        : accounts.filter((a) => a.type === 'stock').map((a) => a.id);
      const allTxs: Transaction[] = [];
      for (const id of stockAccounts) {
        const res = await fetch(`/api/transactions/${id}`);
        const data = await res.json();
        allTxs.push(...data);
      }
      setTransactions(allTxs);
    } catch (e) {
      console.error('Failed to fetch transactions', e);
    }
  }, [accounts]);

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch('/api/market');
      const data = await res.json();
      setMarketQuotes(data);
    } catch (e) {
      console.error('Failed to fetch market', e);
    }
  }, []);

  const fetchRisk = useCallback(async () => {
    try {
      const res = await fetch('/api/risk');
      const data = await res.json();
      setRiskData(data);
    } catch (e) {
      console.error('Failed to fetch risk', e);
    }
  }, []);

  const addAccount = useCallback(async (account: { name: string; type: 'savings' | 'stock' | 'fund'; initialAmount: number }) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      });
      const data = await res.json();
      setAccounts((prev) => [...prev, data]);
      return data;
    } catch (e) {
      console.error('Failed to add account', e);
    }
  }, []);

  const addTransaction = useCallback(async (tx: { accountId: string; symbol: string; type: 'buy' | 'sell'; quantity: number; price: number; date: string }) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx),
      });
      const data = await res.json();
      await fetchTransactions();
      return data;
    } catch (e) {
      console.error('Failed to add transaction', e);
    }
  }, [fetchTransactions]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchAccounts();
      setLoading(false);
    };
    init();
  }, [fetchAccounts]);

  useEffect(() => {
    if (accounts.length > 0) {
      fetchTransactions();
    }
  }, [accounts, fetchTransactions]);

  useEffect(() => {
    fetchMarket();
    const interval = setInterval(fetchMarket, 2000);
    return () => clearInterval(interval);
  }, [fetchMarket]);

  useEffect(() => {
    fetchRisk();
    const interval = setInterval(fetchRisk, 5000);
    return () => clearInterval(interval);
  }, [fetchRisk]);

  return {
    accounts,
    transactions,
    marketQuotes,
    riskData,
    loading,
    addAccount,
    addTransaction,
    fetchTransactions,
  };
}
