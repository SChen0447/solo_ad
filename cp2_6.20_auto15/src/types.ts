export interface Work {
  id: string;
  name: string;
  duration: number;
  releaseDate: string;
  playUrl: string;
  artistId: string;
}

export interface Artist {
  id: string;
  name: string;
  avatarUrl: string;
  styleTags: string[];
  bio: string;
  works: Work[];
}

export interface Performance {
  id: string;
  artistId: string;
  date: string;
  time: string;
  venue: string;
  notes: string;
}

export interface SearchResult {
  type: 'artist' | 'work';
  id: string;
  name: string;
  artistId?: string;
  artistName?: string;
  matchScore: number;
}
