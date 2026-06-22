import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface Account {
  id: string;
  name: string;
  type: 'savings' | 'stock' | 'fund';
  initialAmount: number;
  balance: number;
  createdAt: number;
}

const accounts = new Map<string, Account>();

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const list = Array.from(accounts.values());
  res.json(list);
});

router.post('/', (req: Request, res: Response) => {
  const { name, type, initialAmount } = req.body;
  if (!name || !type || initialAmount === undefined) {
    res.status(400).json({ error: '缺少必要字段' });
    return;
  }
  const id = uuidv4();
  const account: Account = {
    id,
    name,
    type,
    initialAmount: Number(initialAmount),
    balance: Number(initialAmount),
    createdAt: Date.now(),
  };
  accounts.set(id, account);
  res.status(201).json(account);
});

router.get('/:id', (req: Request, res: Response) => {
  const account = accounts.get(req.params.id);
  if (!account) {
    res.status(404).json({ error: '账户不存在' });
    return;
  }
  res.json(account);
});

export const accountsRouter = router;
export { accounts };
