import GUI from 'lil-gui';
import { FLOOR_COLORS } from '../room/Room';
import { CUSHION_COLORS, FRAME_COLORS } from '../furniture/Sofa';

export interface UIControlCallbacks {
  onFloorColorChange: (color: string) => void;
  onCushionColorChange: (color: string) => void;
  onFrameColorChange: (color: string) => void;
  onGlossinessChange: (value: number) => void;
  onReset: () => void;
}

interface ControlParams {
  floorColor: string;
  cushionColor: string;
  frameColor: string;
  glossiness: number;
}

export class UIControl {
  private gui: GUI;
  private params: ControlParams;
  private callbacks: UIControlCallbacks;
  private isAnimating: boolean = false;
  private glossinessController: any = null;
  private resetButtonEl: HTMLElement | null = null;

  constructor(callbacks: UIControlCallbacks) {
    this.callbacks = callbacks;
    this.params = {
      floorColor: FLOOR_COLORS[0].value,
      cushionColor: CUSHION_COLORS[0].value,
      frameColor: FRAME_COLORS[0].value,
      glossiness: 0.5
    };

    this.gui = new GUI({
      title: '家居配置器',
      width: 240,
      closeFolders: false
    });

    this.gui.domElement.style.position = 'fixed';
    this.gui.domElement.style.top = '16px';
    this.gui.domElement.style.right = '16px';

    this.setupControls();
    this.setupResetFlashStyle();
  }

  private setupResetFlashStyle(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes reset-flash {
        0% {
          background-color: var(--widget-color);
          color: var(--text-color);
        }
        30% {
          background-color: #4caf50;
          color: #ffffff;
        }
        100% {
          background-color: var(--widget-color);
          color: var(--text-color);
        }
      }
      .reset-button-flash button {
        animation: reset-flash 0.6s ease-out !important;
      }
    `;
    document.head.appendChild(style);
  }

  private setupControls(): void {
    const roomFolder = this.gui.addFolder('房间设置');
    const floorColorOptions: Record<string, string> = {};
    FLOOR_COLORS.forEach(c => {
      floorColorOptions[c.name] = c.value;
    });

    roomFolder
      .add(this.params, 'floorColor', floorColorOptions)
      .name('地板颜色')
      .onChange((value: string) => {
        this.callbacks.onFloorColorChange(value);
      });

    const sofaFolder = this.gui.addFolder('沙发定制');

    const cushionColorOptions: Record<string, string> = {};
    CUSHION_COLORS.forEach(c => {
      cushionColorOptions[c.name] = c.value;
    });

    sofaFolder
      .add(this.params, 'cushionColor', cushionColorOptions)
      .name('坐垫颜色')
      .onChange((value: string) => {
        this.callbacks.onCushionColorChange(value);
      });

    const frameColorOptions: Record<string, string> = {};
    FRAME_COLORS.forEach(c => {
      frameColorOptions[c.name] = c.value;
    });

    sofaFolder
      .add(this.params, 'frameColor', frameColorOptions)
      .name('框架颜色')
      .onChange((value: string) => {
        this.callbacks.onFrameColorChange(value);
      });

    this.glossinessController = sofaFolder
      .add(this.params, 'glossiness', 0, 1, 0.1)
      .name('光泽度')
      .onFinishChange((value: number) => {
        this.callbacks.onGlossinessChange(value);
      });

    const resetController = this.gui.add(
      { reset: () => this.handleReset() },
      'reset'
    ).name('重置配置');

    const resetDom = resetController.domElement as HTMLElement;
    if (resetDom.classList) {
      this.resetButtonEl = resetDom;
    }
  }

  private triggerResetFlash(): void {
    if (!this.resetButtonEl) return;

    this.resetButtonEl.classList.remove('reset-button-flash');
    void this.resetButtonEl.offsetWidth;
    this.resetButtonEl.classList.add('reset-button-flash');

    setTimeout(() => {
      this.resetButtonEl?.classList.remove('reset-button-flash');
    }, 650);
  }

  private handleReset(): void {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.triggerResetFlash();

    const startFloorColor = this.params.floorColor;
    const startCushionColor = this.params.cushionColor;
    const startFrameColor = this.params.frameColor;
    const startGlossiness = this.params.glossiness;

    const targetFloorColor = FLOOR_COLORS[0].value;
    const targetCushionColor = CUSHION_COLORS[0].value;
    const targetFrameColor = FRAME_COLORS[0].value;
    const targetGlossiness = 0.5;

    const duration = 500;
    const startTime = performance.now();

    const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          }
        : { r: 0, g: 0, b: 0 };
    };

    const rgbToHex = (r: number, g: number, b: number): string => {
      return (
        '#' +
        [r, g, b]
          .map(x => {
            const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          })
          .join('')
      );
    };

    const lerpColor = (startHex: string, endHex: string, t: number): string => {
      const start = hexToRgb(startHex);
      const end = hexToRgb(endHex);
      return rgbToHex(
        start.r + (end.r - start.r) * t,
        start.g + (end.g - start.g) * t,
        start.b + (end.b - start.b) * t
      );
    };

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      const floorColor = lerpColor(startFloorColor, targetFloorColor, easedProgress);
      const cushionColor = lerpColor(startCushionColor, targetCushionColor, easedProgress);
      const frameColor = lerpColor(startFrameColor, targetFrameColor, easedProgress);
      const glossiness = startGlossiness + (targetGlossiness - startGlossiness) * easedProgress;

      this.params.floorColor = floorColor;
      this.params.cushionColor = cushionColor;
      this.params.frameColor = frameColor;
      this.params.glossiness = glossiness;

      this.callbacks.onFloorColorChange(floorColor);
      this.callbacks.onCushionColorChange(cushionColor);
      this.callbacks.onFrameColorChange(frameColor);
      this.callbacks.onGlossinessChange(glossiness);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.params.floorColor = targetFloorColor;
        this.params.cushionColor = targetCushionColor;
        this.params.frameColor = targetFrameColor;
        this.params.glossiness = targetGlossiness;

        this.gui.controllersRecursive().forEach(ctrl => {
          ctrl.updateDisplay();
        });

        this.isAnimating = false;
      }
    };

    requestAnimationFrame(animate);
  }

  public updateGlossinessDisplay(value: number): void {
    this.params.glossiness = value;
    if (this.glossinessController) {
      this.glossinessController.updateDisplay();
    }
  }

  public updateFloorColor(color: string): void {
    this.params.floorColor = color;
    this.gui.controllersRecursive().forEach(ctrl => {
      if (ctrl.property === 'floorColor') {
        ctrl.updateDisplay();
      }
    });
  }

  public updateCushionColor(color: string): void {
    this.params.cushionColor = color;
  }

  public updateFrameColor(color: string): void {
    this.params.frameColor = color;
  }

  public updateGlossiness(value: number): void {
    this.params.glossiness = value;
  }

  public destroy(): void {
    this.gui.destroy();
  }
}
