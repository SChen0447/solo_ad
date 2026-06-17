import * as THREE from 'three';
import type { SoundSourceConfig, SoundscapeConfig } from './types';
import { AudioManager } from './audioManager';
import { SceneManager } from './sceneManager';
import { PRESET_SOUNDSCAPES, MAX_SOURCES } from './presets';

export class ControlPanel {
  private audioManager: AudioManager;
  private sceneManager: SceneManager;
  
  private masterVolumeSlider: HTMLInputElement;
  private masterVolumeValue: HTMLElement;
  private reverbToggle: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private importBtn: HTMLButtonElement;
  private fileInput: HTMLInputElement;
  private dropZone: HTMLElement;
  private presetBtns: NodeListOf<HTMLElement>;

  private onPresetLoadCallback: ((config: SoundscapeConfig) => void) | null = null;

  constructor(audioManager: AudioManager, sceneManager: SceneManager) {
    this.audioManager = audioManager;
    this.sceneManager = sceneManager;

    this.masterVolumeSlider = document.getElementById('master-volume') as HTMLInputElement;
    this.masterVolumeValue = document.getElementById('master-volume-value') as HTMLElement;
    this.reverbToggle = document.getElementById('reverb-toggle') as HTMLButtonElement;
    this.exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    this.importBtn = document.getElementById('import-btn') as HTMLButtonElement;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.dropZone = document.getElementById('drop-zone') as HTMLElement;
    this.presetBtns = document.querySelectorAll('.preset-btn');

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.masterVolumeSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.setMasterVolume(value);
    });

    this.reverbToggle.addEventListener('click', () => {
      this.toggleReverb();
    });

    this.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const presetId = btn.dataset.preset;
        if (presetId) {
          this.loadPreset(presetId);
        }
      });
    });

    this.exportBtn.addEventListener('click', () => {
      this.exportConfig();
    });

    this.importBtn.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.importConfig(file);
      }
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        this.dropZone.classList.add('active');
      }
    });

    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (!this.dropZone.contains(e.relatedTarget as Node)) {
        this.dropZone.classList.remove('active');
      }
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('active');
      
      const file = e.dataTransfer?.files?.[0];
      if (file && file.name.endsWith('.json')) {
        this.importConfig(file);
      }
    });
  }

  private setMasterVolume(value: number): void {
    const volume = value / 100;
    this.audioManager.setMasterVolume(volume);
    this.masterVolumeValue.textContent = `${value}%`;
  }

  private toggleReverb(): void {
    const enabled = !this.audioManager.isReverbEnabled();
    this.audioManager.setReverbEnabled(enabled);
    
    if (enabled) {
      this.reverbToggle.classList.add('active');
      this.reverbToggle.textContent = '关闭混响';
    } else {
      this.reverbToggle.classList.remove('active');
      this.reverbToggle.textContent = '开启混响';
    }
  }

  private loadPreset(presetId: string): void {
    const preset = PRESET_SOUNDSCAPES.find(p => p.id === presetId);
    if (!preset) return;

    if (this.onPresetLoadCallback) {
      this.onPresetLoadCallback(preset.config);
    }

    this.masterVolumeSlider.value = String(Math.round(preset.config.masterVolume * 100));
    this.setMasterVolume(Math.round(preset.config.masterVolume * 100));

    if (preset.config.reverbEnabled !== this.audioManager.isReverbEnabled()) {
      this.toggleReverb();
    }

    this.presetBtns.forEach(btn => {
      if (btn.dataset.preset === presetId) {
        btn.style.background = 'linear-gradient(135deg, #7b2cbf, #ff006e)';
      } else {
        btn.style.background = '';
      }
    });
  }

  public loadConfig(config: SoundscapeConfig): void {
    this.masterVolumeSlider.value = String(Math.round(config.masterVolume * 100));
    this.setMasterVolume(Math.round(config.masterVolume * 100));

    if (config.reverbEnabled !== this.audioManager.isReverbEnabled()) {
      this.toggleReverb();
    }

    this.presetBtns.forEach(btn => {
      btn.style.background = '';
    });
  }

  private exportConfig(): void {
    const sources = this.sceneManager.getSources();
    const config: SoundscapeConfig = {
      version: '1.0',
      timestamp: Date.now(),
      masterVolume: this.audioManager.getMasterVolume(),
      reverbEnabled: this.audioManager.isReverbEnabled(),
      sources: sources.map(source => ({
        type: source.type,
        position: {
          x: Math.round(source.group.position.x * 100) / 100,
          y: Math.round(source.group.position.y * 100) / 100,
          z: Math.round(source.group.position.z * 100) / 100
        },
        volume: Math.round(this.audioManager.getSourceVolume(source) * 100) / 100
      }))
    };

    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `soundscape_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private importConfig(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string) as SoundscapeConfig;
        
        if (!this.validateConfig(config)) {
          alert('无效的音景配置文件');
          return;
        }

        if (config.sources.length > MAX_SOURCES) {
          alert(`配置文件包含 ${config.sources.length} 个音源，最多支持 ${MAX_SOURCES} 个`);
          return;
        }

        if (this.onPresetLoadCallback) {
          this.onPresetLoadCallback(config);
        }

        this.loadConfig(config);
        
        alert('音景配置加载成功！');
      } catch (err) {
        alert('解析配置文件失败，请检查文件格式');
        console.error('Import error:', err);
      }
    };
    reader.readAsText(file);
  }

  private validateConfig(config: SoundscapeConfig): boolean {
    if (!config || typeof config !== 'object') return false;
    if (!config.version || !Array.isArray(config.sources)) return false;
    
    return config.sources.every((source: SoundSourceConfig) => {
      return (
        typeof source.type === 'string' &&
        typeof source.position === 'object' &&
        typeof source.position.x === 'number' &&
        typeof source.position.y === 'number' &&
        typeof source.position.z === 'number' &&
        typeof source.volume === 'number'
      );
    });
  }

  public onPresetLoad(callback: (config: SoundscapeConfig) => void): void {
    this.onPresetLoadCallback = callback;
  }

  public updateUI(): void {
  }

  public dispose(): void {
  }
}
