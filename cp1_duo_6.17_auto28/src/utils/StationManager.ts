import axios from 'axios';

export interface ModuleInfo {
  name: string;
  size: [number, number];
  cost: Record<string, number>;
  production: Record<string, number>;
  consumption: Record<string, number>;
  capacity: number;
  description: string;
}

export interface Module {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  health: number;
}

export interface CrewMember {
  id: string;
  name: string;
  profession: string;
  avatar_color: string;
  morale: number;
  skills: Record<string, number>;
}

export interface Resources {
  oxygen: number;
  water: number;
  food: number;
  power: number;
  tech_points: number;
  reputation: number;
  materials: number;
}

export interface GameState {
  day: number;
  modules: Module[];
  resources: Resources;
  max_resources: Resources;
  crew: CrewMember[];
  zero_resource_days: Record<string, number>;
  game_over: boolean;
  score: number;
  next_event_day: number;
  production_penalty_days: number;
}

export interface FloatingNumber {
  id: number;
  x: number;
  y: number;
  value: number;
  color: string;
  alpha: number;
  life: number;
}

class StationManager {
  private state: GameState | null = null;
  private moduleTypes: Record<string, ModuleInfo> = {};
  private floatingNumbers: FloatingNumber[] = [];
  private floatingNumberId = 0;
  private listeners: Set<() => void> = new Set();

  async initGame(): Promise<boolean> {
    try {
      const response = await axios.post('/api/new-game');
      if (response.data.success) {
        this.state = response.data.state;
        this.moduleTypes = response.data.module_types;
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize game:', error);
      return false;
    }
  }

  getState(): GameState | null {
    return this.state;
  }

  getModuleTypes(): Record<string, ModuleInfo> {
    return this.moduleTypes;
  }

  getModuleInfo(type: string): ModuleInfo | null {
    return this.moduleTypes[type] || null;
  }

  async tick(): Promise<{
    state: GameState;
    event: any;
    gameOver: boolean;
    resourceChanges: Record<string, number>;
  } | null> {
    if (!this.state) return null;

    try {
      const response = await axios.post('/api/tick', { state: this.state });
      if (response.data.success) {
        this.state = response.data.state;
        this.notifyListeners();
        return {
          state: response.data.state,
          event: response.data.event,
          gameOver: response.data.game_over,
          resourceChanges: response.data.resource_changes
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to tick:', error);
      return null;
    }
  }

  async buildModule(moduleType: string, x: number, y: number): Promise<boolean> {
    if (!this.state) return false;

    try {
      const response = await axios.post('/api/build-module', {
        state: this.state,
        module_type: moduleType,
        x,
        y
      });
      if (response.data.success) {
        this.state = response.data.state;
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to build module:', error);
      return false;
    }
  }

  async recruitCrew(): Promise<CrewMember | null> {
    if (!this.state) return null;

    try {
      const response = await axios.post('/api/recruit-crew', { state: this.state });
      if (response.data.success) {
        this.state = response.data.state;
        this.notifyListeners();
        return response.data.crew_member;
      }
      return null;
    } catch (error) {
      console.error('Failed to recruit crew:', error);
      return null;
    }
  }

  async handleEvent(event: any, optionIndex: number): Promise<{
    success: boolean;
    result: any;
  } | null> {
    if (!this.state) return null;

    try {
      const response = await axios.post('/api/handle-event', {
        state: this.state,
        event,
        option_index: optionIndex
      });
      if (response.data.success) {
        this.state = response.data.state;
        this.notifyListeners();
        return {
          success: true,
          result: response.data.result
        };
      }
      return { success: false, result: null };
    } catch (error) {
      console.error('Failed to handle event:', error);
      return null;
    }
  }

  canPlaceModule(moduleType: string, x: number, y: number): boolean {
    if (!this.state) return false;

    const moduleInfo = this.moduleTypes[moduleType];
    if (!moduleInfo) return false;

    const [width, height] = moduleInfo.size;

    if (x < 0 || y < 0 || x + width > 6 || y + height > 6) {
      return false;
    }

    for (const module of this.state.modules) {
      const existingInfo = this.moduleTypes[module.type];
      if (!existingInfo) continue;

      const [ex, ey] = existingInfo.size;
      const mx = module.x;
      const my = module.y;

      if (
        x < mx + ex &&
        x + width > mx &&
        y < my + ey &&
        y + height > my
      ) {
        return false;
      }
    }

    return true;
  }

  canAfford(moduleType: string): boolean {
    if (!this.state) return false;

    const moduleInfo = this.moduleTypes[moduleType];
    if (!moduleInfo) return false;

    for (const [resource, amount] of Object.entries(moduleInfo.cost)) {
      if ((this.state.resources as any)[resource] < amount) {
        return false;
      }
    }

    return true;
  }

  getTotalCapacity(): number {
    if (!this.state) return 0;

    return this.state.modules.reduce((total, module) => {
      const info = this.moduleTypes[module.type];
      return total + (info?.capacity || 0);
    }, 0);
  }

  getResourcePercentage(resource: string): number {
    if (!this.state) return 0;
    const current = (this.state.resources as any)[resource] || 0;
    const max = (this.state.max_resources as any)[resource] || 1;
    return (current / max) * 100;
  }

  getResourceColor(percentage: number): string {
    if (percentage > 60) return '#00FF9D';
    if (percentage > 30) return '#FFD700';
    return '#EF4444';
  }

  isResourceCritical(resource: string): boolean {
    return this.getResourcePercentage(resource) < 20;
  }

  addFloatingNumber(x: number, y: number, value: number, isPositive: boolean): void {
    this.floatingNumbers.push({
      id: this.floatingNumberId++,
      x,
      y,
      value,
      color: isPositive ? '#00FF9D' : '#EF4444',
      alpha: 1,
      life: 60
    });
  }

  updateFloatingNumbers(): void {
    this.floatingNumbers = this.floatingNumbers.filter(fn => {
      fn.y -= 1;
      fn.alpha -= 0.015;
      fn.life--;
      return fn.life > 0 && fn.alpha > 0;
    });
  }

  getFloatingNumbers(): FloatingNumber[] {
    return this.floatingNumbers;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  async getLeaderboard(): Promise<any[]> {
    try {
      const response = await axios.get('/api/leaderboard');
      if (response.data.success) {
        return response.data.leaderboard;
      }
      return [];
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return [];
    }
  }

  async submitScore(name: string, score: number, days: number): Promise<boolean> {
    try {
      const response = await axios.post('/api/leaderboard', { name, score, days });
      return response.data.success;
    } catch (error) {
      console.error('Failed to submit score:', error);
      return false;
    }
  }

  calculateScore(): number {
    if (!this.state) return 0;

    const avgMorale = this.state.crew.length > 0
      ? this.state.crew.reduce((sum, c) => sum + c.morale, 0) / this.state.crew.length
      : 0;

    return Math.floor(
      this.state.day * 100 +
      this.state.resources.tech_points * 2 +
      this.state.resources.reputation * 3 +
      avgMorale * 1.5
    );
  }
}

export const stationManager = new StationManager();
export default stationManager;
