export type ThemeType = 'neon' | 'aurora' | 'lava';

export interface ThemeColors {
  background: number;
  particleColors: number[];
  barGradientStart: number;
  barGradientEnd: number;
  waveformColor: number;
}

export interface Theme {
  name: ThemeType;
  colors: ThemeColors;
}

const THEMES: Record<ThemeType, ThemeColors> = {
  neon: {
    background: 0x0a0a0f,
    particleColors: [0xff00ff, 0x00ffff, 0xff00cc, 0x00ffcc],
    barGradientStart: 0x3344ff,
    barGradientEnd: 0xff00ff,
    waveformColor: 0x00ffff
  },
  aurora: {
    background: 0x0a1a2e,
    particleColors: [0x00ff88, 0x00ccff, 0xffffff, 0x88ffcc],
    barGradientStart: 0x0066ff,
    barGradientEnd: 0x00ff88,
    waveformColor: 0x00ff88
  },
  lava: {
    background: 0x1a0a0a,
    particleColors: [0xff4400, 0xff0000, 0xffaa00, 0xff6600],
    barGradientStart: 0xff3344,
    barGradientEnd: 0xffaa00,
    waveformColor: 0xff4400
  }
};

export class ThemeManager {
  private currentTheme: ThemeType = 'neon';
  private targetTheme: ThemeType = 'neon';
  private transitionProgress: number = 1;
  private readonly transitionDuration: number = 1500;
  private transitionStartTime: number = 0;
  private onThemeChangeCallback: ((colors: ThemeColors) => void) | null = null;

  constructor() {}

  setOnThemeChangeCallback(callback: (colors: ThemeColors) => void): void {
    this.onThemeChangeCallback = callback;
  }

  getCurrentTheme(): ThemeType {
    return this.currentTheme;
  }

  getCurrentColors(): ThemeColors {
    if (this.transitionProgress >= 1) {
      return THEMES[this.currentTheme];
    }

    const fromColors = THEMES[this.currentTheme];
    const toColors = THEMES[this.targetTheme];
    const t = this.transitionProgress;

    return {
      background: this.lerpColor(fromColors.background, toColors.background, t),
      particleColors: fromColors.particleColors.map((color, i) =>
        this.lerpColor(color, toColors.particleColors[i % toColors.particleColors.length], t)
      ),
      barGradientStart: this.lerpColor(fromColors.barGradientStart, toColors.barGradientStart, t),
      barGradientEnd: this.lerpColor(fromColors.barGradientEnd, toColors.barGradientEnd, t),
      waveformColor: this.lerpColor(fromColors.waveformColor, toColors.waveformColor, t)
    };
  }

  switchTheme(theme: ThemeType): void {
    if (theme === this.currentTheme && this.transitionProgress >= 1) {
      return;
    }

    this.targetTheme = theme;
    this.transitionProgress = 0;
    this.transitionStartTime = performance.now();
  }

  update(_deltaTime: number): void {
    if (this.transitionProgress >= 1) {
      if (this.currentTheme !== this.targetTheme) {
        this.currentTheme = this.targetTheme;
      }
      return;
    }

    const elapsed = performance.now() - this.transitionStartTime;
    this.transitionProgress = Math.min(elapsed / this.transitionDuration, 1);

    if (this.transitionProgress >= 1) {
      this.currentTheme = this.targetTheme;
      this.transitionProgress = 1;
    }

    if (this.onThemeChangeCallback) {
      this.onThemeChangeCallback(this.getCurrentColors());
    }
  }

  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 255;
    const g1 = (color1 >> 8) & 255;
    const b1 = color1 & 255;

    const r2 = (color2 >> 16) & 255;
    const g2 = (color2 >> 8) & 255;
    const b2 = color2 & 255;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  static getHexColor(color: number): string {
    return '#' + color.toString(16).padStart(6, '0');
  }

  static hexToRgb(hex: number): { r: number; g: number; b: number } {
    return {
      r: (hex >> 16) & 255,
      g: (hex >> 8) & 255,
      b: hex & 255
    };
  }

  static rgbToHex(r: number, g: number, b: number): number {
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
  }
}
