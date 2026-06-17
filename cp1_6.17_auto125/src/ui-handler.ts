import { MaterialType, TextureType } from './material-manager';
import { LightPosition } from './scene-manager';

export interface UIPreset {
  id: string;
  name: string;
  materialType: MaterialType;
  textureType: TextureType;
  lightPosition: LightPosition;
  createdAt: string;
}

export type MaterialChangeHandler = (type: MaterialType) => void;
export type TextureChangeHandler = (type: TextureType) => void;
export type LightChangeHandler = (pos: LightPosition) => void;
export type PresetSaveHandler = () => void;
export type PresetLoadHandler = (preset: UIPreset) => void;

const MATERIAL_LABELS: Record<MaterialType, string> = {
  metal: '金属',
  plastic: '粗糙塑料',
  glass: '透明玻璃',
  emissive: '自发光',
};

const TEXTURE_LABELS: Record<TextureType, string> = {
  none: '无纹理',
  wood: '木纹',
  marble: '大理石',
  brushed: '磨砂金属',
  fabric: '织物',
};

export class UIHandler {
  private materialButtons: NodeListOf<HTMLButtonElement>;
  private textureSelect: HTMLSelectElement;
  private lightXSlider: HTMLInputElement;
  private lightYSlider: HTMLInputElement;
  private lightZSlider: HTMLInputElement;
  private lightXValue: HTMLElement;
  private lightYValue: HTMLElement;
  private lightZValue: HTMLElement;
  private presetList: HTMLElement;
  private saveBtn: HTMLButtonElement;
  private hamburgerBtn: HTMLButtonElement;
  private panelBody: HTMLElement;

  private currentMaterialType: MaterialType = 'metal';
  private currentTextureType: TextureType = 'none';

  private onMaterialChange?: MaterialChangeHandler;
  private onTextureChange?: TextureChangeHandler;
  private onLightChange?: LightChangeHandler;
  private onPresetSave?: PresetSaveHandler;
  private onPresetLoad?: PresetLoadHandler;

  constructor() {
    this.materialButtons = document.querySelectorAll<HTMLButtonElement>('.material-btn');
    this.textureSelect = document.getElementById('texture-select') as HTMLSelectElement;
    this.lightXSlider = document.getElementById('light-x') as HTMLInputElement;
    this.lightYSlider = document.getElementById('light-y') as HTMLInputElement;
    this.lightZSlider = document.getElementById('light-z') as HTMLInputElement;
    this.lightXValue = document.getElementById('light-x-value') as HTMLElement;
    this.lightYValue = document.getElementById('light-y-value') as HTMLElement;
    this.lightZValue = document.getElementById('light-z-value') as HTMLElement;
    this.presetList = document.getElementById('preset-list') as HTMLElement;
    this.saveBtn = document.getElementById('preset-save-btn') as HTMLButtonElement;
    this.hamburgerBtn = document.getElementById('hamburger-btn') as HTMLButtonElement;
    this.panelBody = document.getElementById('panel-body') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.materialButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.material as MaterialType;
        if (type && type !== this.currentMaterialType) {
          this.setActiveMaterialButton(type);
          this.currentMaterialType = type;
          this.onMaterialChange?.(type);
        }
      });
    });

    this.textureSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const type = target.value as TextureType;
      this.currentTextureType = type;
      this.onTextureChange?.(type);
    });

    const handleLightChange = () => {
      const pos: LightPosition = {
        x: parseFloat(this.lightXSlider.value),
        y: parseFloat(this.lightYSlider.value),
        z: parseFloat(this.lightZSlider.value),
      };
      this.updateLightValueLabels(pos);
      this.onLightChange?.(pos);
    };

    this.lightXSlider.addEventListener('input', handleLightChange);
    this.lightYSlider.addEventListener('input', handleLightChange);
    this.lightZSlider.addEventListener('input', handleLightChange);

    this.saveBtn.addEventListener('click', () => {
      this.onPresetSave?.();
    });

    this.hamburgerBtn.addEventListener('click', () => {
      this.hamburgerBtn.classList.toggle('active');
      this.panelBody.classList.toggle('mobile-open');
    });
  }

  private setActiveMaterialButton(type: MaterialType): void {
    this.materialButtons.forEach((btn) => {
      const isActive = btn.dataset.material === type;
      btn.classList.toggle('active', isActive);
    });
  }

  private updateLightValueLabels(pos: LightPosition): void {
    this.lightXValue.textContent = pos.x.toFixed(1);
    this.lightYValue.textContent = pos.y.toFixed(1);
    this.lightZValue.textContent = pos.z.toFixed(1);
  }

  public getCurrentState(): {
    materialType: MaterialType;
    textureType: TextureType;
    lightPosition: LightPosition;
  } {
    return {
      materialType: this.currentMaterialType,
      textureType: this.currentTextureType,
      lightPosition: {
        x: parseFloat(this.lightXSlider.value),
        y: parseFloat(this.lightYSlider.value),
        z: parseFloat(this.lightZSlider.value),
      },
    };
  }

  public applyPresetToUI(preset: UIPreset): void {
    this.currentMaterialType = preset.materialType;
    this.setActiveMaterialButton(preset.materialType);

    this.currentTextureType = preset.textureType;
    this.textureSelect.value = preset.textureType;

    this.lightXSlider.value = preset.lightPosition.x.toString();
    this.lightYSlider.value = preset.lightPosition.y.toString();
    this.lightZSlider.value = preset.lightPosition.z.toString();
    this.updateLightValueLabels(preset.lightPosition);
  }

  public renderPresets(presets: UIPreset[]): void {
    if (presets.length === 0) {
      this.presetList.innerHTML = `
        <div class="preset-empty">暂无预设，点击上方按钮保存</div>
      `;
      return;
    }

    this.presetList.innerHTML = '';
    presets.forEach((preset) => {
      const card = document.createElement('div');
      card.className = 'preset-card';
      card.dataset.presetId = preset.id;

      const materialLabel = MATERIAL_LABELS[preset.materialType] || preset.materialType;
      const textureLabel = TEXTURE_LABELS[preset.textureType] || preset.textureType;
      const pos = preset.lightPosition;
      const lightInfo = `光源(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`;

      card.innerHTML = `
        <div class="preset-card-name">${preset.name}</div>
        <div class="preset-card-info">
          ${materialLabel} · ${textureLabel}<br/>
          ${lightInfo}
        </div>
      `;

      card.addEventListener('click', () => {
        this.applyPresetToUI(preset);
        this.onPresetLoad?.(preset);
      });

      this.presetList.appendChild(card);
    });
  }

  public setMaterialChangeHandler(handler: MaterialChangeHandler): void {
    this.onMaterialChange = handler;
  }

  public setTextureChangeHandler(handler: TextureChangeHandler): void {
    this.onTextureChange = handler;
  }

  public setLightChangeHandler(handler: LightChangeHandler): void {
    this.onLightChange = handler;
  }

  public setPresetSaveHandler(handler: PresetSaveHandler): void {
    this.onPresetSave = handler;
  }

  public setPresetLoadHandler(handler: PresetLoadHandler): void {
    this.onPresetLoad = handler;
  }

  public getTextureSelect(): HTMLSelectElement {
    return this.textureSelect;
  }
}
