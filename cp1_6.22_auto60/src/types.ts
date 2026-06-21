export interface Artist {
  id: number;
  name: string;
  style: string;
  avatar: string;
  description: string;
  materials: string[];
  works: string[];
}

export interface ArtistDetail extends Artist {
  bookedSlots: BookedSlot[];
}

export interface BookedSlot {
  date: string;
  time: string;
}

export interface Appointment {
  id: number;
  artistId: number;
  date: string;
  time: string;
  visitorName: string;
  phone: string;
}

export type StyleCategory = 'all' | '陶瓷' | '木工' | '织物' | '金属';

export const STYLE_COLORS: Record<string, string> = {
  '陶瓷': '#e53e3e',
  '木工': '#dd6b20',
  '织物': '#d69e2e',
  '金属': '#3182ce'
};

export const BRAND_COLOR = '#805ad5';
