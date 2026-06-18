export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface VoteRecord {
  timestamp: number;
  optionId: string;
  pollId: string;
}

export interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  createdAt: number;
  deadline?: number;
  isClosed: boolean;
  isMultiSelect: boolean;
  votedIps: string[];
  voteHistory: VoteRecord[];
}

export interface CreatePollRequest {
  title: string;
  options: string[];
  deadline?: number;
  isMultiSelect?: boolean;
}

export interface SubmitVoteRequest {
  pollId: string;
  optionIds: string[];
}

export interface PollResult {
  id: string;
  title: string;
  options: PollOption[];
  totalVotes: number;
  isClosed: boolean;
  isMultiSelect: boolean;
  deadline?: number;
  voteHistory: VoteRecord[];
}
