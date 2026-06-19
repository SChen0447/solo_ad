import * as THREE from 'three';
import { Planet } from './Planet';

export interface UIManagerCallbacks {
  onPlanetSelect: (index: number) => void;
  onOrbitRadiusChange: (index: number, multiplier: number) => void;
  onOrbitSpeedChange: (index: number, multiplier: number) => void;
  onGlobalView: () => void;
  onFollowPlanet: () => void;
}

export class UIManager {
  private container: HTMLElement;
  private controlPanel: HTMLElement;
  private planetSelect: HTMLSelectElement;
  private orbitRadiusSlider: HTMLInputElement;
  private orbitSpeedSlider: HTMLInputElement;
  private orbitRadiusValue: HTMLElement;
  private orbitSpeedValue: HTMLElement;
  private infoPopup: HTMLElement | null = null;
  private popupTimer: number | null = null;

  private callbacks: UIManagerCallbacks;
  private planetNames: string[];
  private selectedPlanetIndex: number = 2;
  private camera: THREE.PerspectiveCamera;
  private solarSystemGroup: THREE.Group;

  constructor(
    parent: HTMLElement,
    planetNames: string[],
    callbacks: UIManagerCallbacks,
    camera: THREE.PerspectiveCamera,
    solarSystemGroup: THREE.Group
  ) {
    this.planetNames = planetNames;
    this.callbacks = callbacks;
    this.camera = camera;
    this.solarSystemGroup = solarSystemGroup;
    this.container = parent;

    this.controlPanel = this.createControlPanel();
    this.planetSelect = this.controlPanel.querySelector('#planetSelect') as HTMLSelectElement;
    this.orbitRadiusSlider = this.controlPanel.querySelector('#orbitRadiusSlider') as HTMLInputElement;
    this.orbitSpeedSlider = this.controlPanel.querySelector('#orbitSpeedSlider') as HTMLInputElement;
    this.orbitRadiusValue = this.controlPanel.querySelector('#orbitRadiusValue') as HTMLElement;
    this.orbitSpeedValue = this.controlPanel.querySelector('#orbitSpeedValue') as HTMLElement;

    this.bindEvents();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  private createControlPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'controlPanel';
    panel.style.cssText = `
      position: fixed;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 280px;
      background: rgba(15, 15, 25, 0.85);
      border-radius: 10px;
      padding: 16px;
      color: #fff;
      z-index: 100;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      animation: slideIn 0.3s ease-out forwards;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { width: 0; opacity: 0; padding: 0; overflow: hidden; }
        to { width: 280px; opacity: 1; padding: 16px; overflow: visible; }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      #controlPanel select, #controlPanel input[type="range"], #controlPanel button {
        width: 100%;
        padding: 8px;
        margin: 4px 0 12px 0;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        background: rgba(40, 40, 60, 0.8);
        color: #fff;
        font-size: 13px;
        outline: none;
        transition: background 0.2s, border-color 0.2s;
      }
      #controlPanel select:hover, #controlPanel button:hover {
        background: rgba(70, 70, 100, 0.9);
        border-color: rgba(100, 150, 255, 0.5);
        cursor: pointer;
      }
      #controlPanel label {
        font-size: 12px;
        color: #aaa;
        display: block;
        margin-bottom: 2px;
      }
      #controlPanel .value-display {
        font-size: 12px;
        color: #7ec8e3;
        margin-bottom: 8px;
      }
      #controlPanel .button-group {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      #controlPanel .button-group button {
        flex: 1;
        margin: 0;
      }
      #controlPanel h3 {
        font-size: 15px;
        margin-bottom: 14px;
        color: #ffdd00;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 8px;
      }
      .info-popup {
        position: fixed;
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        border-radius: 10px;
        padding: 12px 16px;
        width: 200px;
        z-index: 200;
        pointer-events: none;
        border: 1px solid rgba(255, 255, 255, 0.2);
        animation: fadeIn 0.2s ease-out forwards;
      }
      .info-popup.fading {
        animation: fadeOut 0.5s ease-out forwards;
      }
      .info-popup .popup-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 6px;
      }
      .info-popup .popup-info {
        font-size: 14px;
        color: #aaa;
        line-height: 1.5;
      }
      @media (max-width: 1024px) {
        #controlPanel {
          left: 0 !important;
          top: 0 !important;
          transform: none !important;
          width: 100% !important;
          height: 50px;
          border-radius: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 10px !important;
        }
        #controlPanel h3 {
          display: none;
        }
        #controlPanel label {
          display: none;
        }
        #controlPanel .value-display {
          display: none;
        }
        #controlPanel select, #controlPanel input[type="range"], #controlPanel button {
          width: auto;
          margin: 0;
          flex: 1;
          min-width: 60px;
        }
      }
    `;
    document.head.appendChild(style);

    const optionsHtml = this.planetNames.map((name, i) =>
      `<option value="${i}" ${i === this.selectedPlanetIndex ? 'selected' : ''}>${name}</option>`
    ).join('');

    panel.innerHTML = `
      <h3>🌌 太阳系控制面板</h3>
      <label>选择行星</label>
      <select id="planetSelect">${optionsHtml}</select>
      <label>轨道半径倍数</label>
      <div class="value-display">当前: <span id="orbitRadiusValue">1.0</span>x</div>
      <input type="range" id="orbitRadiusSlider" min="0.5" max="2" step="0.1" value="1">
      <label>公转速度倍数</label>
      <div class="value-display">当前: <span id="orbitSpeedValue">1.0</span>x</div>
      <input type="range" id="orbitSpeedSlider" min="0.5" max="3" step="0.1" value="1">
      <div class="button-group">
        <button id="globalViewBtn">全局俯视</button>
        <button id="followPlanetBtn">跟随行星</button>
      </div>
    `;

    this.container.appendChild(panel);
    return panel;
  }

  private bindEvents(): void {
    this.planetSelect.addEventListener('change', (e) => {
      const index = parseInt((e.target as HTMLSelectElement).value);
      this.selectedPlanetIndex = index;
      this.callbacks.onPlanetSelect(index);
    });

    this.orbitRadiusSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.orbitRadiusValue.textContent = value.toFixed(1);
      this.callbacks.onOrbitRadiusChange(this.selectedPlanetIndex, value);
    });

    this.orbitSpeedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.orbitSpeedValue.textContent = value.toFixed(1);
      this.callbacks.onOrbitSpeedChange(this.selectedPlanetIndex, value);
    });

    (this.controlPanel.querySelector('#globalViewBtn') as HTMLElement).addEventListener('click', () => {
      this.callbacks.onGlobalView();
    });

    (this.controlPanel.querySelector('#followPlanetBtn') as HTMLElement).addEventListener('click', () => {
      this.callbacks.onFollowPlanet();
    });

    document.addEventListener('click', (e) => {
      if (this.infoPopup && !(e.target as HTMLElement).closest('.info-popup')) {
        this.hidePopup();
      }
    }, true);
  }

  private handleResize(): void {
    // CSS media query handles layout changes
  }

  public updateSlidersForPlanet(planet: Planet): void {
    const radiusMult = planet.getOrbitRadiusMultiplier();
    const speedMult = planet.getOrbitSpeedMultiplier();
    this.orbitRadiusSlider.value = radiusMult.toString();
    this.orbitSpeedSlider.value = speedMult.toString();
    this.orbitRadiusValue.textContent = radiusMult.toFixed(1);
    this.orbitSpeedValue.textContent = speedMult.toFixed(1);
  }

  public showPlanetPopup(planet: Planet): void {
    this.hidePopup();

    const worldPos = planet.getPosition();
    this.solarSystemGroup.localToWorld(worldPos);
    const screenPos = worldPos.clone().project(this.camera);

    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight - 20;

    this.infoPopup = document.createElement('div');
    this.infoPopup.className = 'info-popup';
    this.infoPopup.innerHTML = `
      <div class="popup-title">${planet.name}</div>
      <div class="popup-info">
        轨道半径: ${planet.orbitRadius.toFixed(2)}<br>
        公转速度: ${planet.orbitSpeed.toFixed(2)}
      </div>
    `;
    this.infoPopup.style.left = `${Math.max(10, Math.min(window.innerWidth - 210, x - 100))}px`;
    this.infoPopup.style.top = `${Math.max(10, y - 80)}px`;

    this.container.appendChild(this.infoPopup);

    if (this.popupTimer) {
      clearTimeout(this.popupTimer);
    }
    this.popupTimer = window.setTimeout(() => {
      this.hidePopup();
    }, 2000);
  }

  public hidePopup(): void {
    if (this.popupTimer) {
      clearTimeout(this.popupTimer);
      this.popupTimer = null;
    }
    if (this.infoPopup) {
      this.infoPopup.classList.add('fading');
      const popup = this.infoPopup;
      setTimeout(() => {
        if (popup.parentNode) {
          popup.parentNode.removeChild(popup);
        }
      }, 500);
      this.infoPopup = null;
    }
  }

  public updatePopupPosition(planet: Planet): void {
    if (!this.infoPopup) return;
    const worldPos = planet.getPosition();
    this.solarSystemGroup.localToWorld(worldPos);
    const screenPos = worldPos.clone().project(this.camera);

    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight - 20;

    this.infoPopup.style.left = `${Math.max(10, Math.min(window.innerWidth - 210, x - 100))}px`;
    this.infoPopup.style.top = `${Math.max(10, y - 80)}px`;
  }

  public getSelectedPlanetIndex(): number {
    return this.selectedPlanetIndex;
  }
}
