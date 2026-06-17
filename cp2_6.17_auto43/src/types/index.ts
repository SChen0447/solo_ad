export interface TimerState {
  remaining: number;
  duration: number;
  isRunning: boolean;
  isLocked: boolean;
}

export interface Idea {
  id: string;
  number: number;
  content: string;
  avatarColor: string;
  initials: string;
  createdAt: string;
  likes: number;
}

export interface IdeaWithName extends Idea {
  participantName: string;
}

export interface LikesInfo {
  likes: number;
  liked: boolean;
}

export type Group = Idea[];
