import { useGameStore } from '@/store';
import type { Room, GameState } from '@/types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createRoom(nickname: string): Promise<{ roomId: string }> {
  await delay(50 + Math.random() * 100);
  const roomId = useGameStore.getState().createRoom(nickname);
  return { roomId };
}

export async function getRooms(): Promise<Room[]> {
  await delay(50 + Math.random() * 100);
  return useGameStore.getState().getAvailableRooms();
}

export async function joinRoom(
  roomId: string,
  nickname: string
): Promise<{ success: boolean; message: string }> {
  await delay(50 + Math.random() * 100);
  const success = useGameStore.getState().joinRoom(roomId, nickname);
  return {
    success,
    message: success ? 'Joined room successfully' : 'Failed to join room',
  };
}

export async function getRoom(roomId: string): Promise<Room | null> {
  await delay(50 + Math.random() * 100);
  return useGameStore.getState().getRoom(roomId) ?? null;
}

export async function getGameState(roomId: string): Promise<GameState | null> {
  await delay(50 + Math.random() * 100);
  return useGameStore.getState().gameStates[roomId] ?? null;
}
