import { on, emit } from './cityBuilder';
import { getBuilding, type BuildingType } from './cityData';

const BUILDING_TYPES: { type: BuildingType; icon: string; label: string }[] = [
  { type: 'residential', icon: '🏠', label: '住宅' },
  { type: 'commercial', icon: '🏢', label: '商业楼' },
  { type: 'park', icon: '🌳', label: '公园' },
  { type: 'streetlight', icon: '💡', label: '路灯' },
];

export class UI {
  private sidebar: HTMLDivElement;
  private propertyPanel: HTMLDivElement | null = null;
  private modeToggle: HTMLDivElement | null = null;
  private undoButton: HTMLButtonElement | null = null;
  private fpsDisplay: HTMLDivElement | null = null;
  private currentMode: 'firstPerson' | 'topDown' = 'firstPerson';
  private selectedBuildingId: string | null = null;
  private activePlacementBtn: string | null = null;

  constructor() {
    this.sidebar = this.createSidebar();
    this.createFPSDisplay();
    this.createUndoButton();
    this.bindEvents();
  }

  private createSidebar(): HTMLDivElement {
    const sidebar = document.createElement('div');
    sidebar.style.cssText = `
      position: fixed; top: 20px; left: 20px; width: 240px;
      background: rgba(30,30,40,0.85); border-radius: 12px;
      padding: 16px; z-index: 10; display: flex; flex-direction: column; gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #ffffff; box-sizing: border-box;
    `;

    const title = document.createElement('div');
    title.textContent = '🏙️ 城市构建器';
    title.style.cssText = `
      font-size: 16px; font-weight: bold; margin-bottom: 8px;
      text-align: center; color: #00bcd4;
    `;
    sidebar.appendChild(title);

    const sectionLabel = document.createElement('div');
    sectionLabel.textContent = '建筑工具';
    sectionLabel.style.cssText = `font-size: 12px; color: #aaa; margin-bottom: 4px;`;
    sidebar.appendChild(sectionLabel);

    const btnGrid = document.createElement('div');
    btnGrid.style.cssText = `display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start;`;

    BUILDING_TYPES.forEach(({ type, icon, label }) => {
      const btn = document.createElement('button');
      btn.dataset.type = type;
      btn.innerHTML = `<div style="font-size:22px;line-height:1">${icon}</div><div style="font-size:11px;color:#aaa;margin-top:2px">${label}</div>`;
      btn.style.cssText = `
        width: 48px; height: 48px; border-radius: 50%; border: none;
        background: rgba(255,255,255,0.1); cursor: pointer;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        transition: background 0.2s; color: #fff; padding: 0;
      `;
      btn.addEventListener('mouseenter', () => {
        if (this.activePlacementBtn !== type) btn.style.background = 'rgba(255,255,255,0.25)';
      });
      btn.addEventListener('mouseleave', () => {
        if (this.activePlacementBtn !== type) btn.style.background = 'rgba(255,255,255,0.1)';
      });
      btn.addEventListener('click', () => {
        this.handlePlacementClick(type);
      });
      btnGrid.appendChild(btn);
    });

    sidebar.appendChild(btnGrid);

    const deleteBtn = document.createElement('button');
    deleteBtn.id = 'delete-btn';
    deleteBtn.innerHTML = `<span style="font-size:18px">🗑️</span><span style="font-size:11px;color:#ff5555;margin-left:4px">删除</span>`;
    deleteBtn.style.cssText = `
      width: 100%; height: 36px; border-radius: 8px; border: none;
      background: rgba(255,0,0,0.15); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s; color: #ff5555; margin-top: 8px;
    `;
    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.background = 'rgba(255,0,0,0.2)';
    });
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.background = 'rgba(255,0,0,0.15)';
    });
    deleteBtn.addEventListener('click', () => {
      emit('deleteSelected');
    });
    sidebar.appendChild(deleteBtn);

    const divider = document.createElement('div');
    divider.style.cssText = `height: 1px; background: rgba(255,255,255,0.1); margin: 8px 0;`;
    sidebar.appendChild(divider);

    const modeSection = document.createElement('div');
    modeSection.style.cssText = `margin-top: 4px;`;

    const modeLabel = document.createElement('div');
    modeLabel.textContent = '漫游模式';
    modeLabel.style.cssText = `font-size: 12px; color: #aaa; margin-bottom: 6px;`;
    modeSection.appendChild(modeLabel);

    this.modeToggle = this.createModeToggle();
    modeSection.appendChild(this.modeToggle);
    sidebar.appendChild(modeSection);

    this.propertyPanel = document.createElement('div');
    this.propertyPanel.style.cssText = `
      margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);
      display: none; opacity: 0; transition: opacity 0.3s;
    `;
    sidebar.appendChild(this.propertyPanel);

    document.body.appendChild(sidebar);
    return sidebar;
  }

  private createModeToggle(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex; gap: 4px; background: rgba(255,255,255,0.05);
      border-radius: 8px; padding: 3px;
    `;

    const firstPersonBtn = document.createElement('button');
    firstPersonBtn.textContent = '🚶 第一人称';
    firstPersonBtn.dataset.mode = 'firstPerson';
    firstPersonBtn.style.cssText = `
      flex: 1; padding: 6px 4px; border: none; border-radius: 6px;
      background: rgba(0,188,212,0.4); color: #fff; cursor: pointer;
      font-size: 11px; transition: background 0.2s;
    `;

    const topDownBtn = document.createElement('button');
    topDownBtn.textContent = '🦅 俯视';
    topDownBtn.dataset.mode = 'topDown';
    topDownBtn.style.cssText = `
      flex: 1; padding: 6px 4px; border: none; border-radius: 6px;
      background: rgba(255,255,255,0.1); color: #aaa; cursor: pointer;
      font-size: 11px; transition: background 0.2s;
    `;

    firstPersonBtn.addEventListener('click', () => {
      this.currentMode = 'firstPerson';
      this.updateModeButtons(firstPersonBtn, topDownBtn);
      emit('navigationModeChanged', 'firstPerson');
    });

    topDownBtn.addEventListener('click', () => {
      this.currentMode = 'topDown';
      this.updateModeButtons(topDownBtn, firstPersonBtn);
      emit('navigationModeChanged', 'topDown');
    });

    container.appendChild(firstPersonBtn);
    container.appendChild(topDownBtn);
    return container;
  }

  private updateModeButtons(active: HTMLButtonElement, inactive: HTMLButtonElement) {
    active.style.background = 'rgba(0,188,212,0.4)';
    active.style.color = '#fff';
    inactive.style.background = 'rgba(255,255,255,0.1)';
    inactive.style.color = '#aaa';
  }

  private createFPSDisplay() {
    const fps = document.createElement('div');
    fps.style.cssText = `
      position: fixed; top: 12px; right: 12px;
      background: rgba(0,0,0,0.5); color: #ffffff; font-size: 12px;
      font-family: monospace; padding: 4px 8px; border-radius: 4px;
      z-index: 10; pointer-events: none;
    `;
    fps.textContent = '0 FPS';
    document.body.appendChild(fps);
    this.fpsDisplay = fps;
  }

  private createUndoButton() {
    const btn = document.createElement('button');
    btn.innerHTML = '↩️';
    btn.title = '撤销删除';
    btn.style.cssText = `
      position: fixed; bottom: 20px; right: 20px;
      width: 48px; height: 48px; border-radius: 50%; border: none;
      background: rgba(30,30,40,0.85); color: #fff; font-size: 20px;
      cursor: pointer; z-index: 10; transition: background 0.2s;
      display: flex; align-items: center; justify-content: center;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(0,188,212,0.4)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(30,30,40,0.85)';
    });
    btn.addEventListener('click', () => {
      emit('undoDelete');
    });
    document.body.appendChild(btn);
    this.undoButton = btn;
  }

  private handlePlacementClick(type: BuildingType) {
    if (this.activePlacementBtn === type) {
      this.activePlacementBtn = null;
      this.updatePlacementButtons();
      emit('setPlacementMode', null);
    } else {
      this.activePlacementBtn = type;
      this.updatePlacementButtons();
      emit('setPlacementMode', type);
    }
  }

  private updatePlacementButtons() {
    const buttons = this.sidebar.querySelectorAll('button[data-type]');
    buttons.forEach((btn) => {
      const b = btn as HTMLButtonElement;
      if (b.dataset.type === this.activePlacementBtn) {
        b.style.background = 'rgba(0,188,212,0.4)';
      } else {
        b.style.background = 'rgba(255,255,255,0.1)';
      }
    });
  }

  private bindEvents() {
    on('buildingSelected', (id: unknown) => {
      this.selectedBuildingId = id as string;
      this.showPropertyPanel(id as string);
    });

    on('buildingDeselected', () => {
      this.selectedBuildingId = null;
      this.hidePropertyPanel();
    });

    on('buildingUpdated', (id: unknown) => {
      if (this.selectedBuildingId === id) {
        this.updatePropertyPanel(id as string);
      }
    });

    on('placementModeChanged', () => {
      this.activePlacementBtn = null;
      this.updatePlacementButtons();
    });

    on('deleteHistoryChanged', (count: unknown) => {
      if (this.undoButton) {
        this.undoButton.style.opacity = (count as number) > 0 ? '1' : '0.4';
      }
    });
  }

  private showPropertyPanel(id: string) {
    if (!this.propertyPanel) return;
    const data = getBuilding(id);
    if (!data) return;

    this.propertyPanel.innerHTML = '';
    this.propertyPanel.style.display = 'block';

    requestAnimationFrame(() => {
      if (this.propertyPanel) this.propertyPanel.style.opacity = '1';
    });

    const label = document.createElement('div');
    label.textContent = '属性面板';
    label.style.cssText = `font-size: 12px; color: #aaa; margin-bottom: 8px;`;
    this.propertyPanel.appendChild(label);

    this.addPropertyField('名称', data.name, true, (val) => {
      emit('updateBuildingName', val);
    });

    this.addPropertyField('类型', this.getTypeLabel(data.type), false);

    this.addNumberField('X', data.position.x, (val) => {
      const d = getBuilding(id);
      if (d) emit('updateBuildingPosition', { x: val, y: d.position.y, z: d.position.z });
    });

    this.addNumberField('Y', data.position.y, (val) => {
      const d = getBuilding(id);
      if (d) emit('updateBuildingPosition', { x: d.position.x, y: val, z: d.position.z });
    });

    this.addNumberField('Z', data.position.z, (val) => {
      const d = getBuilding(id);
      if (d) emit('updateBuildingPosition', { x: d.position.x, y: d.position.y, z: val });
    });

    this.addScaleSlider(data.scale, (val) => {
      emit('updateBuildingScale', val);
    });
  }

  private addPropertyField(label: string, value: string, editable: boolean, onChange?: (val: string) => void) {
    const row = document.createElement('div');
    row.style.cssText = `margin-bottom: 6px;`;

    const lbl = document.createElement('div');
    lbl.textContent = label;
    lbl.style.cssText = `font-size: 11px; color: #aaa; margin-bottom: 2px;`;
    row.appendChild(lbl);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.readOnly = !editable;
    input.style.cssText = `
      width: 100%; padding: 4px 8px; background: #2a2a2a; color: #fff;
      border: 1px solid #444; border-radius: 6px; font-size: 13px;
      outline: none; box-sizing: border-box;
      ${!editable ? 'opacity: 0.6; cursor: default;' : ''}
    `;
    input.addEventListener('focus', () => {
      if (editable) input.style.borderColor = '#00bcd4';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#444';
    });
    if (onChange && editable) {
      input.addEventListener('input', () => onChange(input.value));
    }
    row.appendChild(input);

    if (this.propertyPanel) this.propertyPanel.appendChild(row);
  }

  private addNumberField(label: string, value: number, onChange: (val: number) => void) {
    const row = document.createElement('div');
    row.style.cssText = `margin-bottom: 6px;`;

    const lbl = document.createElement('div');
    lbl.textContent = label;
    lbl.style.cssText = `font-size: 11px; color: #aaa; margin-bottom: 2px;`;
    row.appendChild(lbl);

    const input = document.createElement('input');
    input.type = 'number';
    input.value = value.toFixed(2);
    input.step = '0.5';
    input.style.cssText = `
      width: 100%; padding: 4px 8px; background: #2a2a2a; color: #fff;
      border: 1px solid #444; border-radius: 6px; font-size: 13px;
      outline: none; box-sizing: border-box;
    `;
    input.addEventListener('focus', () => {
      input.style.borderColor = '#00bcd4';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#444';
    });
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) onChange(v);
    });
    row.appendChild(input);

    if (this.propertyPanel) this.propertyPanel.appendChild(row);
  }

  private addScaleSlider(value: number, onChange: (val: number) => void) {
    const row = document.createElement('div');
    row.style.cssText = `margin-bottom: 6px;`;

    const lbl = document.createElement('div');
    lbl.textContent = `缩放比例: ${value.toFixed(1)}`;
    lbl.style.cssText = `font-size: 11px; color: #aaa; margin-bottom: 2px;`;
    lbl.id = 'scale-label';
    row.appendChild(lbl);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0.5';
    input.max = '2.0';
    input.step = '0.1';
    input.value = value.toFixed(1);
    input.style.cssText = `
      width: 100%; cursor: pointer;
      accent-color: #00bcd4;
    `;
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      lbl.textContent = `缩放比例: ${v.toFixed(1)}`;
      onChange(v);
    });
    row.appendChild(input);

    if (this.propertyPanel) this.propertyPanel.appendChild(row);
  }

  private hidePropertyPanel() {
    if (!this.propertyPanel) return;
    this.propertyPanel.style.opacity = '0';
    setTimeout(() => {
      if (this.propertyPanel && !this.selectedBuildingId) {
        this.propertyPanel.style.display = 'none';
        this.propertyPanel.innerHTML = '';
      }
    }, 300);
  }

  private updatePropertyPanel(id: string) {
    const data = getBuilding(id);
    if (!data || !this.propertyPanel) return;

    const nameInput = this.propertyPanel.querySelector('input[type="text"]') as HTMLInputElement;
    if (nameInput && !nameInput.matches(':focus')) {
      nameInput.value = data.name;
    }

    const numInputs = this.propertyPanel.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;
    if (numInputs.length >= 3) {
      if (!numInputs[0].matches(':focus')) numInputs[0].value = data.position.x.toFixed(2);
      if (!numInputs[1].matches(':focus')) numInputs[1].value = data.position.y.toFixed(2);
      if (!numInputs[2].matches(':focus')) numInputs[2].value = data.position.z.toFixed(2);
    }

    const slider = this.propertyPanel.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider && !slider.matches(':active')) {
      slider.value = data.scale.toFixed(1);
      const lbl = this.propertyPanel.querySelector('#scale-label');
      if (lbl) lbl.textContent = `缩放比例: ${data.scale.toFixed(1)}`;
    }
  }

  private getTypeLabel(type: BuildingType): string {
    switch (type) {
      case 'residential': return '住宅';
      case 'commercial': return '商业楼';
      case 'park': return '公园';
      case 'streetlight': return '路灯';
    }
  }

  updateFPS(fps: number) {
    if (this.fpsDisplay) {
      this.fpsDisplay.textContent = `${fps} FPS`;
    }
  }
}
