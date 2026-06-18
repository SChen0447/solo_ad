import { create } from 'zustand';

export type WeaponType = 'sword' | 'bow' | 'staff';
export type SkillType = 'fireball' | 'heal' | 'blink';
export type GamePhase = 'editor' | 'battle' | 'victory' | 'defeat';

export interface CharacterConfig {
  head: {
    hatColor: string;
    hairStyle: number;
  };
  body: {
    shirtColor: string;
    armorStyle: number;
  };
  legs: {
    pantsColor: string;
    shoeStyle: number;
  };
  weapon: WeaponType;
  skill: SkillType;
}

export interface BattleState {
  playerHP: number;
  playerMaxHP: number;
  playerEnergy: number;
  playerMaxEnergy: number;
  score: number;
  progressOrbs: number;
  playerX: number;
  playerY: number;
  skillCooldown: number;
}

interface GameStore {
  gamePhase: GamePhase;
  character: CharacterConfig;
  battle: BattleState;
  setGamePhase: (phase: GamePhase) => void;
  updateCharacter: (partial: Partial<CharacterConfig>) => void;
  updateBattle: (partial: Partial<BattleState>) => void;
  resetBattle: () => void;
}

const defaultCharacter: CharacterConfig = {
  head: { hatColor: '#e94560', hairStyle: 0 },
  body: { shirtColor: '#0f3460', armorStyle: 0 },
  legs: { pantsColor: '#16213e', shoeStyle: 0 },
  weapon: 'sword',
  skill: 'fireball',
};

const defaultBattle: BattleState = {
  playerHP: 100,
  playerMaxHP: 100,
  playerEnergy: 50,
  playerMaxEnergy: 50,
  score: 0,
  progressOrbs: 0,
  playerX: 100,
  playerY: 400,
  skillCooldown: 0,
};

export const useGameStore = create<GameStore>((set) => ({
  gamePhase: 'editor',
  character: { ...defaultCharacter },
  battle: { ...defaultBattle },
  setGamePhase: (phase) => set({ gamePhase: phase }),
  updateCharacter: (partial) =>
    set((state) => ({
      character: { ...state.character, ...partial },
    })),
  updateBattle: (partial) =>
    set((state) => ({
      battle: { ...state.battle, ...partial },
    })),
  resetBattle: () =>
    set({
      battle: { ...defaultBattle },
      gamePhase: 'editor',
    }),
}));
