export type VoteType = 'single' | 'multiple' | 'rating';

export type VoteStatus = 'pending' | 'active' | 'ended';

export interface VoteOption {
  id: string;
  text: string;
  votes: number;
  rating?: number;
}

export interface Vote {
  id: string;
  title: string;
  description: string;
  type: VoteType;
  options: VoteOption[];
  status: VoteStatus;
  endTime: string;
  createdAt: string;
  totalVotes: number;
  qrCode?: string;
}

export interface CreateVoteRequest {
  title: string;
  description: string;
  type: VoteType;
  options: string[];
  endTime: string;
}

export interface SubmitVoteRequest {
  voteId: string;
  optionIds: string[];
  ratings?: Record<string, number>;
}
