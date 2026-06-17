export interface VoteOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollData {
  id: string;
  topic: string;
  options: VoteOption[];
  onlineCount: number;
  totalVotes: number;
  isDestroyed: boolean;
}

export interface CreatePollResponse extends PollData {
  adminToken: string;
}
