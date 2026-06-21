import Phaser from 'phaser';

export type ActionType = 'light' | 'heavy' | 'dodge';

export interface ComboDef {
  id: string;
  sequence: ActionType[];
  damageMultiplier: number;
  name: string;
}

export const COMBO_TABLE: ComboDef[] = [
  { id: 'triple_slash', sequence: ['light', 'light', 'light'], damageMultiplier: 1.0, name: '三连击' },
  { id: 'rush_slash', sequence: ['light', 'heavy'], damageMultiplier: 1.5, name: '突进斩' },
  { id: 'heavy_hammer', sequence: ['heavy', 'heavy'], damageMultiplier: 2.0, name: '重锤' },
];

export const COMBO_INPUT_WINDOW = 800;

export type PlayerState = 'idle' | 'attacking' | 'dodging' | 'casting';

export class PlayerController {
  private scene: Phaser.Scene;
  private inputBuffer: ActionType[] = [];
  private lastInputTime: number = 0;
  private state: PlayerState = 'idle';
  private stateTimer: number = 0;
  private currentCombo: ComboDef | null = null;
  private dodgeCooldown: number = 0;
  private facingRight: boolean = true;
  private keys!: {
    J: Phaser.Input.Keyboard.Key;
    K: Phaser.Input.Keyboard.Key;
    L: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  public readonly onComboMatched = new Phaser.Events.EventEmitter();
  public readonly onAction = new Phaser.Events.EventEmitter();
  public readonly onInputBufferChanged = new Phaser.Events.EventEmitter();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeys();
  }

  private setupKeys(): void {
    const kb = this.scene.input.keyboard!;
    this.keys = {
      J: kb.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      K: kb.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      L: kb.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  update(delta: number): void {
    const now = this.scene.time.now;

    if (this.stateTimer > 0) {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        this.state = 'idle';
        this.currentCombo = null;
      }
    }

    if (this.dodgeCooldown > 0) {
      this.dodgeCooldown -= delta;
    }

    if (this.lastInputTime > 0 && now - this.lastInputTime > COMBO_INPUT_WINDOW) {
      if (this.inputBuffer.length > 0 && this.state === 'idle') {
        this.tryMatchCombo();
      }
      if (this.state === 'idle') {
        this.inputBuffer = [];
        this.onInputBufferChanged.emit('changed', this.getBufferDisplay());
      }
      this.lastInputTime = 0;
    }

    this.handleMovement();
    this.handleCombatInput(now);
  }

  private handleMovement(): void {
    if (this.state === 'dodging' || this.state === 'attacking') return;

    const left = this.keys.A.isDown;
    const right = this.keys.D.isDown;

    if (left) this.facingRight = false;
    if (right) this.facingRight = true;
  }

  private handleCombatInput(now: number): void {
    if (this.state === 'dodging') return;

    if (Phaser.Input.Keyboard.JustDown(this.keys.J)) {
      this.pushAction('light', now);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.K)) {
      this.pushAction('heavy', now);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.L)) {
      this.tryDodge();
    }
  }

  private pushAction(action: ActionType, now: number): void {
    this.inputBuffer.push(action);
    this.lastInputTime = now;
    this.onInputBufferChanged.emit('changed', this.getBufferDisplay());
    this.onAction.emit('action', action);

    this.tryMatchCombo();
  }

  private tryMatchCombo(): void {
    for (const combo of COMBO_TABLE) {
      if (this.bufferMatchesCombo(combo)) {
        this.currentCombo = combo;
        this.state = 'attacking';
        this.stateTimer = 400;
        this.inputBuffer = [];
        this.lastInputTime = 0;
        this.onComboMatched.emit('combo', combo);
        this.onInputBufferChanged.emit('changed', this.getBufferDisplay());
        return;
      }
    }
  }

  private bufferMatchesCombo(combo: ComboDef): boolean {
    if (this.inputBuffer.length < combo.sequence.length) return false;
    const start = this.inputBuffer.length - combo.sequence.length;
    const slice = this.inputBuffer.slice(start);
    if (slice.length !== combo.sequence.length) return false;
    for (let i = 0; i < slice.length; i++) {
      if (slice[i] !== combo.sequence[i]) return false;
    }
    return true;
  }

  private tryDodge(): void {
    if (this.dodgeCooldown > 0 || this.state === 'attacking') return;
    this.state = 'dodging';
    this.stateTimer = 300;
    this.dodgeCooldown = 800;
    this.inputBuffer = [];
    this.lastInputTime = 0;
    this.onInputBufferChanged.emit('changed', this.getBufferDisplay());
    this.onAction.emit('dodge');
  }

  getBufferDisplay(): string[] {
    return this.inputBuffer.map(a => a === 'light' ? 'J' : a === 'heavy' ? 'K' : 'L');
  }

  getState(): PlayerState {
    return this.state;
  }

  getCurrentCombo(): ComboDef | null {
    return this.currentCombo;
  }

  isFacingRight(): boolean {
    return this.facingRight;
  }

  isDodging(): boolean {
    return this.state === 'dodging';
  }
}
