import * as dat from 'dat.gui';
import { Galaxy } from './galaxy';
import { Interaction, InteractionMode, SelectionBounds } from './interaction';
import { Config, ColorTheme, DefaultGalaxyParams } from './config';

interface UIControls {
  particleCount: number;
  rotationSpeed: number;
  attractStrength: number;
  colorTheme: string;
  mode: string;
}

declare global {
  interface Window {
    __INFO_PANEL_UPDATER__?: {
      setParticleCount: (n: number) => void;
      setRotationSpeed: (n: number) => void;
    };
  }
}

export class UIControlPanel {
  private galaxy: Galaxy;
  private interaction: Interaction;
  private gui: dat.GUI;
  private controls: UIControls;

  private particleCountController: dat.GUIController | null = null;
  private rotationSpeedController: dat.GUIController | null = null;
  private attractStrengthController: dat.GUIController | null = null;
  private colorThemeController: dat.GUIController | null = null;
  private modeController: dat.GUIController | null = null;
  private explodeFolder: dat.GUI | null = null;

  private explodeButtonDisabled: boolean = true;

  constructor(galaxy: Galaxy, interaction: Interaction) {
    this.galaxy = galaxy;
    this.interaction = interaction;

    const params = this.galaxy.getParams();
    this.controls = {
      particleCount: params.particleCount,
      rotationSpeed: params.rotationSpeed,
      attractStrength: params.attractStrength,
      colorTheme: params.colorTheme,
      mode: 'explore',
    };

    this.gui = new dat.GUI({ autoPlace: true });
    this.gui.domElement.parentElement?.style.setProperty('display', 'none');
    document.body.appendChild(this.gui.domElement);

    this.setupUI();
    this.bindInteractionEvents();
    this.updateInfoPanel();
  }

  private setupUI(): void {
    const galaxyFolder = this.gui.addFolder('星系参数');
    galaxyFolder.open();

    this.particleCountController = galaxyFolder
      .add(this.controls, 'particleCount', Config.PARTICLE_COUNT_MIN, Config.PARTICLE_COUNT_MAX, Config.PARTICLE_COUNT_STEP)
      .name('粒子数量')
      .onChange((value: number) => {
        this.galaxy.updateParams({ particleCount: value });
        this.updateInfoPanel();
      });

    this.rotationSpeedController = galaxyFolder
      .add(this.controls, 'rotationSpeed', Config.ROTATION_SPEED_MIN, Config.ROTATION_SPEED_MAX, Config.ROTATION_SPEED_STEP)
      .name('旋转速度')
      .onChange((value: number) => {
        this.galaxy.updateParams({ rotationSpeed: value });
        this.updateInfoPanel();
      });

    this.attractStrengthController = galaxyFolder
      .add(this.controls, 'attractStrength', Config.ATTRACT_STRENGTH_MIN, Config.ATTRACT_STRENGTH_MAX, Config.ATTRACT_STRENGTH_STEP)
      .name('吸引强度')
      .onChange((value: number) => {
        this.galaxy.updateParams({ attractStrength: value });
      });

    this.colorThemeController = galaxyFolder
      .add(this.controls, 'colorTheme', {
        '渐变色': 'gradient',
        '彩虹色': 'rainbow',
        '单色蓝': 'blue',
        '单色红': 'red',
      })
      .name('颜色主题')
      .onChange((value: string) => {
        this.galaxy.updateParams({ colorTheme: value as ColorTheme });
      });

    this.explodeFolder = this.gui.addFolder('区域爆炸');
    this.explodeFolder.open();

    this.modeController = this.explodeFolder
      .add(this.controls, 'mode', {
        '浏览模式': 'explore',
        '选区模式': 'select',
      })
      .name('操作模式')
      .onChange((value: string) => {
        this.interaction.setMode(value as InteractionMode);
        this.updateExplodeButtonState();
      });

    const explodeObj = { explode: () => this.triggerExplosion() };
    this.explodeFolder.add(explodeObj, 'explode').name('爆炸选区');

    this.updateExplodeButtonState();

    const actionFolder = this.gui.addFolder('操作');
    actionFolder.open();

    const resetObj = { reset: () => this.reset() };
    actionFolder.add(resetObj, 'reset').name('重置参数');

    const clearSelObj = { clear: () => this.clearSelection() };
    actionFolder.add(clearSelObj, 'clear').name('清除选区');
  }

  private bindInteractionEvents(): void {
    this.interaction.onSelectionChange((bounds: SelectionBounds | null) => {
      this.updateExplodeButtonState();
    });
  }

  private updateExplodeButtonState(): void {
    if (!this.explodeFolder) return;

    const controllers = this.explodeFolder.__controllers as dat.GUIController[];

    controllers.forEach((ctrl: dat.GUIController) => {
      const name = ctrl.property;
      const ctrlAny = ctrl as unknown as { __buttonText?: string; __li?: HTMLLIElement };
      if (name === 'explode' || ctrlAny.__buttonText === '爆炸选区') {
        if (!this.explodeButtonDisabled && this.interaction.getMode() === 'select' && this.interaction.hasActiveSelection()) {
          ctrlAny.__li?.classList.remove('disabled');
        }
      }
    });
  }

  private triggerExplosion(): void {
    if (this.interaction.getMode() !== 'select') {
      alert('请先切换到"选区模式"并框选一个区域');
      return;
    }
    if (!this.interaction.hasActiveSelection()) {
      alert('请先在画布上拖拽框选一个区域');
      return;
    }
    const success = this.interaction.triggerExplosion();
    if (!success) {
      alert('爆炸触发失败，请确保已框选有效区域');
    }
  }

  private clearSelection(): void {
    this.interaction.clearSelection();
    if (this.modeController) {
      this.controls.mode = 'explore';
      this.interaction.setMode('explore');
      this.modeController.updateDisplay();
    }
  }

  private reset(): void {
    this.galaxy.reset();
    const params = this.galaxy.getParams();

    this.controls.particleCount = params.particleCount;
    this.controls.rotationSpeed = params.rotationSpeed;
    this.controls.attractStrength = params.attractStrength;
    this.controls.colorTheme = params.colorTheme;
    this.controls.mode = 'explore';

    this.particleCountController?.updateDisplay();
    this.rotationSpeedController?.updateDisplay();
    this.attractStrengthController?.updateDisplay();
    this.colorThemeController?.updateDisplay();
    this.modeController?.updateDisplay();

    this.interaction.setMode('explore');
    this.interaction.clearSelection();

    this.updateInfoPanel();
  }

  private updateInfoPanel(): void {
    const countEl = document.getElementById('particle-count');
    const speedEl = document.getElementById('rotation-speed');
    if (countEl) {
      countEl.textContent = this.galaxy.getParticleCount().toLocaleString();
    }
    if (speedEl) {
      speedEl.textContent = this.galaxy.getRotationSpeed().toFixed(1);
    }
  }

  public update(): void {
    this.updateInfoPanel();
  }

  public dispose(): void {
    this.gui.destroy();
  }
}
