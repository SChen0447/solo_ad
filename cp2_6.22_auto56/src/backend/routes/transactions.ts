import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { marketSimulator } from '../services/marketSimulator';

export interface Transaction {
  id: string;
  accountId: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: string;
  createdAt: number;
}

interface TransactionWithMarket extends Transaction {
  currentPrice: number;
  marketValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

const transactions = new Map<string, Transaction[]>();

const router = Router();

router.get('/:accountId', (req: Request, res: Response) => {
  const accountId = req.params.accountId;
  const list = transactions.get(accountId) || [];

  const enriched: TransactionWithMarket[] = list.map((tx) => {
    const quote = marketSimulator.getQuote(tx.symbol);
    const currentPrice = quote ? quote.price : tx.price;
    const marketValue = tx.type === 'buy'
      ? tx.quantity * currentPrice
      : tx.quantity * (2 * tx.price - currentPrice);
    const costBasis = tx.quantity * tx.price;
    const profitLoss = tx.type === 'buy'
      ? marketValue - costBasis
      : costBasis - marketValue;
    const profitLossPercent = costBasis !== 0 ? (profitLoss / costBasis) * 100 : 0;

    return {
      ...tx,
      currentPrice,
      marketValue: parseFloat(marketValue.toFixed(2)),
      profitLoss: parseFloat(profitLoss.toFixed(2)),
      profitLossPercent: parseFloat(profitLossPercent.toFixed(2)),
    };
  });

  res.json(enriched);
});

router.post('/', (req: Request, res: Response) => {
  const { accountId, symbol, type, quantity, price, date } = req.body;
  if (!accountId || !symbol || !type || !quantity || !price || !date) {
    res.status(400).json({ error: '缺少必要字段' });
    return;
  }

  const id = uuidv4();
  const tx: Transaction = {
    id,
    accountId,
    symbol: symbol.toUpperCase(),
    type,
    quantity: Number(quantity),
    price: Number(price),
    date,
    createdAt: Date.now(),
  };

  if (!transactions.has(accountId)) {
    transactions.set(accountId, []);
  }
  transactions.get(accountId)!.push(tx);

  res.status(201).json(tx);
});

export const transactionsRouter = router;
export { transactions };
