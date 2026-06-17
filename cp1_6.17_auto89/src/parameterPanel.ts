import * as dat from 'dat.gui';
import { ParticleParameters } from './particleSystem';

export interface ParameterPanelOptions {
  container: HTMLElement;
  initialParameters: ParticleParameters;
  onParameterChange?: (params: Partial<ParticleParameters>) => void;
}

export class ParameterPanel {
  private container: HTMLElement;
  private gui: dat.GUI | null = null;
  private parameters: ParticleParameters;
  private onParameterChange?: (params: Partial<ParticleParameters>) => void;
  private isCollapsed: boolean = false;
  private isLocked: boolean = false;
  
  private folders: { [key: string]: dat.GUI } = {};
  
  constructor(options: ParameterPanelOptions) {
    this.container = options.container;
    this.parameters = { ...options.initialParameters };
    this.onParameterChange = options.onParameterChange;
    
    this.init();
  }
  
  private init(): void {
    this.container.classList.add('parameter-panel-wrapper');
    
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
      <span class="panel-title">⚙️ 参数控制</span>
      <button class="toggle-btn" id="togglePanelBtn">
        <span class="toggle-icon">▼</span>
      </button>
    `;
    this.container.appendChild(header);
    
    const guiContainer = document.createElement('div');
    guiContainer.className = 'gui-container';
    guiContainer.id = 'guiContainer';
    this.container.appendChild(guiContainer);
    
    this.gui = new dat.GUI({ autoPlace: false, width: 300 });
    guiContainer.appendChild(this.gui.domElement);
    
    this.createControls();
    
    header.querySelector('#togglePanelBtn')?.addEventListener('click', () => {
      this.togglePanel();
    });
  }
  
  private createControls(): void {
    if (!this.gui) return;
    
    const basicFolder = this.gui.addFolder('基础参数');
    basicFolder.open();
    this.folders.basic = basicFolder;
    
    const particleCountController = basicFolder.add(
      this.parameters, 
      'particleCount', 
      5000, 
      50000, 
      1000
    ).name('粒子密度');
    particleCountController.onChange((value: number) => {
      if (!this.isLocked) {
        this.onParameterChange?.({ particleCount: value });
        this.animateValueChange(particleCountController.domElement);
      }
    });
    
    const rotationSpeedController = basicFolder.add(
      this.parameters,
      'rotationSpeed',
      0,
      5,
      0.1
    ).name('旋转速度');
    rotationSpeedController.onChange((value: number) => {
      if (!this.isLocked) {
        this.onParameterChange?.({ rotationSpeed: value });
      }
    });
    
    const colorOffsetController = basicFolder.add(
      this.parameters,
      'colorOffset',
      0,
      360,
      1
    ).name('颜色偏移 (°)');
    colorOffsetController.onChange((value: number) => {
      if (!this.isLocked) {
        this.onParameterChange?.({ colorOffset: value });
        this.updateSliderTrackColor(colorOffsetController, value);
      }
    });
    
    const noiseFolder = this.gui.addFolder('噪声与形态');
    noiseFolder.open();
    this.folders.noise = noiseFolder;
    
    const noiseStrengthController = noiseFolder.add(
      this.parameters,
      'noiseStrength',
      0,
      1,
      0.01
    ).name('噪声强度');
    noiseStrengthController.onChange((value: number) => {
      if (!this.isLocked) {
        this.onParameterChange?.({ noiseStrength: value });
      }
    });
    
    const spreadRadiusController = noiseFolder.add(
      this.parameters,
      'spreadRadius',
      1,
      10,
      0.1
    ).name('扩散半径');
    spreadRadiusController.onChange((value: number) => {
      if (!this.isLocked) {
        this.onParameterChange?.({ spreadRadius: value });
      }
    });
    
    const visualFolder = this.gui.addFolder('视觉效果');
    visualFolder.open();
    this.folders.visual = visualFolder;
    
    const backgroundColorObj = { backgroundColor: this.parameters.backgroundColor || '#0a0515' };
    const bgColorController = visualFolder.addColor(
      backgroundColorObj,
      'backgroundColor'
    ).name('背景颜色');
    bgColorController.onChange((value: string) => {
      if (!this.isLocked) {
        this.parameters.backgroundColor = value;
        this.onParameterChange?.({ backgroundColor: value });
      }
    });
    
    const pulseFolder = this.gui.addFolder('脉动效果');
    pulseFolder.close();
    this.folders.pulse = pulseFolder;
    
    if (this.parameters.pulseSpeed === undefined) {
      this.parameters.pulseSpeed = 0.5;
    }
    const pulseSpeedController = pulseFolder.add(
      this.parameters,
      'pulseSpeed',
      0,
      3,
      0.1
    ).name('脉动速度');
    pulseSpeedController.onChange((value: number) => {
      if (!this.isLocked) {
        this.onParameterChange?.({ pulseSpeed: value });
      }
    });
    
    if (this.parameters.pulseIntensity === undefined) {
      this.parameters.pulseIntensity = 0.2;
    }
    const pulseIntensityController = pulseFolder.add(
      this.parameters,
      'pulseIntensity',
      0,
      1,
      0.01
    ).name('脉动强度');
    pulseIntensityController.onChange((value: number) => {
      if (!this.isLocked) {
        this.onParameterChange?.({ pulseIntensity: value });
      }
    });
    
    this.styleSliders();
  }
  
  private styleSliders(): void {
    const sliders = this.container.querySelectorAll('.slider');
    sliders.forEach((slider) => {
      slider.classList.add('custom-slider');
    });
  }
  
  private updateSliderTrackColor(controller: dat.GUIController, hue: number): void {
    const slider = controller.domElement.querySelector('.slider-fg');
    if (slider) {
      (slider as HTMLElement).style.backgroundColor = `hsl(${hue}, 80%, 60%)`;
    }
  }
  
  private animateValueChange(element: HTMLElement): void {
    element.style.transform = 'scale(1.05)';
    element.style.transition = 'transform 200ms ease-out';
    
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 200);
  }
  
  public togglePanel(): void {
    this.isCollapsed = !this.isCollapsed;
    
    const guiContainer = this.container.querySelector('.gui-container');
    const toggleIcon = this.container.querySelector('.toggle-icon');
    
    if (guiContainer) {
      if (this.isCollapsed) {
        guiContainer.classList.add('collapsed');
        if (toggleIcon) {
          toggleIcon.textContent = '▲';
        }
      } else {
        guiContainer.classList.remove('collapsed');
        if (toggleIcon) {
          toggleIcon.textContent = '▼';
        }
      }
    }
  }
  
  public updateParameters(params: Partial<ParticleParameters>): void {
    this.parameters = { ...this.parameters, ...params };
    this.refreshGUI();
  }
  
  private refreshGUI(): void {
    if (!this.gui) return;
    
    const controllers: dat.GUIController[] = this.gui.__controllers as dat.GUIController[];
    controllers.forEach((controller: dat.GUIController) => {
      controller.updateDisplay();
    });
    
    Object.values(this.folders).forEach((folder: dat.GUI) => {
      const folderControllers: dat.GUIController[] = folder.__controllers as dat.GUIController[];
      folderControllers.forEach((controller: dat.GUIController) => {
        controller.updateDisplay();
      });
    });
  }
  
  public setLocked(locked: boolean): void {
    this.isLocked = locked;
    
    const allControllers: dat.GUIController[] = [];
    
    if (this.gui) {
      allControllers.push(...this.gui.__controllers);
    }
    
    Object.values(this.folders).forEach((folder) => {
      allControllers.push(...folder.__controllers);
    });
    
    allControllers.forEach((controller) => {
      if (locked) {
        controller.domElement.style.opacity = '0.5';
        controller.domElement.style.pointerEvents = 'none';
      } else {
        controller.domElement.style.opacity = '1';
        controller.domElement.style.pointerEvents = 'auto';
      }
    });
  }
  
  public getParameters(): ParticleParameters {
    return { ...this.parameters };
  }
  
  public dispose(): void {
    if (this.gui) {
      this.gui.destroy();
    }
  }
}
