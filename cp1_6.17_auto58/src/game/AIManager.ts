import axios from 'axios';
import type { AIAgent, AIState, Door, MapData, Vec2 } from '../types';

export class AIManager {
  private ais: AIAgent[] = [];

  getAgents(): AIAgent[] {
    return this.ais;
  }

  updateFromServer(serverAis: any[]): void {
    this.ais = serverAis.map(sa => ({
      id: sa.id,
      x: sa.x,
      y: sa.y,
      prevX: this.ais.find(a => a.id === sa.id)?.x ?? sa.x,
      prevY: this.ais.find(a => a.id === sa.id)?.y ?? sa.y,
      state: (sa.state as AIState),
      patrolPoints: sa.patrolPoints || [],
      patrolIndex: sa.patrolIndex || 0,
      path: sa.path || [],
      target: sa.target,
      alertTimer: sa.alertTimer || 0,
      showAlert: 0,
      facing: sa.facing || 0,
    }));
  }

  static async updateServer(
    player: Vec2,
    doors: Door[],
    dt: number
  ): Promise<{ ais: any[]; events: any[] }> {
    try {
      const res = await axios.post('/api/ai/update', {
        player,
        doors,
        dt,
      });
      return res.data;
    } catch (e) {
      console.error('AI update failed:', e);
      return { ais: [], events: [] };
    }
  }

  static async generateMap(): Promise<MapData> {
    const res = await axios.post('/api/map/generate');
    return res.data;
  }

  static async updateDoor(door: Door): Promise<Door> {
    const res = await axios.post('/api/doors/update', { door });
    return res.data.door;
  }

  static async findPath(start: Vec2, goal: Vec2, ignoreDoors = false): Promise<Vec2[]> {
    const res = await axios.post('/api/path/find', { start, goal, ignoreDoors });
    return res.data.path;
  }

  processEvents(events: any[], audioCallback: (ev: any) => void): void {
    for (const ev of events) {
      if (ev.type === 'footstep') {
        const ai = this.ais.find(a => a.id === ev.aiId);
        if (ai) {
          audioCallback({ ...ev, state: ai.state });
        }
      } else if (ev.type === 'ai_alert') {
        const ai = this.ais.find(a => a.id === ev.aiId);
        if (ai) {
          ai.showAlert = 1.0;
        }
      }
    }
  }
}
