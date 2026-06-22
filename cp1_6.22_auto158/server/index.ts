import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  Transaction,
  Budget,
  User,
  mockUser,
  mockTransactions,
  mockBudgets,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from './models';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let transactions: Transaction[] = [...mockTransactions];
let budgets: Budget[] = [...mockBudgets];
const user: User = mockUser;

app.get('/api/user', (_req: Request, res: Response) => {
  res.json(user);
});

app.get('/api/transactions', (req: Request, res: Response) => {
  const { category, type, startDate, endDate, sort = 'date_desc' } = req.query as {
    category?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    sort?: string;
  };

  let filtered = [...transactions];

  if (category && category !== 'all') {
    filtered = filtered.filter((t) => t.category === category);
  }
  if (type && type !== 'all') {
    filtered = filtered.filter((t) => t.type === type);
  }
  if (startDate) {
    filtered = filtered.filter((t) => t.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((t) => t.date <= endDate);
  }

  if (sort === 'date_desc') {
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } else if (sort === 'date_asc') {
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } else if (sort === 'amount_desc') {
    filtered.sort((a, b) => b.amount - a.amount);
  } else if (sort === 'amount_asc') {
    filtered.sort((a, b) => a.amount - b.amount);
  }

  res.json(filtered);
});

app.post('/api/transactions', (req: Request, res: Response) => {
  const { type, amount, category, date, note } = req.body;
  if (!type || !amount || !category || !date) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const newTransaction: Transaction = {
    id: uuidv4(),
    type,
    amount: Number(amount),
    category,
    date,
    note: note || '',
  };
  transactions.push(newTransaction);
  res.status(201).json(newTransaction);
});

app.put('/api/transactions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { type, amount, category, date, note } = req.body;
  const index = transactions.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '交易记录不存在' });
  }
  transactions[index] = {
    ...transactions[index],
    type: type || transactions[index].type,
    amount: amount ? Number(amount) : transactions[index].amount,
    category: category || transactions[index].category,
    date: date || transactions[index].date,
    note: note !== undefined ? note : transactions[index].note,
  };
  res.json(transactions[index]);
});

app.delete('/api/transactions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = transactions.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '交易记录不存在' });
  }
  const deleted = transactions.splice(index, 1);
  res.json(deleted[0]);
});

app.get('/api/budgets', (_req: Request, res: Response) => {
  res.json(budgets);
});

app.get('/api/budgets/:month', (req: Request, res: Response) => {
  const { month } = req.params;
  const monthBudgets = budgets.filter((b) => b.month === month);
  res.json(monthBudgets);
});

app.post('/api/budgets', (req: Request, res: Response) => {
  const { category, limit, month } = req.body;
  if (!category || !limit || !month) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const existingIndex = budgets.findIndex((b) => b.category === category && b.month === month);
  if (existingIndex !== -1) {
    budgets[existingIndex].limit = Number(limit);
    return res.json(budgets[existingIndex]);
  }
  const newBudget: Budget = {
    id: uuidv4(),
    category,
    limit: Number(limit),
    month,
  };
  budgets.push(newBudget);
  res.status(201).json(newBudget);
});

app.put('/api/budgets/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { limit } = req.body;
  const index = budgets.findIndex((b) => b.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '预算不存在' });
  }
  budgets[index].limit = Number(limit);
  res.json(budgets[index]);
});

app.get('/api/categories', (_req: Request, res: Response) => {
  res.json({
    expense: EXPENSE_CATEGORIES,
    income: INCOME_CATEGORIES,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
