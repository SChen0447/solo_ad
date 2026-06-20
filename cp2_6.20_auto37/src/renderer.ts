import * as THREE from 'three';
import type { TopologyData, TopologyNode, SelectedNodeInfo, Particle } from './types';
import type { DataRouter } from './dataRouter';

const NODE_RADIUS = 0.3;
const EDGE_RADIUS = 0.02;
const TRANSITION_DURATION = 500;
const BOUNCE_DURATION = 300;

interface NodeObject {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  id: number;
  targetPosition: THREE.Vector3;
  isDragging: boolean;
  scale: number;
  targetScale: number;
}

interface EdgeObject {
  mesh: THREE.Mesh;
  source: number;
  target: number;
  isHighlighted: boolean;
  targetRadius: number;
  currentRadius: number;
}

export class TopologyRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private nodeObjects: Map<number, NodeObject> = new Map();
  private edgeObjects: EdgeObject[] = [];
  private particles: THREE.Points | null = null;
  private particleData: Particle[] = [];

  private dataRouter: DataRouter | null = null;
  private packetMesh: THREE.Mesh | null = null;

  private selectedNodeId: number | null = null;
  private draggedNodeId: number | null = null;
  private isDragging: boolean = false;
  private dragPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private dragOffset: THREE.Vector3 = new THREE.Vector3();

  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;

  private onNodeSelect?: (info: SelectedNodeInfo | null) => void;
  private onNodePositionChange?: (nodeId: number, position: { x: number; y: number; z: number }) => void;

  private animationFrameId: number = 0;
  private lastTime: number = 0;
  private clock: THREE.Clock = new THREE.Clock();

  private cameraAngle: number = 0;
  private cameraHeight: number = 8;
  private cameraDistance: number = 12;
  private isCameraRotating: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private isRightMouseDown: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupGrid();
    this.setupEventListeners();
    this.setupParticles();
    this.createPacketMesh();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 50);
    pointLight.position.set(8, 10, 6);
    this.scene.add(pointLight);

    const blueLight = new THREE.PointLight(0x4488ff, 0.5, 30);
    blueLight.position.set(-6, 4, -4);
    this.scene.add(blueLight);
  }

  private setupGrid(): void {
    const gridHelper = new THREE.GridHelper(20, 20, 0x334455, 0x223344);
    gridHelper.position.y = -2;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    this.scene.add(gridHelper);
  }

  private setupParticles(): void {
    const maxParticles = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private createPacketMesh(): void {
    const geometry = new THREE.SphereGeometry(0.15, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0.9,
    });
    this.packetMesh = new THREE.Mesh(geometry, material);
    this.packetMesh.visible = false;

    const glowGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6666,
      transparent: true,
      opacity: 0.4,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.packetMesh.add(glow);

    this.scene.add(this.packetMesh);
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngle);
    const z = this.cameraDistance * Math.cos(this.cameraAngle);
    this.camera.position.set(x, this.cameraHeight, z);
    this.camera.lookAt(0, 0, 0);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseUp);
    canvas.addEventListener('wheel', this.onWheel);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', this.onResize);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 2) {
      this.isRightMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      return;
    }

    this.updateMousePosition(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = Array.from(this.nodeObjects.values()).map((n) => n.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const nodeObj = this.findNodeByMesh(mesh);
      if (nodeObj) {
        this.draggedNodeId = nodeObj.id;
        this.isDragging = true;
        nodeObj.isDragging = true;
        nodeObj.targetScale = 1.3;
        this.setSelectedNode(nodeObj.id);

        const intersectPoint = intersects[0].point;
        this.dragPlane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 1, 0),
          intersectPoint
        );
        this.dragOffset.copy(intersectPoint).sub(nodeObj.mesh.position);
      }
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.isRightMouseDown) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.cameraAngle -= deltaX * 0.01;
      this.cameraHeight = Math.max(2, Math.min(20, this.cameraHeight + deltaY * 0.05));
      this.updateCameraPosition();
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      return;
    }

    this.updateMousePosition(e);

    if (this.isDragging && this.draggedNodeId !== null) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const nodeObj = this.nodeObjects.get(this.draggedNodeId);
      if (nodeObj) {
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
        const newPos = intersectPoint.sub(this.dragOffset);
        nodeObj.mesh.position.copy(newPos);
        nodeObj.targetPosition.copy(newPos);
        this.updateEdgesForNode(this.draggedNodeId);

        if (this.onNodePositionChange) {
          this.onNodePositionChange(this.draggedNodeId, {
            x: newPos.x,
            y: newPos.y,
            z: newPos.z,
          });
        }

        if (this.selectedNodeId === this.draggedNodeId && this.onNodeSelect) {
          this.onNodeSelect(this.getSelectedNodeInfo());
        }
      }
    }
  };

  private onMouseUp = (): void => {
    this.isRightMouseDown = false;

    if (this.isDragging && this.draggedNodeId !== null) {
      const nodeObj = this.nodeObjects.get(this.draggedNodeId);
      if (nodeObj) {
        nodeObj.isDragging = false;
        nodeObj.targetScale = 1.0;
      }
    }
    this.isDragging = false;
    this.draggedNodeId = null;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    this.cameraDistance = Math.max(5, Math.min(30, this.cameraDistance + e.deltaY * zoomSpeed));
    this.updateCameraPosition();
  };

  private onResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private updateMousePosition(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private findNodeByMesh(mesh: THREE.Mesh): NodeObject | undefined {
    for (const nodeObj of this.nodeObjects.values()) {
      if (nodeObj.mesh === mesh || nodeObj.glow === mesh) {
        return nodeObj;
      }
    }
    return undefined;
  }

  private setSelectedNode(nodeId: number | null): void {
    this.selectedNodeId = nodeId;
    if (this.onNodeSelect) {
      this.onNodeSelect(nodeId !== null ? this.getSelectedNodeInfo() : null);
    }
  }

  private getSelectedNodeInfo(): SelectedNodeInfo | null {
    if (this.selectedNodeId === null) return null;
    const nodeObj = this.nodeObjects.get(this.selectedNodeId);
    if (!nodeObj) return null;

    let connectionCount = 0;
    for (const edge of this.edgeObjects) {
      if (edge.source === this.selectedNodeId || edge.target === this.selectedNodeId) {
        connectionCount++;
      }
    }

    return {
      id: nodeObj.id,
      position: {
        x: nodeObj.mesh.position.x,
        y: nodeObj.mesh.position.y,
        z: nodeObj.mesh.position.z,
      },
      connectionCount,
    };
  }

  public setDataRouter(router: DataRouter): void {
    this.dataRouter = router;
  }

  public setOnNodeSelect(callback: (info: SelectedNodeInfo | null) => void): void {
    this.onNodeSelect = callback;
  }

  public setOnNodePositionChange(callback: (nodeId: number, position: { x: number; y: number; z: number }) => void): void {
    this.onNodePositionChange = callback;
  }

  public updateTopology(data: TopologyData): void {
    this.isTransitioning = true;
    this.transitionProgress = 0;

    const oldNodes = new Set(this.nodeObjects.keys());
    const newNodeIds = new Set(data.nodes.map((n) => n.id));

    for (const nodeId of oldNodes) {
      if (!newNodeIds.has(nodeId)) {
        const nodeObj = this.nodeObjects.get(nodeId);
        if (nodeObj) {
          this.scene.remove(nodeObj.mesh);
          this.scene.remove(nodeObj.glow);
        }
        this.nodeObjects.delete(nodeId);
      }
    }

    for (const edgeObj of this.edgeObjects) {
      this.scene.remove(edgeObj.mesh);
    }
    this.edgeObjects = [];

    for (const node of data.nodes) {
      if (!this.nodeObjects.has(node.id)) {
        this.createNodeObject(node);
      }
      const nodeObj = this.nodeObjects.get(node.id)!;
      nodeObj.targetPosition.set(node.position.x, node.position.y, node.position.z);
    }

    for (const edge of data.edges) {
      this.createEdgeObject(edge.source, edge.target);
    }
  }

  private createNodeMaterial(): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: 0x00cccc,
      emissive: 0x004444,
      shininess: 100,
      transparent: true,
      opacity: 0,
    });
  }

  private createNodeObject(node: TopologyNode): void {
    const geometry = new THREE.SphereGeometry(NODE_RADIUS, 16, 16);
    const material = this.createNodeMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(node.position.x, node.position.y, node.position.z);

    const glowGeometry = new THREE.SphereGeometry(NODE_RADIUS * 1.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    this.scene.add(mesh);

    this.nodeObjects.set(node.id, {
      mesh,
      glow,
      id: node.id,
      targetPosition: new THREE.Vector3(node.position.x, node.position.y, node.position.z),
      isDragging: false,
      scale: 1,
      targetScale: 1,
    });
  }

  private createEdgeObject(source: number, target: number): void {
    const geometry = new THREE.CylinderGeometry(EDGE_RADIUS, EDGE_RADIUS, 1, 8);
    const material = new THREE.MeshPhongMaterial({
      color: 0x445566,
      transparent: true,
      opacity: 0,
    });
    const mesh = new THREE.Mesh(geometry, material);

    this.scene.add(mesh);
    this.edgeObjects.push({
      mesh,
      source,
      target,
      isHighlighted: false,
      targetRadius: EDGE_RADIUS,
      currentRadius: EDGE_RADIUS,
    });
  }

  private updateEdgesForNode(nodeId: number): void {
    for (const edgeObj of this.edgeObjects) {
      if (edgeObj.source === nodeId || edgeObj.target === nodeId) {
        this.updateEdgePosition(edgeObj);
      }
    }
  }

  private updateEdgePosition(edgeObj: EdgeObject): void {
    const sourceNode = this.nodeObjects.get(edgeObj.source);
    const targetNode = this.nodeObjects.get(edgeObj.target);
    if (!sourceNode || !targetNode) return;

    const start = sourceNode.mesh.position;
    const end = targetNode.mesh.position;
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();

    edgeObj.mesh.scale.y = length;
    edgeObj.mesh.position.copy(start).add(end).multiplyScalar(0.5);
    edgeObj.mesh.lookAt(end);
    edgeObj.mesh.rotateX(Math.PI / 2);
  }

  private updateEdgeHighlighting(): void {
    if (!this.dataRouter) return;

    for (const edgeObj of this.edgeObjects) {
      const isHighlighted = this.dataRouter.isEdgeHighlighted(edgeObj.source, edgeObj.target);
      if (isHighlighted !== edgeObj.isHighlighted) {
        edgeObj.isHighlighted = isHighlighted;
        const material = edgeObj.mesh.material as THREE.MeshPhongMaterial;
        if (isHighlighted) {
          material.color.setHex(0x00ff66);
          material.emissive?.setHex(0x004422);
          edgeObj.targetRadius = EDGE_RADIUS * 2;
        } else {
          material.color.setHex(0x445566);
          material.emissive?.setHex(0x000000);
          edgeObj.targetRadius = EDGE_RADIUS;
        }
      }
    }
  }

  private addPacketParticle(): void {
    if (!this.packetMesh || !this.packetMesh.visible) return;

    const pos = this.packetMesh.position;
    this.particleData.push({
      position: { x: pos.x, y: pos.y, z: pos.z },
      life: 0.5,
      maxLife: 0.5,
    });

    if (this.particleData.length > 200) {
      this.particleData.shift();
    }
  }

  private updateParticles(deltaTime: number): void {
    this.particleData = this.particleData.filter((p) => {
      p.life -= deltaTime;
      return p.life > 0;
    });

    if (!this.particles) return;

    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    const colors = this.particles.geometry.attributes.color.array as Float32Array;
    const sizes = this.particles.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < 200; i++) {
      const idx = i * 3;
      if (i < this.particleData.length) {
        const p = this.particleData[i];
        const alpha = p.life / p.maxLife;
        positions[idx] = p.position.x;
        positions[idx + 1] = p.position.y;
        positions[idx + 2] = p.position.z;
        colors[idx] = 1;
        colors[idx + 1] = 0.3 * alpha + 0.2;
        colors[idx + 2] = 0.2;
        sizes[i] = 0.15 * alpha;
      } else {
        positions[idx] = 0;
        positions[idx + 1] = -100;
        positions[idx + 2] = 0;
        sizes[i] = 0;
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
    this.particles.geometry.attributes.size.needsUpdate = true;
  }

  private updatePacketPosition(): void {
    if (!this.dataRouter || !this.packetMesh) return;

    const isActive = this.dataRouter.isRoutingActive();
    this.packetMesh.visible = isActive;

    if (isActive) {
      const pos = this.dataRouter.getPacketPosition();
      this.packetMesh.position.set(pos.x, pos.y, pos.z);
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    if (this.dataRouter) {
      this.dataRouter.update(deltaTime);
    }

    this.updateNodeAnimations(deltaTime);
    this.updateEdgeAnimations(deltaTime);
    this.updateEdgeHighlighting();
    this.updatePacketPosition();

    if (this.dataRouter?.isRoutingActive()) {
      this.addPacketParticle();
    }
    this.updateParticles(deltaTime);

    if (this.isTransitioning) {
      this.transitionProgress += deltaTime * 2;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioning = false;
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updateNodeAnimations(deltaTime: number): void {
    for (const nodeObj of this.nodeObjects.values()) {
      const material = nodeObj.mesh.material as THREE.MeshPhongMaterial;
      const glowMaterial = nodeObj.glow.material as THREE.MeshBasicMaterial;

      if (this.isTransitioning && material.opacity < 1) {
        material.opacity = Math.min(1, material.opacity + deltaTime * 2);
        glowMaterial.opacity = Math.min(0.3, glowMaterial.opacity + deltaTime * 2);
      }

      if (!nodeObj.isDragging) {
        const dx = nodeObj.targetPosition.x - nodeObj.mesh.position.x;
        const dy = nodeObj.targetPosition.y - nodeObj.mesh.position.y;
        const dz = nodeObj.targetPosition.z - nodeObj.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist > 0.001) {
          const speed = 8 * deltaTime;
          nodeObj.mesh.position.x += dx * speed;
          nodeObj.mesh.position.y += dy * speed;
          nodeObj.mesh.position.z += dz * speed;
          this.updateEdgesForNode(nodeObj.id);
        }
      }

      const scaleDiff = nodeObj.targetScale - nodeObj.scale;
      if (Math.abs(scaleDiff) > 0.001) {
        nodeObj.scale += scaleDiff * 10 * deltaTime;
        nodeObj.mesh.scale.setScalar(nodeObj.scale);
      }
    }
  }

  private updateEdgeAnimations(deltaTime: number): void {
    for (const edgeObj of this.edgeObjects) {
      const material = edgeObj.mesh.material as THREE.MeshPhongMaterial;

      if (this.isTransitioning && material.opacity < 1) {
        material.opacity = Math.min(0.8, material.opacity + deltaTime * 2);
      }

      const radiusDiff = edgeObj.targetRadius - edgeObj.currentRadius;
      if (Math.abs(radiusDiff) > 0.001) {
        edgeObj.currentRadius += radiusDiff * 8 * deltaTime;
        const geometry = edgeObj.mesh.geometry as THREE.CylinderGeometry;
        geometry.dispose();
        edgeObj.mesh.geometry = new THREE.CylinderGeometry(
          edgeObj.currentRadius,
          edgeObj.currentRadius,
          1,
          8
        );
        this.updateEdgePosition(edgeObj);
      }
    }
  }

  public getNodePosition(nodeId: number): { x: number; y: number; z: number } | null {
    const nodeObj = this.nodeObjects.get(nodeId);
    if (!nodeObj) return null;
    return {
      x: nodeObj.mesh.position.x,
      y: nodeObj.mesh.position.y,
      z: nodeObj.mesh.position.z,
    };
  }

  public getNodeIds(): number[] {
    return Array.from(this.nodeObjects.keys());
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
