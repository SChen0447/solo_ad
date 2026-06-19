import { readJson, writeJson } from '../../utils/jsonStore.js';
import { v4 as uuidv4 } from 'uuid';

interface PointsTransaction {
  id: string;
  userId: string;
  swapId: string;
  counterpartyId: string;
  points: number;
  createdAt: string;
}

export type { PointsTransaction };

export async function getByUserId(userId: string): Promise<PointsTransaction[]> {
  const transactions = await readJson<PointsTransaction>('points.json');
  return transactions.filter(t => t.userId === userId);
}

export async function create(userId: string, swapId: string, counterpartyId: string, points: number): Promise<PointsTransaction> {
  const transactions = await readJson<PointsTransaction>('points.json');
  const newTransaction: PointsTransaction = {
    id: uuidv4(),
    userId,
    swapId,
    counterpartyId,
    points,
    createdAt: new Date().toISOString(),
  };
  transactions.push(newTransaction);
  await writeJson('points.json', transactions);
  return newTransaction;
}
