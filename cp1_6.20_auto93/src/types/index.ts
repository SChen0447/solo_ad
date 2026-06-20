export interface Topic {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  created_at: string | null;
  deadline: string | null;
  is_voting_ended: boolean;
}

export interface Idea {
  id: string;
  topic_id: string;
  title: string;
  description: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  votes: number;
  created_at: string | null;
}

export interface UserVotes {
  voted_ids: string[];
  remaining_votes: number;
  max_votes: number;
}

export interface VotePayload {
  idea_id: string;
  votes: number;
  user_id: string;
  remaining_votes: number;
}
