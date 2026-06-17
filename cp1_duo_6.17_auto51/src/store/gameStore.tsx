import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { produce } from 'immer';
import { Hero, GridPosition, BattleResult, BattleFrame, PlacedHero, WaveConfig } from '../types';
import { PRESET_HEROES } from '../data/heroes';
import { runSimulation } from '../modules/battleSimulator';

interface GameState {
  heroes: Hero[];
  formation: { heroId: string; position: GridPosition }[];
  battleHistory: BattleResult[];
  currentBattle: BattleResult | null;
  currentFrames: BattleFrame[];
  selectedWaveId: string;
  waves: WaveConfig[];
  isSimulating: boolean;
}

type GameAction =
  | { type: 'ADD_HERO'; hero: Hero }
  | { type: 'REMOVE_HERO'; heroId: string }
  | { type: 'UPDATE_HERO'; heroId: string; updates: Partial<Hero> }
  | { type: 'PLACE_ON_GRID'; heroId: string; position: GridPosition }
  | { type: 'REMOVE_FROM_GRID'; heroId: string }
  | { type: 'SET_WAVES'; waves: WaveConfig[] }
  | { type: 'SELECT_WAVE'; waveId: string }
  | { type: 'START_SIMULATION' }
  | { type: 'SIMULATION_COMPLETE'; result: BattleResult }
  | { type: 'LOAD_HISTORY'; history: BattleResult[] }
  | { type: 'SET_CURRENT_BATTLE'; battle: BattleResult | null };

const initialState: GameState = {
  heroes: PRESET_HEROES,
  formation: [],
  battleHistory: [],
  currentBattle: null,
  currentFrames: [],
  selectedWaveId: 'wave-easy',
  waves: [],
  isSimulating: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  return produce(state, (draft) => {
    switch (action.type) {
      case 'ADD_HERO':
        draft.heroes.push(action.hero);
        break;
      case 'REMOVE_HERO':
        draft.heroes = draft.heroes.filter((h) => h.id !== action.heroId);
        draft.formation = draft.formation.filter((f) => f.heroId !== action.heroId);
        break;
      case 'UPDATE_HERO':
        const heroIdx = draft.heroes.findIndex((h) => h.id === action.heroId);
        if (heroIdx !== -1) {
          Object.assign(draft.heroes[heroIdx], action.updates);
          if (action.updates.maxHp !== undefined) {
            draft.heroes[heroIdx].hp = action.updates.maxHp;
          }
        }
        break;
      case 'PLACE_ON_GRID':
        const existingIdx = draft.formation.findIndex((f) => f.heroId === action.heroId);
        if (existingIdx !== -1) {
          draft.formation[existingIdx].position = action.position;
        } else {
          draft.formation = draft.formation.filter(
            (f) => !(f.position.x === action.position.x && f.position.y === action.position.y)
          );
          draft.formation.push({ heroId: action.heroId, position: action.position });
        }
        break;
      case 'REMOVE_FROM_GRID':
        draft.formation = draft.formation.filter((f) => f.heroId !== action.heroId);
        break;
      case 'SET_WAVES':
        draft.waves = action.waves;
        break;
      case 'SELECT_WAVE':
        draft.selectedWaveId = action.waveId;
        break;
      case 'START_SIMULATION':
        draft.isSimulating = true;
        break;
      case 'SIMULATION_COMPLETE':
        draft.isSimulating = false;
        draft.currentBattle = action.result;
        draft.currentFrames = action.result.frames;
        draft.battleHistory.unshift(action.result);
        if (draft.battleHistory.length > 50) {
          draft.battleHistory = draft.battleHistory.slice(0, 50);
        }
        try {
          localStorage.setItem('battleHistory', JSON.stringify(draft.battleHistory));
        } catch (e) {}
        break;
      case 'LOAD_HISTORY':
        draft.battleHistory = action.history;
        break;
      case 'SET_CURRENT_BATTLE':
        draft.currentBattle = action.battle;
        draft.currentFrames = action.battle?.frames || [];
        break;
    }
  });
}

interface GameStoreContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  addHero: (hero: Hero) => void;
  removeHero: (heroId: string) => void;
  updateHero: (heroId: string, updates: Partial<Hero>) => void;
  placeOnGrid: (heroId: string, position: GridPosition) => void;
  removeFromGrid: (heroId: string) => void;
  selectWave: (waveId: string) => void;
  startSimulation: () => Promise<void>;
  loadHistory: () => void;
  setCurrentBattle: (battle: BattleResult | null) => void;
  getPlacedHeroes: () => PlacedHero[];
  getFormationStats: () => { totalHp: number; totalAttack: number; totalDefense: number; avgSpeed: number };
}

const GameStoreContext = createContext<GameStoreContextType | null>(null);

export function GameStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    fetch('/waves.json')
      .then((r) => r.json())
      .then((data) => dispatch({ type: 'SET_WAVES', waves: data }))
      .catch(() => {});

    try {
      const saved = localStorage.getItem('battleHistory');
      if (saved) {
        dispatch({ type: 'LOAD_HISTORY', history: JSON.parse(saved) });
      }
    } catch (e) {}
  }, []);

  const addHero = (hero: Hero) => dispatch({ type: 'ADD_HERO', hero });
  const removeHero = (heroId: string) => dispatch({ type: 'REMOVE_HERO', heroId });
  const updateHero = (heroId: string, updates: Partial<Hero>) =>
    dispatch({ type: 'UPDATE_HERO', heroId, updates });
  const placeOnGrid = (heroId: string, position: GridPosition) =>
    dispatch({ type: 'PLACE_ON_GRID', heroId, position });
  const removeFromGrid = (heroId: string) =>
    dispatch({ type: 'REMOVE_FROM_GRID', heroId });
  const selectWave = (waveId: string) => dispatch({ type: 'SELECT_WAVE', waveId });

  const startSimulation = async () => {
    if (state.formation.length === 0 || !state.waves.length) return;
    dispatch({ type: 'START_SIMULATION' });

    const wave = state.waves.find((w) => w.id === state.selectedWaveId);
    if (!wave) return;

    const placedHeroes = getPlacedHeroes();

    setTimeout(() => {
      const result = runSimulation(placedHeroes, wave);
      dispatch({ type: 'SIMULATION_COMPLETE', result });
    }, 50);
  };

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem('battleHistory');
      if (saved) {
        dispatch({ type: 'LOAD_HISTORY', history: JSON.parse(saved) });
      }
    } catch (e) {}
  };

  const setCurrentBattle = (battle: BattleResult | null) => {
    dispatch({ type: 'SET_CURRENT_BATTLE', battle });
  };

  const getPlacedHeroes = (): PlacedHero[] => {
    return state.formation
      .map((f) => {
        const hero = state.heroes.find((h) => h.id === f.heroId);
        if (!hero) return null;
        return { ...hero, position: f.position, hp: hero.maxHp };
      })
      .filter((h): h is PlacedHero => h !== null);
  };

  const getFormationStats = () => {
    const placed = getPlacedHeroes();
    if (placed.length === 0) {
      return { totalHp: 0, totalAttack: 0, totalDefense: 0, avgSpeed: 0 };
    }
    return {
      totalHp: placed.reduce((sum, h) => sum + h.maxHp, 0),
      totalAttack: placed.reduce((sum, h) => sum + h.attack, 0),
      totalDefense: placed.reduce((sum, h) => sum + h.defense, 0),
      avgSpeed: Math.round(placed.reduce((sum, h) => sum + h.speed, 0) / placed.length),
    };
  };

  return (
    <GameStoreContext.Provider
      value={{
        state,
        dispatch,
        addHero,
        removeHero,
        updateHero,
        placeOnGrid,
        removeFromGrid,
        selectWave,
        startSimulation,
        loadHistory,
        setCurrentBattle,
        getPlacedHeroes,
        getFormationStats,
      }}
    >
      {children}
    </GameStoreContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(GameStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within GameStoreProvider');
  return ctx;
}
