export interface PlayerActions {
  left: boolean;
  right: boolean;
  jump: boolean;
  defend: boolean;
  attack: boolean;
  skill: boolean;
}

export class InputManager {
  private p1Actions: PlayerActions;
  private p2Actions: PlayerActions;
  private keyMap: Map<string, { player: 1 | 2; action: keyof PlayerActions }>;

  constructor() {
    this.p1Actions = this.createEmptyActions();
    this.p2Actions = this.createEmptyActions();
    this.keyMap = new Map([
      ['KeyA', { player: 1, action: 'left' }],
      ['KeyD', { player: 1, action: 'right' }],
      ['KeyW', { player: 1, action: 'jump' }],
      ['KeyS', { player: 1, action: 'defend' }],
      ['KeyJ', { player: 1, action: 'attack' }],
      ['KeyK', { player: 1, action: 'skill' }],
      ['ArrowLeft', { player: 2, action: 'left' }],
      ['ArrowRight', { player: 2, action: 'right' }],
      ['ArrowUp', { player: 2, action: 'jump' }],
      ['ArrowDown', { player: 2, action: 'defend' }],
      ['Digit1', { player: 2, action: 'attack' }],
      ['Digit2', { player: 2, action: 'skill' }]
    ]);

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  private createEmptyActions(): PlayerActions {
    return {
      left: false,
      right: false,
      jump: false,
      defend: false,
      attack: false,
      skill: false
    };
  }

  public attach(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public detach(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const mapping = this.keyMap.get(e.code);
    if (mapping) {
      e.preventDefault();
      const actions = mapping.player === 1 ? this.p1Actions : this.p2Actions;
      actions[mapping.action] = true;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const mapping = this.keyMap.get(e.code);
    if (mapping) {
      e.preventDefault();
      const actions = mapping.player === 1 ? this.p1Actions : this.p2Actions;
      actions[mapping.action] = false;
    }
  }

  public getP1Actions(): Readonly<PlayerActions> {
    return this.p1Actions;
  }

  public getP2Actions(): Readonly<PlayerActions> {
    return this.p2Actions;
  }

  public consumeAttack(player: 1 | 2): boolean {
    const actions = player === 1 ? this.p1Actions : this.p2Actions;
    if (actions.attack) {
      actions.attack = false;
      return true;
    }
    return false;
  }

  public consumeSkill(player: 1 | 2): boolean {
    const actions = player === 1 ? this.p1Actions : this.p2Actions;
    if (actions.skill) {
      actions.skill = false;
      return true;
    }
    return false;
  }
}
