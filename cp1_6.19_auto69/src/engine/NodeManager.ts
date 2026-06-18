import * as THREE from 'three';
import { eventBus, NodeData } from '../core/EventBus';

type NodeObject = {
  id: string;
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  position: THREE.Vector3;
  color: string;
  baseScale: number;
  targetScale: number;
  flashStartTime: number | null;
  isAnimating: boolean;
  animStartTime: number;
};

export class NodeManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private nodes: Map<string, NodeObject> = new Map();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private selectedNodeId: string | null = null;
  private draggingNodeId: string | null = null;
  private dragPlane: THREE.Plane = new THREE.Plane();
  private dragOffset: THREE.Vector3 = new THREE.Vector3();

  private readonly MAX_NODES = 50;
  private readonly NODE_RADIUS = 0.15;
  private readonly DEFAULT_COLOR = '#f0e68c';
  private readonly GLOW_RADIUS = 0.3;
  private readonly ANIMATION_DURATION = 200;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }

  public init(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => this.onMouseDown(e));
    dom.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  private updateMouse(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private intersectNodes(): THREE.Intersection | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const cores: THREE.Object3D[] = [];
    this.nodes.forEach((n) => cores.push(n.coreMesh));
    const intersects = this.raycaster.intersectObjects(cores, false);
    return intersects.length > 0 ? intersects[0] : null;
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.updateMouse(e);

    const hit = this.intersectNodes();
    if (hit && hit.object.userData.nodeId) {
      const hitId = hit.object.userData.nodeId as string;
      this.draggingNodeId = hitId;
      const node = this.nodes.get(hitId)!;

      this.dragPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion),
        node.position
      );

      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
      this.dragOffset.copy(node.position).sub(intersection);

      if (this.selectedNodeId !== hitId) {
        this.selectNode(hitId);
      }
      return;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouse(e);

    if (this.draggingNodeId) {
      const node = this.nodes.get(this.draggingNodeId);
      if (!node) return;

      const intersection = new THREE.Vector3();
      this.raycaster.setFromCamera(this.mouse, this.camera);

      this.dragPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion),
        node.position
      );

      if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
        const newPos = intersection.add(this.dragOffset);
        node.position.copy(newPos);
        node.group.position.copy(newPos);
        eventBus.emit('node:moved', {
          id: node.id,
          position: { x: newPos.x, y: newPos.y, z: newPos.z }
        });
      }
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.updateMouse(e);

    if (this.draggingNodeId) {
      this.draggingNodeId = null;
      return;
    }

    const target = e.target as HTMLElement;
    if (target.tagName === 'CANVAS') {
      const hit = this.intersectNodes();
      if (!hit) {
        this.createNodeAtIntersection();
      }
    }
  }

  private createNodeAtIntersection(): void {
    if (this.nodes.size >= this.MAX_NODES) {
      console.warn(`Maximum number of nodes (${this.MAX_NODES}) reached.`);
      return;
    }

    const intersectPoint = new THREE.Vector3();
    const plane = new THREE.Plane(
      new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion),
      -2
    );
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.ray.intersectPlane(plane, intersectPoint);

    this.createNode(intersectPoint, this.DEFAULT_COLOR);
  }

  private createNode(position: THREE.Vector3, color: string): void {
    const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const group = new THREE.Group();
    group.position.copy(position);
    group.scale.set(0, 0, 0);

    const coreGeo = new THREE.SphereGeometry(this.NODE_RADIUS, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.userData.nodeId = id;
    group.add(coreMesh);

    const glowGeo = new THREE.SphereGeometry(this.GLOW_RADIUS, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        viewVector: { value: this.camera.position }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.7 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float intensity;
        void main() {
          vec3 glow = color * intensity;
          gl_FragColor = vec4(glow, intensity * 0.8);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    group.add(glowMesh);

    this.scene.add(group);

    const nodeObj: NodeObject = {
      id,
      group,
      coreMesh,
      glowMesh,
      position: position.clone(),
      color,
      baseScale: 1,
      targetScale: 1,
      flashStartTime: null,
      isAnimating: true,
      animStartTime: performance.now()
    };

    this.nodes.set(id, nodeObj);
    this.selectNode(id);

    const data: NodeData = {
      id,
      position: { x: position.x, y: position.y, z: position.z },
      color
    };
    eventBus.emit('node:created', data);
    eventBus.emit('nodelist:update', this.getAllNodesData());
  }

  private selectNode(id: string): void {
    this.selectedNodeId = id;
    const data: NodeData = {
      id,
      position: {
        x: this.nodes.get(id)!.position.x,
        y: this.nodes.get(id)!.position.y,
        z: this.nodes.get(id)!.position.z
      },
      color: this.nodes.get(id)!.color
    };
    eventBus.emit('node:selected', data);
  }

  public deleteNodeById(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;

    this.scene.remove(node.group);
    node.coreMesh.geometry.dispose();
    (node.coreMesh.material as THREE.Material).dispose();
    node.glowMesh.geometry.dispose();
    (node.glowMesh.material as THREE.Material).dispose();

    this.nodes.delete(id);

    if (this.selectedNodeId === id) {
      this.selectedNodeId = null;
    }

    eventBus.emit('node:deleted', { id });
    eventBus.emit('nodelist:update', this.getAllNodesData());
  }

  public flashNode(data: unknown): void {
    const { id } = data as { id: string };
    const node = this.nodes.get(id);
    if (!node) return;
    node.flashStartTime = performance.now();
    node.targetScale = 1.3;
  }

  public getNodePosition(id: string): THREE.Vector3 | null {
    const node = this.nodes.get(id);
    return node ? node.position.clone() : null;
  }

  public getNodeCount(): number {
    return this.nodes.size;
  }

  public getAllNodesData(): NodeData[] {
    const result: NodeData[] = [];
    this.nodes.forEach((node) => {
      result.push({
        id: node.id,
        position: {
          x: node.position.x,
          y: node.position.y,
          z: node.position.z
        },
        color: node.color
      });
    });
    return result;
  }

  public getNodeIds(): string[] {
    return Array.from(this.nodes.keys());
  }

  public update(): void {
    const now = performance.now();

    this.nodes.forEach((node) => {
      if (node.isAnimating) {
        const elapsed = now - node.animStartTime;
        const t = Math.min(elapsed / this.ANIMATION_DURATION, 1);
        const elasticT = this.elasticOut(t);
        const s = elasticT;
        node.group.scale.set(s, s, s);
        if (t >= 1) {
          node.isAnimating = false;
          node.group.scale.set(1, 1, 1);
        }
      }

      if (node.flashStartTime !== null) {
        const elapsed = now - node.flashStartTime;
        const duration = 400;
        const t = Math.min(elapsed / duration, 1);
        const pulse = 1 + 0.3 * Math.sin(t * Math.PI);
        const s = pulse;
        node.group.scale.set(s, s, s);
        if (t >= 1) {
          node.flashStartTime = null;
          node.group.scale.set(1, 1, 1);
        }
      }

      if (node.glowMesh.material instanceof THREE.ShaderMaterial) {
        node.glowMesh.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(
          this.camera.position,
          node.glowMesh.getWorldPosition(new THREE.Vector3())
        );
      }
    });
  }

  private elasticOut(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
}
