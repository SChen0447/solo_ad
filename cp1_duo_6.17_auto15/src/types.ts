export interface ColorItem {
  id: string;
  name: string;
  value: string;
  label: string;
}

export interface Theme {
  id: string;
  name: string;
  tags: string[];
  colors: ColorItem[];
  createdAt: number;
}

export type ColorAction =
  | { type: 'SET_COLOR'; payload: { id: string; value: string } }
  | { type: 'SET_ALL_COLORS'; payload: ColorItem[] };
