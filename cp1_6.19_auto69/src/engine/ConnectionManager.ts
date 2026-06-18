import * as THREE from 'three';
import { eventBus, NodeData, ConnectionData } from '../core/EventBus';

type ConnectionObject = {
  id: string;
  nodeAId: string;
  nodeBId: string;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  tubeGeometry: THREE.TubeGeometry | null;
  distance: number;
  drawProgress: number;
  isDrawing: boolean;
  drawStartTime: number;
  isFading: boolean;
  fadeStartTime: number;
  baseOpacity: number;
  currentOpacity: number;
  baseColor: THREE.Color;
  isHovered: boolean;
  labelDiv: HTMLDivElement | null;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
};

export class ConnectionManager {
  private scene: THREE.Scene;
  private connections: Map<string, ConnectionObject> = new Map();
  private lastSelectedNodeId: string | null = null;
  private labelContainer: HTMLDivElement;

  private readonly MAX_CONNECTIONS = 100;
  private readonly DRAW_DURATION = 300;
  private readonly FADE_DURATION = 500;
  private readonly MIN_THICKNESS = 0.03;
  private readonly MAX_THICKNESS = 0.1;

  private nodePositions: Map<string, THREE.Vector3> = new Map();

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private hoveredConnectionId: string | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.labelContainer = document.createElement('div');
    this.labelContainer.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 5;
      overflow: hidden;
    `;
    document.body.appendChild(this.labelContainer);

    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    eventBus.on('node:moved', (data) => this.onNodeMoved(data));
  }

  public init(): void {
    // nothing to initialize here
  }

  private onMouseMove(e: MouseEvent): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      this.clearHover();
      return;
    }

    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const camera = (this.scene as unknown as { userData: { camera?: THREE.Camera } }).userData
      .camera;
    if (!camera) return;

    this.raycaster.setFromCamera(this.mouse, camera);

    const meshes: THREE.Object3D[] = [];
    this.connections.forEach((c) => {
      if (!c.isFading) meshes.push(c.mesh);
    });

    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const id = hit.object.userData.connectionId;
      if (id && id !== this.hoveredConnectionId) {
        this.setHover(id, e.clientX, e.clientY);
      } else if (id === this.hoveredConnectionId) {
        this.updateLabelPosition(id, e.clientX, e.clientY);
      }
    } else {
      this.clearHover();
    }
  }

  private setHover(id: string, clientX: number, clientY: number): void {
    this.clearHover();
    this.hoveredConnectionId = id;
    const conn = this.connections.get(id);
    if (!conn) return;
    conn.isHovered = true;
    this.updateMaterial(conn);
    this.createLabel(conn, clientX, clientY);
  }

  private updateLabelPosition(id: string, clientX: number, clientY: number): void {
    const conn = this.connections.get(id);
    if (!conn || !conn.labelDiv) return;
    conn.labelDiv.style.left = `${clientX + 12}px`;
    conn.labelDiv.style.top = `${clientY + 12}px`;
  }

  private clearHover(): void {
    if (!this.hoveredConnectionId) return;
    const conn = this.connections.get(this.hoveredConnectionId);
    if (conn) {
      conn.isHovered = false;
      this.updateMaterial(conn);
      if (conn.labelDiv) {
        conn.labelDiv.remove();
        conn.labelDiv = null;
      }
    }
    this.hoveredConnectionId = null;
  }

  private createLabel(conn: ConnectionObject, clientX: number, clientY: number): void {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      left: ${clientX + 12}px;
      top: ${clientY + 12}px;
      background: rgba(27, 32, 66, 0.95);
      border: 1px solid #48dbfb;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12px;
      color: #e0e6ff;
      pointer-events: none;
      box-shadow: 0 0 10px rgba(72, 219, 251, 0.3);
      white-space: nowrap;
      z-index: 10;
    `;
    div.textContent = `距离: ${conn.distance.toFixed(3)}`;
    this.labelContainer.appendChild(div);
    conn.labelDiv = div;
  }

  public setCamera(camera: THREE.Camera): void {
    (this.scene as unknown as { userData: { camera?: THREE.Camera } }).userData.camera = camera;
  }

  public onNodeSelected(data: unknown): void {
    const nodeData = data as NodeData;
    const pos = new THREE.Vector3(
      nodeData.position.x,
      nodeData.position.y,
      nodeData.position.z
    );
    this.nodePositions.set(nodeData.id, pos);

    if (this.lastSelectedNodeId && this.lastSelectedNodeId !== nodeData.id) {
      this.createConnection(this.lastSelectedNodeId, nodeData.id);
      this.lastSelectedNodeId = null;
    } else {
      this.lastSelectedNodeId = nodeData.id;
    }
  }

  public onNodeDeleted(data: unknown): void {
    const { id } = data as { id: string };
    this.nodePositions.delete(id);
    if (this.lastSelectedNodeId === id) {
      this.lastSelectedNodeId = null;
    }

    const toRemove: string[] = [];
    this.connections.forEach((conn, key) => {
      if (conn.nodeAId === id || conn.nodeBId === id) {
        toRemove.push(key);
      }
    });

    toRemove.forEach((connId) => this.fadeAndRemove(connId));
  }

  private onNodeMoved(data: unknown): void {
    const { id, position } = data as {
      id: string;
      position: { x: number; y: number; z: number };
    };
    const pos = new THREE.Vector3(position.x, position.y, position.z);
    this.nodePositions.set(id, pos);

    this.connections.forEach((conn) => {
      if (conn.nodeAId === id || conn.nodeBId === id) {
        this.updateConnectionGeometry(conn);
      }
    });
  }

  private createConnection(nodeAId: string, nodeBId: string): void {
    const exists = Array.from(this.connections.values()).some(
      (c) =>
        (c.nodeAId === nodeAId && c.nodeBId === nodeBId) ||
        (c.nodeAId === nodeBId && c.nodeBId === nodeAId)
    );
    if (exists) return;

    if (this.connections.size >= this.MAX_CONNECTIONS) {
      console.warn(`Maximum number of connections (${this.MAX_CONNECTIONS}) reached.`);
      return;
    }

    const posA = this.nodePositions.get(nodeAId);
    const posB = this.nodePositions.get(nodeBId);
    if (!posA || !posB) return;

    const id = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const distance = posA.distanceTo(posB);

    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });

    const direction = new THREE.Vector3().subVectors(posB, posA);
    const length = direction.length();
    const midPoint = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);

    const thickness = this.mapThickness(distance);
    const geometry = new THREE.CylinderGeometry(thickness, thickness, length, 12);
    geometry.rotateX(Math.PI / 2);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(midPoint);
    mesh.lookAt(posB);
    mesh.userData.connectionId = id;

    const color = this.getDistanceColor(distance, 0);

    const conn: ConnectionObject = {
      id,
      nodeAId,
      nodeBId,
      mesh,
      material,
      tubeGeometry: null,
      distance,
      drawProgress: 0,
      isDrawing: true,
      drawStartTime: performance.now(),
      isFading: false,
      fadeStartTime: 0,
      baseOpacity: 0.75,
      currentOpacity: 0,
      baseColor: new THREE.Color(color),
      isHovered: false,
      labelDiv: null,
      startPos: posA.clone(),
      endPos: posB.clone()
    };

    this.scene.add(mesh);
    this.connections.set(id, conn);

    const data: ConnectionData = {
      id,
      nodeAId,
      nodeBId,
      distance
    };
    eventBus.emit('connection:created', data);
  }

  private updateConnectionGeometry(conn: ConnectionObject): void {
    const posA = this.nodePositions.get(conn.nodeAId);
    const posB = this.nodePositions.get(conn.nodeBId);
    if (!posA || !posB) return;

    conn.startPos.copy(posA);
    conn.endPos.copy(posB);
    conn.distance = posA.distanceTo(posB);

    const direction = new THREE.Vector3().subVectors(posB, posA);
    const length = direction.length();
    const midPoint = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);

    conn.mesh.geometry.dispose();
    const thickness = this.mapThickness(conn.distance);
    const geometry = new THREE.CylinderGeometry(thickness, thickness, length, 12);
    geometry.rotateX(Math.PI / 2);
    conn.mesh.geometry = geometry;
    conn.mesh.position.copy(midPoint);
    conn.mesh.lookAt(posB);

    conn.baseColor = new THREE.Color(this.getDistanceColor(conn.distance, 0));
    this.updateMaterial(conn);
  }

  private mapThickness(distance: number): number {
    const d = Math.min(Math.max(distance, 0.1), 12);
    const t = (d - 0.1) / (12 - 0.1);
    return this.MIN_THICKNESS + t * (this.MAX_THICKNESS - this.MIN_THICKNESS);
  }

  private getDistanceColor(distance: number, t: number): string {
    t = Math.min(Math.max(t, 0), 1);
    if (distance < 3) {
      return this.lerpColor('#ff6b6b', '#feca57', t);
    } else if (distance < 6) {
      return this.lerpColor('#48dbfb', '#ff9ff3', t);
    } else {
      return this.lerpColor('#54a0ff', '#5f27cd', t);
    }
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    const result = new THREE.Color().lerpColors(c1, c2, t);
    return `#${result.getHexString()}`;
  }

  private updateMaterial(conn: ConnectionObject): void {
    const color = conn.isHovered
      ? conn.baseColor.clone().lerp(new THREE.Color(0xffffff), 0.3)
      : conn.baseColor;
    conn.material.color.copy(color);
    const opacity = conn.isHovered
      ? Math.min(conn.currentOpacity * 1.3 + 0.2, 1)
      : conn.currentOpacity;
    conn.material.opacity = opacity;
  }

  private fadeAndRemove(id: string): void {
    const conn = this.connections.get(id);
    if (!conn) return;
    conn.isFading = true;
    conn.fadeStartTime = performance.now();
    if (conn.isHovered && conn.labelDiv) {
      conn.labelDiv.remove();
      conn.labelDiv = null;
      conn.isHovered = false;
    }
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getAllConnectionsData(): ConnectionData[] {
    const result: ConnectionData[] = [];
    this.connections.forEach((conn) => {
      if (!conn.isFading) {
        result.push({
          id: conn.id,
          nodeAId: conn.nodeAId,
          nodeBId: conn.nodeBId,
          distance: conn.distance
        });
      }
    });
    return result;
  }

  public getConnectionPath(): Array<{ nodeAId: string; nodeBId: string }> {
    const result: Array<{ nodeAId: string; nodeBId: string }> = [];
    this.connections.forEach((conn) => {
      if (!conn.isFading && conn.drawProgress >= 1) {
        result.push({ nodeAId: conn.nodeAId, nodeBId: conn.nodeBId });
      }
    });
    return result;
  }

  public getConnectionNodePositions(
    nodeAId: string,
    nodeBId: string
  ): { start: THREE.Vector3; end: THREE.Vector3 } | null {
    const conn = Array.from(this.connections.values()).find(
      (c) =>
        !c.isFading &&
        ((c.nodeAId === nodeAId && c.nodeBId === nodeBId) ||
          (c.nodeAId === nodeBId && c.nodeBId === nodeAId))
    );
    if (!conn) return null;
    if (conn.nodeAId === nodeAId) {
      return { start: conn.startPos.clone(), end: conn.endPos.clone() };
    } else {
      return { start: conn.endPos.clone(), end: conn.startPos.clone() };
    }
  }

  public update(): void {
    const now = performance.now();

    const toDelete: string[] = [];

    this.connections.forEach((conn, id) => {
      if (conn.isDrawing) {
        const elapsed = now - conn.drawStartTime;
        const t = Math.min(elapsed / this.DRAW_DURATION, 1);
        conn.drawProgress = t;
        conn.currentOpacity = conn.baseOpacity * t;
        this.updateMaterial(conn);

        const posA = this.nodePositions.get(conn.nodeAId);
        const posB = this.nodePositions.get(conn.nodeBId);
        if (posA && posB) {
          const partialEnd = new THREE.Vector3().lerpVectors(posA, posB, t);
          const direction = new THREE.Vector3().subVectors(partialEnd, posA);
          const length = direction.length();
          if (length > 0.001) {
            const midPoint = new THREE.Vector3().addVectors(posA, partialEnd).multiplyScalar(0.5);
            const thickness = this.mapThickness(conn.distance);
            conn.mesh.geometry.dispose();
            const geometry = new THREE.CylinderGeometry(thickness, thickness, length, 12);
            geometry.rotateX(Math.PI / 2);
            conn.mesh.geometry = geometry;
            conn.mesh.position.copy(midPoint);
            conn.mesh.lookAt(partialEnd);
          }
        }

        if (t >= 1) {
          conn.isDrawing = false;
          conn.drawProgress = 1;
          this.updateConnectionGeometry(conn);
        }
      }

      if (conn.isFading) {
        const elapsed = now - conn.fadeStartTime;
        const t = Math.min(elapsed / this.FADE_DURATION, 1);
        conn.currentOpacity = conn.baseOpacity * (1 - t);
        this.updateMaterial(conn);
        const s = 1 - t * 0.5;
        conn.mesh.scale.set(1, 1, s);

        if (t >= 1) {
          this.scene.remove(conn.mesh);
          conn.mesh.geometry.dispose();
          conn.material.dispose();
          if (conn.tubeGeometry) conn.tubeGeometry.dispose();
          toDelete.push(id);
        }
      }
    });

    toDelete.forEach((id) => {
      this.connections.delete(id);
      eventBus.emit('connection:deleted', { id });
    });
  }
}
