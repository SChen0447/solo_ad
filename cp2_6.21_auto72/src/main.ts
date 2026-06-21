import { AudioAnalyzer, type SpectrumData } from './audioAnalyzer';
import { SceneManager, COLOR_THEMES, type ColorTheme } from './sceneManager';
import { SpectrumVisualizer } from './spectrumVisualizer';
import { ParticleSystem } from './particleSystem';

function applyHoverEffect(element: HTMLElement, glowColor: string): void {
  element.addEventListener('mouseenter', () => {
    element.style.transform = 'scale(1.05)';
    element.style.filter = `drop-shadow(0 0 8px ${glowColor})`;
  });
  element.addEventListener('mouseleave', () => {
    element.style.transform = 'scale(1)';
    element.style.filter = 'none';
  });
}

class App {
  private audioAnalyzer: AudioAnalyzer;
  private sceneManager: SceneManager;
  private spectrumVisualizer: SpectrumVisualizer;
  private particleSystem: ParticleSystem;
  private spectrumData: SpectrumData;
  private isPlaying: boolean = false;
  private loading: boolean = false;
  private animationId: number | null = null;
  private currentThemeIndex: number = 0;
  private playPauseBtn: HTMLButtonElement | null = null;

  constructor() {
    this.audioAnalyzer = new AudioAnalyzer();
    this.sceneManager = new SceneManager('canvas-container');
    this.spectrumVisualizer = new SpectrumVisualizer(
      this.sceneManager.spectrumGroup,
      this.sceneManager
    );
    this.particleSystem = new ParticleSystem(this.sceneManager.particleGroup, 500);
    this.spectrumData = new Float32Array(128);

    this.createUI();
    this.setupAudioCallbacks();
    this.startAnimationLoop();
    this.setupWindowResizeHandler();
  }

  private createUI(): void {
    const app = document.getElementById('app');
    if (!app) return;

    const uploadArea = document.createElement('div');
    uploadArea.id = 'upload-area';
    uploadArea.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-start;
    `;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.mp3,.wav,audio/mpeg,audio/wav';
    fileInput.id = 'file-input';
    fileInput.style.display = 'none';

    const uploadButton = document.createElement('button');
    uploadButton.textContent = '选择音频文件';
    uploadButton.style.cssText = `
      padding: 12px 24px;
      background: #1E1E1E;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s ease-out;
    `;
    uploadButton.addEventListener('click', () => fileInput.click());
    uploadButton.addEventListener('mouseenter', () => {
      uploadButton.style.transform = 'scale(1.05)';
      uploadButton.style.boxShadow = '0 0 20px rgba(78, 205, 196, 0.5)';
    });
    uploadButton.addEventListener('mouseleave', () => {
      uploadButton.style.transform = 'scale(1)';
      uploadButton.style.boxShadow = 'none';
    });

    const dropZone = document.createElement('div');
    dropZone.textContent = '拖拽 MP3/WAV 文件到此处';
    dropZone.style.cssText = `
      padding: 20px 40px;
      border: 2px dashed #FF6B6B;
      border-radius: 8px;
      background: rgba(30, 30, 30, 0.8);
      color: #aaa;
      font-size: 13px;
      text-align: center;
      transition: all 0.3s ease-out;
      min-width: 200px;
    `;

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '#FF6B6B';
      dropZone.style.background = 'rgba(255, 107, 107, 0.2)';
      dropZone.style.boxShadow = '0 0 20px rgba(255, 107, 107, 0.4)';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = '#FF6B6B';
      dropZone.style.background = 'rgba(30, 30, 30, 0.8)';
      dropZone.style.boxShadow = 'none';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '#FF6B6B';
      dropZone.style.background = 'rgba(30, 30, 30, 0.8)';
      dropZone.style.boxShadow = 'none';
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('audio/')) {
          this.handleFileSelected(file);
        }
      }
    });

    fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        this.handleFileSelected(file);
      }
    });

    uploadButton.appendChild(fileInput);
    uploadArea.appendChild(uploadButton);
    uploadArea.appendChild(dropZone);

    const controlPanel = this.createControlPanel();
    const loadingOverlay = this.createLoadingOverlay();

    app.appendChild(uploadArea);
    app.appendChild(controlPanel);
    app.appendChild(loadingOverlay);
  }

  private createControlPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    const isNarrow = window.innerWidth < 768;

    panel.style.cssText = `
      position: fixed;
      ${isNarrow ? 'bottom: 20px; left: 50%; transform: translateX(-50%);' : 'top: 50%; right: 20px; transform: translateY(-50%);'}
      width: 220px;
      background: rgba(30, 30, 30, 0.9);
      border-radius: 12px;
      padding: 20px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 16px;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease-out;
    `;
    panel.id = 'control-panel';

    const title = document.createElement('div');
    title.textContent = '控制面板';
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      color: white;
      margin-bottom: 8px;
      text-align: center;
    `;
    panel.appendChild(title);

    const playPauseBtn = document.createElement('button');
    playPauseBtn.innerHTML = this.getPlayPauseSVG(false);
    playPauseBtn.style.cssText = `
      width: 100%;
      padding: 12px;
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease-out;
      color: #4ECDC4;
      opacity: 0.5;
    `;
    playPauseBtn.disabled = true;
    this.playPauseBtn = playPauseBtn;

    applyHoverEffect(playPauseBtn, '#4ECDC4');

    playPauseBtn.addEventListener('click', () => {
      if (this.isPlaying) {
        this.audioAnalyzer.pause();
        this.isPlaying = false;
      } else {
        this.audioAnalyzer.play();
        this.isPlaying = true;
      }
      playPauseBtn.innerHTML = this.getPlayPauseSVG(this.isPlaying);
      playPauseBtn.style.color = this.isPlaying ? '#FF6B6B' : '#4ECDC4';
    });

    panel.appendChild(playPauseBtn);

    const volumeLabel = document.createElement('div');
    volumeLabel.textContent = '音量';
    volumeLabel.style.cssText = 'color: #aaa; font-size: 12px;';
    panel.appendChild(volumeLabel);

    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.value = '100';
    this.styleSlider(volumeSlider, '#4ECDC4');
    volumeSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.audioAnalyzer.setVolume(value);
    });
    panel.appendChild(volumeSlider);

    const particleLabel = document.createElement('div');
    particleLabel.textContent = '粒子数量';
    particleLabel.style.cssText = 'color: #aaa; font-size: 12px;';
    panel.appendChild(particleLabel);

    const particleSlider = document.createElement('input');
    particleSlider.type = 'range';
    particleSlider.min = '100';
    particleSlider.max = '1000';
    particleSlider.step = '100';
    particleSlider.value = '500';
    this.styleSlider(particleSlider, '#4ECDC4');
    particleSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.particleSystem.setParticleCount(value);
    });
    panel.appendChild(particleSlider);

    const themeLabel = document.createElement('div');
    themeLabel.textContent = '颜色主题';
    themeLabel.style.cssText = 'color: #aaa; font-size: 12px; margin-bottom: 8px;';
    panel.appendChild(themeLabel);

    const themeContainer = document.createElement('div');
    themeContainer.style.cssText = `
      display: flex;
      gap: 8px;
      justify-content: center;
    `;

    COLOR_THEMES.forEach((theme: ColorTheme, index: number) => {
      const themeBtn = document.createElement('button');
      themeBtn.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 8px;
        border: 2px solid ${index === 0 ? '#fff' : 'transparent'};
        background: linear-gradient(135deg, ${theme.lowColor}, ${theme.highColor});
        cursor: pointer;
        transition: all 0.2s ease-out;
      `;
      applyHoverEffect(themeBtn, '#ffffff');

      themeBtn.addEventListener('click', () => {
        this.currentThemeIndex = index;
        this.sceneManager.setColorTheme(theme);
        this.spectrumVisualizer.updateColorTheme(theme);
        Array.from(themeContainer.children).forEach((child) => {
          (child as HTMLElement).style.border = '2px solid transparent';
        });
        themeBtn.style.border = '2px solid #fff';
      });

      themeContainer.appendChild(themeBtn);
    });

    panel.appendChild(themeContainer);

    return panel;
  }

  private createLoadingOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 10, 10, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 200;
    `;

    const loader = document.createElement('div');
    loader.style.cssText = `
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: conic-gradient(from 0deg, #FF6B6B, #4ECDC4, #FF6B6B);
      animation: spin 1s linear infinite;
      mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000);
      -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000);
      mask-composite: exclude;
      -webkit-mask-composite: xor;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    overlay.appendChild(loader);
    return overlay;
  }

  private getPlayPauseSVG(isPlaying: boolean): string {
    if (isPlaying) {
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>`;
    }
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21"/>
    </svg>`;
  }

  private styleSlider(slider: HTMLInputElement, color: string): void {
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #333;
      outline: none;
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
    `;

    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: ${color};
        cursor: pointer;
        transition: all 0.2s ease-out;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 10px ${color}88;
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: ${color};
        cursor: pointer;
        border: none;
      }
    `;
    document.head.appendChild(style);
  }

  private setupAudioCallbacks(): void {
    this.audioAnalyzer.setOnSpectrumUpdate((data: SpectrumData) => {
      this.spectrumData = data;
    });
  }

  private async handleFileSelected(file: File): Promise<void> {
    this.loading = true;
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }

    try {
      await this.audioAnalyzer.loadAudioFile(file);
      this.audioAnalyzer.play();
      this.isPlaying = true;

      if (this.playPauseBtn) {
        this.playPauseBtn.disabled = false;
        this.playPauseBtn.style.opacity = '1';
        this.playPauseBtn.innerHTML = this.getPlayPauseSVG(true);
        this.playPauseBtn.style.color = '#FF6B6B';
      }
    } catch (error) {
      console.error('Error loading audio file:', error);
      alert('音频文件加载失败，请尝试其他文件');
    } finally {
      this.loading = false;
      if (overlay) {
        overlay.style.display = 'none';
      }
    }
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.spectrumVisualizer.update(this.spectrumData);
      this.particleSystem.update(this.spectrumData);
      this.sceneManager.update(this.spectrumData);
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  private setupWindowResizeHandler(): void {
    window.addEventListener('resize', () => {
      const panel = document.getElementById('control-panel');
      if (!panel) return;

      const isNarrow = window.innerWidth < 768;
      if (isNarrow) {
        panel.style.top = 'auto';
        panel.style.right = 'auto';
        panel.style.bottom = '20px';
        panel.style.left = '50%';
        panel.style.transform = 'translateX(-50%)';
      } else {
        panel.style.top = '50%';
        panel.style.right = '20px';
        panel.style.bottom = 'auto';
        panel.style.left = 'auto';
        panel.style.transform = 'translateY(-50%)';
      }
      this.spectrumVisualizer.updatePositions();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
