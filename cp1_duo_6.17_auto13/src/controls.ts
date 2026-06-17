import GUI from 'lil-gui';
import type { TectonicParams } from './terrain';

export interface ControlCallbacks {
  onParamsChange: (params: Partial<TectonicParams>) => void;
}

interface ModeColors {
  fill: string;
  track: string;
}

const MODE_COLORS: Record<string, ModeColors> = {
  compression: { fill: '#E53935', track: '#3d1a1a' },
  stretch: { fill: '#FDD835', track: '#3d3a1a' },
  shear: { fill: '#1E88E5', track: '#1a2d3d' }
};

const DEFAULT_COLORS: ModeColors = {
  fill: '#888888',
  track: '#3a3a3c'
};

export class ControlPanel {
  private gui: GUI;
  private params: TectonicParams;
  private callbacks: ControlCallbacks;
  private modeLabel: HTMLElement;
  private paramLabel: HTMLElement;
  private styleEl: HTMLStyleElement;
  private compressionCtrl: any;
  private stretchCtrl: any;
  private shearCtrl: any;

  constructor(callbacks: ControlCallbacks) {
    this.callbacks = callbacks;
    this.params = { compression: 0, stretch: 0, shearAngle: 0 };

    this.modeLabel = document.getElementById('mode-label')!;
    this.paramLabel = document.getElementById('param-label')!;

    this.gui = new GUI({
      title: 'Tectonic Controls',
      container: document.body,
      width: 310
    });

    this.styleEl = document.createElement('style');
    document.head.appendChild(this.styleEl);

    this.applyBaseStyles();
    this.setupSliders();
    this.updateInfoDisplay();
    this.updateSliderColors();
  }

  private applyBaseStyles(): void {
    const domElement = this.gui.domElement;
    domElement.style.position = 'fixed';
    domElement.style.top = '16px';
    domElement.style.right = '16px';
    domElement.style.zIndex = '100';
    domElement.style.borderRadius = '8px';

    this.styleEl.textContent = `
      .lil-gui {
        --background-color: rgba(44, 44, 46, 0.92) !important;
        --widget-color: #3a3a3c !important;
        --focus-color: #5a5a5c !important;
        --hover-color: #4a4a4c !important;
        --number-color: #E0E0E0 !important;
        --text-color: #E0E0E0 !important;
        --title-background-color: rgba(44, 44, 46, 0.98) !important;
        --font-family: system-ui !important;
        --font-size: 14px !important;
      }
      .lil-gui .title {
        background-color: rgba(44, 44, 46, 0.98) !important;
        color: #E0E0E0 !important;
        font-size: 14px !important;
        font-weight: 600 !important;
      }
      .lil-gui .controller {
        padding: 6px 12px !important;
        min-height: 34px !important;
      }
      .lil-gui .controller .name {
        color: #E0E0E0 !important;
        font-size: 14px !important;
        width: 115px !important;
      }
      .lil-gui .controller .slider {
        height: 6px !important;
        border-radius: 3px !important;
        flex: 1 1 auto !important;
        transition: background-color 0.2s ease !important;
      }
      .lil-gui .controller .widget {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
      }
      .lil-gui .controller .slider .fill {
        height: 100% !important;
        border-radius: 3px !important;
        transition: background-color 0.2s ease !important;
      }
      .lil-gui .controller input[type="text"],
      .lil-gui .controller input[type="number"] {
        color: #E0E0E0 !important;
        background-color: #3a3a3c !important;
        border: 1px solid #4a4a4c !important;
        border-radius: 4px !important;
        font-size: 13px !important;
        padding: 3px 8px !important;
        width: 55px !important;
        text-align: right !important;
        font-weight: 600 !important;
        min-width: 45px !important;
      }
      .lil-gui .controller input[type="text"]:focus,
      .lil-gui .controller input[type="number"]:focus {
        outline: none !important;
        border-color: #6a6a6c !important;
      }
      .lil-gui .controller.display-mode .name {
        font-weight: 700 !important;
      }
    `;
  }

  private setupSliders(): void {
    this.compressionCtrl = this.gui
      .add(this.params, 'compression', 0, 10, 0.1)
      .name('Compression')
      .onChange((_value: number) => {
        this.handleParamChange();
      });

    this.stretchCtrl = this.gui
      .add(this.params, 'stretch', 0, 5, 0.1)
      .name('Stretch')
      .onChange((_value: number) => {
        this.handleParamChange();
      });

    this.shearCtrl = this.gui
      .add(this.params, 'shearAngle', 0, 360, 1)
      .name('Shear Angle')
      .onChange((_value: number) => {
        this.handleParamChange();
      });
  }

  private handleParamChange(): void {
    this.callbacks.onParamsChange({ ...this.params });
    this.updateInfoDisplay();
    this.updateSliderColors();
  }

  private getActiveMode(): string {
    const { compression, stretch, shearAngle } = this.params;
    const cNorm = compression / 10;
    const sNorm = stretch / 5;
    const shNorm = shearAngle / 360;

    if (cNorm === 0 && sNorm === 0 && shNorm === 0) {
      return 'none';
    }

    let maxMode = 'compression';
    let maxValue = cNorm;

    if (sNorm > maxValue) {
      maxValue = sNorm;
      maxMode = 'stretch';
    }
    if (shNorm > maxValue) {
      maxValue = shNorm;
      maxMode = 'shear';
    }

    return maxMode;
  }

  private updateSliderColors(): void {
    const activeMode = this.getActiveMode();
    const { compression, stretch, shearAngle } = this.params;

    const compActive = activeMode === 'compression' && compression > 0.05;
    const stretchActive = activeMode === 'stretch' && stretch > 0.05;
    const shearActive = activeMode === 'shear' && shearAngle > 0.5;

    this.applySliderStyle('compression', compActive ? MODE_COLORS.compression : DEFAULT_COLORS);
    this.applySliderStyle('stretch', stretchActive ? MODE_COLORS.stretch : DEFAULT_COLORS);
    this.applySliderStyle('shear', shearActive ? MODE_COLORS.shear : DEFAULT_COLORS);

    this.compressionCtrl.domElement.classList.toggle('display-mode', compActive);
    this.stretchCtrl.domElement.classList.toggle('display-mode', stretchActive);
    this.shearCtrl.domElement.classList.toggle('display-mode', shearActive);
  }

  private applySliderStyle(mode: string, colors: ModeColors): void {
    const selector = mode === 'compression'
      ? '.lil-gui .controller:nth-of-type(2) .slider'
      : mode === 'stretch'
        ? '.lil-gui .controller:nth-of-type(3) .slider'
        : '.lil-gui .controller:nth-of-type(4) .slider';

    const fillSelector = selector + ' .fill';

    const existingTrack = this.styleEl.sheet?.cssRules.length
      ? Array.from(this.styleEl.sheet!.cssRules).findIndex(
          (r: any) => r.selectorText === selector
        )
      : -1;

    const existingFill = this.styleEl.sheet?.cssRules.length
      ? Array.from(this.styleEl.sheet!.cssRules).findIndex(
          (r: any) => r.selectorText === fillSelector
        )
      : -1;

    if (existingTrack >= 0) {
      (this.styleEl.sheet!.cssRules[existingTrack] as CSSStyleRule).style.backgroundColor = colors.track;
    } else {
      this.styleEl.sheet!.insertRule(
        `${selector} { background-color: ${colors.track} !important; }`,
        this.styleEl.sheet!.cssRules.length
      );
    }

    if (existingFill >= 0) {
      (this.styleEl.sheet!.cssRules[existingFill] as CSSStyleRule).style.backgroundColor = colors.fill;
    } else {
      this.styleEl.sheet!.insertRule(
        `${fillSelector} { background-color: ${colors.fill} !important; }`,
        this.styleEl.sheet!.cssRules.length
      );
    }
  }

  private updateInfoDisplay(): void {
    const { compression, stretch, shearAngle } = this.params;

    let modeName = 'Flat';
    const activeModes: string[] = [];

    if (compression > 0.1) activeModes.push('Compression');
    if (stretch > 0.1) activeModes.push('Stretch');
    if (shearAngle > 0.5) activeModes.push('Shear');

    if (activeModes.length === 1) {
      modeName = activeModes[0];
    } else if (activeModes.length > 1) {
      modeName = activeModes.join(' + ');
    }

    this.modeLabel.textContent = modeName;
    this.paramLabel.textContent = `Compression: ${compression.toFixed(1)} | Stretch: ${stretch.toFixed(1)} | Shear: ${shearAngle.toFixed(0)}°`;
  }

  public getParams(): TectonicParams {
    return { ...this.params };
  }
}
