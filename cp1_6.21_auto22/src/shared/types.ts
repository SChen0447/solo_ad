export interface Agenda {
  _id: string;
  title: string;
  time: string;
  participants: string[];
  description: string;
  topics: Topic[];
  createdAt: string;
}

export interface Topic {
  id: string;
  title: string;
  assignee: string;
  deadline: string;
  completed: boolean;
  order: number;
}

export interface Note {
  id: string;
  topicId: string;
  agendaId: string;
  nickname: string;
  content: string;
  timestamp: string;
}

export interface ActionItem {
  _id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'closed';
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  deadline: string;
  topicId: string;
  agendaId: string;
  comments: Comment[];
  attachments: Attachment[];
  createdAt: string;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

export interface Attachment {
  id: string;
  filename: string;
  size: number;
  url: string;
  uploadedAt: string;
}
