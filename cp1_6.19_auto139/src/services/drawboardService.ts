import type {
  Board,
  BoardsResponse,
  BoardResponse,
  Card,
  CardResponse,
  CardType,
  CardContent
} from '../types';

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(BASE_URL + url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `请求失败: ${response.status}`);
  }
  return response.json();
}

export function getAllBoards(): Promise<Board[]> {
  return request<BoardsResponse>('/boards').then(r => r.boards);
}

export function getBoard(id: string): Promise<Board> {
  return request<BoardResponse>(`/boards/${id}`).then(r => r.board);
}

export function createBoard(name: string, themeColor: string): Promise<Board> {
  return request<BoardResponse>('/boards', {
    method: 'POST',
    body: JSON.stringify({ name, themeColor }),
  }).then(r => r.board);
}

export function importBoard(importData: { board: Board }): Promise<Board> {
  return request<BoardResponse>('/boards/import', {
    method: 'POST',
    body: JSON.stringify(importData),
  }).then(r => r.board);
}

export function addCard(
  boardId: string,
  type: CardType,
  content: CardContent,
  x: number,
  y: number
): Promise<Card> {
  return request<CardResponse>(`/boards/${boardId}/cards`, {
    method: 'POST',
    body: JSON.stringify({ type, content, x, y }),
  }).then(r => r.card);
}

export function updateCard(
  boardId: string,
  cardId: string,
  payload: { content?: CardContent; x?: number; y?: number }
): Promise<Card> {
  return request<CardResponse>(`/boards/${boardId}/cards/${cardId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then(r => r.card);
}

export function deleteCard(boardId: string, cardId: string): Promise<boolean> {
  return request<{ success: boolean }>(`/boards/${boardId}/cards/${cardId}`, {
    method: 'DELETE',
  }).then(r => r.success);
}

export function exportBoardJson(boardId: string): Promise<void> {
  return fetch(BASE_URL + `/boards/${boardId}/export`)
    .then(res => {
      if (!res.ok) throw new Error('导出失败');
      const filename = decodeURIComponent(
        res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ||
        `画板_${boardId}.json`
      );
      return res.blob().then(blob => ({ blob, filename }));
    })
    .then(({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
}
