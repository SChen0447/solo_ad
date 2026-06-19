export interface SampleConfig {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
  color: string;
}

export const FONT_FAMILIES = [
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Playfair Display',
  'Source Code Pro',
] as const;

export const DEFAULT_TEXT = '天将降大任于是人也，必先苦其心志，劳其筋骨，饿其体肤，空乏其身，行拂乱其所为，所以动心忍性，曾益其所不能。';

export function createDefaultSample(id: string): SampleConfig {
  return {
    id,
    text: DEFAULT_TEXT,
    fontFamily: 'Roboto',
    fontSize: 16,
    lineHeight: 1.6,
    fontWeight: 400,
    color: '#333333',
  };
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
