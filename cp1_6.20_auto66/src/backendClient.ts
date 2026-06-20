export type CellType = 'wall' | 'floor' | 'entrance' | 'exit';

export interface Position {
  x: number;
  y: number;
}

export interface Monster {
  id: string;
  position: Position;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  name: string;
}

export interface Treasure {
  id: string;
  position: Position;
  type: 'heal' | 'attack';
  value: number;
  collected: boolean;
}

export interface DungeonData {
  grid: CellType[][];
  entrance: Position;
  exit: Position;
  monsters: Monster[];
  treasures: Treasure[];
  seed: number;
  difficulty: number;
}

export interface FightRequest {
  playerAttack: number;
  monsterDefense: number;
  monsterHp: number;
  playerHp: number;
  monsterAttack: number;
}

export interface FightResponse {
  damage: number;
  monsterHp: number;
  monsterDefeated: boolean;
  counterDamage: number;
  playerHp: number;
  playerDefeated: boolean;
  defenseVariation: number;
}

export interface GenerateLevelRequest {
  seed?: number;
  difficulty: number;
  floor: number;
}

export interface ApiError {
  error: string;
  message: string;
}

class BackendClient {
  private baseUrl: string = '/api';
  private timeoutMs: number = 5000;

  public setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  public async generateLevel(request: GenerateLevelRequest): Promise<DungeonData> {
    try {
      const response = await this.fetchWithTimeout<DungeonData>(
        `${this.baseUrl}/generateLevel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );
      return response;
    } catch (error) {
      console.error('生成地牢失败:', error);
      if (error instanceof Error) {
        throw {
          error: 'network_error',
          message: `生成地牢失败: ${error.message}`,
        } as ApiError;
      }
      throw {
        error: 'unknown_error',
        message: '生成地牢时发生未知错误',
      } as ApiError;
    }
  }

  public async fight(request: FightRequest): Promise<FightResponse> {
    try {
      const response = await this.fetchWithTimeout<FightResponse>(
        `${this.baseUrl}/fight`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );
      return response;
    } catch (error) {
      console.error('战斗结算失败:', error);
      if (error instanceof Error) {
        throw {
          error: 'network_error',
          message: `战斗结算失败: ${error.message}`,
        } as ApiError;
      }
      throw {
        error: 'unknown_error',
        message: '战斗结算时发生未知错误',
      } as ApiError;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async fetchWithTimeout<T>(
    url: string,
    options: RequestInit,
    timeout: number = this.timeoutMs
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('请求超时，请检查后端服务是否启动');
      }
      throw error;
    }
  }
}

export const backendClient = new BackendClient();
export default backendClient;
