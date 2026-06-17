export interface ColorItem {
  id: string;
  name: string;
  value: string;
  label: string;
  locked: boolean;
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
  | { type: 'TOGGLE_LOCK'; payload: { id: string } }
  | { type: 'SET_ALL_COLORS'; payload: ColorItem[] };
