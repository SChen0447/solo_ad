export interface TypesetParams {
  id: string;
  letterSpacing: number;
  lineHeight: number;
  fontSize: number;
  fontWeight: number;
  color: string;
}

export interface FontData {
  name: string;
  buffer: ArrayBuffer | null;
  fontUrl: string | null;
  family: string;
  isCustom: boolean;
  metrics?: {
    ascender: number;
    descender: number;
    unitsPerEm: number;
  };
}

export interface PreviewColumn {
  id: string;
  paramsId: string;
  isActive: boolean;
}

export type FontWeight = 300 | 400 | 500 | 600 | 700 | 800 | 900;

export const PRESET_FONTS = [
  { name: 'Open Sans', family: "'Open Sans', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap' },
  { name: 'Roboto', family: "'Roboto', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap' },
  { name: 'Playfair Display', family: "'Playfair Display', serif", url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap' },
  { name: 'Source Code Pro', family: "'Source Code Pro', monospace", url: 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@300;400;500;600;700;800;900&display=swap' },
] as const;

export const DEFAULT_PARAMS: Omit<TypesetParams, 'id'> = {
  letterSpacing: 0,
  lineHeight: 1.5,
  fontSize: 36,
  fontWeight: 400,
  color: '#333333',
};
