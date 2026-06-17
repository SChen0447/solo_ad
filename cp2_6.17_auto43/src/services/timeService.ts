import type { TimerState } from '../types';

const API_BASE = '/api';

export async function getTimerState(): Promise<TimerState> {
  const response = await fetch(`${API_BASE}/timer`);
  if (!response.ok) {
    throw new Error('Failed to fetch timer state');
  }
  return response.json();
}

export async function startTimer(duration: number): Promise<TimerState> {
  const response = await fetch(`${API_BASE}/timer/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ duration }),
  });
  if (!response.ok) {
    throw new Error('Failed to start timer');
  }
  return response.json();
}

export async function resetTimer(): Promise<TimerState> {
  const response = await fetch(`${API_BASE}/timer/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to reset timer');
  }
  return response.json();
}
