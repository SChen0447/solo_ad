export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  createdAt: string;
  deadline: string | null;
  isClosed: boolean;
  voterIPs: string[];
}

export interface VoteRecord {
  pollId: string;
  optionId: string;
  voterIP: string;
  timestamp: string;
}

export interface TimelinePoint {
  timestamp: string;
  optionId: string;
  optionText: string;
  cumulativeVotes: number;
  totalVotesAtTime: number;
}

export interface CreatePollRequest {
  title: string;
  options: string[];
  deadline?: string;
}

export interface VoteRequest {
  optionIds: string[];
}
