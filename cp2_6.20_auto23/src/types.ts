export interface Artist {
  id: string;
  name: string;
  avatarUrl: string;
  styleTags: string[];
  bio: string;
}

export interface Track {
  id: string;
  artistId: string;
  name: string;
  duration: number;
  releaseDate: string;
  playLink: string;
}

export interface Show {
  id: string;
  artistId: string;
  date: string;
  time: string;
  venue: string;
  notes: string;
}

export interface SearchResult {
  type: 'artist' | 'track';
  data: Artist | Track;
  score: number;
  artist?: Artist;
}

export interface AppState {
  artists: Artist[];
  tracks: Track[];
  shows: Show[];
  loading: boolean;
  styleColors: Record<string, string>;
}

export interface AppContextType extends AppState {
  fetchAllData: () => Promise<void>;
  addArtist: (data: Omit<Artist, 'id'>) => Promise<Artist>;
  addTrack: (data: Omit<Track, 'id'>) => Promise<Track>;
  addShow: (data: Omit<Show, 'id'>) => Promise<Show>;
  updateShow: (id: string, data: Partial<Show>) => Promise<Show>;
  updateTrack: (id: string, data: Partial<Track>) => Promise<Track>;
  deleteShow: (id: string) => Promise<void>;
  search: (q: string) => Promise<SearchResult[]>;
}
