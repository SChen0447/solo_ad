export interface PlayerInputState {
  left: boolean;
  right: boolean;
  forward: boolean;
  backward: boolean;
  jumpPressed: boolean;
  jumpHoldTime: number;
  isCharging: boolean;
}

export interface InputEvent {
  playerId: number;
  type: 'jumpChargeStart' | 'jumpChargeRelease' | 'jumpAutoRelease' | 'move';
  chargeTime?: number;
  direction?: { x: number; y: number };
}

type InputCallback = (event: InputEvent) => void;

const PLAYER_KEY_MAPS: Record<number, {
  left: string;
  right: string;
  forward: string;
  backward: string;
  jump: string;
}> = {
  0: { left: 'KeyA', right: 'KeyD', forward: 'KeyW', backward: 'KeyS', jump: 'Space' },
  1: { left: 'ArrowLeft', right: 'ArrowRight', forward: 'ArrowUp', backward: 'ArrowDown', jump: 'Enter' },
  2: { left: 'KeyH', right: 'KeyK', forward: 'KeyU', backward: 'KeyJ', jump: 'Space' },
  3: { left: 'Numpad4', right: 'Numpad6', forward: 'Numpad8', backward: 'Numpad5', jump: 'Numpad0' }
};

const MAX_CHARGE_TIME = 2.0;

export class InputManager {
  private playerStates: Map<number, PlayerInputState> = new Map();
  private listeners: InputCallback[] = [];
  private activePlayers: number = 2;
  private jumpChargeStartTimes: Map<number, number> = new Map();

  constructor() {
    this.setupEventListeners();
  }

  setActivePlayers(count: number): void {
    this.activePlayers = count;
    this.playerStates.clear();
    for (let i = 0; i < count; i++) {
      this.playerStates.set(i, {
        left: false,
        right: false,
        forward: false,
        backward: false,
        jumpPressed: false,
        jumpHoldTime: 0,
        isCharging: false
      });
    }
  }

  addListener(callback: InputCallback): void {
    this.listeners.push(callback);
  }

  removeListener(callback: InputCallback): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  getPlayerState(playerId: number): PlayerInputState | undefined {
    return this.playerStates.get(playerId);
  }

  update(deltaTime: number): void {
    const now = performance.now() / 1000;

    for (let i = 0; i < this.activePlayers; i++) {
      const state = this.playerStates.get(i);
      if (!state) continue;

      if (state.isCharging) {
        const startTime = this.jumpChargeStartTimes.get(i) || now;
        state.jumpHoldTime = Math.min(now - startTime, MAX_CHARGE_TIME);

        if (state.jumpHoldTime >= MAX_CHARGE_TIME) {
          this.emitEvent({
            playerId: i,
            type: 'jumpAutoRelease',
            chargeTime: MAX_CHARGE_TIME
          });
          state.isCharging = false;
          state.jumpHoldTime = 0;
          this.jumpChargeStartTimes.delete(i);
        }
      }

      const dx = (state.right ? 1 : 0) - (state.left ? 1 : 0);
      const dy = (state.forward ? 1 : 0) - (state.backward ? 1 : 0);
      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        this.emitEvent({
          playerId: i,
          type: 'move',
          direction: { x: dx / len, y: dy / len }
        });
      }
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.handleKeyDown(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.handleKeyUp(e.code);
    });
  }

  private handleKeyDown(code: string): void {
    for (let i = 0; i < this.activePlayers; i++) {
      const keyMap = PLAYER_KEY_MAPS[i];
      const state = this.playerStates.get(i);
      if (!state) continue;

      switch (code) {
        case keyMap.left:
          state.left = true;
          break;
        case keyMap.right:
          state.right = true;
          break;
        case keyMap.forward:
          state.forward = true;
          break;
        case keyMap.backward:
          state.backward = true;
          break;
        case keyMap.jump:
          if (!state.isCharging) {
            state.isCharging = true;
            state.jumpHoldTime = 0;
            this.jumpChargeStartTimes.set(i, performance.now() / 1000);
            this.emitEvent({
              playerId: i,
              type: 'jumpChargeStart'
            });
          }
          break;
      }
    }
  }

  private handleKeyUp(code: string): void {
    for (let i = 0; i < this.activePlayers; i++) {
      const keyMap = PLAYER_KEY_MAPS[i];
      const state = this.playerStates.get(i);
      if (!state) continue;

      switch (code) {
        case keyMap.left:
          state.left = false;
          break;
        case keyMap.right:
          state.right = false;
          break;
        case keyMap.forward:
          state.forward = false;
          break;
        case keyMap.backward:
          state.backward = false;
          break;
        case keyMap.jump:
          if (state.isCharging) {
            const chargeTime = state.jumpHoldTime;
            state.isCharging = false;
            state.jumpHoldTime = 0;
            this.jumpChargeStartTimes.delete(i);
            this.emitEvent({
              playerId: i,
              type: 'jumpChargeRelease',
              chargeTime: chargeTime
            });
          }
          break;
      }
    }
  }

  private emitEvent(event: InputEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  getMaxChargeTime(): number {
    return MAX_CHARGE_TIME;
  }
}
