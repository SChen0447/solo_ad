export enum Status {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CLOSED = 'closed',
}

export enum FeedbackType {
  FEATURE = 'feature',
  BUG = 'bug',
  OTHER = 'other',
}

export interface Note {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  title: string;
  type: FeedbackType;
  description: string;
  status: Status;
  createdAt: string;
  notes: Note[];
}

export interface FeedbackListResponse {
  data: Feedback[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateFeedbackRequest {
  title: string;
  type: FeedbackType;
  description: string;
}

export interface UpdateStatusRequest {
  status: Status;
}

export interface AddNoteRequest {
  content: string;
}

export interface TrendDataPoint {
  date: string;
  count: number;
}

export interface TypeDistribution {
  type: FeedbackType;
  count: number;
  name: string;
}
