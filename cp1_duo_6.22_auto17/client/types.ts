export interface VoteOption {
  id: string;
  text: string;
  votes: number;
}

export interface Vote {
  id: string;
  title: string;
  description: string;
  options: VoteOption[];
  isClosed: boolean;
  createdAt: number;
  creatorId: string;
}

export interface HistoryVote {
  id: string;
  title: string;
  createdAt: number;
  isClosed: boolean;
  viewedAt: number;
}

export interface CreateVoteResponse {
  vote: Vote;
  creatorId: string;
}
