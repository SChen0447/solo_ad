export interface Option {
  id: string;
  text: string;
  votes: number;
}

export interface Vote {
  id: string;
  title: string;
  vote_type: 'single' | 'multiple';
  deadline: number | null;
  creator_id: string;
  created_at: number;
  is_deleted: number;
  options: Option[];
  options_count?: number;
  total_voters: number;
  voter_ids?: string[];
}

export interface ChatMessage {
  id: string;
  vote_id: string;
  nickname: string;
  content: string;
  created_at: number;
}
