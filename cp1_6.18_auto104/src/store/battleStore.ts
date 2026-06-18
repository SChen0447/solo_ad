import { create } from 'zustand';
import type {
  BattleState,
  Player,
  Boss,
  Minion,
  DamageNumber,
  SkillEffect,
  BattleLogEntry,
  PlayerAction,
  BossBehavior
} from '../types';

interface BattleStore extends BattleState {
  setPlayer: (player: Player) => void;
  setBoss: (boss: Boss) => void;
  updateBossState: (behavior: BossBehavior) => void;
  addMinion: (minion: Minion) => void;
  updateMinion: (id: string, updates: Partial<Minion>) => void;
  removeMinion: (id: string) => void;
  addDamageNumber: (damage: Omit<DamageNumber, 'id'>) => void;
  updateDamageNumbers: (deltaTime: number) => void;
  addSkillEffect: (effect: Omit<SkillEffect, 'id'>) => void;
  updateSkillEffects: (deltaTime: number) => void;
  addBattleLog: (entry: Omit<BattleLogEntry, 'id' | 'timestamp'>) => void;
  setScreenShake: (intensity: number) => void;
  updateScreenShake: (deltaTime: number) => void;
  setIsPlayerTurn: (isPlayerTurn: boolean) => void;
  updateTurnTimer: (deltaTime: number) => void;
  setBattleResult: (result: 'ongoing' | 'victory' | 'defeat' | null) => void;
  setDifficultyModifier: (modifier: number) => void;
  setBalanceAdjustmentMessage: (message: string | null) => void;
  incrementConsecutiveWins: () => void;
  incrementConsecutiveLosses: () => void;
  resetConsecutiveCounts: () => void;
  handlePlayerAction: (action: PlayerAction) => void;
  updateBossHp: (damage: number) => void;
  updatePlayerHp: (damage: number, isHeal?: boolean) => void;
  updatePlayerCooldowns: (deltaTime: number) => void;
  setBossStun: (duration: number) => void;
  updateBossStun: (deltaTime: number) => void;
  setBossTransitioning: (isTransitioning: boolean, duration?: number) => void;
  resetBattle: (player: Player, boss: Boss) => void;
}

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createInitialPlayer = (): Player => ({
  maxHp: 1000,
  currentHp: 1000,
  attack: 80,
  defense: 40,
  level: 50,
  equipmentScore: 500,
  position: { x: 200, y: 400 },
  actionCooldown: 0,
  dodgeCooldown: 0,
  skillCooldowns: {
    fireball: 0,
    ice_spike: 0,
    lightning_bolt: 0
  }
});

const createInitialBoss = (): Boss => ({
  id: 'temp',
  name: 'Boss',
  maxHp: 5000,
  currentHp: 5000,
  attack: 100,
  defense: 50,
  speed: 60,
  fireResist: 30,
  iceResist: 40,
  lightningResist: 50,
  skills: [],
  state: 'idle',
  position: { x: 600, y: 350 },
  stateTransitionTime: 0,
  isTransitioning: false,
  stunDuration: 0
});

export const useBattleStore = create<BattleStore>((set, get) => ({
  player: createInitialPlayer(),
  boss: createInitialBoss(),
  minions: [],
  damageNumbers: [],
  skillEffects: [],
  battleLog: [],
  screenShake: 0,
  isPlayerTurn: true,
  turnTimer: 2000,
  battleResult: null,
  consecutiveWins: 0,
  consecutiveLosses: 0,
  difficultyModifier: 1,
  balanceAdjustmentMessage: null,

  setPlayer: (player) => set({ player }),
  setBoss: (boss) => set({ boss }),

  updateBossState: (behavior) => set((state) => ({
    boss: {
      ...state.boss,
      state: behavior.state
    }
  })),

  addMinion: (minion) => set((state) => ({
    minions: [...state.minions, minion]
  })),

  updateMinion: (id, updates) => set((state) => ({
    minions: state.minions.map(m =>
      m.id === id ? { ...m, ...updates } : m
    )
  })),

  removeMinion: (id) => set((state) => ({
    minions: state.minions.filter(m => m.id !== id)
  })),

  addDamageNumber: (damage) => set((state) => ({
    damageNumbers: [...state.damageNumbers, { ...damage, id: generateId() }]
  })),

  updateDamageNumbers: (deltaTime) => set((state) => ({
    damageNumbers: state.damageNumbers
      .map(d => ({
        ...d,
        y: d.y - 30 * (deltaTime / 1000),
        opacity: d.opacity - 0.8 * (deltaTime / 1000)
      }))
      .filter(d => d.opacity > 0)
  })),

  addSkillEffect: (effect) => set((state) => ({
    skillEffects: [...state.skillEffects, { ...effect, id: generateId() }]
  })),

  updateSkillEffects: (deltaTime) => set((state) => ({
    skillEffects: state.skillEffects
      .map(e => ({
        ...e,
        duration: e.duration - deltaTime
      }))
      .filter(e => e.duration > 0)
  })),

  addBattleLog: (entry) => set((state) => ({
    battleLog: [
      ...state.battleLog.slice(-49),
      { ...entry, id: generateId(), timestamp: Date.now() }
    ]
  })),

  setScreenShake: (intensity) => set({ screenShake: intensity }),

  updateScreenShake: (deltaTime) => set((state) => ({
    screenShake: Math.max(0, state.screenShake - deltaTime * 0.01)
  })),

  setIsPlayerTurn: (isPlayerTurn) => set({ isPlayerTurn, turnTimer: 2000 }),

  updateTurnTimer: (deltaTime) => set((state) => ({
    turnTimer: Math.max(0, state.turnTimer - deltaTime)
  })),

  setBattleResult: (result) => set({ battleResult: result }),

  setDifficultyModifier: (modifier) => set({ difficultyModifier: modifier }),

  setBalanceAdjustmentMessage: (message) => set({ balanceAdjustmentMessage: message }),

  incrementConsecutiveWins: () => set((state) => ({
    consecutiveWins: state.consecutiveWins + 1,
    consecutiveLosses: 0
  })),

  incrementConsecutiveLosses: () => set((state) => ({
    consecutiveLosses: state.consecutiveLosses + 1,
    consecutiveWins: 0
  })),

  resetConsecutiveCounts: () => set({
    consecutiveWins: 0,
    consecutiveLosses: 0
  }),

  handlePlayerAction: (_action) => {
    const state = get();
    if (!state.isPlayerTurn || state.player.actionCooldown > 0) return;
    set((s) => ({
      player: { ...s.player, actionCooldown: 2000 }
    }));
  },

  updateBossHp: (damage) => set((state) => {
    const newHp = Math.max(0, state.boss.currentHp - damage);
    return {
      boss: { ...state.boss, currentHp: newHp }
    };
  }),

  updatePlayerHp: (damage, isHeal = false) => set((state) => {
    const newHp = isHeal
      ? Math.min(state.player.maxHp, state.player.currentHp + damage)
      : Math.max(0, state.player.currentHp - damage);
    return {
      player: { ...state.player, currentHp: newHp }
    };
  }),

  updatePlayerCooldowns: (deltaTime) => set((state) => {
    const updatedCooldowns: Record<string, number> = {};
    for (const [key, value] of Object.entries(state.player.skillCooldowns)) {
      updatedCooldowns[key] = Math.max(0, value - deltaTime);
    }
    return {
      player: {
        ...state.player,
        actionCooldown: Math.max(0, state.player.actionCooldown - deltaTime),
        dodgeCooldown: Math.max(0, state.player.dodgeCooldown - deltaTime),
        skillCooldowns: updatedCooldowns
      }
    };
  }),

  setBossStun: (duration) => set((state) => ({
    boss: { ...state.boss, stunDuration: duration, state: 'idle' }
  })),

  updateBossStun: (deltaTime) => set((state) => ({
    boss: {
      ...state.boss,
      stunDuration: Math.max(0, state.boss.stunDuration - deltaTime)
    }
  })),

  setBossTransitioning: (isTransitioning, duration = 1500) => set((state) => ({
    boss: {
      ...state.boss,
      isTransitioning,
      stateTransitionTime: isTransitioning ? duration : 0
    }
  })),

  resetBattle: (player, boss) => set({
    player,
    boss,
    minions: [],
    damageNumbers: [],
    skillEffects: [],
    battleLog: [],
    screenShake: 0,
    isPlayerTurn: true,
    turnTimer: 2000,
    battleResult: null
  })
}));
