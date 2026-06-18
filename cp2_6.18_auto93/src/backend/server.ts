import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { PurchaseRequest, CreateRequestPayload, UpdateStatusPayload, RequestStatus } from './types';

const app = express();
const PORT = 8765;

app.use(cors());
app.use(express.json());

const requests: PurchaseRequest[] = [];

const calculateTotal = (items: { quantity: number; unitPrice: number }[]): number => {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
};

app.get('/api/requests', (_req: Request, res: Response<PurchaseRequest[]>) => {
  const sorted = [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sorted);
});

app.post('/api/requests', (req: Request<unknown, unknown, CreateRequestPayload>, res: Response<PurchaseRequest>) => {
  const { title, items, applicant } = req.body;

  if (!title || !items || !items.length || !applicant) {
    res.status(400).json({} as PurchaseRequest);
    return;
  }

  const now = new Date().toISOString();
  const newRequest: PurchaseRequest = {
    id: uuidv4(),
    title,
    items,
    applicant,
    status: 'pending',
    total: calculateTotal(items),
    createdAt: now,
    updatedAt: now,
  };

  requests.unshift(newRequest);
  res.status(201).json(newRequest);
});

app.patch(
  '/api/requests/:id',
  (req: Request<{ id: string }, unknown, UpdateStatusPayload>, res: Response<PurchaseRequest | { error: string }>) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses: RequestStatus[] = ['pending', 'approved', 'rejected', 'delivered'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const requestIndex = requests.findIndex((r) => r.id === id);
    if (requestIndex === -1) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    requests[requestIndex] = {
      ...requests[requestIndex],
      status,
      updatedAt: new Date().toISOString(),
    };

    res.json(requests[requestIndex]);
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
