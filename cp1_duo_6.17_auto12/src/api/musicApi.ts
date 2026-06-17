import axios from 'axios';
import { MusicResult } from '../types';

const ITUNES_API_BASE = 'https://itunes.apple.com';

const genreMap: Record<string, string> = {
  'Pop': 'pop',
  'Rock': 'rock',
  'Electronic': 'electronic',
  'Dance': 'electronic',
  'Classical': 'classical',
  'Jazz': 'classical',
  'Hip-Hop': 'pop',
  'Rap': 'pop',
  'R&B': 'pop',
  'Country': 'pop',
  'Folk': 'pop',
  'Alternative': 'rock',
  'Metal': 'rock',
  'Punk': 'rock',
  'Indie': 'rock'
};

export const musicApi = {
  async searchSongs(query: string): Promise<MusicResult[]> {
    try {
      const response = await axios.get(`${ITUNES_API_BASE}/search`, {
        params: {
          term: query,
          media: 'music',
          entity: 'song',
          limit: 20
        }
      });

      const results = response.data.results || [];
      
      return results.map((item: any, index: number) => ({
        id: `${item.trackId || index}`,
        title: item.trackName || 'Unknown',
        artist: item.artistName || 'Unknown Artist',
        album: item.collectionName || 'Unknown Album',
        coverUrl: item.artworkUrl100?.replace('100x100', '300x300') || '',
        genre: genreMap[item.primaryGenreName] || 'default'
      }));
    } catch (error) {
      console.error('Music search failed:', error);
      return [];
    }
  },

  async searchByArtist(artist: string): Promise<MusicResult[]> {
    return this.searchSongs(artist);
  }
};
