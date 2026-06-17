export enum Breakpoint {
  DESKTOP = 1200,
  TABLET = 768,
  MOBILE = 375,
}

export enum ComponentType {
  NAVBAR = 'navbar',
  CAROUSEL = 'carousel',
  CARD_GRID = 'card_grid',
  TWO_COLUMN = 'two_column',
  THREE_COLUMN = 'three_column',
  FOOTER = 'footer',
}

export interface LayoutComponentStyle {
  backgroundColor: string;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  borderRadius: number;
}

export interface LayoutComponent {
  id: string;
  type: ComponentType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked: boolean;
  style: LayoutComponentStyle;
}

export interface ComponentTemplate {
  type: ComponentType;
  name: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultColor: string;
}

export interface HistoryState {
  components: LayoutComponent[];
}

export type ColorFormat = 'hex' | 'rgb' | 'hsl';
