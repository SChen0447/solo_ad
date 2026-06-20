import axios from 'axios';

export interface NoteData {
  id: string;
  pitch: string;
  beat: number;
  duration: string;
}

export interface ChordData {
  name: string;
  type: string;
  root: string | null;
  color: string;
  start: number;
  end: number;
  measure: number;
  confidence?: number;
}

export interface ChordAnalysisResponse {
  chords: ChordData[];
}

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const musicApi = {
  convertMidiToAudio: async (
    notes: NoteData[],
    bpm: number = 120
  ): Promise<Blob> => {
    try {
      const response = await api.post('/midi-to-audio', {
        notes: notes.map(n => ({
          pitch: n.pitch,
          beat: n.beat,
          duration: n.duration,
        })),
        bpm,
      }, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('MIDI转音频失败:', error);
      throw error;
    }
  },

  analyzeChords: async (
    notes: NoteData[],
    beatsPerMeasure: number = 4
  ): Promise<ChordAnalysisResponse> => {
    try {
      const response = await api.post('/chord-analysis', {
        notes: notes.map(n => ({
          pitch: n.pitch,
          beat: n.beat,
          duration: n.duration,
        })),
        beatsPerMeasure,
      });
      return response.data;
    } catch (error) {
      console.error('和弦分析失败:', error);
      return { chords: [] };
    }
  },

  checkHealth: async (): Promise<{ status: string }> => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      return { status: 'error' };
    }
  },
};

export default musicApi;
