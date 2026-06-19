import { readJson, writeJson } from '../../utils/jsonStore.js';
import { v4 as uuidv4 } from 'uuid';
import * as bookService from '../book/bookService.js';
import * as userService from '../user/userService.js';
import * as pointsService from '../points/pointsService.js';

interface Swap {
  id: string;
  requesterId: string;
  bookOfferedId: string;
  bookRequestedId: string;
  ownerId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export type { Swap };

export async function getAll(userId?: string, status?: string): Promise<Swap[]> {
  let swaps = await readJson<Swap>('swaps.json');
  if (userId) {
    swaps = swaps.filter(s => s.requesterId === userId || s.ownerId === userId);
  }
  if (status) {
    swaps = swaps.filter(s => s.status === status);
  }
  return swaps;
}

export async function getById(id: string): Promise<Swap | undefined> {
  const swaps = await readJson<Swap>('swaps.json');
  return swaps.find(s => s.id === id);
}

export async function create(requesterId: string, bookOfferedId: string, bookRequestedId: string): Promise<Swap> {
  const bookRequested = await bookService.getById(bookRequestedId);
  if (!bookRequested) {
    throw new Error(`Requested book ${bookRequestedId} not found`);
  }
  const swaps = await readJson<Swap>('swaps.json');
  const now = new Date().toISOString();
  const newSwap: Swap = {
    id: uuidv4(),
    requesterId,
    bookOfferedId,
    bookRequestedId,
    ownerId: bookRequested.ownerId,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  swaps.push(newSwap);
  await writeJson('swaps.json', swaps);
  return newSwap;
}

export async function accept(id: string): Promise<Swap> {
  const swaps = await readJson<Swap>('swaps.json');
  const idx = swaps.findIndex(s => s.id === id);
  if (idx === -1) {
    throw new Error(`Swap with id ${id} not found`);
  }
  if (swaps[idx].status !== 'pending') {
    throw new Error(`Swap ${id} is not pending, cannot accept`);
  }
  swaps[idx].status = 'accepted';
  swaps[idx].updatedAt = new Date().toISOString();
  await writeJson('swaps.json', swaps);

  setTimeout(async () => {
    try {
      await complete(id);
    } catch (err) {
      console.error(`Auto-complete swap ${id} failed:`, err);
    }
  }, 5000);

  return swaps[idx];
}

export async function reject(id: string): Promise<Swap> {
  const swaps = await readJson<Swap>('swaps.json');
  const idx = swaps.findIndex(s => s.id === id);
  if (idx === -1) {
    throw new Error(`Swap with id ${id} not found`);
  }
  if (swaps[idx].status !== 'pending') {
    throw new Error(`Swap ${id} is not pending, cannot reject`);
  }
  swaps[idx].status = 'rejected';
  swaps[idx].updatedAt = new Date().toISOString();
  await writeJson('swaps.json', swaps);
  return swaps[idx];
}

export async function complete(id: string): Promise<Swap> {
  const swaps = await readJson<Swap>('swaps.json');
  const idx = swaps.findIndex(s => s.id === id);
  if (idx === -1) {
    throw new Error(`Swap with id ${id} not found`);
  }
  if (swaps[idx].status !== 'accepted') {
    throw new Error(`Swap ${id} is not accepted, cannot complete`);
  }
  swaps[idx].status = 'completed';
  swaps[idx].updatedAt = new Date().toISOString();
  await writeJson('swaps.json', swaps);

  await bookService.updateStatus(swaps[idx].bookOfferedId, 'swapped');
  await bookService.updateStatus(swaps[idx].bookRequestedId, 'swapped');

  await userService.addPoints(swaps[idx].requesterId, 10);
  await userService.addPoints(swaps[idx].ownerId, 10);

  await pointsService.create(swaps[idx].requesterId, id, swaps[idx].ownerId, 10);
  await pointsService.create(swaps[idx].ownerId, id, swaps[idx].requesterId, 10);

  return swaps[idx];
}
