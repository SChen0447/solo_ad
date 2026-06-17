import GUI from 'lil-gui';
import type { RockLayerData } from './types';

export interface GUIControlsCallbacks {
  onOpacityChange: (opacity: number) => void;
  onLayerVisibility: (id: string, visible: boolean) => void;
  onResetCamera: () => void;
  onToggleClipping: (enabled: boolean) => void;
  onClipPlaneChange?: (y: number) => void;
}

interface GUIState {
  globalOpacity: number;
  showClipping: boolean;
  clipDepth: number;
  layerVisibility: Record<string, boolean>;
}

export class GUIControls {
  private gui: GUI;
  private state: GUIState;
  private callbacks: GUIControlsCallbacks;
  private layersFolder: GUI | null = null;
  private opacityController: ReturnType<GUI['add']> | null = null;
  private clippingFolder: GUI | null = null;

  constructor(layers: RockLayerData[], callbacks: GUIControlsCallbacks) {
    this.callbacks = callbacks;
    this.state = {
      globalOpacity: 0.7,
      showClipping: false,
      clipDepth: -150,
      layerVisibility: {}
    };

    layers.forEach(layer => {
      this.state.layerVisibility[layer.id] = true;
    });

    this.gui = new GUI({
      title: '控制面板',
      width: 300
    });
    this.gui.domElement.id = 'main-gui';

    this.build();
    this.applyStyles();
  }

  private build(): void {
    this.gui.add(this.state, 'globalOpacity', 0.1, 1.0, 0.05)
      .name('整体透明度')
      .onChange((val: number) => {
        this.callbacks.onOpacityChange(val);
      });

    this.opacityController = this.gui.controllers[this.gui.controllers.length - 1];

    this.layersFolder = this.gui.addFolder('岩层显示');

    const layerList: RockLayerData[] = [];
    Object.keys(this.state.layerVisibility).forEach(id => {
      const layer = { id, name: id } as unknown as RockLayerData;
      layerList.push(layer);
    });

    Object.entries(this.state.layerVisibility).forEach(([id, visible]) => {
      if (this.layersFolder) {
        this.layersFolder.add(this.state.layerVisibility, id)
          .name(this.getLayerDisplayName(id))
          .onChange((val: boolean) => {
            this.callbacks.onLayerVisibility(id, val);
          });
      }
    });

    this.clippingFolder = this.gui.addFolder('剖切功能');
    this.clippingFolder.add(this.state, 'showClipping')
      .name('显示剖切面')
      .onChange((val: boolean) => {
        this.callbacks.onToggleClipping(val);
        if (depthController) {
          depthController.enable(val);
        }
      });

    const depthController = this.clippingFolder.add(this.state, 'clipDepth', -290, 0, 1)
      .name('剖切深度(m)')
      .onChange((val: number) => {
        this.callbacks.onClipPlaneChange?.(val);
      })
      .disable();

    this.gui.add({ reset: () => this.callbacks.onResetCamera() }, 'reset')
      .name('重置视角');
  }

  private getLayerDisplayName(id: string): string {
    const names: Record<string, string> = {
      'layer-1': '① 表土层',
      'layer-2': '② 沉积岩层',
      'layer-3': '③ 火山碎屑岩',
      'layer-4': '④ 变质岩层',
      'layer-5': '⑤ 结晶基底'
    };
    return names[id] || id;
  }

  private applyStyles(): void {
    const root = this.gui.domElement;
    root.style.setProperty('--background-color', 'rgba(26, 31, 58, 0.85)');
    root.style.setProperty('--widget-color', '#2a3150');
    root.style.setProperty('--focus-color', '#3a4470');
    root.style.setProperty('--hover-color', '#354065');
    root.style.setProperty('--number-color', '#00e5ff');
    root.style.setProperty('--text-color', '#e4e8f5');
    root.style.setProperty('--title-background-color', 'rgba(0, 229, 255, 0.12)');
    root.style.setProperty('--font-size', '13px');

    root.style.position = 'fixed';
    root.style.top = '20px';
    root.style.left = '20px';
    root.style.zIndex = '100';
    root.style.borderRadius = '10px';
    root.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    root.style.backdropFilter = 'blur(12px)';
    root.style.webkitBackdropFilter = 'blur(12px)';
    root.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 229, 255, 0.08) inset';

    const style = document.createElement('style');
    style.textContent = `
      #main-gui .lil-gui {
        --slider-color: #00e5ff !important;
        --knob-color: #66ffff !important;
      }
      #main-gui .slider {
        background: linear-gradient(to right, #00e5ff 0%, #00e5ff var(--value, 50%), #1a2040 var(--value, 50%), #1a2040 100%) !important;
      }
      #main-gui .name {
        color: #c8d0e8 !important;
        font-weight: 500;
      }
      #main-gui .title {
        color: #00e5ff !important;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      #main-gui .controller.checkbox input[type="checkbox"] {
        accent-color: #00e5ff;
      }
      #main-gui .controller.button .button {
        transition: all 0.2s ease;
        background: linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(0, 150, 200, 0.15));
        border: 1px solid rgba(0, 229, 255, 0.3);
      }
      #main-gui .controller.button .button:hover {
        background: linear-gradient(135deg, rgba(0, 229, 255, 0.35), rgba(0, 150, 200, 0.25));
        box-shadow: 0 0 16px rgba(0, 229, 255, 0.3);
      }
      #main-gui .controller.button .button:active {
        transform: scale(0.97);
      }
      @media (max-width: 768px) {
        #main-gui {
          width: calc(100% - 40px) !important;
          top: 10px !important;
          left: 20px !important;
          font-size: 12px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  public setClipDepth(y: number): void {
    this.state.clipDepth = Math.round(y);
    const controllers = this.clippingFolder?.controllers || [];
    for (const ctrl of controllers) {
      if (ctrl.property === 'clipDepth') {
        ctrl.updateDisplay();
        break;
      }
    }
  }

  public setGlobalOpacity(value: number): void {
    this.state.globalOpacity = value;
    this.opacityController?.updateDisplay();
  }

  public destroy(): void {
    this.gui.destroy();
  }
}
