export interface Participant {
  id: string;
  name: string;
  avatar: string;
}

export type Priority = 'high' | 'medium' | 'low';

export interface CardData {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: Priority;
  columnId: string;
  order: number;
  createdAt: number;
  lockedBy?: string;
}

export type ColumnId = 'todo' | 'in-progress' | 'done';

export interface Column {
  id: ColumnId;
  title: string;
}

export const COLUMNS: Column[] = [
  { id: 'todo', title: '待办' },
  { id: 'in-progress', title: '进行中' },
  { id: 'done', title: '已完成' }
];

export interface RoomState {
  roomId: string;
  clientId: string;
  participant: Participant;
  participants: Participant[];
  cards: CardData[];
}
