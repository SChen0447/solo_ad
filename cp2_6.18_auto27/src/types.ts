export interface Meeting {
  id: string;
  title: string;
  description: string;
  deadline: string;
  createdAt: string;
  isClosed: boolean;
}

export interface Idea {
  id: string;
  meetingId: string;
  title: string;
  description: string;
  votes: number;
  createdAt: string;
  votedBy: string[];
}

export interface MeetingWithIdeas extends Meeting {
  ideas: Idea[];
}
