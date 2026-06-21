export enum VoteType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  RANKING = 'ranking',
}

export interface Room {
  id: string;
  code: string;
  adminKey: string;
  title: string;
  description: string;
  options: string[];
  voteType: VoteType;
  isEnded: boolean;
  createdAt: number;
}

export interface Vote {
  id: string;
  roomId: string;
  voterId: string;
  voterName: string | null;
  selections: number[];
  createdAt: number;
}

export interface Comment {
  id: string;
  roomId: string;
  content: string;
  createdAt: number;
}

export interface VoterInfo {
  voterId: string;
  voterName: string | null;
}

export interface VoteResult {
  optionIndex: number;
  optionText: string;
  count: number;
  percentage: number;
  weightedScore?: number;
  voters: VoterInfo[];
}

export interface ResultsResponse {
  results: VoteResult[];
  totalVotes: number;
}

export interface CreateRoomRequest {
  title: string;
  description?: string;
  options: string[];
  voteType: VoteType;
}

export interface CreateRoomResponse {
  code: string;
  adminKey: string;
  room: Room;
}

export interface SubmitVoteRequest {
  voterId: string;
  voterName?: string;
  selections: number[];
}

export interface CreateCommentRequest {
  content: string;
}
