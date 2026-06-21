export interface Podcast {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  author: string;
  subscribed: boolean;
  subscribedAt?: string;
  lastUpdated: string;
  episodeCount: number;
}

export interface Episode {
  id: string;
  podcastId: string;
  title: string;
  publishDate: string;
  duration: number;
  summary: string;
  coverUrl: string;
  rating: number;
}

export type ListeningStatus = 'not_started' | 'in_progress' | 'completed';

export interface ListeningProgress {
  episodeId: string;
  position: number;
  status: ListeningStatus;
  updatedAt: string;
}

export interface GeneratePlaylistRequest {
  maxDuration: number;
  subscribedPodcastIds: string[];
}

export interface GeneratePlaylistResponse {
  episodes: Episode[];
  totalDuration: number;
}
