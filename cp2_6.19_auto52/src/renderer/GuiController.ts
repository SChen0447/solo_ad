import * as dat from 'dat.gui';
import { ANIMATION_CONFIG, HELIX_CONFIG } from '../data/BasePairData';

export interface GuiParams {
  translateX: number;
  translateY: number;
  translateZ: number;
  rotateSpeed: number;
  autoRotate: boolean;
  backboneRadius: number;
  baseRadius: number;
  baseHeight: number;
  helixPitch: number;
  helixRadius: number;
  sequence: string;
  highlightStart: number;
  highlightEnd: number;
}

export interface GuiCallbacks {
  onRotateSpeedChange: (speed: number) => void;
  onAutoRotateToggle: (enabled: boolean) => void;
  onBackboneRadiusChange: (value: number) => void;
  onBaseRadiusChange: (value: number) => void;
  onBaseHeightChange: (value: number) => void;
  onHelixPitchChange: (value: number) => void;
  onHelixRadiusChange: (value: number) => void;
  onSequenceUpdate: (sequence: string) => void;
  onHighlight: (start: number, end: number) => void;
  onResetHighlight: () => void;
}

export class GuiController {
  private gui: dat.GUI;
  public params: GuiParams;
  private callbacks: GuiCallbacks;
  private sequenceFolder: dat.GUI;
  private highlightFolder: dat.GUI;
  private appearanceFolder: dat.GUI;
  private animationFolder: dat.GUI;
  private sequenceController: dat.GUIController | null = null;
  private updateButtonController: dat.GUIController | null = null;
  private highlightStartController: dat.GUIController | null = null;
  private highlightEndController: dat.GUIController | null = null;

  constructor(callbacks: GuiCallbacks) {
    this.callbacks = callbacks;
    this.gui = new dat.GUI({ autoPlace: true, closed: false });
    this.gui.domElement.id = 'gui-container';
    
    this.params = {
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      rotateSpeed: ANIMATION_CONFIG.defaultRotateSpeed,
      autoRotate: true,
      backboneRadius: 0.2,
      baseRadius: HELIX_CONFIG.radius,
      baseHeight: 0.5,
      helixPitch: HELIX_CONFIG.verticalPitch,
      helixRadius: HELIX_CONFIG.radius,
      sequence: 'ATCGATCGATCGATCGATCGATCG',
      highlightStart: 0,
      highlightEnd: 5
    };

    this.animationFolder = this.gui.addFolder('动画控制');
    this.appearanceFolder = this.gui.addFolder('外观参数');
    this.sequenceFolder = this.gui.addFolder('序列编辑');
    this.highlightFolder = this.gui.addFolder('区域高亮');

    this.setupAnimationControls();
    this.setupAppearanceControls();
    this.setupSequenceControls();
    this.setupHighlightControls();
  }

  private setupAnimationControls(): void {
    const folder = this.animationFolder;

    folder
      .add(this.params, 'autoRotate')
      .name('自动旋转')
      .onChange((value: boolean) => {
        this.callbacks.onAutoRotateToggle(value);
      });

    folder
      .add(this.params, 'rotateSpeed', 0, 2.0, 0.05)
      .name('旋转速度')
      .onChange((value: number) => {
        this.callbacks.onRotateSpeedChange(value);
      });

    folder.open();
  }

  private setupAppearanceControls(): void {
    const folder = this.appearanceFolder;

    folder
      .add(this.params, 'backboneRadius', 0.1, 0.5, 0.01)
      .name('主链半径')
      .onChange((value: number) => {
        this.callbacks.onBackboneRadiusChange(value);
      });

    folder
      .add(this.params, 'baseHeight', 0.2, 0.8, 0.01)
      .name('碱基高度')
      .onChange((value: number) => {
        this.callbacks.onBaseHeightChange(value);
      });

    folder
      .add(this.params, 'helixPitch', 1.0, 3.0, 0.1)
      .name('螺旋间距')
      .onChange((value: number) => {
        this.callbacks.onHelixPitchChange(value);
      });
  }

  private setupSequenceControls(): void {
    const folder = this.sequenceFolder;
    this.sequenceController = folder
      .add(this.params, 'sequence')
      .name('序列(≤64)');

    this.updateButtonController = folder.add({
      updateSequence: () => {
        const seq = this.params.sequence.toUpperCase().replace(/[^ATCG]/g, '');
        this.params.sequence = seq.length > 64 ? seq.substring(0, 64) : seq;
        this.sequenceController?.updateDisplay();
        this.callbacks.onSequenceUpdate(this.params.sequence);
      }
    }, 'updateSequence').name('更新序列');

    folder.open();
  }

  private setupHighlightControls(): void {
    const folder = this.highlightFolder;

    this.highlightStartController = folder.add(this.params, 'highlightStart', 0, 63, 1)
      .name('起始索引');

    this.highlightEndController = folder.add(this.params, 'highlightEnd', 0, 63, 1)
      .name('结束索引');

    folder.add({
      applyHighlight: () => {
        const start = Math.min(this.params.highlightStart, this.params.highlightEnd);
        const end = Math.max(this.params.highlightStart, this.params.highlightEnd);
        this.callbacks.onHighlight(start, end);
      }
    }, 'applyHighlight').name('高亮区域');

    folder.add({
      resetHighlight: () => {
        this.callbacks.onResetHighlight();
      }
    }, 'resetHighlight').name('重置高亮');
  }

  public updateSequenceDisplay(sequence: string): void {
    this.params.sequence = sequence;
    this.sequenceController?.updateDisplay();
  }

  public updateHighlightRange(maxIndex: number): void {
    this.highlightStartController?.max(maxIndex).updateDisplay();
    this.highlightEndController?.max(maxIndex).updateDisplay();
  }

  public getSequenceInputElement(): HTMLInputElement | null {
    if (!this.sequenceController) return null;
    const dom = (this.sequenceController as any).domElement as HTMLElement | undefined;
    if (!dom) return null;
    return dom.querySelector('input[type="text"]');
  }

  public getSequenceRowElement(): HTMLElement | null {
    if (!this.sequenceController) return null;
    const dom = (this.sequenceController as any).domElement as HTMLElement | undefined;
    if (!dom) return null;
    return dom;
  }

  public getUpdateButtonElement(): HTMLElement | null {
    if (!this.updateButtonController) return null;
    const dom = (this.updateButtonController as any).domElement as HTMLElement | undefined;
    if (!dom) return null;
    return dom;
  }

  public destroy(): void {
    this.gui.destroy();
  }
}

export default GuiController;
