import { AudioEngine, InstrumentType } from '../core/AudioEngine';
import { Scene3D, PresetLayout } from '../core/Scene3D';

export class ControlPanel {
  private container: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private audioEngine: AudioEngine | null = null;
  private scene3D: Scene3D | null = null;
  
  private globalVolumeSlider: HTMLInputElement | null = null;
  private reverbSlider: HTMLInputElement | null = null;
  private globalVolumeValue: HTMLElement | null = null;
  private reverbValue: HTMLElement | null = null;
  private presetButtons: HTMLButtonElement[] = [];
  private currentPresetIndex: number = -1;
  
  private onResetCallback: (() => void) | null = null;
  
  init(
    container: HTMLElement,
    audioEngine: AudioEngine,
    scene3D: Scene3D
  ): void {
    this.container = container;
    this.audioEngine = audioEngine;
    this.scene3D = scene3D;
    
    this.createPanel();
    this.addStyles();
  }
  
  private createPanel(): void {
    if (!this.container) return;
    
    this.panel = document.createElement('div');
    this.panel.className = 'control-panel';
    this.panel.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 280px;
      height: 100vh;
      background: rgba(22, 33, 62, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-left: 1px solid rgba(233, 69, 96, 0.3);
      padding: 24px 20px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 24px;
      z-index: 100;
      overflow-y: auto;
    `;
    
    const title = this.createTitle();
    this.panel.appendChild(title);
    
    const presetSection = this.createPresetSection();
    this.panel.appendChild(presetSection);
    
    const volumeSection = this.createVolumeSection();
    this.panel.appendChild(volumeSection);
    
    const reverbSection = this.createReverbSection();
    this.panel.appendChild(reverbSection);
    
    const resetButton = this.createResetButton();
    this.panel.appendChild(resetButton);
    
    const infoSection = this.createInfoSection();
    this.panel.appendChild(infoSection);
    
    this.container.appendChild(this.panel);
  }
  
  private createTitle(): HTMLElement {
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(233, 69, 96, 0.2);
    `;
    
    const title = document.createElement('h1');
    title.textContent = '空间音频模拟器';
    title.style.cssText = `
      color: #e0e0e0;
      font-size: 18px;
      font-weight: 700;
      margin: 0;
      letter-spacing: 0.5px;
    `;
    
    const subtitle = document.createElement('p');
    subtitle.textContent = '拖拽乐器到舞台，体验空间音频定位';
    subtitle.style.cssText = `
      color: rgba(224, 224, 224, 0.6);
      font-size: 12px;
      margin: 0;
    `;
    
    titleContainer.appendChild(title);
    titleContainer.appendChild(subtitle);
    
    return titleContainer;
  }
  
  private createPresetSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;
    
    const label = document.createElement('label');
    label.textContent = '预设布局';
    label.style.cssText = `
      color: #e0e0e0;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    `;
    section.appendChild(label);
    
    const layouts = this.scene3D?.getPresetLayouts() || [];
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    `;
    
    layouts.forEach((layout: PresetLayout, index: number) => {
      const button = document.createElement('button');
      button.className = 'preset-button';
      button.dataset.index = String(index);
      
      button.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
          <span style="font-size: 13px; font-weight: 600;">${layout.name}</span>
          <span style="font-size: 10px; opacity: 0.6; font-weight: 400;">${layout.description}</span>
        </div>
      `;
      
      button.style.cssText = `
        width: 100%;
        padding: 10px 14px;
        background: rgba(15, 52, 96, 0.6);
        border: 1px solid rgba(233, 69, 96, 0.2);
        border-radius: 12px;
        color: #e0e0e0;
        cursor: pointer;
        transition: all 0.15s ease;
        text-align: left;
        font-family: inherit;
      `;
      
      button.addEventListener('mousedown', () => {
        button.style.transform = 'scale(0.95)';
      });
      
      button.addEventListener('mouseup', () => {
        button.style.transform = 'scale(1.05)';
        setTimeout(() => {
          button.style.transform = 'scale(1)';
        }, 100);
      });
      
      button.addEventListener('mouseleave', () => {
        if (this.currentPresetIndex !== index) {
          button.style.background = 'rgba(15, 52, 96, 0.6)';
        }
      });
      
      button.addEventListener('mouseenter', () => {
        if (this.currentPresetIndex !== index) {
          button.style.background = 'rgba(233, 69, 96, 0.3)';
        }
      });
      
      button.addEventListener('click', () => {
        this.applyPreset(index);
      });
      
      buttonContainer.appendChild(button);
      this.presetButtons.push(button);
    });
    
    section.appendChild(buttonContainer);
    
    return section;
  }
  
  private createVolumeSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 8px;
    `;
    
    const labelContainer = document.createElement('div');
    labelContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const label = document.createElement('label');
    label.textContent = '全局音量';
    label.style.cssText = `
      color: #e0e0e0;
      font-size: 14px;
      font-weight: 600;
    `;
    
    this.globalVolumeValue = document.createElement('span');
    this.globalVolumeValue.textContent = '0 dB';
    this.globalVolumeValue.style.cssText = `
      color: #e94560;
      font-size: 13px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    `;
    
    labelContainer.appendChild(label);
    labelContainer.appendChild(this.globalVolumeValue);
    
    this.globalVolumeSlider = document.createElement('input');
    this.globalVolumeSlider.type = 'range';
    this.globalVolumeSlider.min = '-20';
    this.globalVolumeSlider.max = '0';
    this.globalVolumeSlider.step = '0.5';
    this.globalVolumeSlider.value = '0';
    this.globalVolumeSlider.style.cssText = this.getSliderStyle();
    
    this.globalVolumeSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.onVolumeChange(value);
    });
    
    section.appendChild(labelContainer);
    section.appendChild(this.globalVolumeSlider);
    
    return section;
  }
  
  private createReverbSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 8px;
    `;
    
    const labelContainer = document.createElement('div');
    labelContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const label = document.createElement('label');
    label.textContent = '混响强度';
    label.style.cssText = `
      color: #e0e0e0;
      font-size: 14px;
      font-weight: 600;
    `;
    
    this.reverbValue = document.createElement('span');
    this.reverbValue.textContent = '30%';
    this.reverbValue.style.cssText = `
      color: #e94560;
      font-size: 13px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    `;
    
    labelContainer.appendChild(label);
    labelContainer.appendChild(this.reverbValue);
    
    this.reverbSlider = document.createElement('input');
    this.reverbSlider.type = 'range';
    this.reverbSlider.min = '0';
    this.reverbSlider.max = '100';
    this.reverbSlider.step = '1';
    this.reverbSlider.value = '30';
    this.reverbSlider.style.cssText = this.getSliderStyle();
    
    this.reverbSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.onReverbChange(value);
    });
    
    section.appendChild(labelContainer);
    section.appendChild(this.reverbSlider);
    
    return section;
  }
  
  private createResetButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'reset-button';
    button.textContent = '重置';
    button.style.cssText = `
      width: 100%;
      padding: 12px 20px;
      background: linear-gradient(135deg, #e94560 0%, #0f3460 100%);
      border: none;
      border-radius: 12px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
      letter-spacing: 0.5px;
      margin-top: 8px;
    `;
    
    button.addEventListener('mousedown', () => {
      button.style.transform = 'scale(0.95)';
      this.audioEngine?.playClickSound();
    });
    
    button.addEventListener('mouseup', () => {
      button.style.transform = 'scale(1.05)';
      setTimeout(() => {
        button.style.transform = 'scale(1)';
      }, 100);
      this.onReset();
    });
    
    button.addEventListener('mouseenter', () => {
      button.style.boxShadow = '0 4px 20px rgba(233, 69, 96, 0.4)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.boxShadow = 'none';
    });
    
    return button;
  }
  
  private createInfoSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-top: auto;
      padding-top: 16px;
      border-top: 1px solid rgba(233, 69, 96, 0.2);
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    const tip1 = document.createElement('p');
    tip1.innerHTML = '💡 <strong>提示：</strong>拖拽乐器图标到舞台不同位置';
    tip1.style.cssText = `
      color: rgba(224, 224, 224, 0.7);
      font-size: 11px;
      line-height: 1.5;
      margin: 0;
    `;
    
    const tip2 = document.createElement('p');
    tip2.innerHTML = '👆 <strong>点击舞台：</strong>移动听者位置';
    tip2.style.cssText = `
      color: rgba(224, 224, 224, 0.7);
      font-size: 11px;
      line-height: 1.5;
      margin: 0;
    `;
    
    section.appendChild(tip1);
    section.appendChild(tip2);
    
    return section;
  }
  
  private getSliderStyle(): string {
    return `
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(to right, #0f3460 0%, #e94560 100%);
      outline: none;
      cursor: pointer;
    `;
  }
  
  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #e94560 0%, #ff6b6b 100%);
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(233, 69, 96, 0.5);
        transition: transform 0.15s ease;
        border: 2px solid #ffffff;
      }
      
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      
      input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #e94560 0%, #ff6b6b 100%);
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(233, 69, 96, 0.5);
        transition: transform 0.15s ease;
        border: 2px solid #ffffff;
      }
      
      input[type="range"]::-moz-range-thumb:hover {
        transform: scale(1.2);
      }
      
      .control-panel::-webkit-scrollbar {
        width: 4px;
      }
      
      .control-panel::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .control-panel::-webkit-scrollbar-thumb {
        background: rgba(233, 69, 96, 0.3);
        border-radius: 2px;
      }
      
      .preset-button.active {
        background: linear-gradient(135deg, rgba(233, 69, 96, 0.4) 0%, rgba(15, 52, 96, 0.6) 100%) !important;
        border-color: rgba(233, 69, 96, 0.6) !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  private applyPreset(index: number): void {
    if (!this.scene3D || !this.audioEngine) return;
    
    this.audioEngine.playClickSound();
    
    this.currentPresetIndex = index;
    
    this.presetButtons.forEach((btn, i) => {
      if (i === index) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    const layouts = this.scene3D.getPresetLayouts();
    const layout = layouts[index];
    
    const types: InstrumentType[] = ['violin', 'cello', 'flute', 'trumpet', 'piano', 'timpani'];
    
    types.forEach((type, i) => {
      const position = layout.positions[type];
      if (position) {
        const delay = i * 100;
        this.scene3D?.moveInstrument(type, position, true, delay, () => {
          const currentPos = this.scene3D?.getInstrumentPosition(type);
          if (currentPos) {
            this.audioEngine?.updatePosition(type, currentPos);
          }
        });
      }
    });
  }
  
  private onVolumeChange(db: number): void {
    if (this.audioEngine) {
      this.audioEngine.setGlobalVolume(db);
      if (this.globalVolumeValue) {
        this.globalVolumeValue.textContent = `${db.toFixed(1)} dB`;
      }
    }
  }
  
  private onReverbChange(percent: number): void {
    if (this.audioEngine) {
      this.audioEngine.setReverb(percent / 100);
      if (this.reverbValue) {
        this.reverbValue.textContent = `${Math.round(percent)}%`;
      }
    }
  }
  
  private onReset(): void {
    if (this.onResetCallback) {
      this.onResetCallback();
    }
    
    this.currentPresetIndex = -1;
    this.presetButtons.forEach(btn => btn.classList.remove('active'));
    
    if (this.globalVolumeSlider) {
      this.globalVolumeSlider.value = '0';
      this.onVolumeChange(0);
    }
    if (this.reverbSlider) {
      this.reverbSlider.value = '30';
      this.onReverbChange(30);
    }
  }
  
  setOnResetCallback(callback: () => void): void {
    this.onResetCallback = callback;
  }
  
  setGlobalVolume(db: number): void {
    if (this.globalVolumeSlider) {
      this.globalVolumeSlider.value = String(db);
      this.onVolumeChange(db);
    }
  }
  
  setReverbIntensity(percent: number): void {
    if (this.reverbSlider) {
      this.reverbSlider.value = String(percent);
      this.onReverbChange(percent);
    }
  }
  
  destroy(): void {
    if (this.panel && this.container) {
      this.container.removeChild(this.panel);
    }
  }
}
