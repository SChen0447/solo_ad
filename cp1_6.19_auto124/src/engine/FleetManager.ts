import { v4 as uuidv4 } from 'uuid';
import type { Ship, ShipType, Faction, HexCoord } from '../types';
import { SHIP_CONFIGS } from '../types';

export class FleetManager {
  createFleet(faction: Faction, shipTypes: ShipType[]): Ship[] {
    return shipTypes.map((type, index) => {
      const config = SHIP_CONFIGS[type];
      return {
        id: uuidv4(),
        type,
        name: `${config.name}${this.getLetterLabel(index)}`,
        faction,
        hp: config.hp,
        maxHp: config.hp,
        attack: config.attack,
        range: config.range,
        position: null,
        isAlive: true
      };
    });
  }

  applyDamage(ship: Ship, damage: number): { isDead: boolean; remainingHp: number } {
    const newHp = Math.max(0, ship.hp - damage);
    ship.hp = newHp;
    ship.isAlive = newHp > 0;
    return {
      isDead: !ship.isAlive,
      remainingHp: newHp
    };
  }

  isFleetDestroyed(fleet: Ship[]): boolean {
    return fleet.every(ship => !ship.isAlive);
  }

  cloneFleet(fleet: Ship[]): Ship[] {
    return fleet.map(ship => ({
      ...ship,
      position: ship.position ? { ...ship.position } : null
    }));
  }

  setShipPosition(ship: Ship, position: HexCoord | null): void {
    ship.position = position;
  }

  isPositionOccupied(position: HexCoord, fleet: Ship[]): boolean {
    return fleet.some(
      ship => ship.isAlive && 
              ship.position && 
              ship.position.q === position.q && 
              ship.position.r === position.r
    );
  }

  findShipById(shipId: string, fleet: Ship[]): Ship | undefined {
    return fleet.find(ship => ship.id === shipId);
  }

  private getLetterLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }
}

export const fleetManager = new FleetManager();
