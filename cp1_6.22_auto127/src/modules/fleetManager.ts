import type { ShipType } from '../../shared/types';
import { calculatePower, SHIP_TEMPLATES, MAX_FLEET_SIZE } from '../../shared/types';

export interface FleetData {
  ships: ShipType[];
  fleetId: string;
  power: number;
}

export async function saveFleet(ships: ShipType[]): Promise<FleetData> {
  const response = await fetch('/api/fleet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ships }),
  });
  if (!response.ok) throw new Error('Failed to save fleet');
  const data = await response.json();
  return {
    ships,
    fleetId: data.fleetId,
    power: data.power,
  };
}

export function canAddShip(currentFleet: ShipType[]): boolean {
  return currentFleet.length < MAX_FLEET_SIZE;
}

export function getShipTemplate(type: ShipType) {
  return SHIP_TEMPLATES.find((t) => t.type === type)!;
}

export function getFleetPower(ships: ShipType[]): number {
  return calculatePower(ships);
}

export function getShipCount(ships: ShipType[], type: ShipType): number {
  return ships.filter((s) => s === type).length;
}
