export interface TypographySample {
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

export const DEFAULT_TEXT = 'Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed.';

export function createDefaultSample(overrides?: Partial<TypographySample>): TypographySample {
  return {
    id: crypto.randomUUID(),
    text: DEFAULT_TEXT,
    fontFamily: 'Roboto',
    fontSize: 16,
    lineHeight: 1.5,
    fontWeight: 400,
    color: '#333333',
    ...overrides,
  };
}
