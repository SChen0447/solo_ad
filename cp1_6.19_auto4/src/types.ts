export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: number;
  status: 'pending' | 'resolved';
  startOffset: number;
  endOffset: number;
  selectedText: string;
}

export interface DocumentVersion {
  id: string;
  timestamp: number;
  content?: string;
  comments?: Comment[];
}

export interface User {
  id: string;
  username: string;
}
