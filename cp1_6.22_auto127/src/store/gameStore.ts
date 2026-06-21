import { create } from 'zustand';
import type {
  ShipType,
  Team,
  BattleShip,
  BattleSnapshot,
  BattleEndPayload,
} from '../../shared/types';
import { SHIP_TEMPLATES, calculatePower, MAX_FLEET_SIZE } from '../../shared/types';

interface GameState {
  playerId: string;
  fleetShips: ShipType[];
  fleetId: string;
  fleetPower: number;
  matchStatus: 'idle' | 'searching' | 'found' | 'battle' | 'ended';
  waitStartTime: number;
  roomId: string;
  yourTeam: Team;
  battleSnapshot: BattleSnapshot | null;
  battleResult: BattleEndPayload | null;
  commandTarget: string | null;

  setPlayerId: (id: string) => void;
  addShip: (type: ShipType) => void;
  removeShip: (index: number) => void;
  clearFleet: () => void;
  setFleetId: (id: string) => void;
  setMatchStatus: (status: 'idle' | 'searching' | 'found' | 'battle' | 'ended') => void;
  setWaitStartTime: (time: number) => void;
  setRoomId: (id: string) => void;
  setYourTeam: (team: Team) => void;
  setBattleSnapshot: (snapshot: BattleSnapshot) => void;
  setBattleResult: (result: BattleEndPayload) => void;
  setCommandTarget: (id: string | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  playerId: `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  fleetShips: [],
  fleetId: '',
  fleetPower: 0,
  matchStatus: 'idle',
  waitStartTime: 0,
  roomId: '',
  yourTeam: 'blue',
  battleSnapshot: null,
  battleResult: null,
  commandTarget: null,

  setPlayerId: (id) => set({ playerId: id }),
  addShip: (type) => {
    const current = get().fleetShips;
    if (current.length >= MAX_FLEET_SIZE) return;
    const next = [...current, type];
    set({ fleetShips: next, fleetPower: calculatePower(next) });
  },
  removeShip: (index) => {
    const current = get().fleetShips;
    const next = current.filter((_, i) => i !== index);
    set({ fleetShips: next, fleetPower: calculatePower(next) });
  },
  clearFleet: () => set({ fleetShips: [], fleetPower: 0, fleetId: '' }),
  setFleetId: (id) => set({ fleetId: id }),
  setMatchStatus: (status) => set({ matchStatus: status }),
  setWaitStartTime: (time) => set({ waitStartTime: time }),
  setRoomId: (id) => set({ roomId: id }),
  setYourTeam: (team) => set({ yourTeam: team }),
  setBattleSnapshot: (snapshot) => set({ battleSnapshot: snapshot }),
  setBattleResult: (result) => set({ battleResult: result, matchStatus: 'ended' }),
  setCommandTarget: (id) => set({ commandTarget: id }),
  reset: () =>
    set({
      fleetShips: [],
      fleetId: '',
      fleetPower: 0,
      matchStatus: 'idle',
      waitStartTime: 0,
      roomId: '',
      yourTeam: 'blue',
      battleSnapshot: null,
      battleResult: null,
      commandTarget: null,
    }),
}));

export function getTeamTotalHp(ships: BattleShip[], team: Team): { current: number; max: number } {
  const teamShips = ships.filter((s) => s.team === team);
  return {
    current: teamShips.reduce((s, sh) => s + Math.max(0, sh.hp), 0),
    max: teamShips.reduce((s, sh) => s + sh.maxHp, 0),
  };
}
