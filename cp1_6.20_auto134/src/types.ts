export interface TopicVotes {
  for: number;
  against: number;
  neutral: number;
}

export interface Topic {
  id: string;
  name: string;
  index: number;
  votes: TopicVotes;
  voter_choices: Record<string, string>;
  suggested_duration: number;
  elapsed: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  topic_name: string;
  vote_type: string;
  delta: number;
  total_votes: number;
}

export interface SessionData {
  session_id: string;
  room_code: string;
  title: string;
  description: string;
  speaker_id?: string;
  current_topic: Topic;
  current_topic_index: number;
  topics: Topic[];
  audience_count: number;
  history?: HistoryEntry[];
}

export interface PaceChange {
  type: 'speed_up' | 'slow_down';
  message: string;
}

export type VoteType = 'for' | 'against' | 'neutral';

export type AppView = 'create' | 'join' | 'session';
