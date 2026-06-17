import * as THREE from 'three';
import { RoomShape } from './roomManager';

export interface UIParams {
  roomShape: RoomShape;
  sourcePosition: THREE.Vector3;
  receiverPosition: THREE.Vector3;
  reflectionRate: number;
  airAbsorption: number;
}

export interface UICallbacks {
  onRoomShapeChange: (shape: RoomShape) => void;
  onSourcePositionChange: (pos: THREE.Vector3) => void;
  onReceiverPositionChange: (pos: THREE.Vector3) => void;
  onParamsChange: (reflectionRate: number, airAbsorption: number) => void;
  onRedrawRequest: () => void;
  onResetView: () => void;
}

export class UIController {
  private params: UIParams;
  private callbacks: UICallbacks;
  
  private readonly elements: {
    roomShape: HTMLSelectElement;
    sourceX: HTMLInputElement;
    sourceY: HTMLInputElement;
    sourceZ: HTMLInputElement;
    receiverX: HTMLInputElement;
    receiverY: HTMLInputElement;
    receiverZ: HTMLInputElement;
    reflectionRate: HTMLInputElement;
    airAbsorption: HTMLInputElement;
    reflectionRateValue: HTMLDivElement;
    airAbsorptionValue: HTMLDivElement;
    controlPanel: HTMLDivElement;
    menuToggle: HTMLButtonElement;
    panelOverlay: HTMLDivElement;
    fpsCounter: HTMLDivElement;
    resetViewBtn: HTMLButtonElement;
  };

  private paramsUpdateTimer: number | null = null;
  private readonly PARAMS_UPDATE_DELAY = 2000;

  constructor(callbacks: UICallbacks, initialParams: UIParams) {
    this.callbacks = callbacks;
    this.params = { ...initialParams };

    this.elements = {
      roomShape: document.getElementById('room-shape') as HTMLSelectElement,
      sourceX: document.getElementById('source-x') as HTMLInputElement,
      sourceY: document.getElementById('source-y') as HTMLInputElement,
      sourceZ: document.getElementById('source-z') as HTMLInputElement,
      receiverX: document.getElementById('receiver-x') as HTMLInputElement,
      receiverY: document.getElementById('receiver-y') as HTMLInputElement,
      receiverZ: document.getElementById('receiver-z') as HTMLInputElement,
      reflectionRate: document.getElementById('reflection-rate') as HTMLInputElement,
      airAbsorption: document.getElementById('absorption-coeff') as HTMLInputElement,
      reflectionRateValue: document.getElementById('reflection-rate-value') as HTMLDivElement,
      airAbsorptionValue: document.getElementById('absorption-coeff-value') as HTMLDivElement,
      controlPanel: document.getElementById('control-panel') as HTMLDivElement,
      menuToggle: document.getElementById('menu-toggle') as HTMLButtonElement,
      panelOverlay: document.getElementById('panel-overlay') as HTMLDivElement,
      fpsCounter: document.getElementById('fps-counter') as HTMLDivElement,
      resetViewBtn: document.getElementById('reset-view-btn') as HTMLButtonElement
    };

    this.bindEvents();
    this.updateUI();
  }

  private bindEvents(): void {
    this.elements.roomShape.addEventListener('change', (e) => {
      const shape = (e.target as HTMLSelectElement).value as RoomShape;
      this.params.roomShape = shape;
      this.callbacks.onRoomShapeChange(shape);
      this.scheduleRedraw();
    });

    const coordInputs = [
      { el: this.elements.sourceX, axis: 'x', isSource: true },
      { el: this.elements.sourceY, axis: 'y', isSource: true },
      { el: this.elements.sourceZ, axis: 'z', isSource: true },
      { el: this.elements.receiverX, axis: 'x', isSource: false },
      { el: this.elements.receiverY, axis: 'y', isSource: false },
      { el: this.elements.receiverZ, axis: 'z', isSource: false }
    ];

    coordInputs.forEach(({ el, axis, isSource }) => {
      el.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        if (!isNaN(value)) {
          if (isSource) {
            (this.params.sourcePosition as any)[axis] = value;
            this.callbacks.onSourcePositionChange(this.params.sourcePosition.clone());
          } else {
            (this.params.receiverPosition as any)[axis] = value;
            this.callbacks.onReceiverPositionChange(this.params.receiverPosition.clone());
          }
          this.scheduleRedraw();
        }
      });
    });

    this.elements.reflectionRate.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.params.reflectionRate = value;
      this.elements.reflectionRateValue.textContent = value.toFixed(1);
      this.scheduleParamsUpdate();
    });

    this.elements.airAbsorption.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.params.airAbsorption = value;
      this.elements.airAbsorptionValue.textContent = value.toFixed(2);
      this.scheduleParamsUpdate();
    });

    this.elements.menuToggle.addEventListener('click', () => {
      this.togglePanel();
    });

    this.elements.panelOverlay.addEventListener('click', () => {
      this.closePanel();
    });

    this.elements.resetViewBtn.addEventListener('click', () => {
      this.callbacks.onResetView();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        this.closePanel();
      }
    });
  }

  private scheduleRedraw(): void {
    this.callbacks.onRedrawRequest();
  }

  private scheduleParamsUpdate(): void {
    if (this.paramsUpdateTimer !== null) {
      window.clearTimeout(this.paramsUpdateTimer);
    }
    this.paramsUpdateTimer = window.setTimeout(() => {
      this.callbacks.onParamsChange(
        this.params.reflectionRate,
        this.params.airAbsorption
      );
      this.paramsUpdateTimer = null;
    }, this.PARAMS_UPDATE_DELAY);
  }

  private togglePanel(): void {
    this.elements.controlPanel.classList.toggle('active');
    this.elements.panelOverlay.classList.toggle('active');
  }

  private closePanel(): void {
    this.elements.controlPanel.classList.remove('active');
    this.elements.panelOverlay.classList.remove('active');
  }

  private updateUI(): void {
    this.elements.roomShape.value = this.params.roomShape;
    this.elements.sourceX.value = this.params.sourcePosition.x.toString();
    this.elements.sourceY.value = this.params.sourcePosition.y.toString();
    this.elements.sourceZ.value = this.params.sourcePosition.z.toString();
    this.elements.receiverX.value = this.params.receiverPosition.x.toString();
    this.elements.receiverY.value = this.params.receiverPosition.y.toString();
    this.elements.receiverZ.value = this.params.receiverPosition.z.toString();
    this.elements.reflectionRate.value = this.params.reflectionRate.toString();
    this.elements.airAbsorption.value = this.params.airAbsorption.toString();
    this.elements.reflectionRateValue.textContent = this.params.reflectionRate.toFixed(1);
    this.elements.airAbsorptionValue.textContent = this.params.airAbsorption.toFixed(2);
  }

  public updateSourcePosition(pos: THREE.Vector3): void {
    this.params.sourcePosition.copy(pos);
    this.elements.sourceX.value = pos.x.toFixed(2);
    this.elements.sourceY.value = pos.y.toFixed(2);
    this.elements.sourceZ.value = pos.z.toFixed(2);
  }

  public updateReceiverPosition(pos: THREE.Vector3): void {
    this.params.receiverPosition.copy(pos);
    this.elements.receiverX.value = pos.x.toFixed(2);
    this.elements.receiverY.value = pos.y.toFixed(2);
    this.elements.receiverZ.value = pos.z.toFixed(2);
  }

  public updateFPS(fps: number): void {
    this.elements.fpsCounter.textContent = `FPS: ${fps.toFixed(0)}`;
    if (fps >= 30) {
      this.elements.fpsCounter.style.color = '#00ff00';
    } else if (fps >= 20) {
      this.elements.fpsCounter.style.color = '#ffff00';
    } else {
      this.elements.fpsCounter.style.color = '#ff0000';
    }
  }

  public getParams(): UIParams {
    return { ...this.params };
  }
}
