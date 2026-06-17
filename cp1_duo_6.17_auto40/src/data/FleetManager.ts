import axios from 'axios';

export interface ShipData {
  id: string;
  name: string;
  stars: number;
  maxHull: number;
  hull: number;
  firepower: number;
  speed: number;
  x: number;
  y: number;
  faction: string;
  status: 'idle' | 'moving' | 'battle' | 'patrol';
  path: { id: string; x: number; y: number; type: string; name: string }[];
  path_index: number;
  mission_type: string | null;
  alive: boolean;
}

export interface StarSystem {
  id: string;
  name: string;
  type: 'home' | 'mining' | 'outpost';
  x: number;
  y: number;
  connections: string[];
}

type SortKey = 'stars' | 'hull' | 'firepower';

class FleetManager {
  private ships: ShipData[] = [];
  private enemyShips: ShipData[] = [];
  private starSystems: StarSystem[] = [];
  private selectedShipId: string | null = null;
  private listeners: (() => void)[] = [];

  getShips(): ShipData[] {
    return [...this.ships];
  }

  getEnemyShips(): ShipData[] {
    return [...this.enemyShips];
  }

  getStarSystems(): StarSystem[] {
    return [...this.starSystems];
  }

  getSelectedShip(): ShipData | null {
    return this.ships.find(s => s.id === this.selectedShipId) || null;
  }

  setSelectedShip(id: string | null): void {
    this.selectedShipId = id;
    this.notifyListeners();
  }

  sortBy(key: SortKey): ShipData[] {
    const sorted = [...this.ships];
    if (key === 'stars') {
      sorted.sort((a, b) => b.stars - a.stars);
    } else if (key === 'hull') {
      sorted.sort((a, b) => b.hull - a.hull);
    } else if (key === 'firepower') {
      sorted.sort((a, b) => b.firepower - a.firepower);
    }
    return sorted;
  }

  async initFleet(): Promise<void> {
    try {
      const response = await axios.post('/api/init_fleet');
      this.ships = response.data.fleet;
      this.enemyShips = response.data.enemyFleet;
      this.starSystems = response.data.starSystems;
      this.notifyListeners();
    } catch (err) {
      console.error('Failed to init fleet:', err);
      throw err;
    }
  }

  async queryStatus(): Promise<void> {
    try {
      const response = await axios.get('/api/query_status');
      this.ships = response.data.fleet;
      this.enemyShips = response.data.enemyFleet;
      this.notifyListeners();
    } catch (err) {
      console.error('Failed to query status:', err);
    }
  }

  async assignMission(
    shipId: string,
    missionType: string,
    targetSystemId: string,
    path: StarSystem[]
  ): Promise<void> {
    try {
      await axios.post('/api/assign_mission', {
        ship_id: shipId,
        mission_type: missionType,
        target_system_id: targetSystemId,
        path
      });
    } catch (err) {
      console.error('Failed to assign mission:', err);
      throw err;
    }
  }

  async findPath(startId: string, endId: string): Promise<StarSystem[]> {
    try {
      const response = await axios.post('/api/find_path', {
        start_id: startId,
        end_id: endId
      });
      return response.data.path;
    } catch (err) {
      console.error('Failed to find path:', err);
      return [];
    }
  }

  subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => cb());
  }

  findNearestSystem(x: number, y: number): StarSystem | null {
    if (this.starSystems.length === 0) return null;
    let nearest = this.starSystems[0];
    let minDist = Infinity;
    for (const sys of this.starSystems) {
      const dist = Math.sqrt((sys.x - x) ** 2 + (sys.y - y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = sys;
      }
    }
    return nearest;
  }
}

export const fleetManager = new FleetManager();
