export type ToolType = 'player' | 'patrol' | 'sniper' | 'path' | null;

export interface UIState {
  selectedTool: ToolType;
}

export interface UIParams {
  patrolSpeed: number;
  fovAngle: number;
  alertTime: number;
  fovRadius: number;
}

export interface UICallbacks {
  onToolSelect: (tool: ToolType) => void;
  onParamChange: (params: Partial<UIParams>) => void;
  onClear: () => void;
}

export class UIManager {
  private state: UIState = {
    selectedTool: null
  };

  private params: UIParams = {
    patrolSpeed: 3,
    fovAngle: 90,
    alertTime: 3,
    fovRadius: 150
  };

  private callbacks: UICallbacks;

  private btnPlayer: HTMLButtonElement;
  private btnPatrol: HTMLButtonElement;
  private btnSniper: HTMLButtonElement;
  private btnPath: HTMLButtonElement;
  private btnClear: HTMLButtonElement;

  private sliderPatrolSpeed: HTMLInputElement;
  private sliderFovAngle: HTMLInputElement;
  private sliderAlertTime: HTMLInputElement;
  private sliderFovRadius: HTMLInputElement;

  private valPatrolSpeed: HTMLElement;
  private valFovAngle: HTMLElement;
  private valAlertTime: HTMLElement;
  private valFovRadius: HTMLElement;

  private statTotal: HTMLElement;
  private statPatrol: HTMLElement;
  private statSearch: HTMLElement;
  private statChase: HTMLElement;
  private statPlayerX: HTMLElement;
  private statPlayerY: HTMLElement;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    this.btnPlayer = document.getElementById('btn-player') as HTMLButtonElement;
    this.btnPatrol = document.getElementById('btn-patrol') as HTMLButtonElement;
    this.btnSniper = document.getElementById('btn-sniper') as HTMLButtonElement;
    this.btnPath = document.getElementById('btn-path') as HTMLButtonElement;
    this.btnClear = document.getElementById('btn-clear') as HTMLButtonElement;

    this.sliderPatrolSpeed = document.getElementById('slider-patrol-speed') as HTMLInputElement;
    this.sliderFovAngle = document.getElementById('slider-fov-angle') as HTMLInputElement;
    this.sliderAlertTime = document.getElementById('slider-alert-time') as HTMLInputElement;
    this.sliderFovRadius = document.getElementById('slider-fov-radius') as HTMLInputElement;

    this.valPatrolSpeed = document.getElementById('val-patrol-speed') as HTMLElement;
    this.valFovAngle = document.getElementById('val-fov-angle') as HTMLElement;
    this.valAlertTime = document.getElementById('val-alert-time') as HTMLElement;
    this.valFovRadius = document.getElementById('val-fov-radius') as HTMLElement;

    this.statTotal = document.getElementById('stat-total') as HTMLElement;
    this.statPatrol = document.getElementById('stat-patrol') as HTMLElement;
    this.statSearch = document.getElementById('stat-search') as HTMLElement;
    this.statChase = document.getElementById('stat-chase') as HTMLElement;
    this.statPlayerX = document.getElementById('stat-player-x') as HTMLElement;
    this.statPlayerY = document.getElementById('stat-player-y') as HTMLElement;

    this.bindEvents();
    this.updateParamDisplay();
  }

  private bindEvents(): void {
    this.btnPlayer.addEventListener('click', () => this.selectTool('player'));
    this.btnPatrol.addEventListener('click', () => this.selectTool('patrol'));
    this.btnSniper.addEventListener('click', () => this.selectTool('sniper'));
    this.btnPath.addEventListener('click', () => this.selectTool('path'));
    this.btnClear.addEventListener('click', () => this.handleClear());

    this.sliderPatrolSpeed.addEventListener('input', () => this.handleParamChange());
    this.sliderFovAngle.addEventListener('input', () => this.handleParamChange());
    this.sliderAlertTime.addEventListener('input', () => this.handleParamChange());
    this.sliderFovRadius.addEventListener('input', () => this.handleParamChange());
  }

  private selectTool(tool: ToolType): void {
    if (this.state.selectedTool === tool) {
      this.state.selectedTool = null;
    } else {
      this.state.selectedTool = tool;
    }
    this.updateToolButtons();
    this.callbacks.onToolSelect(this.state.selectedTool);
  }

  private handleClear(): void {
    this.callbacks.onClear();
  }

  private handleParamChange(): void {
    this.params.patrolSpeed = parseFloat(this.sliderPatrolSpeed.value);
    this.params.fovAngle = parseFloat(this.sliderFovAngle.value);
    this.params.alertTime = parseFloat(this.sliderAlertTime.value);
    this.params.fovRadius = parseFloat(this.sliderFovRadius.value);

    this.updateParamDisplay();
    this.callbacks.onParamChange({
      patrolSpeed: this.params.patrolSpeed,
      fovAngle: this.params.fovAngle,
      alertTime: this.params.alertTime,
      fovRadius: this.params.fovRadius
    });
  }

  private updateToolButtons(): void {
    const buttons = [
      { btn: this.btnPlayer, tool: 'player' as ToolType },
      { btn: this.btnPatrol, tool: 'patrol' as ToolType },
      { btn: this.btnSniper, tool: 'sniper' as ToolType },
      { btn: this.btnPath, tool: 'path' as ToolType }
    ];

    for (const { btn, tool } of buttons) {
      if (this.state.selectedTool === tool) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  }

  private updateParamDisplay(): void {
    this.valPatrolSpeed.textContent = this.params.patrolSpeed.toFixed(1);
    this.valFovAngle.textContent = `${this.params.fovAngle.toFixed(0)}°`;
    this.valAlertTime.textContent = `${this.params.alertTime.toFixed(1)}s`;
    this.valFovRadius.textContent = this.params.fovRadius.toFixed(0);
  }

  public updateStats(
    total: number,
    patrol: number,
    search: number,
    chase: number,
    playerX: number,
    playerY: number
  ): void {
    this.statTotal.textContent = total.toString();
    this.statPatrol.textContent = patrol.toString();
    this.statSearch.textContent = search.toString();
    this.statChase.textContent = chase.toString();
    this.statPlayerX.textContent = Math.round(playerX).toString();
    this.statPlayerY.textContent = Math.round(playerY).toString();
  }

  public getSelectedTool(): ToolType {
    return this.state.selectedTool;
  }

  public getParams(): UIParams {
    return { ...this.params };
  }

  public deselectTool(): void {
    this.state.selectedTool = null;
    this.updateToolButtons();
  }

  public setToolActive(tool: ToolType, active: boolean): void {
    if (active) {
      this.state.selectedTool = tool;
    } else if (this.state.selectedTool === tool) {
      this.state.selectedTool = null;
    }
    this.updateToolButtons();
  }
}
