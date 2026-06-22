export interface User {
  id: string;
  username: string;
  avatar: string;
  online: boolean;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  mentions: string[];
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: User | null;
  deadline: string | null;
  comments: Comment[];
  laneId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lane {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Board {
  id: string;
  name: string;
  members: User[];
  lanes: Lane[];
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: 'mention' | 'assignment';
  content: string;
  taskId: string;
  taskTitle: string;
  fromUser: User;
  toUserId: string;
  read: boolean;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
}
