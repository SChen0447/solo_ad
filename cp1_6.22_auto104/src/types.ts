export type CatStatus = 'healthy' | 'injured' | 'needsAdoption' | 'spayed';

export interface Feedback {
  id: string;
  catPointId: string;
  author: string;
  content: string;
  status: CatStatus;
  images: string[];
  createdAt: string;
}

export interface CatPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  catCount: number;
  lastFedAt: string;
  images: string[];
  feedbacks: Feedback[];
  hasNewUpdate: boolean;
}

export interface ApiCatPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  catCount: number;
  lastFedAt: string;
  images: string[];
  hasNewUpdate: boolean;
}

export interface CreateFeedbackPayload {
  catPointId: string;
  author: string;
  content: string;
  status: CatStatus;
}
