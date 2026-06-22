import { CellType, CellData, PLAYER_COLORS, PLAYER_NAMES } from './gameBoard';

export interface PlayerData {
  index: number;
  name: string;
  color: string;
  gold: number;
  position: number;
  properties: number[];
  bankrupt: boolean;
}

export type PositionUpdateCallback = (playerIndex: number, pathIndex: number) => void;
export type LandCallback = (playerIndex: number, cell: CellData) => void;

export class PlayerManager {
  players: PlayerData[];
  currentPlayerIndex: number = 0;
  isMoving: boolean = false;
  onPositionUpdate: PositionUpdateCallback | null = null;
  onLand: LandCallback | null = null;
  onPassStart: ((playerIndex: number) => void) | null = null;

  constructor() {
    this.players = PLAYER_NAMES.map((name, i) => ({
      index: i,
      name,
      color: PLAYER_COLORS[i],
      gold: 1500,
      position: 0,
      properties: [],
      bankrupt: false,
    }));
  }

  getCurrentPlayer(): PlayerData {
    return this.players[this.currentPlayerIndex];
  }

  rollDice(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  async movePlayer(steps: number): Promise<void> {
    this.isMoving = true;
    const player = this.players[this.currentPlayerIndex];
    const prevPos = player.position;

    for (let i = 0; i < steps; i++) {
      const fromPos = player.position;
      player.position = (player.position + 1) % 36;

      if (player.position === 0 && i > 0) {
        player.gold += 200;
        this.onPassStart?.(this.currentPlayerIndex);
      }

      this.onPositionUpdate?.(this.currentPlayerIndex, player.position);

      if (this.onPositionUpdate) {
        await this.animateStep(this.currentPlayerIndex, fromPos, player.position);
      }

      await this.delay(250);
    }

    const cell = this.getCellForPosition(player.position);
    this.onLand?.(this.currentPlayerIndex, cell);
    this.isMoving = false;
  }

  private animateStep(playerIndex: number, fromPath: number, toPath: number): Promise<void> {
    return new Promise(resolve => {
      const board = (window as any).__gameBoard as any;
      if (board && board.setAnimation) {
        board.setAnimation(playerIndex, fromPath, toPath);
        const start = performance.now();
        const duration = 200;
        const tick = (now: number) => {
          const elapsed = now - start;
          board.animProgress = Math.min(1, elapsed / duration);
          if (elapsed < duration) {
            requestAnimationFrame(tick);
          } else {
            board.clearAnimation();
            resolve();
          }
        };
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    });
  }

  private getCellForPosition(position: number): CellData {
    const board = (window as any).__gameBoard as any;
    if (board && board.getCellAt) {
      return board.getCellAt(position);
    }
    return {
      pathIndex: position,
      col: 0,
      row: 0,
      type: CellType.Normal,
      name: '',
      price: 0,
      owner: -1,
      rent: 0,
    };
  }

  buyProperty(pathIndex: number): boolean {
    const player = this.players[this.currentPlayerIndex];
    const cell = this.getCellForPosition(pathIndex);

    if (player.gold < cell.price) return false;

    player.gold -= cell.price;
    player.properties.push(pathIndex);

    const board = (window as any).__gameBoard as any;
    if (board && board.setCellOwner) {
      board.setCellOwner(pathIndex, this.currentPlayerIndex);
    }

    return true;
  }

  payRent(pathIndex: number, fromPlayerIndex: number, toPlayerIndex: number): number {
    const cell = this.getCellForPosition(pathIndex);
    const rent = cell.rent;
    const fromPlayer = this.players[fromPlayerIndex];
    const toPlayer = this.players[toPlayerIndex];

    const actualRent = Math.min(rent, fromPlayer.gold);
    fromPlayer.gold -= actualRent;
    toPlayer.gold += actualRent;

    if (fromPlayer.gold <= 0) {
      fromPlayer.bankrupt = true;
      for (const propIdx of fromPlayer.properties) {
        const b = (window as any).__gameBoard as any;
        if (b && b.setCellOwner) b.setCellOwner(propIdx, -1);
      }
      fromPlayer.properties = [];
    }

    return actualRent;
  }

  addGold(playerIndex: number, amount: number) {
    this.players[playerIndex].gold += amount;
    if (this.players[playerIndex].gold <= 0) {
      this.players[playerIndex].bankrupt = true;
    }
  }

  nextTurn() {
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;
    } while (this.players[this.currentPlayerIndex].bankrupt && this.getActivePlayers().length > 1);
  }

  getActivePlayers(): PlayerData[] {
    return this.players.filter(p => !p.bankrupt);
  }

  isGameOver(): boolean {
    return this.getActivePlayers().length <= 1;
  }

  getWinner(): PlayerData | null {
    const active = this.getActivePlayers();
    return active.length === 1 ? active[0] : null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
