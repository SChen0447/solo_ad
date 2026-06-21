import { ForestScene } from './forestScene';
import { AnimationController } from './animationController';
import { TreeParams, TreeType } from './treeGenerator';

interface UIState {
  treeType: TreeType;
  crownDensity: number;
  branchLevels: number;
  randomness: number;
}

class FractalForestApp {
  private forestScene: ForestScene;
  private animationController: AnimationController;
  private uiState: UIState;
  
  private statusBar: HTMLElement;
  private fpsElement: HTMLElement;
  private treeCountElement: HTMLElement;
  private speedElement: HTMLElement;
  
  private typeSelect: HTMLSelectElement;
  private crownDensitySlider: HTMLInputElement;
  private branchLevelsSlider: HTMLInputElement;
  private randomnessSlider: HTMLInputElement;
  
  private crownDensityValue: HTMLElement;
  private branchLevelsValue: HTMLElement;
  private randomnessValue: HTMLElement;
  
  private vignette: HTMLElement;
  
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFps: number = 0;
  
  private isAnimating: boolean = false;
  private animationId: number = 0;

  constructor() {
    const container = document.getElementById('app')!;
    
    this.uiState = {
      treeType: 'lsystem',
      crownDensity: 60,
      branchLevels: 5,
      randomness: 0.3
    };
    
    this.forestScene = new ForestScene(container);
    this.animationController = new AnimationController(this.forestScene);
    
    this.statusBar = document.createElement('div');
    this.fpsElement = document.createElement('span');
    this.treeCountElement = document.createElement('span');
    this.speedElement = document.createElement('span');
    
    this.typeSelect = document.createElement('select');
    this.crownDensitySlider = document.createElement('input');
    this.branchLevelsSlider = document.createElement('input');
    this.randomnessSlider = document.createElement('input');
    
    this.crownDensityValue = document.createElement('span');
    this.branchLevelsValue = document.createElement('span');
    this.randomnessValue = document.createElement('span');
    
    this.vignette = document.createElement('div');
    
    this.createUI();
    this.setupEventListeners();
    this.generateForest();
    this.startAnimationLoop();
  }

  private createUI(): void {
    this.createStatusBar();
    this.createLeftPanel();
    this.createRightPanel();
    this.createVignette();
  }

  private createStatusBar(): void {
    this.statusBar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 30px;
      color: #ffffff;
      font-size: 13px;
      z-index: 100;
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    this.fpsElement.textContent = 'FPS: 60';
    this.treeCountElement.textContent = '树木: 0';
    this.speedElement.textContent = '速度: 0.0x';
    
    this.fpsElement.style.cssText = 'font-family: monospace;';
    this.treeCountElement.style.cssText = 'font-family: monospace;';
    this.speedElement.style.cssText = 'font-family: monospace;';
    
    this.statusBar.appendChild(this.fpsElement);
    this.statusBar.appendChild(this.treeCountElement);
    this.statusBar.appendChild(this.speedElement);
    
    const hint = document.createElement('span');
    hint.textContent = '点击画面进入漫游 | WASD移动 | 鼠标拖拽/锁定视角 | 滚轮调速';
    hint.style.cssText = 'margin-left: auto; color: rgba(255,255,255,0.6); font-size: 12px;';
    this.statusBar.appendChild(hint);
    
    document.body.appendChild(this.statusBar);
  }

  private createLeftPanel(): void {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      top: 60px;
      left: 20px;
      z-index: 100;
    `;
    
    const label = document.createElement('div');
    label.textContent = '生成规则';
    label.style.cssText = `
      color: #E0E0E0;
      font-size: 13px;
      margin-bottom: 8px;
      font-weight: 500;
    `;
    panel.appendChild(label);
    
    this.typeSelect.innerHTML = `
      <option value="lsystem">L-System 树</option>
      <option value="recursive">递归分形树</option>
      <option value="random">随机分支树</option>
    `;
    this.typeSelect.style.cssText = `
      width: 180px;
      height: 36px;
      border-radius: 6px;
      background: #2C2C2C;
      color: #E0E0E0;
      border: 1px solid rgba(255,255,255,0.1);
      padding: 0 12px;
      font-size: 13px;
      cursor: pointer;
      outline: none;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23E0E0E0' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 36px;
    `;
    
    panel.appendChild(this.typeSelect);
    document.body.appendChild(panel);
  }

  private createRightPanel(): void {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      width: 260px;
      background: rgba(26, 26, 26, 0.8);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      z-index: 100;
      border: 1px solid rgba(255, 255, 255, 0.08);
    `;
    
    const title = document.createElement('div');
    title.textContent = '参数控制';
    title.style.cssText = `
      color: #ffffff;
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    `;
    panel.appendChild(title);
    
    const crownGroup = this.createSliderGroup(
      '树冠密度',
      this.crownDensitySlider,
      this.crownDensityValue,
      20, 100, 60,
      '20-100'
    );
    panel.appendChild(crownGroup);
    
    const branchGroup = this.createSliderGroup(
      '分支层数',
      this.branchLevelsSlider,
      this.branchLevelsValue,
      3, 8, 5,
      '3-8'
    );
    panel.appendChild(branchGroup);
    
    const randomGroup = this.createSliderGroup(
      '随机变异度',
      this.randomnessSlider,
      this.randomnessValue,
      0, 100, 30,
      '0-1'
    );
    panel.appendChild(randomGroup);
    
    const applyBtn = document.createElement('button');
    applyBtn.textContent = '重新生成';
    applyBtn.style.cssText = `
      width: 100%;
      height: 40px;
      border-radius: 8px;
      background: linear-gradient(135deg, #4CAF50, #2E7D32);
      color: white;
      border: none;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 20px;
      transition: all 0.2s;
    `;
    applyBtn.addEventListener('mouseenter', () => {
      applyBtn.style.transform = 'scale(1.02)';
    });
    applyBtn.addEventListener('mouseleave', () => {
      applyBtn.style.transform = 'scale(1)';
    });
    applyBtn.addEventListener('click', () => this.generateForest());
    panel.appendChild(applyBtn);
    
    document.body.appendChild(panel);
  }

  private createSliderGroup(
    labelText: string,
    slider: HTMLInputElement,
    valueDisplay: HTMLElement,
    min: number,
    max: number,
    value: number,
    rangeText: string
  ): HTMLElement {
    const group = document.createElement('div');
    group.style.cssText = 'margin-bottom: 18px;';
    
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;
    
    const label = document.createElement('span');
    label.textContent = labelText;
    label.style.cssText = 'color: #E0E0E0; font-size: 13px;';
    
    const valueWrapper = document.createElement('span');
    valueWrapper.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    
    valueDisplay.textContent = this.formatSliderValue(slider, value);
    valueDisplay.style.cssText = `
      color: #8BC34A;
      font-size: 13px;
      font-weight: 600;
      font-family: monospace;
    `;
    
    const rangeLabel = document.createElement('span');
    rangeLabel.textContent = rangeText;
    rangeLabel.style.cssText = 'color: rgba(255,255,255,0.4); font-size: 11px;';
    
    valueWrapper.appendChild(valueDisplay);
    valueWrapper.appendChild(rangeLabel);
    
    header.appendChild(label);
    header.appendChild(valueWrapper);
    
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    slider.step = '1';
    
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: linear-gradient(to right, #4CAF50 0%, #2E7D32 100%);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #ffffff;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        border: 2px solid #4CAF50;
        transition: transform 0.15s;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #ffffff;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        border: 2px solid #4CAF50;
      }
    `;
    document.head.appendChild(styleSheet);
    
    group.appendChild(header);
    group.appendChild(slider);
    
    return group;
  }

  private createVignette(): void {
    this.vignette.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 50;
      background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%);
      opacity: 0;
      transition: opacity 0.2s;
    `;
    document.body.appendChild(this.vignette);
  }

  private formatSliderValue(slider: HTMLInputElement, value: number): string {
    if (slider === this.randomnessSlider) {
      return (value / 100).toFixed(2);
    }
    return String(value);
  }

  private setupEventListeners(): void {
    this.typeSelect.addEventListener('change', () => {
      this.uiState.treeType = this.typeSelect.value as TreeType;
      this.generateForest();
    });
    
    this.crownDensitySlider.addEventListener('input', () => {
      const val = parseInt(this.crownDensitySlider.value);
      this.crownDensityValue.textContent = String(val);
      this.uiState.crownDensity = val;
    });
    this.crownDensitySlider.addEventListener('change', () => {
      this.generateForest();
    });
    
    this.branchLevelsSlider.addEventListener('input', () => {
      const val = parseInt(this.branchLevelsSlider.value);
      this.branchLevelsValue.textContent = String(val);
      this.uiState.branchLevels = val;
    });
    this.branchLevelsSlider.addEventListener('change', () => {
      this.generateForest();
    });
    
    this.randomnessSlider.addEventListener('input', () => {
      const val = parseInt(this.randomnessSlider.value) / 100;
      this.randomnessValue.textContent = val.toFixed(2);
      this.uiState.randomness = val;
    });
    this.randomnessSlider.addEventListener('change', () => {
      this.generateForest();
    });
    
    this.forestScene.setOnSpeedChange((speed) => {
      this.speedElement.textContent = `速度: ${this.forestScene.getSpeedMultiplier().toFixed(1)}x`;
      this.updateVignette(speed);
    });
    
    this.forestScene.setOnTreeCountChange((count) => {
      this.treeCountElement.textContent = `树木: ${count}`;
    });
  }

  private updateVignette(speed: number): void {
    const maxSpeed = 15;
    const normalizedSpeed = Math.min(speed / maxSpeed, 1);
    const opacity = 0.1 + normalizedSpeed * 0.3;
    this.vignette.style.opacity = String(opacity);
  }

  private generateForest(): void {
    const params: TreeParams = {
      type: this.uiState.treeType,
      crownDensity: this.uiState.crownDensity,
      branchLevels: this.uiState.branchLevels,
      randomness: this.uiState.randomness
    };
    
    this.forestScene.generateForest(params);
  }

  private startAnimationLoop(): void {
    this.isAnimating = true;
    this.lastTime = performance.now();
    this.animate();
  }

  private animate(): void {
    if (!this.isAnimating) return;
    
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;
    if (this.fpsUpdateTime >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsUpdateTime);
      this.fpsElement.textContent = `FPS: ${this.currentFps}`;
      this.frameCount = 0;
      this.fpsUpdateTime = 0;
    }
    
    this.animationController.update(deltaTime);
    this.forestScene.update(deltaTime, this.animationController.getTime());
  }

  stop(): void {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.forestScene.dispose();
  }
}

let app: FractalForestApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new FractalForestApp();
});

export { FractalForestApp };
