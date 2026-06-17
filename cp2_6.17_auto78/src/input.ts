export interface PlayerActions {
  left: boolean;
  right: boolean;
  jump: boolean;
  defend: boolean;
  attack: boolean;
  skill: boolean;
}

interface EdgeFlags {
  left: boolean;
  right: boolean;
}

export class InputManager {
  private p1Actions: PlayerActions;
  private p2Actions: PlayerActions;
  private p1Prev: PlayerActions;
  private p2Prev: PlayerActions;
  private p1Edge: EdgeFlags;
  private p2Edge: EdgeFlags;
  private keyMap: Map<string, { player: 1 | 2; action: keyof PlayerActions }>;

  constructor() {
    this.p1Actions = this.createEmptyActions();
    this.p2Actions = this.createEmptyActions();
    this.p1Prev = this.createEmptyActions();
    this.p2Prev = this.createEmptyActions();
    this.p1Edge = { left: false, right: false };
    this.p2Edge = { left: false, right: false };
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

  public tick(): void {
    if (this.p1Actions.left && !this.p1Prev.left) this.p1Edge.left = true;
    if (this.p1Actions.right && !this.p1Prev.right) this.p1Edge.right = true;
    if (this.p2Actions.left && !this.p2Prev.left) this.p2Edge.left = true;
    if (this.p2Actions.right && !this.p2Prev.right) this.p2Edge.right = true;
    this.p1Prev = { ...this.p1Actions };
    this.p2Prev = { ...this.p2Actions };
  }

  public consumeP1Left(): boolean {
    if (this.p1Edge.left) {
      this.p1Edge.left = false;
      return true;
    }
    return false;
  }

  public consumeP1Right(): boolean {
    if (this.p1Edge.right) {
      this.p1Edge.right = false;
      return true;
    }
    return false;
  }

  public consumeP2Left(): boolean {
    if (this.p2Edge.left) {
      this.p2Edge.left = false;
      return true;
    }
    return false;
  }

  public consumeP2Right(): boolean {
    if (this.p2Edge.right) {
      this.p2Edge.right = false;
      return true;
    }
    return false;
  }
}
