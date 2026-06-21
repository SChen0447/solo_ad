import { CharacterParams } from './character';
import { InteractionState } from './interaction';

export interface UIParams {
  height: number;
  armLength: number;
  shoulderWidth: number;
  showHelpers: boolean;
}

export interface UICallbacks {
  onParamsChange: (params: Partial<CharacterParams>) => void;
  onResetItems: () => void;
  onHelpersToggle: (show: boolean) => void;
}

export class UIManager {
  private heightSlider: HTMLInputElement;
  private armLengthSlider: HTMLInputElement;
  private shoulderWidthSlider: HTMLInputElement;
  private showHelpersCheckbox: HTMLInputElement;
  private resetButton: HTMLButtonElement;
  
  private heightValue: HTMLSpanElement;
  private armLengthValue: HTMLSpanElement;
  private shoulderWidthValue: HTMLSpanElement;
  private reachDisplay: HTMLSpanElement;
  private selectedItemDisplay: HTMLSpanElement;
  private reachabilityDisplay: HTMLSpanElement;
  
  private heightLabel: HTMLDivElement;
  
  private params: UIParams;
  private callbacks: UICallbacks;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    
    this.heightSlider = document.getElementById('height-slider') as HTMLInputElement;
    this.armLengthSlider = document.getElementById('arm-length-slider') as HTMLInputElement;
    this.shoulderWidthSlider = document.getElementById('shoulder-width-slider') as HTMLInputElement;
    this.showHelpersCheckbox = document.getElementById('show-helpers') as HTMLInputElement;
    this.resetButton = document.getElementById('reset-items') as HTMLButtonElement;
    
    this.heightValue = document.getElementById('height-value') as HTMLSpanElement;
    this.armLengthValue = document.getElementById('arm-length-value') as HTMLSpanElement;
    this.shoulderWidthValue = document.getElementById('shoulder-width-value') as HTMLSpanElement;
    this.reachDisplay = document.getElementById('reach-display') as HTMLSpanElement;
    this.selectedItemDisplay = document.getElementById('selected-item') as HTMLSpanElement;
    this.reachabilityDisplay = document.getElementById('reachability') as HTMLSpanElement;

    this.heightLabel = document.createElement('div');
    this.heightLabel.className = 'height-label';
    document.body.appendChild(this.heightLabel);

    this.params = {
      height: parseInt(this.heightSlider.value),
      armLength: parseInt(this.armLengthSlider.value),
      shoulderWidth: parseInt(this.shoulderWidthSlider.value),
      showHelpers: this.showHelpersCheckbox.checked
    };

    this.setupEventListeners();
    this.updateDisplay();
  }

  private setupEventListeners(): void {
    this.heightSlider.addEventListener('input', this.onHeightChange.bind(this));
    this.armLengthSlider.addEventListener('input', this.onArmLengthChange.bind(this));
    this.shoulderWidthSlider.addEventListener('input', this.onShoulderWidthChange.bind(this));
    this.showHelpersCheckbox.addEventListener('change', this.onHelpersToggle.bind(this));
    this.resetButton.addEventListener('click', this.onResetItems.bind(this));
  }

  private onHeightChange(e: Event): void {
    const value = parseInt((e.target as HTMLInputElement).value);
    this.params.height = value;
    this.heightValue.textContent = `${value} cm`;
    this.callbacks.onParamsChange({ height: value });
    this.updateReachDisplay();
  }

  private onArmLengthChange(e: Event): void {
    const value = parseInt((e.target as HTMLInputElement).value);
    this.params.armLength = value;
    this.armLengthValue.textContent = `${value} cm`;
    this.callbacks.onParamsChange({ armLength: value });
    this.updateReachDisplay();
  }

  private onShoulderWidthChange(e: Event): void {
    const value = parseInt((e.target as HTMLInputElement).value);
    this.params.shoulderWidth = value;
    this.shoulderWidthValue.textContent = `${value} cm`;
    this.callbacks.onParamsChange({ shoulderWidth: value });
    this.updateReachDisplay();
  }

  private onHelpersToggle(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.params.showHelpers = checked;
    this.callbacks.onHelpersToggle(checked);
  }

  private onResetItems(): void {
    this.callbacks.onResetItems();
  }

  private updateDisplay(): void {
    this.heightValue.textContent = `${this.params.height} cm`;
    this.armLengthValue.textContent = `${this.params.armLength} cm`;
    this.shoulderWidthValue.textContent = `${this.params.shoulderWidth} cm`;
    this.updateReachDisplay();
  }

  private updateReachDisplay(): void {
    const maxReach = this.params.armLength + this.params.shoulderWidth * 0.3;
    this.reachDisplay.textContent = `${maxReach.toFixed(1)} cm`;
  }

  public updateInteractionState(state: InteractionState): void {
    if (state.selectedItem) {
      const userData = state.selectedItem.userData;
      this.selectedItemDisplay.textContent = `第${userData.level + 1}层 - 物品${userData.index + 1}`;
      
      if (state.isReachable) {
        this.reachabilityDisplay.textContent = '可达';
        this.reachabilityDisplay.className = 'reachable';
      } else {
        this.reachabilityDisplay.textContent = '不可达';
        this.reachabilityDisplay.className = 'unreachable';
      }
    } else {
      this.selectedItemDisplay.textContent = '无';
      this.reachabilityDisplay.textContent = '-';
      this.reachabilityDisplay.className = '';
    }
  }

  public updateHeightLabel(screenX: number, screenY: number, height: number): void {
    this.heightLabel.style.left = `${screenX}px`;
    this.heightLabel.style.top = `${screenY}px`;
    this.heightLabel.textContent = `${height} cm`;
  }

  public hideHeightLabel(): void {
    this.heightLabel.style.display = 'none';
  }

  public showHeightLabel(): void {
    this.heightLabel.style.display = 'block';
  }

  public getParams(): UIParams {
    return { ...this.params };
  }

  public setVignetteActive(active: boolean): void {
    const vignette = document.getElementById('vignette');
    if (vignette) {
      if (active) {
        vignette.classList.add('active');
      } else {
        vignette.classList.remove('active');
      }
    }
  }

  public dispose(): void {
    this.heightSlider.removeEventListener('input', this.onHeightChange.bind(this));
    this.armLengthSlider.removeEventListener('input', this.onArmLengthChange.bind(this));
    this.shoulderWidthSlider.removeEventListener('input', this.onShoulderWidthChange.bind(this));
    this.showHelpersCheckbox.removeEventListener('change', this.onHelpersToggle.bind(this));
    this.resetButton.removeEventListener('click', this.onResetItems.bind(this));
    this.heightLabel.remove();
  }
}
