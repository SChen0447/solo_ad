export interface User {
  id: string;
  nickname: string;
  avatar: string;
}

export interface Team {
  id: string;
  name: string;
  tags: string[];
  maxMembers: number;
  members: User[];
  creatorId: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  text: string;
  timestamp: number;
  teamId: string;
}
