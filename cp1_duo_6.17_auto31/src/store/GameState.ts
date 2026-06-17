import { PlayerState, MaterialData, WeaponData, UnlockData } from './models/TypeDefinitions';
import axios from 'axios';

class GameStateStore {
  private static instance: GameStateStore;
  player: PlayerState;
  unlocks: UnlockData;

  private constructor() {
    this.player = {
      hp: 100,
      maxHp: 100,
      attack: 15,
      defense: 10,
      materials: [],
      weapons: [],
      equippedWeapon: null,
      steps: 0,
    };
    this.unlocks = {
      monsterCount: 0,
      weaponCount: 0,
      unlockedAffixes: [],
      forgeSlots: 3,
    };
  }

  static getInstance(): GameStateStore {
    if (!GameStateStore.instance) {
      GameStateStore.instance = new GameStateStore();
    }
    return GameStateStore.instance;
  }

  addMaterials(materials: MaterialData[]) {
    this.player.materials.push(...materials);
  }

  removeMaterials(materialIds: string[]) {
    for (const id of materialIds) {
      const idx = this.player.materials.findIndex(m => m.id === id);
      if (idx !== -1) {
        this.player.materials.splice(idx, 1);
      }
    }
  }

  addWeapon(weapon: WeaponData) {
    this.player.weapons.push(weapon);
    if (!this.player.equippedWeapon) {
      this.player.equippedWeapon = weapon;
    }
  }

  equipWeapon(weapon: WeaponData) {
    this.player.equippedWeapon = weapon;
    this.player.attack = 15 + weapon.attack;
    this.player.defense = 10 + weapon.defense;
  }

  heal(amount: number) {
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
  }

  takeDamage(amount: number) {
    this.player.hp = Math.max(0, this.player.hp - amount);
  }

  advanceStep() {
    this.player.steps++;
  }

  async refreshUnlocks() {
    try {
      const response = await axios.get<UnlockData>('/api/collection/unlock');
      this.unlocks = response.data;
    } catch {
      this.unlocks = { monsterCount: 0, weaponCount: 0, unlockedAffixes: [], forgeSlots: 3 };
    }
  }
}

export const gameState = GameStateStore.getInstance();
