export interface VoteOption {
  id: string;
  text: string;
  votes: number;
}

export interface Vote {
  id: string;
  title: string;
  options: VoteOption[];
  type: 'single' | 'multiple';
  status: 'active' | 'ended';
  createdAt: number;
  voters: string[];
}

export interface CreateVoteData {
  title: string;
  options: string[];
  type: 'single' | 'multiple';
}

export interface VoteState {
  votes: Vote[];
  selectedVoteId: string | null;
  currentUserId: string;
}
