import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { graphEngine } from './graphEngine.js';
import type { TopologyData, RiskData, HistoryRecord } from './types/index.js';

export class WebSocketManager {
  private io: Server | null = null;
  private connectedClients: Set<string> = new Set();

  init(httpServer: HTTPServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      if (graphEngine.hasProject()) {
        const topology = graphEngine.getCurrentTopology();
        const risks = graphEngine.getCurrentRisks();
        const history = graphEngine.getRecentHistory(5);

        if (topology && risks) {
          socket.emit('topology:update', {
            topology,
            risks,
            history,
          });
        }
      }

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      socket.on('topology:request', () => {
        if (graphEngine.hasProject()) {
          const topology = graphEngine.getCurrentTopology();
          const risks = graphEngine.getCurrentRisks();
          const history = graphEngine.getRecentHistory(5);

          if (topology && risks) {
            socket.emit('topology:update', {
              topology,
              risks,
              history,
            });
          }
        }
      });
    });
  }

  broadcastTopologyUpdate(data: {
    topology: TopologyData;
    risks: RiskData[];
    history: HistoryRecord[];
  }): void {
    if (this.io) {
      console.log(
        `Broadcasting topology update to ${this.connectedClients.size} clients`
      );
      this.io.emit('topology:update', data);
    }
  }

  broadcastSimulationResult(data: {
    moduleId: string;
    result: {
      affectedModules: string[];
      affectedEdges: string[];
      impactPaths: string[][];
      riskLevel: string;
    };
  }): void {
    if (this.io) {
      console.log(`Broadcasting simulation result for module: ${data.moduleId}`);
      this.io.emit('simulation:result', data);
    }
  }

  broadcastAlert(message: {
    type: 'warning' | 'error' | 'info';
    message: string;
    moduleId?: string;
  }): void {
    if (this.io) {
      this.io.emit('alert', message);
    }
  }

  getConnectedCount(): number {
    return this.connectedClients.size;
  }

  close(): void {
    if (this.io) {
      this.io.close();
      this.connectedClients.clear();
    }
  }
}

export const websocketManager = new WebSocketManager();
