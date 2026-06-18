export type TowerType = 'arrow' | 'cannon' | 'frost';

export type GameActionType =
  | 'deploy'
  | 'upgrade'
  | 'move'
  | 'startWave'
  | 'help'
  | 'sell'
  | 'status';

export interface DeployAction {
  type: 'deploy';
  params: DeployParams;
}

export interface UpgradeAction {
  type: 'upgrade';
  params: UpgradeParams;
}

export interface MoveAction {
  type: 'move';
  params: MoveParams;
}

export interface SellAction {
  type: 'sell';
  params: SellParams;
}

export interface StartWaveAction {
  type: 'startWave';
  params: Record<string, never>;
}

export interface HelpAction {
  type: 'help';
  params: Record<string, never>;
}

export interface StatusAction {
  type: 'status';
  params: Record<string, never>;
}

export type GameAction =
  | DeployAction
  | UpgradeAction
  | MoveAction
  | SellAction
  | StartWaveAction
  | HelpAction
  | StatusAction;

export interface DeployParams {
  towerType: TowerType;
  x: number;
  y: number;
}

export interface UpgradeParams {
  x: number;
  y: number;
}

export interface MoveParams {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SellParams {
  x: number;
  y: number;
}

export class InputParser {
  private history: string[] = [];
  private historyIndex: number = -1;
  private currentTemp: string = '';

  private commands: string[] = [
    'deploy',
    'upgrade',
    'move',
    'start',
    'help',
    'sell',
    'status'
  ];

  private towerTypes: TowerType[] = ['arrow', 'cannon', 'frost'];

  addToHistory(command: string): void {
    if (command.trim() === '') return;
    if (this.history.length > 0 && this.history[this.history.length - 1] === command) {
      this.historyIndex = this.history.length;
      return;
    }
    this.history.push(command);
    if (this.history.length > 50) {
      this.history.shift();
    }
    this.historyIndex = this.history.length;
  }

  getHistoryPrevious(): string | null {
    if (this.history.length === 0) return null;
    if (this.historyIndex === this.history.length) {
      this.currentTemp = '';
    }
    this.historyIndex = Math.max(0, this.historyIndex - 1);
    return this.history[this.historyIndex] ?? null;
  }

  getHistoryNext(): string | null {
    if (this.history.length === 0) return null;
    this.historyIndex = Math.min(this.history.length, this.historyIndex + 1);
    if (this.historyIndex === this.history.length) {
      return this.currentTemp;
    }
    return this.history[this.historyIndex] ?? null;
  }

  setCurrentTemp(text: string): void {
    this.currentTemp = text;
    this.historyIndex = this.history.length;
  }

  autocomplete(input: string): string {
    const parts = input.trim().split(/\s+/);
    if (parts.length === 1 && parts[0] !== '') {
      const prefix = parts[0].toLowerCase();
      const matches = this.commands.filter(cmd => cmd.startsWith(prefix));
      if (matches.length === 1) {
        return matches[0] + ' ';
      }
    } else if (parts.length === 2 && parts[0] === 'deploy') {
      const prefix = parts[1].toLowerCase();
      const matches = this.towerTypes.filter(t => t.startsWith(prefix));
      if (matches.length === 1) {
        return parts[0] + ' ' + matches[0] + ' ';
      }
    }
    return input;
  }

  getSuggestions(input: string): string[] {
    const parts = input.trim().split(/\s+/);
    if (parts.length === 1) {
      const prefix = parts[0].toLowerCase();
      return this.commands.filter(cmd => cmd.startsWith(prefix));
    } else if (parts.length === 2 && parts[0] === 'deploy') {
      const prefix = parts[1].toLowerCase();
      return this.towerTypes.filter(t => t.startsWith(prefix));
    }
    return [];
  }

  parse(input: string): GameAction {
    const trimmed = input.trim();
    if (trimmed === '') {
      throw new Error('Empty command');
    }

    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();

    switch (command) {
      case 'deploy':
        return this.parseDeploy(parts);
      case 'upgrade':
        return this.parseUpgrade(parts);
      case 'move':
        return this.parseMove(parts);
      case 'start':
        return { type: 'startWave', params: {} };
      case 'help':
        return { type: 'help', params: {} };
      case 'sell':
        return this.parseSell(parts);
      case 'status':
        return { type: 'status', params: {} };
      default:
        throw new Error(`Unknown command: ${command}. Type 'help' for available commands.`);
    }
  }

  private parseDeploy(parts: string[]): DeployAction {
    if (parts.length !== 4) {
      throw new Error('Usage: deploy <towerType> <x> <y>. Tower types: arrow, cannon, frost');
    }

    const towerType = parts[1].toLowerCase() as TowerType;
    if (!this.towerTypes.includes(towerType)) {
      throw new Error(`Unknown tower type: ${parts[1]}. Available: arrow, cannon, frost`);
    }

    const x = parseInt(parts[2], 10);
    const y = parseInt(parts[3], 10);

    if (isNaN(x) || isNaN(y)) {
      throw new Error('Coordinates must be numbers');
    }

    return {
      type: 'deploy',
      params: { towerType, x, y }
    };
  }

  private parseUpgrade(parts: string[]): UpgradeAction {
    if (parts.length !== 3) {
      throw new Error('Usage: upgrade <x> <y>');
    }

    const x = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);

    if (isNaN(x) || isNaN(y)) {
      throw new Error('Coordinates must be numbers');
    }

    return {
      type: 'upgrade',
      params: { x, y }
    };
  }

  private parseMove(parts: string[]): MoveAction {
    if (parts.length !== 5) {
      throw new Error('Usage: move <x1> <y1> <x2> <y2>');
    }

    const x1 = parseInt(parts[1], 10);
    const y1 = parseInt(parts[2], 10);
    const x2 = parseInt(parts[3], 10);
    const y2 = parseInt(parts[4], 10);

    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
      throw new Error('Coordinates must be numbers');
    }

    return {
      type: 'move',
      params: { x1, y1, x2, y2 }
    };
  }

  private parseSell(parts: string[]): SellAction {
    if (parts.length !== 3) {
      throw new Error('Usage: sell <x> <y>');
    }

    const x = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);

    if (isNaN(x) || isNaN(y)) {
      throw new Error('Coordinates must be numbers');
    }

    return {
      type: 'sell',
      params: { x, y }
    };
  }

  getHelpText(): string {
    return `Available commands:
  deploy <arrow|cannon|frost> <x> <y>  - Deploy a tower
  upgrade <x> <y>                       - Upgrade a tower
  move <x1> <y1> <x2> <y2>             - Move a tower
  sell <x> <y>                          - Sell a tower
  start                                 - Start next wave
  status                                - Show game status
  help                                  - Show this help

Examples:
  deploy arrow 5 5
  upgrade 5 5
  move 5 5 10 10
  start`;
  }
}
