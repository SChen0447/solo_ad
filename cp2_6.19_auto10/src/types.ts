export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  cover: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  year: number;
  songs: Song[];
}

export interface Playlist {
  id: string;
  name: string;
  cover: string;
  description: string;
  songs: Song[];
}

export type NavKey = 'my-music' | 'albums' | 'playlists' | 'recent';

export interface NavItem {
  key: NavKey;
  label: string;
  icon: string;
}
