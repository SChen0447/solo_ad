import * as dat from 'dat.gui';
import type { Visualizer } from './visualizer';

export interface ControlCallbacks {
  onOpacityChange: (value: number) => void;
  onShowLabelsChange: (value: boolean) => void;
  onBackgroundColorChange: (value: string) => void;
  onResetCamera: () => void;
  onExportScreenshot: () => void;
}

export class Controls {
  private gui: dat.GUI;
  private visualizer: Visualizer;
  private params: {
    opacity: number;
    showLabels: boolean;
    backgroundColor: string;
    resetCamera: () => void;
    exportScreenshot: () => void;
  };

  constructor(visualizer: Visualizer) {
    this.visualizer = visualizer;

    this.params = {
      opacity: 0.9,
      showLabels: true,
      backgroundColor: '#0a0a1a',
      resetCamera: () => {
        this.visualizer.resetCamera();
      },
      exportScreenshot: () => {
        this.visualizer.exportScreenshot();
      },
    };

    this.gui = new dat.GUI({ autoPlace: false });
    const guiContainer = document.getElementById('gui-container');
    if (guiContainer) {
      guiContainer.appendChild(this.gui.domElement);
    }

    this.gui.domElement.style.width = '100%';

    this.gui
      .add(this.params, 'opacity', 0.2, 1.0, 0.01)
      .name('Opacity')
      .onChange((v: number) => {
        this.visualizer.updateOpacity(v);
      });

    this.gui
      .add(this.params, 'showLabels')
      .name('Axis Labels')
      .onChange((v: boolean) => {
        this.visualizer.updateShowLabels(v);
      });

    this.gui
      .add(this.params, 'backgroundColor', {
        Dark: '#0a0a1a',
        Light: '#f5f5f5',
      })
      .name('Background')
      .onChange((v: string) => {
        this.visualizer.updateBackgroundColor(v);
        const statsEl = document.getElementById('stats-panel');
        const uploadEl = document.getElementById('upload-panel');
        if (v === '#f5f5f5') {
          if (statsEl) statsEl.style.color = '#333';
          if (uploadEl) uploadEl.style.color = '#333';
        } else {
          if (statsEl) statsEl.style.color = '#ccc';
          if (uploadEl) uploadEl.style.color = '#ccc';
        }
      });

    this.gui.add(this.params, 'resetCamera').name('🔄 Reset View');
    this.gui.add(this.params, 'exportScreenshot').name('📷 Export PNG');

    this.setupKeyboard();
  }

  private setupKeyboard(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        this.visualizer.resetCamera();
      }
      if (e.key === 's' || e.key === 'S') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.visualizer.exportScreenshot();
        }
      }
      if (e.key === 'l' || e.key === 'L') {
        this.params.showLabels = !this.params.showLabels;
        this.visualizer.updateShowLabels(this.params.showLabels);
        for (const ctrl of this.gui.__controllers) {
          ctrl.updateDisplay();
        }
      }
    });
  }

  dispose(): void {
    this.gui.destroy();
  }
}
