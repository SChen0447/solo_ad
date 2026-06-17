import GUI from 'lil-gui';
import type { TectonicParams } from './terrain';

export interface ControlCallbacks {
  onParamsChange: (params: Partial<TectonicParams>) => void;
}

export class ControlPanel {
  private gui: GUI;
  private params: TectonicParams;
  private callbacks: ControlCallbacks;
  private modeLabel: HTMLElement;
  private paramLabel: HTMLElement;

  constructor(callbacks: ControlCallbacks) {
    this.callbacks = callbacks;
    this.params = { compression: 0, stretch: 0, shearAngle: 0 };

    this.modeLabel = document.getElementById('mode-label')!;
    this.paramLabel = document.getElementById('param-label')!;

    this.gui = new GUI({
      title: 'Tectonic Controls',
      container: document.body,
      width: 280
    });

    this.applyGUIStyles();
    this.setupSliders();
    this.updateInfoDisplay();
  }

  private applyGUIStyles(): void {
    const domElement = this.gui.domElement;
    domElement.style.position = 'fixed';
    domElement.style.top = '16px';
    domElement.style.right = '16px';
    domElement.style.zIndex = '100';
    domElement.style.background = 'rgba(44, 44, 46, 0.92)';
    domElement.style.borderRadius = '8px';
    domElement.style.backdropFilter = 'blur(6px)';
    domElement.style.fontFamily = 'system-ui';
    domElement.style.color = '#E0E0E0';
    domElement.style.fontSize = '14px';

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .lil-gui {
        --background-color: rgba(44, 44, 46, 0.92) !important;
        --widget-color: #3a3a3c !important;
        --focus-color: #5a5a5c !important;
        --hover-color: #4a4a4c !important;
        --font-family: system-ui !important;
        --text-color: #E0E0E0 !important;
        --title-background-color: rgba(44, 44, 46, 0.98) !important;
      }
      .lil-gui .title {
        background-color: rgba(44, 44, 46, 0.98) !important;
        color: #E0E0E0 !important;
        font-size: 14px !important;
        font-weight: 600 !important;
      }
      .lil-gui .controller .name {
        color: #E0E0E0 !important;
        font-size: 14px !important;
      }
      .lil-gui .controller .slider {
        height: 6px !important;
        border-radius: 3px !important;
      }
      .lil-gui .controller.compression .slider .fill {
        background-color: #E53935 !important;
      }
      .lil-gui .controller.compression .slider {
        background-color: #4a2020 !important;
      }
      .lil-gui .controller.stretch .slider .fill {
        background-color: #FDD835 !important;
      }
      .lil-gui .controller.stretch .slider {
        background-color: #4a4420 !important;
      }
      .lil-gui .controller.shear .slider .fill {
        background-color: #1E88E5 !important;
      }
      .lil-gui .controller.shear .slider {
        background-color: #20304a !important;
      }
      .lil-gui .controller input[type="number"] {
        color: #E0E0E0 !important;
        background-color: #3a3a3c !important;
        border: none !important;
        border-radius: 3px !important;
        font-size: 13px !important;
      }
      .lil-gui .controller {
        padding: 6px 12px !important;
      }
    `;
    document.head.appendChild(styleEl);
  }

  private setupSliders(): void {
    const compressionCtrl = this.gui
      .add(this.params, 'compression', 0, 10, 0.1)
      .name('Compression')
      .onChange((value: number) => {
        this.callbacks.onParamsChange({ compression: value });
        this.updateInfoDisplay();
      });
    (compressionCtrl.domElement as HTMLElement).classList.add('compression');

    const stretchCtrl = this.gui
      .add(this.params, 'stretch', 0, 5, 0.1)
      .name('Stretch')
      .onChange((value: number) => {
        this.callbacks.onParamsChange({ stretch: value });
        this.updateInfoDisplay();
      });
    (stretchCtrl.domElement as HTMLElement).classList.add('stretch');

    const shearCtrl = this.gui
      .add(this.params, 'shearAngle', 0, 360, 1)
      .name('Shear Angle (°)')
      .onChange((value: number) => {
        this.callbacks.onParamsChange({ shearAngle: value });
        this.updateInfoDisplay();
      });
    (shearCtrl.domElement as HTMLElement).classList.add('shear');
  }

  private updateInfoDisplay(): void {
    const { compression, stretch, shearAngle } = this.params;

    let modeName = 'Flat';
    const modes: { name: string; value: number; threshold: number }[] = [
      { name: 'Compression', value: compression, threshold: 0.1 },
      { name: 'Stretch', value: stretch, threshold: 0.1 },
      { name: 'Shear', value: shearAngle, threshold: 0.5 }
    ];

    let maxValue = 0;
    for (const mode of modes) {
      if (mode.value > mode.threshold && mode.value > maxValue) {
        maxValue = mode.value;
        modeName = mode.name;
      }
    }

    if (compression > 0.1 && stretch > 0.1 && compression * 0.2 > stretch) {
      modeName = 'Compression + Stretch';
    }

    this.modeLabel.textContent = modeName;
    this.paramLabel.textContent = `Compression: ${compression.toFixed(1)} | Stretch: ${stretch.toFixed(1)} | Shear: ${shearAngle.toFixed(0)}°`;
  }

  public getParams(): TectonicParams {
    return { ...this.params };
  }
}
