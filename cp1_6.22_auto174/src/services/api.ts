import axios from 'axios';

export type EnemyState = 'patrol' | 'chase' | 'attack';

export interface EnemyDecision {
  moveDirection: number;
  attackIntent: boolean;
  attackDamage: number;
  skillIntent: boolean;
  skillDamage: number;
  skillRadius: number;
  newState: EnemyState;
}

export interface PlayerState {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  isAttacking: boolean;
  facingRight: boolean;
}

export interface EnemyData {
  id: string;
  type: 'grunt' | 'elite';
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  state: EnemyState;
  lastAttackTime: number;
  lastSkillTime: number;
}

export interface EnemySpawn {
  type: 'grunt' | 'elite';
  x: number;
}

export interface WaveData {
  enemies: EnemySpawn[];
  delay: number;
}

export interface TerrainData {
  groundY: number;
  groundHeight: number;
  groundWidth: number;
}

export interface LevelData {
  id: number;
  name: string;
  terrain: TerrainData;
  waves: WaveData[];
  waveInterval: number;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 200
});

export async function getLevelConfig(levelId: number): Promise<LevelData> {
  const response = await api.get<LevelData>(`/level/${levelId}`);
  return response.data;
}

export async function getEnemyDecision(
  playerState: PlayerState,
  enemies: EnemyData[],
  deltaTime: number,
  currentTime: number
): Promise<Record<string, EnemyDecision>> {
  const response = await api.post<{ decisions: Record<string, EnemyDecision> }>('/ai/decision', {
    playerState,
    enemies,
    deltaTime,
    currentTime
  });
  return response.data.decisions;
}
