export interface Part {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Repertoire {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  progress: number;
  rehearsalCount: number;
  nextRehearsal: string;
  parts: Part[];
}

export interface Performer {
  id: string;
  name: string;
  instrument: string;
  part: string;
}

export interface Rehearsal {
  id: string;
  repertoireId: string;
  date: string;
  performerIds: string[];
  createdAt: string;
}

export interface Score {
  id: string;
  rehearsalId: string;
  performerId: string;
  score: number;
  comment: string;
  createdAt: string;
}

export interface Reply {
  id: string;
  fromName: string;
  content: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  performerId: string;
  fromId: string;
  fromName: string;
  score: number;
  content: string;
  likes: number;
  replies: Reply[];
  createdAt: string;
}

const BASE_URL = '/api';

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const getRepertoires = (): Promise<Repertoire[]> =>
  fetch(`${BASE_URL}/repertoires`).then((res) => handleResponse<Repertoire[]>(res));

export const getPerformers = (): Promise<Performer[]> =>
  fetch(`${BASE_URL}/performers`).then((res) => handleResponse<Performer[]>(res));

export const getPerformerScores = (performerId: string): Promise<Score[]> =>
  fetch(`${BASE_URL}/performers/${performerId}/scores`).then((res) =>
    handleResponse<Score[]>(res)
  );

export const getPerformerFeedback = (performerId: string): Promise<Feedback[]> =>
  fetch(`${BASE_URL}/feedback/${performerId}`).then((res) =>
    handleResponse<Feedback[]>(res)
  );

export const createRehearsal = (
  repertoireId: string,
  date: string,
  performerIds: string[]
): Promise<Rehearsal> =>
  fetch(`${BASE_URL}/rehearsals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repertoireId, date, performerIds }),
  }).then((res) => handleResponse<Rehearsal>(res));

export const submitFeedback = (
  performerId: string,
  fromId: string,
  fromName: string,
  score: number,
  content: string
): Promise<Feedback> =>
  fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ performerId, fromId, fromName, score, content }),
  }).then((res) => handleResponse<Feedback>(res));

export const likeFeedback = (feedbackId: string): Promise<{ success: boolean; likes: number }> =>
  fetch(`${BASE_URL}/feedback/${feedbackId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => handleResponse<{ success: boolean; likes: number }>(res));

export const replyFeedback = (
  feedbackId: string,
  fromName: string,
  content: string
): Promise<Feedback> =>
  fetch(`${BASE_URL}/feedback/${feedbackId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromName, content }),
  }).then((res) => handleResponse<Feedback>(res));
