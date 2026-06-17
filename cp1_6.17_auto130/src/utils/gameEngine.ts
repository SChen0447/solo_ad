import axios from 'axios';
import {
  GameState,
  Room,
  Totem,
  ElementType,
  ClearedLine,
  SaveData,
  MAX_TOTEMS,
} from '../types';

class GameEngine {
  private state: GameState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = {
      playerPos: { row: 0, col: 0 },
      totems: [],
      resources: { wood: 0, ore: 0, crystal: 0 },
      rooms: {},
      clearedRooms: [],
      clearedLines: [],
      seed: 0,
      selectedTotemId: null,
      isAnimating: false,
      showSaveMenu: false,
      currentView: 'menu',
    };
  }

  getState(): GameState {
    return { ...this.state };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  private setState(updates: Partial<GameState>): void {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  async initializeGame(seed?: number): Promise<void> {
    try {
      const response = await axios.post('/api/rooms/seed', { seed });
      const { seed: gameSeed, rooms } = response.data;

      const convertedRooms: Record<string, Room> = {};
      Object.keys(rooms).forEach((key) => {
        const r = rooms[key];
        convertedRooms[key] = {
          id: r.id,
          row: r.row,
          col: r.col,
          totemSequence: r.totem_sequence,
          clueColors: r.clue_colors,
          resources: r.resources.map((res: any) => ({
            id: res.id,
            type: res.type,
            x: res.x,
            y: res.y,
            collected: res.collected,
          })),
          cleared: r.cleared,
          doorOpen: r.door_open,
          activationSlots: r.activation_slots,
          activationIndex: r.activation_index,
        };
      });

      const initialTotems: Totem[] = [
        { id: 'totem_1', type: 'fire', level: 1, exp: 0 },
        { id: 'totem_2', type: 'water', level: 1, exp: 0 },
        { id: 'totem_3', type: 'earth', level: 1, exp: 0 },
        { id: 'totem_4', type: 'wind', level: 1, exp: 0 },
      ];

      this.setState({
        seed: gameSeed,
        rooms: convertedRooms,
        playerPos: { row: 0, col: 0 },
        totems: initialTotems,
        resources: { wood: 5, ore: 3, crystal: 2 },
        clearedRooms: [],
        clearedLines: [],
        currentView: 'game',
      });
    } catch (error) {
      console.error('Failed to initialize game:', error);
    }
  }

  movePlayer(direction: 'up' | 'down' | 'left' | 'right'): boolean {
    const { row, col } = this.state.playerPos;
    let newRow = row;
    let newCol = col;

    switch (direction) {
      case 'up':
        newRow = Math.max(0, row - 1);
        break;
      case 'down':
        newRow = Math.min(2, row + 1);
        break;
      case 'left':
        newCol = Math.max(0, col - 1);
        break;
      case 'right':
        newCol = Math.min(2, col + 1);
        break;
    }

    if (newRow === row && newCol === col) return false;

    const currentRoomId = `${row}_${col}`;
    const currentRoom = this.state.rooms[currentRoomId];

    if (currentRoom && !currentRoom.doorOpen && currentRoomId !== '0_0') {
      if (this.isAdjacent(row, col, newRow, newCol)) {
        return false;
      }
    }

    this.setState({
      playerPos: { row: newRow, col: newCol },
    });

    return true;
  }

  private isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  getCurrentRoom(): Room | null {
    const { row, col } = this.state.playerPos;
    const roomId = `${row}_${col}`;
    return this.state.rooms[roomId] || null;
  }

  selectTotem(totemId: string | null): void {
    this.setState({ selectedTotemId: totemId });
  }

  async activateTotem(totemId: string): Promise<{ success: boolean; complete: boolean }> {
    const currentRoom = this.getCurrentRoom();
    const totem = this.state.totems.find((t) => t.id === totemId);

    if (!currentRoom || !totem || currentRoom.cleared) {
      return { success: false, complete: false };
    }

    const { activationIndex, activationSlots, totemSequence } = currentRoom;

    if (activationIndex >= totemSequence.length) {
      return { success: false, complete: false };
    }

    const expectedElement = totemSequence[activationIndex];
    const isCorrect: boolean = totem.type === expectedElement || !!(totem.isRare && totem.elements?.includes(expectedElement));

    const newSlots = [...activationSlots];
    newSlots[activationIndex] = isCorrect ? (totem.type as ElementType) : null;

    const updatedRoom = {
      ...currentRoom,
      activationSlots: newSlots,
      activationIndex: isCorrect ? activationIndex + 1 : 0,
    };

    if (!isCorrect) {
      updatedRoom.activationSlots = new Array(totemSequence.length).fill(null);
    }

    const isComplete = isCorrect && activationIndex + 1 >= totemSequence.length;

    if (isComplete) {
      updatedRoom.cleared = true;
      updatedRoom.doorOpen = true;

      const newClearedRooms = [...this.state.clearedRooms, currentRoom.id];

      try {
        const allRooms = { ...this.state.rooms, [currentRoom.id]: updatedRoom };
        const lineResponse = await axios.post('/api/lines/check', { rooms: this.serializeRooms(allRooms) });
        const clearedLines: ClearedLine[] = lineResponse.data.cleared_lines.map((line: any) => ({
          type: line.type,
          index: line.index,
          rooms: line.rooms,
        }));

        const newLines = clearedLines.filter(
          (nl) => !this.state.clearedLines.some(
            (el) => el.type === nl.type && el.index === nl.index
          )
        );

        if (newLines.length > 0) {
          const fusionElements = this.getFusionElements(newLines[0]);
          if (fusionElements && this.state.totems.length < MAX_TOTEMS) {
            try {
              const fusionResponse = await axios.post('/api/fusion/generate', { elements: fusionElements });
              const newTotem = {
                ...fusionResponse.data.totem,
                isRare: fusionResponse.data.totem.is_rare,
              };
              this.setState({
                totems: [...this.state.totems, newTotem],
              });
            } catch (e) {
              console.error('Failed to generate fusion totem:', e);
            }
          }
        }

        this.setState({
          rooms: allRooms,
          clearedRooms: newClearedRooms,
          clearedLines: [...this.state.clearedLines, ...newLines],
        });
      } catch (e) {
        console.error('Failed to check lines:', e);
        this.setState({
          rooms: { ...this.state.rooms, [currentRoom.id]: updatedRoom },
          clearedRooms: newClearedRooms,
        });
      }
    } else {
      this.setState({
        rooms: { ...this.state.rooms, [currentRoom.id]: updatedRoom },
      });
    }

    if (isCorrect && totem.exp !== undefined) {
      const updatedTotems = this.state.totems.map((t) => {
        if (t.id === totemId) {
          const newExp = (t.exp || 0) + 10;
          const expToLevel = t.level * 50;
          if (newExp >= expToLevel) {
            return { ...t, level: t.level + 1, exp: newExp - expToLevel };
          }
          return { ...t, exp: newExp };
        }
        return t;
      });
      this.setState({ totems: updatedTotems });
    }

    return { success: isCorrect, complete: isComplete };
  }

  private getFusionElements(line: ClearedLine): ElementType[] | null {
    const roomIds = line.rooms;
    const elements = new Set<ElementType>();

    for (const roomId of roomIds) {
      const room = this.state.rooms[roomId];
      if (room?.totemSequence?.[0]) {
        elements.add(room.totemSequence[0]);
      }
    }

    const uniqueElements = Array.from(elements);
    if (uniqueElements.length >= 2) {
      return uniqueElements.slice(0, 2) as ElementType[];
    }

    return ['fire', 'water'];
  }

  private serializeRooms(rooms: Record<string, Room>): Record<string, any> {
    const result: Record<string, any> = {};
    Object.keys(rooms).forEach((key) => {
      const r = rooms[key];
      result[key] = {
        id: r.id,
        row: r.row,
        col: r.col,
        totem_sequence: r.totemSequence,
        clue_colors: r.clueColors,
        resources: r.resources,
        cleared: r.cleared,
        door_open: r.doorOpen,
        activation_slots: r.activationSlots,
        activation_index: r.activationIndex,
      };
    });
    return result;
  }

  collectResource(resourceId: string): boolean {
    const currentRoom = this.getCurrentRoom();
    if (!currentRoom) return false;

    const resource = currentRoom.resources.find((r) => r.id === resourceId);
    if (!resource || resource.collected) return false;

    const updatedResources = { ...this.state.resources };
    updatedResources[resource.type] += 1;

    const updatedRoomResources = currentRoom.resources.map((r) =>
      r.id === resourceId ? { ...r, collected: true } : r
    );

    const updatedRoom = { ...currentRoom, resources: updatedRoomResources };

    this.setState({
      resources: updatedResources,
      rooms: { ...this.state.rooms, [currentRoom.id]: updatedRoom },
    });

    return true;
  }

  reorderTotems(fromIndex: number, toIndex: number): void {
    const totems = [...this.state.totems];
    const [removed] = totems.splice(fromIndex, 1);
    totems.splice(toIndex, 0, removed);
    this.setState({ totems });
  }

  async saveGame(slot: number): Promise<boolean> {
    try {
      const saveData = {
        slot,
        player_pos: this.state.playerPos,
        totems: this.state.totems,
        resources: this.state.resources,
        cleared_rooms: this.state.clearedRooms,
        room_config: this.serializeRooms(this.state.rooms),
        seed: this.state.seed,
      };

      await axios.post('/api/save', saveData);
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  async loadSaves(): Promise<SaveData[]> {
    try {
      const response = await axios.get('/api/load');
      return response.data.saves.map((save: any) => ({
        ...save,
        updatedAt: save.updated_at,
        clearedRooms: save.cleared_rooms,
        roomConfig: save.room_config,
      }));
    } catch (error) {
      console.error('Failed to load saves:', error);
      return [];
    }
  }

  async loadGame(slot: number): Promise<boolean> {
    try {
      const response = await axios.get(`/api/load/${slot}`);
      const save = response.data.save;

      const convertedRooms: Record<string, Room> = {};
      const roomConfig = save.room_config || {};
      Object.keys(roomConfig).forEach((key) => {
        const r = roomConfig[key];
        convertedRooms[key] = {
          id: r.id,
          row: r.row,
          col: r.col,
          totemSequence: r.totem_sequence || r.totemSequence,
          clueColors: r.clue_colors || r.clueColors,
          resources: (r.resources || []).map((res: any) => ({
            id: res.id,
            type: res.type,
            x: res.x,
            y: res.y,
            collected: res.collected,
          })),
          cleared: r.cleared,
          doorOpen: r.door_open || r.doorOpen,
          activationSlots: r.activation_slots || r.activationSlots,
          activationIndex: r.activation_index || r.activationIndex,
        };
      });

      this.setState({
        playerPos: save.player_pos || save.playerPos,
        totems: save.totems,
        resources: save.resources,
        clearedRooms: save.cleared_rooms || save.clearedRooms,
        rooms: convertedRooms,
        seed: save.seed,
        currentView: 'game',
        selectedTotemId: null,
      });

      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }

  setView(view: 'menu' | 'game' | 'saves'): void {
    this.setState({ currentView: view });
  }

  setShowSaveMenu(show: boolean): void {
    this.setState({ showSaveMenu: show });
  }
}

export const gameEngine = new GameEngine();
