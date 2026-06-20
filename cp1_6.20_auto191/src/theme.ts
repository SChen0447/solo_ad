export interface Theme {
  name: string;
  primary: string;
  secondary: string;
  hex: string;
}

export const THEMES: Theme[] = [
  {
    name: '黑客绿',
    primary: '#00FF00',
    secondary: '#00AA00',
    hex: '#00FF00'
  },
  {
    name: '冰蓝色',
    primary: '#00BFFF',
    secondary: '#0080AA',
    hex: '#00BFFF'
  },
  {
    name: '火焰橙',
    primary: '#FF4500',
    secondary: '#CC3300',
    hex: '#FF4500'
  },
  {
    name: '霓虹紫',
    primary: '#AA00FF',
    secondary: '#7700AA',
    hex: '#AA00FF'
  }
];

export const COLORS = {
  background: '#0A0A0A',
  panelBg: 'rgba(20, 20, 20, 0.9)',
  text: '#E0E0E0',
  textMuted: '#888888',
  sliderTrack: '#444444',
  white: '#FFFFFF'
} as const;

export const SIZES = {
  panelWidth: 300,
  panelHeight: 180,
  buttonWidth: 120,
  buttonHeight: 40,
  borderRadius: 12,
  buttonRadius: 6,
  labelFontSize: 14
} as const;

export const ANIMATION = {
  panelTransition: { duration: 0.3, ease: 'easeOut' },
  colorTransition: { duration: 0.2 },
  buttonHover: { duration: 0.15 },
  buttonClick: { duration: 0.1 }
} as const;
