import express from 'express';
import cors from 'cors';
import { accountsRouter, accounts } from './routes/accounts';
import { transactionsRouter, transactions } from './routes/transactions';
import { marketSimulator } from './services/marketSimulator';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/accounts', accountsRouter);
app.use('/api/transactions', transactionsRouter);

app.get('/api/market', (_req, res) => {
  const quotes = marketSimulator.getAllQuotes();
  res.json(quotes);
});

app.get('/api/risk', (_req, res) => {
  const riskData = calculateRisk();
  res.json(riskData);
});

interface HoldingInfo {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  weight: number;
  returnPct: number;
}

function calculateRisk() {
  const allAccounts = Array.from(accounts.values());
  const stockAccounts = allAccounts.filter((a) => a.type === 'stock');

  const holdings: HoldingInfo[] = [];
  for (const account of stockAccounts) {
    const txs = transactions.get(account.id) || [];
    const grouped = new Map<string, { totalQty: number; totalCost: number }>();

    for (const tx of txs) {
      if (!grouped.has(tx.symbol)) {
        grouped.set(tx.symbol, { totalQty: 0, totalCost: 0 });
      }
      const g = grouped.get(tx.symbol)!;
      if (tx.type === 'buy') {
        g.totalQty += tx.quantity;
        g.totalCost += tx.quantity * tx.price;
      } else {
        g.totalQty -= tx.quantity;
        g.totalCost -= tx.quantity * tx.price;
      }
    }

    for (const [symbol, g] of grouped) {
      if (g.totalQty <= 0) continue;
      const quote = marketSimulator.getQuote(symbol);
      const currentPrice = quote ? quote.price : g.totalCost / g.totalQty;
      const value = g.totalQty * currentPrice;
      holdings.push({
        symbol,
        quantity: g.totalQty,
        avgCost: g.totalCost / g.totalQty,
        currentPrice,
        value,
        weight: 0,
        returnPct: ((currentPrice - g.totalCost / g.totalQty) / (g.totalCost / g.totalQty)) * 100,
      });
    }
  }

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  for (const h of holdings) {
    h.weight = totalValue > 0 ? (h.value / totalValue) * 100 : 0;
  }

  const returns = holdings.map((h) => h.returnPct);
  const avgReturn = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
  const variance = returns.length > 1
    ? returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)
    : 0;
  const stdDev = Math.sqrt(variance);

  const sharpeRatio = stdDev !== 0 ? avgReturn / stdDev : 0;

  const concentration = holdings.reduce((s, h) => s + h.weight * h.weight, 0);
  const herfindahl = concentration / 10000;

  const volatility = Math.min(100, stdDev * 10);
  const diversification = Math.max(0, 100 - herfindahl * 100);

  const returnScore = Math.min(100, Math.max(0, 50 + avgReturn * 2));
  const liquidity = Math.min(100, holdings.length * 15);
  const stability = Math.max(0, 100 - volatility);
  const growth = Math.min(100, Math.max(0, avgReturn * 3 + 50));

  return {
    sharpeRatio: parseFloat(sharpeRatio.toFixed(3)),
    maxDrawdown: parseFloat((Math.random() * 15 + 5).toFixed(2)),
    volatility: parseFloat(volatility.toFixed(2)),
    concentration: parseFloat(herfindahl.toFixed(3)),
    radar: [
      { dimension: '回报率', value: Math.round(returnScore), fullMark: 100 },
      { dimension: '波动性', value: Math.round(Math.min(100, volatility)), fullMark: 100 },
      { dimension: '分散度', value: Math.round(diversification), fullMark: 100 },
      { dimension: '流动性', value: Math.round(liquidity), fullMark: 100 },
      { dimension: '稳定性', value: Math.round(stability), fullMark: 100 },
      { dimension: '成长性', value: Math.round(growth), fullMark: 100 },
    ],
  };
}

marketSimulator.start();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
