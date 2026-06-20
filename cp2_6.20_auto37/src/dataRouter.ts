import * as d3 from 'd3';
import type { TopologyData, TopologyNode, RoutingState, RoutingSpeed } from './types';

const SPEED_MAP: Record<RoutingSpeed, number> = {
  slow: 1.5,
  medium: 3,
  fast: 6,
};

export class DataRouter {
  private topologyData: TopologyData;
  private adjacencyList: Map<number, number[]> = new Map();
  private routingState: RoutingState = {
    isActive: false,
    currentNodeIndex: 0,
    path: [],
    progress: 0,
    packetPosition: { x: 0, y: 0, z: 0 },
  };
  private speed: number = SPEED_MAP.medium;
  private highlightedEdges: Set<string> = new Set();
  private edgeHighlightTimers: Map<string, number> = new Map();

  constructor(topologyData: TopologyData) {
    this.topologyData = topologyData;
    this.buildAdjacencyList();
  }

  private buildAdjacencyList(): void {
    this.adjacencyList.clear();
    for (const node of this.topologyData.nodes) {
      this.adjacencyList.set(node.id, []);
    }
    for (const edge of this.topologyData.edges) {
      this.adjacencyList.get(edge.source)?.push(edge.target);
      this.adjacencyList.get(edge.target)?.push(edge.source);
    }
  }

  public setTopology(data: TopologyData): void {
    this.topologyData = data;
    this.buildAdjacencyList();
    this.stopRouting();
  }

  public setSpeed(speed: RoutingSpeed): void {
    this.speed = SPEED_MAP[speed];
  }

  public calculateShortestPath(start: number, end: number): number[] {
    if (start === end) return [start];

    const distances: Map<number, number> = new Map();
    const previous: Map<number, number | null> = new Map();
    const queue: number[] = [];

    for (const node of this.topologyData.nodes) {
      distances.set(node.id, Infinity);
      previous.set(node.id, null);
    }
    distances.set(start, 0);
    queue.push(start);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === end) break;

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        const alt = distances.get(current)! + 1;
        if (alt < distances.get(neighbor)!) {
          distances.set(neighbor, alt);
          previous.set(neighbor, current);
          queue.push(neighbor);
        }
      }
    }

    const path: number[] = [];
    let current: number | null = end;
    while (current !== null) {
      path.unshift(current);
      current = previous.get(current) ?? null;
    }

    return path[0] === start ? path : [];
  }

  public startRouting(startNode: number, endNode: number): boolean {
    const path = this.calculateShortestPath(startNode, endNode);
    if (path.length < 2) return false;

    this.routingState = {
      isActive: true,
      currentNodeIndex: 0,
      path,
      progress: 0,
      packetPosition: { ...this.getNodePosition(startNode) },
    };
    this.highlightedEdges.clear();
    this.edgeHighlightTimers.clear();
    return true;
  }

  public stopRouting(): void {
    this.routingState.isActive = false;
    this.routingState.path = [];
    this.highlightedEdges.clear();
    this.edgeHighlightTimers.clear();
  }

  public getRoutingState(): RoutingState {
    return { ...this.routingState };
  }

  public isEdgeHighlighted(source: number, target: number): boolean {
    const key1 = `${source}-${target}`;
    const key2 = `${target}-${source}`;
    return this.highlightedEdges.has(key1) || this.highlightedEdges.has(key2);
  }

  public update(deltaTime: number): void {
    if (!this.routingState.isActive || this.routingState.path.length < 2) return;

    const path = this.routingState.path;
    const currentIndex = this.routingState.currentNodeIndex;

    if (currentIndex >= path.length - 1) {
      this.routingState.isActive = false;
      return;
    }

    const fromNode = this.getNodePosition(path[currentIndex]);
    const toNode = this.getNodePosition(path[currentIndex + 1]);

    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const dz = toNode.z - fromNode.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance === 0) {
      this.routingState.currentNodeIndex++;
      return;
    }

    const moveAmount = (this.speed * deltaTime) / distance;
    this.routingState.progress += moveAmount;

    if (this.routingState.progress >= 1) {
      this.routingState.progress = 0;
      this.routingState.currentNodeIndex++;

      if (currentIndex < path.length - 1) {
        const edgeKey = `${path[currentIndex]}-${path[currentIndex + 1]}`;
        this.highlightedEdges.add(edgeKey);
        setTimeout(() => {
          this.highlightedEdges.delete(edgeKey);
        }, 200);
      }

      if (this.routingState.currentNodeIndex >= path.length - 1) {
        this.routingState.isActive = false;
        const lastPos = this.getNodePosition(path[path.length - 1]);
        this.routingState.packetPosition = { ...lastPos };
        return;
      }
    }

    const t = this.routingState.progress;
    const fromPos = this.getNodePosition(path[this.routingState.currentNodeIndex]);
    const toPos = this.getNodePosition(path[this.routingState.currentNodeIndex + 1]);

    this.routingState.packetPosition = {
      x: fromPos.x + (toPos.x - fromPos.x) * t,
      y: fromPos.y + (toPos.y - fromPos.y) * t + Math.sin(t * Math.PI) * 0.5,
      z: fromPos.z + (toPos.z - fromPos.z) * t,
    };
  }

  private getNodePosition(nodeId: number): { x: number; y: number; z: number } {
    const node = this.topologyData.nodes.find((n) => n.id === nodeId);
    return node?.position || { x: 0, y: 0, z: 0 };
  }

  public getPacketPosition(): { x: number; y: number; z: number } {
    return { ...this.routingState.packetPosition };
  }

  public isRoutingActive(): boolean {
    return this.routingState.isActive;
  }
}
