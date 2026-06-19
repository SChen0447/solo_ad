import { readJson, writeJson } from '../../utils/jsonStore.js';

interface User {
  id: string;
  name: string;
  avatar: string;
  points: number;
}

export type { User };

export async function getAll(): Promise<User[]> {
  return readJson<User>('users.json');
}

export async function getById(id: string): Promise<User | undefined> {
  const users = await readJson<User>('users.json');
  return users.find(u => u.id === id);
}

export async function getLeaderboard(): Promise<User[]> {
  const users = await readJson<User>('users.json');
  return users.sort((a, b) => b.points - a.points).slice(0, 10);
}

export async function addPoints(userId: string, points: number): Promise<User> {
  const users = await readJson<User>('users.json');
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) {
    throw new Error(`User with id ${userId} not found`);
  }
  users[idx].points += points;
  await writeJson('users.json', users);
  return users[idx];
}
