import { BuildingType, getTypeName } from './cityData';

type EventBusEmit = (event: string, data?: unknown) => void;
type EventBusOn = (event: string, callback: (data?: unknown) => void) => void;

export class UI {
  private emit: EventBusEmit;
  private on: EventBusOn;
  private container: HTMLElement;
  private sidebar!: HTMLElement;
  private propertyPanel: HTMLElement | null = null;
  private fpsElement!: HTMLElement;
  private undoButton!: HTMLElement;
  private rotationTooltip!: HTMLElement;

  private buildingButtons: Map<BuildingType, HTMLElement> = new Map();
  private activePlacingType: BuildingType | null = null;

  constructor(emit: EventBusEmit, on: EventBusOn) {
    this.emit = emit;
    this.on = on;

    this.container = document.getElementById('app')!;
    this.createSidebar();
    this.createFPSCounter();
    this.createUndoButton();
    this.createRotationTooltip();
    this.setupEventListeners();
  }

  private createSidebar(): void {
    this.sidebar = document.createElement('div');
    this.sidebar.style.cssText = `
      position: fixed;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 240px;
      background: rgba(30, 30, 40, 0.85);
      border-radius: 12px;
      padding: 16px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all 0.3s ease;
    `;

    const title = document.createElement('div');
    title.textContent = '🏗️ 城市构建器';
    title.style.cssText = `
      color: #ffffff;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    `;
    this.sidebar.appendChild(title);

    const types: BuildingType[] = [
      BuildingType.RESIDENTIAL,
      BuildingType.COMMERCIAL,
      BuildingType.PARK,
      BuildingType.STREETLIGHT,
    ];

    const icons: Record<BuildingType, string> = {
      [BuildingType.RESIDENTIAL]: '🏠',
      [BuildingType.COMMERCIAL]: '🏢',
      [BuildingType.PARK]: '🌳',
      [BuildingType.STREETLIGHT]: '💡',
    };

    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    `;

    types.forEach((type) => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center;';

      const btn = document.createElement('button');
      btn.style.cssText = `
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: none;
        background: rgba(255,255,255,0.1);
        color: #ffffff;
        font-size: 20px;
        cursor: pointer;
        transition: background 0.2s, transform 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      btn.textContent = icons[type];
      btn.addEventListener('mouseenter', () => {
        if (this.activePlacingType !== type) {
          btn.style.background = 'rgba(255,255,255,0.25)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (this.activePlacingType !== type) {
          btn.style.background = 'rgba(255,255,255,0.1)';
        }
      });
      btn.addEventListener('click', () => {
        this.handlePlaceButtonClick(type);
      });

      const label = document.createElement('div');
      label.textContent = getTypeName(type);
      label.style.cssText = 'font-size: 12px; color: #aaa; margin-top: 4px;';

      wrapper.appendChild(btn);
      wrapper.appendChild(label);
      buttonRow.appendChild(wrapper);

      this.buildingButtons.set(type, btn);
    });

    this.sidebar.appendChild(buttonRow);

    const divider = document.createElement('div');
    divider.style.cssText = `
      height: 1px;
      background: rgba(255,255,255,0.1);
      margin: 8px 0;
    `;
    this.sidebar.appendChild(divider);

    const deleteBtn = document.createElement('button');
    deleteBtn.id = 'delete-btn';
    deleteBtn.textContent = '🗑️ 删除';
    deleteBtn.style.cssText = `
      width: 100%;
      padding: 8px;
      border: none;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.1);
      color: #ff4444;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
    `;
    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.background = 'rgba(255,0,0,0.2)';
    });
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.background = 'rgba(255,255,255,0.1)';
    });
    deleteBtn.addEventListener('click', () => {
      this.emit('deleteBuilding');
    });
    this.sidebar.appendChild(deleteBtn);

    const modeDivider = document.createElement('div');
    modeDivider.style.cssText = `
      height: 1px;
      background: rgba(255,255,255,0.1);
      margin: 8px 0;
    `;
    this.sidebar.appendChild(modeDivider);

    const modeContainer = document.createElement('div');
    modeContainer.style.cssText = `
      display: flex;
      gap: 8px;
      justify-content: center;
    `;

    const fpsBtn = document.createElement('button');
    fpsBtn.textContent = '🚶 第一人称';
    fpsBtn.style.cssText = `
      flex: 1;
      padding: 8px 4px;
      border: none;
      border-radius: 6px;
      background: rgba(0, 188, 212, 0.4);
      color: #ffffff;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
    `;
    fpsBtn.addEventListener('click', () => {
      this.emit('switchMode', 'firstPerson');
      fpsBtn.style.background = 'rgba(0, 188, 212, 0.4)';
      overheadBtn.style.background = 'rgba(255,255,255,0.1)';
    });

    const overheadBtn = document.createElement('button');
    overheadBtn.textContent = '🛩️ 俯视图';
    overheadBtn.style.cssText = `
      flex: 1;
      padding: 8px 4px;
      border: none;
      border-radius: 6px;
      background: rgba(255,255,255,0.1);
      color: #ffffff;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
    `;
    overheadBtn.addEventListener('click', () => {
      this.emit('switchMode', 'overhead');
      overheadBtn.style.background = 'rgba(0, 188, 212, 0.4)';
      fpsBtn.style.background = 'rgba(255,255,255,0.1)';
    });

    modeContainer.appendChild(fpsBtn);
    modeContainer.appendChild(overheadBtn);
    this.sidebar.appendChild(modeContainer);

    this.propertyPanel = document.createElement('div');
    this.propertyPanel.style.cssText = `
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255,255,255,0.1);
      opacity: 0;
      max-height: 0;
      overflow: hidden;
      transition: opacity 0.3s, max-height 0.3s;
    `;
    this.sidebar.appendChild(this.propertyPanel);

    this.container.appendChild(this.sidebar);
  }

  private createFPSCounter(): void {
    this.fpsElement = document.createElement('div');
    this.fpsElement.style.cssText = `
      position: fixed;
      top: 12px;
      right: 12px;
      color: #ffffff;
      font-size: 12px;
      font-family: monospace;
      background: rgba(0,0,0,0.5);
      padding: 4px 8px;
      border-radius: 4px;
      z-index: 200;
      pointer-events: none;
    `;
    this.fpsElement.textContent = 'FPS: 0';
    this.container.appendChild(this.fpsElement);
  }

  private createUndoButton(): void {
    this.undoButton = document.createElement('button');
    this.undoButton.textContent = '↩️';
    this.undoButton.title = '撤销删除';
    this.undoButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,0.1);
      color: #ffffff;
      font-size: 20px;
      cursor: pointer;
      z-index: 200;
      transition: background 0.2s;
    `;
    this.undoButton.addEventListener('mouseenter', () => {
      this.undoButton.style.background = 'rgba(255,255,255,0.25)';
    });
    this.undoButton.addEventListener('mouseleave', () => {
      this.undoButton.style.background = 'rgba(255,255,255,0.1)';
    });
    this.undoButton.addEventListener('click', () => {
      this.emit('undoDelete');
    });
    this.container.appendChild(this.undoButton);
  }

  private createRotationTooltip(): void {
    this.rotationTooltip = document.createElement('div');
    this.rotationTooltip.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.7);
      color: #00bcd4;
      font-size: 18px;
      font-weight: bold;
      padding: 8px 16px;
      border-radius: 6px;
      z-index: 300;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    `;
    this.container.appendChild(this.rotationTooltip);
  }

  private handlePlaceButtonClick(type: BuildingType): void {
    if (this.activePlacingType === type) {
      this.activePlacingType = null;
      this.emit('setPlacingType', null);
      this.updateButtonStyles();
      return;
    }
    this.activePlacingType = type;
    this.emit('setPlacingType', type);
    this.updateButtonStyles();
  }

  private updateButtonStyles(): void {
    this.buildingButtons.forEach((btn, type) => {
      if (type === this.activePlacingType) {
        btn.style.background = 'rgba(0,188,212,0.4)';
        btn.style.transform = 'scale(1.1)';
      } else {
        btn.style.background = 'rgba(255,255,255,0.1)';
        btn.style.transform = 'scale(1)';
      }
    });
  }

  showPropertyPanel(data: {
    id: string;
    name: string;
    type: BuildingType;
    position: { x: number; y: number; z: number };
    rotation: { y: number };
    scale: { x: number; y: number; z: number };
  }): void {
    if (!this.propertyPanel) return;
    this.propertyPanel.innerHTML = '';

    const nameInput = this.createInput('名称', data.name, 'text', (val) => {
      this.emit('updateProperty', { id: data.id, name: val });
    });
    this.propertyPanel.appendChild(nameInput.container);

    const typeDisplay = document.createElement('div');
    typeDisplay.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 6px;
    `;
    const typeLabel = document.createElement('span');
    typeLabel.textContent = '类型: ';
    typeLabel.style.cssText = 'color: #aaa; font-size: 13px; width: 50px;';
    const typeValue = document.createElement('span');
    typeValue.textContent = getTypeName(data.type);
    typeValue.style.cssText = 'color: #ffffff; font-size: 13px;';
    typeDisplay.appendChild(typeLabel);
    typeDisplay.appendChild(typeValue);
    this.propertyPanel.appendChild(typeDisplay);

    const posX = this.createInput('X', data.position.x.toFixed(1), 'number', (val) => {
      this.emit('updateProperty', {
        id: data.id,
        position: { x: parseFloat(val) || 0, y: data.position.y, z: data.position.z },
      });
    });
    this.propertyPanel.appendChild(posX.container);

    const posY = this.createInput('Y', data.position.y.toFixed(1), 'number', (val) => {
      this.emit('updateProperty', {
        id: data.id,
        position: { x: data.position.x, y: parseFloat(val) || 0, z: data.position.z },
      });
    });
    this.propertyPanel.appendChild(posY.container);

    const posZ = this.createInput('Z', data.position.z.toFixed(1), 'number', (val) => {
      this.emit('updateProperty', {
        id: data.id,
        position: { x: data.position.x, y: data.position.y, z: parseFloat(val) || 0 },
      });
    });
    this.propertyPanel.appendChild(posZ.container);

    const scaleSlider = this.createSlider('缩放', data.scale.x, 0.5, 2.0, 0.1, (val) => {
      this.emit('updateProperty', {
        id: data.id,
        scale: { x: val, y: val, z: val },
      });
    });
    this.propertyPanel.appendChild(scaleSlider);

    this.propertyPanel.style.opacity = '1';
    this.propertyPanel.style.maxHeight = '500px';
  }

  hidePropertyPanel(): void {
    if (!this.propertyPanel) return;
    this.propertyPanel.style.opacity = '0';
    this.propertyPanel.style.maxHeight = '0';
  }

  private createInput(
    label: string,
    value: string,
    type: string,
    onChange: (val: string) => void
  ): { container: HTMLElement; input: HTMLInputElement } {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; align-items: center; margin-bottom: 6px;';

    const labelEl = document.createElement('span');
    labelEl.textContent = `${label}: `;
    labelEl.style.cssText = 'color: #aaa; font-size: 13px; width: 50px; flex-shrink: 0;';

    const input = document.createElement('input');
    input.type = type;
    input.value = value;
    input.style.cssText = `
      flex: 1;
      padding: 4px 8px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #2a2a2a;
      color: #ffffff;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    `;
    input.addEventListener('focus', () => {
      input.style.borderColor = '#00bcd4';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#444';
    });
    input.addEventListener('change', () => {
      onChange(input.value);
    });

    container.appendChild(labelEl);
    container.appendChild(input);
    return { container, input };
  }

  private createSlider(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (val: number) => void
  ): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 6px;';

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 4px;';

    const labelEl = document.createElement('span');
    labelEl.textContent = `${label}: `;
    labelEl.style.cssText = 'color: #aaa; font-size: 13px;';

    const valueEl = document.createElement('span');
    valueEl.textContent = value.toFixed(1);
    valueEl.style.cssText = 'color: #00bcd4; font-size: 13px;';

    header.appendChild(labelEl);
    header.appendChild(valueEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.style.cssText = `
      width: 100%;
      accent-color: #00bcd4;
      cursor: pointer;
    `;
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueEl.textContent = v.toFixed(1);
      onChange(v);
    });

    container.appendChild(header);
    container.appendChild(slider);
    return container;
  }

  updateFPS(fps: number): void {
    this.fpsElement.textContent = `FPS: ${fps}`;
  }

  showRotationTooltip(angle: number): void {
    this.rotationTooltip.textContent = `${angle}°`;
    this.rotationTooltip.style.opacity = '1';
  }

  hideRotationTooltip(): void {
    this.rotationTooltip.style.opacity = '0';
  }

  clearPlacingType(): void {
    this.activePlacingType = null;
    this.updateButtonStyles();
  }

  private setupEventListeners(): void {
    this.on('buildingSelected', (data) => {
      if (data) {
        this.showPropertyPanel(data as any);
      }
    });

    this.on('buildingDeselected', () => {
      this.hidePropertyPanel();
    });

    this.on('buildingRotated', (data: any) => {
      if (data && data.angle !== undefined) {
        this.showRotationTooltip(data.angle);
      }
    });

    this.on('buildingPropertyChanged', (data) => {
      if (data) {
        this.showPropertyPanel(data as any);
      }
    });

    this.on('buildingMoved', (data) => {
      if (data) {
        this.showPropertyPanel(data as any);
      }
    });
  }
}
