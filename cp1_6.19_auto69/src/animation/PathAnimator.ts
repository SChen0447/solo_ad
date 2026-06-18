import * as THREE from 'three';
import { eventBus, NodeData, ConnectionData } from '../core/EventBus';

type TrailPoint = {
  position: THREE.Vector3;
  startTime: number;
  opacity: number;
};

type PathSegment = {
  nodeAId: string;
  nodeBId: string;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  length: number;
};

export class PathAnimator {
  private scene: THREE.Scene;

  private ball: THREE.Mesh | null = null;
  private ballGlow: THREE.Mesh | null = null;
  private ballGroup: THREE.Group;

  private isPlaying: boolean = false;
  private speed: number = 1;
  private baseSpeed: number = 2;

  private nodes: Map<string, THREE.Vector3> = new Map();
  private connections: Map<string, { nodeAId: string; nodeBId: string; distance: number }> =
    new Map();

  private pathSegments: PathSegment[] = [];
  private currentSegmentIndex: number = 0;
  private currentSegmentProgress: number = 0;
  private lastVisitedNodeId: string | null = null;
  private visitedNodes: Set<string> = new Set();

  private trail: TrailPoint[] = [];
  private trailMesh: THREE.Points | null = null;
  private readonly TRAIL_DURATION = 500;
  private readonly TRAIL_MAX_POINTS = 80;

  private selectedStartNodeId: string | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.ballGroup = new THREE.Group();
    this.ballGroup.visible = false;
    this.scene.add(this.ballGroup);

    this.createBall();
    this.createTrail();

    eventBus.on('ui:play-toggle', () => this.togglePlay());
    eventBus.on('ui:speed-change', (data) => {
      this.speed = (data as { speed: number }).speed;
    });
    eventBus.on('ui:select-start-node', (data) => {
      this.selectedStartNodeId = (data as { id: string | null }).id;
      if (!this.isPlaying) {
        this.resetToStart();
      }
    });
  }

  public init(): void {
    // nothing
  }

  private createBall(): void {
    const coreGeo = new THREE.SphereGeometry(0.08, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1
    });
    this.ball = new THREE.Mesh(coreGeo, coreMat);
    this.ballGroup.add(this.ball);

    const glowGeo = new THREE.SphereGeometry(0.2, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        viewVector: { value: new THREE.Vector3() }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.65 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float intensity;
        void main() {
          vec3 color = vec3(0.9, 0.95, 1.0) * intensity;
          gl_FragColor = vec4(color, intensity * 0.85);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    this.ballGlow = new THREE.Mesh(glowGeo, glowMat);
    this.ballGroup.add(this.ballGlow);
  }

  private createTrail(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.TRAIL_MAX_POINTS * 3);
    const colors = new Float32Array(this.TRAIL_MAX_POINTS * 3);
    const opacities = new Float32Array(this.TRAIL_MAX_POINTS);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    geometry.setDrawRange(0, 0);

    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute vec3 color;
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 12.0 * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * vOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    this.trailMesh = new THREE.Points(geometry, material);
    this.scene.add(this.trailMesh);
  }

  public onNodeCreated(data: unknown): void {
    const nd = data as NodeData;
    this.nodes.set(
      nd.id,
      new THREE.Vector3(nd.position.x, nd.position.y, nd.position.z)
    );
    if (!this.selectedStartNodeId) {
      this.selectedStartNodeId = nd.id;
      this.resetToStart();
    }
  }

  public onNodeDeleted(data: unknown): void {
    const { id } = data as { id: string };
    this.nodes.delete(id);
    if (this.selectedStartNodeId === id) {
      this.selectedStartNodeId = this.nodes.size > 0 ? (this.nodes.keys().next().value as string) : null;
      this.resetToStart();
    }
    if (this.lastVisitedNodeId === id) {
      this.lastVisitedNodeId = null;
    }
    this.visitedNodes.delete(id);

    const toRemove: string[] = [];
    this.connections.forEach((conn, key) => {
      if (conn.nodeAId === id || conn.nodeBId === id) {
        toRemove.push(key);
      }
    });
    toRemove.forEach((k) => this.connections.delete(k));
    this.rebuildPath();
  }

  public onConnectionCreated(data: unknown): void {
    const cd = data as ConnectionData;
    this.connections.set(cd.id, {
      nodeAId: cd.nodeAId,
      nodeBId: cd.nodeBId,
      distance: cd.distance
    });
    this.rebuildPath();
  }

  private rebuildPath(): void {
    this.pathSegments = [];
    this.visitedNodes.clear();
    this.currentSegmentIndex = 0;
    this.currentSegmentProgress = 0;

    const nodeIds = Array.from(this.nodes.keys());
    if (nodeIds.length < 2) return;

    const startId = this.selectedStartNodeId || nodeIds[0];
    const visited = new Set<string>();
    const queue: string[] = [startId];
    const segmentQueue: PathSegment[] = [];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      this.connections.forEach((conn) => {
        let otherId: string | null = null;
        if (conn.nodeAId === currentId) otherId = conn.nodeBId;
        else if (conn.nodeBId === currentId) otherId = conn.nodeAId;

        if (otherId && !visited.has(otherId) && this.nodes.has(otherId)) {
          const posA = this.nodes.get(currentId)!;
          const posB = this.nodes.get(otherId)!;
          segmentQueue.push({
            nodeAId: currentId,
            nodeBId: otherId,
            startPos: posA.clone(),
            endPos: posB.clone(),
            length: posA.distanceTo(posB)
          });
          if (!queue.includes(otherId)) queue.push(otherId);
        }
      });
    }

    this.pathSegments = segmentQueue;
  }

  private resetToStart(): void {
    this.currentSegmentIndex = 0;
    this.currentSegmentProgress = 0;
    this.visitedNodes.clear();
    this.lastVisitedNodeId = null;
    this.trail = [];
    this.updateTrailGeometry();

    if (this.pathSegments.length > 0) {
      const startPos = this.pathSegments[0].startPos;
      this.ballGroup.position.copy(startPos);
      this.ballGroup.visible = true;
    } else if (this.selectedStartNodeId && this.nodes.has(this.selectedStartNodeId)) {
      this.ballGroup.position.copy(this.nodes.get(this.selectedStartNodeId)!);
      this.ballGroup.visible = true;
    } else {
      this.ballGroup.visible = false;
    }
  }

  private togglePlay(): void {
    if (this.isPlaying) {
      this.isPlaying = false;
    } else {
      if (this.pathSegments.length === 0) {
        this.rebuildPath();
      }
      if (this.pathSegments.length > 0) {
        if (this.currentSegmentIndex >= this.pathSegments.length) {
          this.resetToStart();
        }
        this.isPlaying = true;
        this.ballGroup.visible = true;
      }
    }
    eventBus.emit('anim:state-changed', { isPlaying: this.isPlaying });
  }

  public update(): void {
    const now = performance.now();

    if (this.ballGlow && this.ballGlow.material instanceof THREE.ShaderMaterial) {
      this.ballGlow.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(
        new THREE.Vector3(
          (this.scene as unknown as { userData: { camera?: THREE.Camera } }).userData.camera?.position.x || 0,
          (this.scene as unknown as { userData: { camera?: THREE.Camera } }).userData.camera?.position.y || 5,
          (this.scene as unknown as { userData: { camera?: THREE.Camera } }).userData.camera?.position.z || 0
        ),
        this.ballGroup.getWorldPosition(new THREE.Vector3())
      );
    }

    if (this.isPlaying && this.pathSegments.length > 0) {
      const dt = 1 / 60;
      const currentSegment = this.pathSegments[this.currentSegmentIndex];

      if (currentSegment) {
        const distanceToTravel = this.baseSpeed * this.speed * dt;
        let remainingDistance = distanceToTravel;

        while (remainingDistance > 0 && this.currentSegmentIndex < this.pathSegments.length) {
          const seg = this.pathSegments[this.currentSegmentIndex];
          const segRemaining = (1 - this.currentSegmentProgress) * seg.length;

          if (remainingDistance < segRemaining) {
            this.currentSegmentProgress += remainingDistance / seg.length;
            remainingDistance = 0;
          } else {
            remainingDistance -= segRemaining;
            this.currentSegmentProgress = 0;

            if (this.lastVisitedNodeId !== seg.nodeBId) {
              eventBus.emit('node:flash', { id: seg.nodeBId });
              this.lastVisitedNodeId = seg.nodeBId;
              this.visitedNodes.add(seg.nodeBId);
            }

            this.currentSegmentIndex++;

            if (this.currentSegmentIndex >= this.pathSegments.length) {
              this.currentSegmentIndex = 0;
              this.currentSegmentProgress = 0;
              this.visitedNodes.clear();
              if (this.selectedStartNodeId && this.nodes.has(this.selectedStartNodeId)) {
                const firstSegWithStart = this.pathSegments.find(
                  (s) => s.nodeAId === this.selectedStartNodeId
                );
                if (firstSegWithStart) {
                  this.currentSegmentIndex = this.pathSegments.indexOf(firstSegWithStart);
                }
              }
              this.lastVisitedNodeId = null;
              break;
            }
          }
        }

        const activeSeg = this.pathSegments[this.currentSegmentIndex];
        if (activeSeg) {
          const pos = new THREE.Vector3().lerpVectors(
            activeSeg.startPos,
            activeSeg.endPos,
            this.currentSegmentProgress
          );
          this.ballGroup.position.copy(pos);
          this.ballGroup.visible = true;

          this.trail.push({
            position: pos.clone(),
            startTime: now,
            opacity: 1
          });
        }
      }
    }

    this.trail = this.trail.filter((p) => {
      const age = now - p.startTime;
      return age < this.TRAIL_DURATION;
    });
    if (this.trail.length > this.TRAIL_MAX_POINTS) {
      this.trail = this.trail.slice(this.trail.length - this.TRAIL_MAX_POINTS);
    }
    this.updateTrailGeometry(now);
  }

  private updateTrailGeometry(now: number = performance.now()): void {
    if (!this.trailMesh) return;
    const geometry = this.trailMesh.geometry as THREE.BufferGeometry;
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const colors = geometry.attributes.color as THREE.BufferAttribute;
    const opacities = geometry.attributes.opacity as THREE.BufferAttribute;

    const count = this.trail.length;
    for (let i = 0; i < count; i++) {
      const p = this.trail[i];
      const age = now - p.startTime;
      const t = Math.min(age / this.TRAIL_DURATION, 1);
      const opacity = (1 - t) * 0.6;

      (positions.array as Float32Array)[i * 3] = p.position.x;
      (positions.array as Float32Array)[i * 3 + 1] = p.position.y;
      (positions.array as Float32Array)[i * 3 + 2] = p.position.z;

      const colorT = t;
      const r = 0.9 - colorT * 0.2;
      const g = 0.95 - colorT * 0.15;
      const b = 1.0;
      (colors.array as Float32Array)[i * 3] = r;
      (colors.array as Float32Array)[i * 3 + 1] = g;
      (colors.array as Float32Array)[i * 3 + 2] = b;

      (opacities.array as Float32Array)[i] = opacity;
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    opacities.needsUpdate = true;
    geometry.setDrawRange(0, count);
  }

  public isAnimatorPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentStartNodeId(): string | null {
    return this.selectedStartNodeId;
  }
}
