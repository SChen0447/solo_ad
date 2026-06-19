export interface Comment {
  id: string;
  taskId: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  columnId: string;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  title: string;
  order: number;
}

export type ColumnId = string;
