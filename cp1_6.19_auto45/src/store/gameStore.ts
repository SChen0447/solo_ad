import { create } from 'zustand';
import { MapGrid } from '../ecosystem/MapGrid';
import { EcosystemManager } from '../ecosystem/EcosystemManager';
import { PlayerController } from '../collection/PlayerController';
import { Inventory } from '../collection/Inventory';
import { CultivationChamber } from '../cultivation/CultivationChamber';
import { PlayerPosition, InventorySlot, CultivationSlot, GridCellData, ColonyData } from '../types';

interface GameState {
  playerPosition: PlayerPosition;
  gridSnapshot: GridCellData[][];
  colonies: ColonyData[];
  inventorySlots: InventorySlot[];
  cultivationSlots: CultivationSlot[];
  temperature: number;
  humidity: number;
  light: number;
  selectedInventoryIndex: number | null;
  isPanelCollapsed: boolean;
  nearbyCollectibles: { x: number; y: number }[];
  lastEventMessage: string;

  init: () => void;
  movePlayer: (dx: number, dy: number) => void;
  collectAt: (x: number, y: number) => void;
  collectAtPlayer: () => void;
  setTemperature: (v: number) => void;
  setHumidity: (v: number) => void;
  setLight: (v: number) => void;
  placeSporeInSlot: (slotIndex: number) => void;
  harvestSlot: (slotIndex: number) => void;
  selectInventoryItem: (index: number | null) => void;
  togglePanel: () => void;
  refreshSnapshot: () => void;
}

const mapGrid = new MapGrid();
const ecosystemManager = new EcosystemManager(mapGrid);
const inventory = new Inventory();
const playerController = new PlayerController(mapGrid, inventory);
const cultivationChamber = new CultivationChamber();

export const useGameStore = create<GameState>((set, get) => ({
  playerPosition: playerController.getPosition(),
  gridSnapshot: mapGrid.getAllCells(),
  colonies: [],
  inventorySlots: [],
  cultivationSlots: cultivationChamber.getSlots(),
  temperature: cultivationChamber.getTemperature(),
  humidity: cultivationChamber.getHumidity(),
  light: cultivationChamber.getLight(),
  selectedInventoryIndex: null,
  isPanelCollapsed: false,
  nearbyCollectibles: [],
  lastEventMessage: '',

  init: () => {
    ecosystemManager.initialize();

    ecosystemManager.startEvolution(() => {
      get().refreshSnapshot();
    });

    cultivationChamber.setOnUpdate(() => {
      set({
        cultivationSlots: cultivationChamber.getSlots(),
        temperature: cultivationChamber.getTemperature(),
        humidity: cultivationChamber.getHumidity(),
        light: cultivationChamber.getLight(),
      });
    });

    cultivationChamber.startGrowthCycle();

    inventory.setOnChange(() => {
      set({ inventorySlots: inventory.getSlots() });
    });

    playerController.setCallbacks(
      (pos) => {
        set({
          playerPosition: pos,
          nearbyCollectibles: playerController.getNearbyCollectibles(),
        });
      },
      (speciesId) => {
        set({
          inventorySlots: inventory.getSlots(),
          lastEventMessage: `采集了${['红伞菇', '荧光菇', '鬼笔菇', '松茸菇', '灵芝菇', '鸡枞菇', '牛肝菇', '竹荪菇'][speciesId]}孢子！`,
        });
      }
    );

    playerController.startListening();

    get().refreshSnapshot();
  },

  movePlayer: (dx, dy) => {
  },

  collectAt: (x, y) => {
    const speciesId = playerController.tryCollectAt(x, y);
    if (speciesId !== null) {
      set({
        inventorySlots: inventory.getSlots(),
        nearbyCollectibles: playerController.getNearbyCollectibles(),
        lastEventMessage: `采集了${['红伞菇', '荧光菇', '鬼笔菇', '松茸菇', '灵芝菇', '鸡枞菇', '牛肝菇', '竹荪菇'][speciesId]}孢子！`,
      });
      get().refreshSnapshot();
    }
  },

  collectAtPlayer: () => {
    playerController.tryCollect();
    set({
      inventorySlots: inventory.getSlots(),
      nearbyCollectibles: playerController.getNearbyCollectibles(),
    });
    get().refreshSnapshot();
  },

  setTemperature: (v) => {
    cultivationChamber.setTemperature(v);
  },

  setHumidity: (v) => {
    cultivationChamber.setHumidity(v);
  },

  setLight: (v) => {
    cultivationChamber.setLight(v);
  },

  placeSporeInSlot: (slotIndex) => {
    const { selectedInventoryIndex, inventorySlots } = get();
    if (selectedInventoryIndex === null) return;
    const slot = inventorySlots[selectedInventoryIndex];
    if (!slot) return;

    const success = cultivationChamber.placeSpore(slotIndex, slot.speciesId);
    if (success) {
      inventory.removeSpore(slot.speciesId, 1);
      set({
        cultivationSlots: cultivationChamber.getSlots(),
        inventorySlots: inventory.getSlots(),
        selectedInventoryIndex: null,
      });
    }
  },

  harvestSlot: (slotIndex) => {
    const speciesId = cultivationChamber.harvestMushroom(slotIndex);
    if (speciesId !== null) {
      inventory.addSpore(speciesId, 3);
      set({
        cultivationSlots: cultivationChamber.getSlots(),
        inventorySlots: inventory.getSlots(),
        lastEventMessage: `收获了${['红伞菇', '荧光菇', '鬼笔菇', '松茸菇', '灵芝菇', '鸡枞菇', '牛肝菇', '竹荪菇'][speciesId]}×3！`,
      });
    }
  },

  selectInventoryItem: (index) => {
    set({ selectedInventoryIndex: index });
  },

  togglePanel: () => {
    set((s) => ({ isPanelCollapsed: !s.isPanelCollapsed }));
  },

  refreshSnapshot: () => {
    set({
      gridSnapshot: mapGrid.getAllCells(),
      colonies: ecosystemManager.getColonies(),
      nearbyCollectibles: playerController.getNearbyCollectibles(),
    });
  },
}));
