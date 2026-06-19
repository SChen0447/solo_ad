export interface Note {
  beat: number;
  pitch: number;
}

export interface Melody {
  id: string;
  name: string;
  tags: string[];
  notes: Note[];
  bpm: number;
  favorite: boolean;
  createdAt: string;
}

const API_BASE = '/api';

export const Api = {
  async loadMelodies(): Promise<Melody[]> {
    const res = await fetch(`${API_BASE}/melodies`);
    if (!res.ok) throw new Error('Failed to load melodies');
    return res.json();
  },

  async saveMelody(data: { name: string; tags: string[]; notes: Note[]; bpm: number }): Promise<Melody> {
    const res = await fetch(`${API_BASE}/melodies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save melody');
    return res.json();
  },

  async updateMelody(id: string, data: Partial<Melody>): Promise<Melody> {
    const res = await fetch(`${API_BASE}/melodies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update melody');
    return res.json();
  },

  async deleteMelody(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/melodies/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete melody');
  },

  async generateShareLink(melodyIds: string[]): Promise<string> {
    const res = await fetch(`${API_BASE}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ melodyIds }),
    });
    if (!res.ok) throw new Error('Failed to generate share link');
    const data = await res.json();
    return data.shareUrl;
  },

  parseShareData(): { name: string; notes: Note[]; bpm: number; tags: string[] }[] | null {
    const params = new URLSearchParams(window.location.search);
    const share = params.get('share');
    if (!share) return null;
    try {
      return JSON.parse(decodeURIComponent(share));
    } catch {
      return null;
    }
  },
};
