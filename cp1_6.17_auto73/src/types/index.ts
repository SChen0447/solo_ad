export interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: number;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  author_id: string;
  author_name: string;
  likes: string[];
  votes: Record<string, number>;
  comments: Comment[];
  importance_score: number;
  urgency_score: number;
  matrix_x: number;
  matrix_y: number;
  created_at: number;
  likes_count: number;
  votes_count: number;
  average_rating: number;
}

export interface Weights {
  importance_weight: number;
  urgency_weight: number;
}

export interface IdeaResponse {
  ideas: Idea[];
  weights: Weights;
}

export interface CreateIdeaData {
  title: string;
  description: string;
  author_name: string;
}

export interface VoteData {
  user_id: string;
  rating: number;
}

export interface LikeData {
  user_id: string;
}

export interface CommentData {
  user_id: string;
  user_name: string;
  content: string;
}

export interface MatrixPosition {
  idea_id: string;
  matrix_x: number;
  matrix_y: number;
}

export type WebSocketEventType =
  | 'idea_created'
  | 'idea_updated'
  | 'matrix_updated'
  | 'weights_updated'
  | 'client_connected';

export interface WebSocketMessage {
  type: WebSocketEventType;
  data: Idea | { weights: Weights; ideas: Idea[] } | { client_id: string; timestamp: number };
}
