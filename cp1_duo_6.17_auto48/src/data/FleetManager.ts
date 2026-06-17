import axios from 'axios';

export interface Ship {
  id: string;
  name: string;
  stars: number;
  hp: number;
  max_hp: number;
  firepower: number;
  speed: number;
  x: number;
  y: number;
  system_id: number;
  status: 'idle' | 'moving' | 'combat' | 'destroyed';
  faction: 'player' | 'enemy';
}

export interface StarSystem {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
}

export interface Route {
  0: number;
  1: number;
}

export interface MissionInfo {
  mission_id: string;
  ship_id: string;
  mission_type: string;
  path_index: number;
  completed: boolean;
}

export interface GameData {
  fleet: Ship[];
  enemy_fleet: Ship[];
  star_systems: StarSystem[];
  routes: Route[];
  active_missions: MissionInfo[];
}

class FleetManager {
  private fleet: Ship[] = [];
  private enemyFleet: Ship[] = [];
  private starSystems: StarSystem[] = [];
  private routes: Route[] = [];
  private activeMissions: MissionInfo[] = [];
  private listeners: (() => void)[] = [];

  async initFleet(): Promise<GameData> {
    const res = await axios.post('/api/init_fleet');
    this.fleet = res.data.fleet;
    this.enemyFleet = res.data.enemy_fleet;
    this.starSystems = res.data.star_systems;
    this.routes = res.data.routes;
    this.notify();
    return res.data;
  }

  async queryStatus(): Promise<GameData> {
    const res = await axios.get('/api/query_status');
    this.fleet = res.data.fleet;
    this.enemyFleet = res.data.enemy_fleet;
    this.starSystems = res.data.star_systems;
    this.routes = res.data.routes;
    this.activeMissions = res.data.active_missions;
    this.notify();
    return res.data;
  }

  async assignMission(shipId: string, missionType: string, path: number[]): Promise<any> {
    const res = await axios.post('/api/assign_mission', {
      ship_id: shipId,
      mission_type: missionType,
      path: path,
    });
    return res.data;
  }

  async calcPath(startId: number, endId: number): Promise<number[]> {
    const res = await axios.post('/api/calc_path', {
      start_id: startId,
      end_id: endId,
    });
    return res.data.path;
  }

  getFleet(): Ship[] {
    return this.fleet;
  }

  getEnemyFleet(): Ship[] {
    return this.enemyFleet;
  }

  getStarSystems(): StarSystem[] {
    return this.starSystems;
  }

  getRoutes(): Route[] {
    return this.routes;
  }

  getActiveMissions(): MissionInfo[] {
    return this.activeMissions;
  }

  getShipById(id: string): Ship | undefined {
    return this.fleet.find(s => s.id === id) || this.enemyFleet.find(s => s.id === id);
  }

  sortByStars(): Ship[] {
    return [...this.fleet].sort((a, b) => b.stars - a.stars);
  }

  sortByHp(): Ship[] {
    return [...this.fleet].sort((a, b) => b.hp - a.hp);
  }

  sortByFirepower(): Ship[] {
    return [...this.fleet].sort((a, b) => b.firepower - a.firepower);
  }

  onChange(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }
}

export const fleetManager = new FleetManager();
