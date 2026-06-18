import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Coordinate,
  Obstacle,
  ObstacleType,
  Character,
  CharacterColor,
  ShootLog,
  ToolType,
  OBSTACLE_HEIGHTS,
} from './types';

interface DataStore {
  obstacles: Obstacle[];
  characters: Character[];
  shootLogs: ShootLog[];
  selectedTool: ToolType;
  bounceModuleEnabled: boolean;
  activeCharacterId: string | null;

  addObstacle: (type: ObstacleType, position: Coordinate) => void;
  removeObstacle: (id: string) => void;
  damageObstacle: (id: string) => void;
  clearObstacleFlags: () => void;

  addCharacter: (color: CharacterColor, position: Coordinate) => void;
  removeCharacter: (id: string) => void;
  setActiveCharacter: (id: string | null) => void;
  setCharacterHit: (id: string, isHit: boolean) => void;
  clearCharacterFlags: () => void;

  addShootLog: (log: Omit<ShootLog, 'id' | 'timestamp'>) => void;
  clearShootLogs: () => void;

  setSelectedTool: (tool: ToolType) => void;
  setBounceModuleEnabled: (enabled: boolean) => void;

  getObstacleAt: (position: Coordinate) => Obstacle | undefined;
  getCharacterAt: (position: Coordinate) => Character | undefined;
  isPositionOccupied: (position: Coordinate) => boolean;
}

const formatTimestamp = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

export const useDataStore = create<DataStore>((set, get) => ({
  obstacles: [],
  characters: [],
  shootLogs: [],
  selectedTool: null,
  bounceModuleEnabled: false,
  activeCharacterId: null,

  addObstacle: (type, position) => {
    const existing = get().obstacles.find(
      (o) => o.position.x === position.x && o.position.y === position.y
    );
    if (existing) return;

    const character = get().characters.find(
      (c) => c.position.x === position.x && c.position.y === position.y
    );
    if (character) return;

    const obstacle: Obstacle = {
      id: uuidv4(),
      type,
      position,
      height: OBSTACLE_HEIGHTS[type],
      isDamaged: false,
      isNew: true,
    };

    set((state) => ({ obstacles: [...state.obstacles, obstacle] }));
  },

  removeObstacle: (id) => {
    set((state) => ({
      obstacles: state.obstacles.filter((o) => o.id !== id),
    }));
  },

  damageObstacle: (id) => {
    set((state) => ({
      obstacles: state.obstacles.map((o) =>
        o.id === id ? { ...o, isDamaged: true } : o
      ),
    }));
  },

  clearObstacleFlags: () => {
    set((state) => ({
      obstacles: state.obstacles.map((o) => ({ ...o, isNew: false })),
    }));
  },

  addCharacter: (color, position) => {
    const obstacle = get().obstacles.find(
      (o) => o.position.x === position.x && o.position.y === position.y
    );
    if (obstacle) return;

    const existing = get().characters.find(
      (c) => c.position.x === position.x && c.position.y === position.y
    );
    if (existing) return;

    const character: Character = {
      id: uuidv4(),
      color,
      position,
      bounceCount: 0,
      isActive: false,
      isHit: false,
      isNew: true,
    };

    set((state) => ({ characters: [...state.characters, character] }));
  },

  removeCharacter: (id) => {
    set((state) => ({
      characters: state.characters.filter((c) => c.id !== id),
      activeCharacterId: state.activeCharacterId === id ? null : state.activeCharacterId,
    }));
  },

  setActiveCharacter: (id) => {
    const bounceEnabled = get().bounceModuleEnabled;
    set((state) => ({
      characters: state.characters.map((c) => ({
        ...c,
        isActive: c.id === id,
        bounceCount: c.id === id && bounceEnabled ? 3 : 0,
      })),
      activeCharacterId: id,
    }));
  },

  setCharacterHit: (id, isHit) => {
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === id ? { ...c, isHit } : c
      ),
    }));
  },

  clearCharacterFlags: () => {
    set((state) => ({
      characters: state.characters.map((c) => ({ ...c, isNew: false })),
    }));
  },

  addShootLog: (log) => {
    const shootLog: ShootLog = {
      ...log,
      id: uuidv4(),
      timestamp: formatTimestamp(),
    };
    set((state) => ({ shootLogs: [shootLog, ...state.shootLogs] }));
  },

  clearShootLogs: () => {
    set({ shootLogs: [] });
  },

  setSelectedTool: (tool) => {
    if (tool !== null) {
      set({ activeCharacterId: null });
      set((state) => ({
        characters: state.characters.map((c) => ({ ...c, isActive: false })),
      }));
    }
    set({ selectedTool: tool });
  },

  setBounceModuleEnabled: (enabled) => {
    set({ bounceModuleEnabled: enabled });
    const activeId = get().activeCharacterId;
    if (activeId) {
      set((state) => ({
        characters: state.characters.map((c) => ({
          ...c,
          bounceCount: c.id === activeId && enabled ? 3 : 0,
        })),
      }));
    }
  },

  getObstacleAt: (position) => {
    return get().obstacles.find(
      (o) => o.position.x === position.x && o.position.y === position.y
    );
  },

  getCharacterAt: (position) => {
    return get().characters.find(
      (c) => c.position.x === position.x && c.position.y === position.y
    );
  },

  isPositionOccupied: (position) => {
    return (
      get().getObstacleAt(position) !== undefined ||
      get().getCharacterAt(position) !== undefined
    );
  },
}));
