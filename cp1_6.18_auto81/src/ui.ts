import * as THREE from 'three';
import { eventBus, type AtomType } from './atoms';

export class UIManager {
  private atomSelector: HTMLElement;
  private vibrationSlider: HTMLInputElement;
  private rotationSlider: HTMLInputElement;
  private glowSlider: HTMLInputElement;
  private vibValue: HTMLElement;
  private rotValue: HTMLElement;
  private glowValue: HTMLElement;
  private atomCountEl: HTMLElement;
  private bondCountEl: HTMLElement;
  private fpsCountEl: HTMLElement;

  private pendingPosition: THREE.Vector3 | null = null;
  private isSelectorVisible = false;

  constructor() {
    this.atomSelector = document.getElementById('atom-selector')!;
    this.vibrationSlider = document.getElementById('vibration-slider') as HTMLInputElement;
    this.rotationSlider = document.getElementById('rotation-slider') as HTMLInputElement;
    this.glowSlider = document.getElementById('glow-slider') as HTMLInputElement;
    this.vibValue = document.getElementById('vib-value')!;
    this.rotValue = document.getElementById('rot-value')!;
    this.glowValue = document.getElementById('glow-value')!;
    this.atomCountEl = document.getElementById('atom-count')!;
    this.bondCountEl = document.getElementById('bond-count')!;
    this.fpsCountEl = document.getElementById('fps-count')!;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('picker:show', (x: number, y: number, worldPos: THREE.Vector3) => {
      this.showAtomSelector(x, y, worldPos);
    });

    eventBus.on('picker:hide', () => {
      this.hideAtomSelector();
    });

    eventBus.on('atoms:changed', (count: number) => {
      this.atomCountEl.textContent = String(count);
    });

    eventBus.on('bonds:changed', (count: number) => {
      this.bondCountEl.textContent = String(count);
    });

    eventBus.on('fps:update', (fps: number) => {
      this.fpsCountEl.textContent = Math.round(fps).toString();
    });

    const atomBtns = this.atomSelector.querySelectorAll('.atom-btn');
    atomBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const atomType = (btn as HTMLElement).dataset.atom as AtomType;
        this.selectAtom(atomType);
      });
    });

    this.vibrationSlider.addEventListener('input', () => {
      const value = parseInt(this.vibrationSlider.value);
      this.vibValue.textContent = String(value);
      eventBus.emit('vibration:change', value);
    });

    this.rotationSlider.addEventListener('input', () => {
      const value = parseInt(this.rotationSlider.value);
      this.rotValue.textContent = String(value);
      eventBus.emit('rotation:change', value);
    });

    this.glowSlider.addEventListener('input', () => {
      const value = parseInt(this.glowSlider.value);
      this.glowValue.textContent = String(value);
      eventBus.emit('glow:intensity', value);
    });

    document.addEventListener('click', (e) => {
      if (this.isSelectorVisible) {
        const target = e.target as HTMLElement;
        if (!this.atomSelector.contains(target)) {
          const isControlPanel = target.closest('#control-panel');
          const isInfoPanel = target.closest('#info-panel');
          const isStatsPanel = target.closest('#stats');
          if (!isControlPanel && !isInfoPanel && !isStatsPanel) {
            this.hideAtomSelector();
          }
        }
      }
    });

    window.addEventListener('resize', () => {
      eventBus.emit('window:resize', window.innerWidth, window.innerHeight);
    });
  }

  private showAtomSelector(x: number, y: number, worldPos: THREE.Vector3): void {
    this.pendingPosition = worldPos.clone();

    const panelWidth = 200;
    const panelHeight = 180;
    let left = x - panelWidth / 2;
    let top = y - panelHeight / 2;

    if (left < 10) left = 10;
    if (left + panelWidth > window.innerWidth - 10) {
      left = window.innerWidth - panelWidth - 10;
    }
    if (top < 10) top = 10;
    if (top + panelHeight > window.innerHeight - 10) {
      top = window.innerHeight - panelHeight - 10;
    }

    this.atomSelector.style.left = `${left}px`;
    this.atomSelector.style.top = `${top}px`;
    this.atomSelector.style.display = 'block';
    this.isSelectorVisible = true;
  }

  private hideAtomSelector(): void {
    this.atomSelector.style.display = 'none';
    this.isSelectorVisible = false;
    this.pendingPosition = null;
  }

  private selectAtom(type: AtomType): void {
    if (this.pendingPosition) {
      eventBus.emit('atom:create', type, this.pendingPosition.clone());
    }
    this.hideAtomSelector();
  }

  setFPS(fps: number): void {
    this.fpsCountEl.textContent = Math.round(fps).toString();
  }

  dispose(): void {
  }
}
