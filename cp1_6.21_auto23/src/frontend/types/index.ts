export interface VoteOption {
  id: string;
  text: string;
  votes: number;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  options: VoteOption[];
  createdAt: number;
  deadline: number | null;
  totalVotes: number;
}

export interface VoteRecord {
  activityId: string;
  optionId: string;
  userId: string;
  votedAt: number;
}

export interface UserVoteHistory {
  activityId: string;
  activityTitle: string;
  optionId: string;
  optionText: string;
  votedAt: number;
}
