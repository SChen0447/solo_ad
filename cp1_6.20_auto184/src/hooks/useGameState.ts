import { useReducer, useCallback, useEffect } from 'react';
import { PokedexEntry, getInitialPokedex, getRandomCreature, Creature, getCreatureById, MAP_TILES } from '../data/creatures';

export interface GameState {
  position: { x: number; y: number };
  backpack: number[];
  pokedex: PokedexEntry[];
  currentEncounter: Creature | null;
  encounterHp: number;
}

type GameAction =
  | { type: 'MOVE_PLAYER'; payload: { x: number; y: number } }
  | { type: 'TRIGGER_ENCOUNTER'; payload: Creature }
  | { type: 'CLEAR_ENCOUNTER' }
  | { type: 'CATCH_SUCCESS' }
  | { type: 'CATCH_FAIL' }
  | { type: 'UPDATE_ENCOUNTER_HP'; payload: number }
  | { type: 'RELEASE_CREATURE'; payload: number }
  | { type: 'LOAD_STATE'; payload: GameState };

const STORAGE_KEY = 'pocketmon_game_state';

const getInitialState = (): GameState => {
  const saved = sessionStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fall through
    }
  }
  return {
    position: { x: 0, y: 0 },
    backpack: [],
    pokedex: getInitialPokedex(),
    currentEncounter: null,
    encounterHp: 0,
  };
};

const saveState = (state: GameState) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    case 'MOVE_PLAYER': {
      const { x, y } = action.payload;
      const tile = MAP_TILES[y]?.[x];
      if (tile === 'water') return state;

      const triggerEncounter = Math.random() < 0.2;
      const randomCreature = getRandomCreature();

      const newPokedex = state.pokedex.map(entry =>
        entry.id === randomCreature.id && triggerEncounter
          ? { ...entry, seen: true }
          : entry
      );

      return {
        ...state,
        position: { x, y },
        currentEncounter: triggerEncounter ? randomCreature : null,
        encounterHp: triggerEncounter ? randomCreature.hp : 0,
        pokedex: triggerEncounter ? newPokedex : state.pokedex,
      };
    }

    case 'TRIGGER_ENCOUNTER': {
      const creature = action.payload;
      const newPokedex = state.pokedex.map(entry =>
        entry.id === creature.id ? { ...entry, seen: true } : entry
      );
      return {
        ...state,
        currentEncounter: creature,
        encounterHp: creature.hp,
        pokedex: newPokedex,
      };
    }

    case 'CLEAR_ENCOUNTER':
      return {
        ...state,
        currentEncounter: null,
        encounterHp: 0,
      };

    case 'CATCH_SUCCESS': {
      if (!state.currentEncounter) return state;

      const creatureId = state.currentEncounter.id;
      const newPokedex = state.pokedex.map(entry =>
        entry.id === creatureId ? { ...entry, caught: true } : entry
      );

      const newBackpack = [...state.backpack, creatureId];

      return {
        ...state,
        backpack: newBackpack,
        pokedex: newPokedex,
        currentEncounter: null,
        encounterHp: 0,
      };
    }

    case 'CATCH_FAIL':
      return {
        ...state,
        currentEncounter: null,
        encounterHp: 0,
      };

    case 'UPDATE_ENCOUNTER_HP':
      return {
        ...state,
        encounterHp: Math.max(0, action.payload),
      };

    case 'RELEASE_CREATURE': {
      const creatureId = action.payload;
      return {
        ...state,
        backpack: state.backpack.filter(id => id !== creatureId),
      };
    }

    default:
      return state;
  }
};

export const useGameState = () => {
  const [state, dispatch] = useReducer(gameReducer, null, getInitialState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const movePlayer = useCallback((x: number, y: number) => {
    dispatch({ type: 'MOVE_PLAYER', payload: { x, y } });
  }, []);

  const catchCreature = useCallback((creature: Creature) => {
    dispatch({ type: 'TRIGGER_ENCOUNTER', payload: creature });
  }, []);

  const attemptCatch = useCallback(() => {
    if (!state.currentEncounter) return false;

    const hpRatio = state.encounterHp / state.currentEncounter.hp;
    const catchRate = 0.5 + hpRatio * 0.3;
    const success = Math.random() < catchRate;

    if (success) {
      dispatch({ type: 'CATCH_SUCCESS' });
    } else {
      dispatch({ type: 'CATCH_FAIL' });
    }

    return success;
  }, [state.currentEncounter, state.encounterHp]);

  const clearEncounter = useCallback(() => {
    dispatch({ type: 'CLEAR_ENCOUNTER' });
  }, []);

  const releaseCreature = useCallback((creatureId: number) => {
    dispatch({ type: 'RELEASE_CREATURE', payload: creatureId });
  }, []);

  const getBackpackCreatures = useCallback((): Creature[] => {
    return state.backpack
      .map(id => getCreatureById(id))
      .filter((c): c is Creature => c !== undefined);
  }, [state.backpack]);

  const canCatch = useCallback((): boolean => {
    return state.backpack.length < 6;
  }, [state.backpack.length]);

  const loadState = useCallback((newState: GameState) => {
    dispatch({ type: 'LOAD_STATE', payload: newState });
  }, []);

  return {
    state,
    movePlayer,
    catchCreature,
    attemptCatch,
    clearEncounter,
    releaseCreature,
    getBackpackCreatures,
    canCatch,
    loadState,
  };
};
