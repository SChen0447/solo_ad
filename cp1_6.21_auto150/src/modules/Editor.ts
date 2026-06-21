import * as THREE from 'three';
import { SceneManager } from '../core/SceneManager';
import { MazeGrid } from '../core/MazeGrid';

interface WallAnimation {
  mesh: THREE.Mesh;
  targetScale: number;
  startTime: number;
  duration: number;
  isGrowing: boolean;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class Editor {
  private sceneManager: SceneManager;
  private mazeGrid: MazeGrid;
  private wallMeshes: Map<string, THREE.Mesh> = new Map();
  private gridGroup: THREE.Group;
  private wallAnimations: WallAnimation[] = [];
  private particles: Particle[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private groundMesh: THREE.Mesh;
  private selectedCell: THREE.Mesh | null = null;
  private isActive: boolean = true;
  private keys: Set<string> = new Set();
  private lastKeyProcess: number = 0;
  private animationFrameId: number | null = null;

  constructor(sceneManager: SceneManager, mazeGrid: MazeGrid) {
    this.sceneManager = sceneManager;
    this.mazeGrid = mazeGrid;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.gridGroup = new THREE.Group();
    this.sceneManager.getScene().add(this.gridGroup);
    this.groundMesh = this.createGround();
    this.setupEventListeners();
    this.sceneManager.onUpdate(this.update.bind(this));
  }

  private createGround(): THREE.Mesh {
    const size = this.mazeGrid.size;

    const groundGeo = new THREE.PlaneGeometry(size, size);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(size / 2 - 0.5, -0.01, size / 2 - 0.5);
    ground.receiveShadow = true;
    this.gridGroup.add(ground);

    const gridHelper = new THREE.GridHelper(size, size, 0x4a9eff, 0x2a4a7f);
    gridHelper.position.set(size / 2 - 0.5, 0.01, size / 2 - 0.5);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.6;
    this.gridGroup.add(gridHelper);

    const highlightGeo = new THREE.PlaneGeometry(0.95, 0.95);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const highlight = new THREE.Mesh(highlightGeo, highlightMat);
    highlight.rotation.x = -Math.PI / 2;
    highlight.position.y = 0.02;
    highlight.visible = false;
    highlight.name = 'cellHighlight';
    this.gridGroup.add(highlight);
    this.selectedCell = highlight;

    const startGeo = new THREE.PlaneGeometry(0.9, 0.9);
    const startMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.7
    });
    const start = new THREE.Mesh(startGeo, startMat);
    start.rotation.x = -Math.PI / 2;
    start.position.set(0, 0.015, 0);
    this.gridGroup.add(start);

    const endMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.7
    });
    const end = new THREE.Mesh(startGeo, endMat);
    end.rotation.x = -Math.PI / 2;
    end.position.set(size - 1, 0.015, size - 1);
    this.gridGroup.add(end);

    return ground;
  }

  private setupEventListeners(): void {
    const canvas = this.sceneManager.getCanvas();

    canvas.addEventListener('click', this.onCanvasClick.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));

    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isActive) return;

    const canvas = this.sceneManager.getCanvas();
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.getCamera());
    const intersects = this.raycaster.intersectObject(this.groundMesh);

    if (intersects.length > 0 && this.selectedCell) {
      const point = intersects[0].point;
      const gx = Math.round(point.x);
      const gz = Math.round(point.z);

      if (gx >= 0 && gx < this.mazeGrid.size && gz >= 0 && gz < this.mazeGrid.size) {
        this.selectedCell.position.set(gx, 0.02, gz);
        this.selectedCell.visible = true;
        (this.selectedCell.material as THREE.MeshBasicMaterial).opacity = 0.3;
      } else {
        this.selectedCell.visible = false;
      }
    } else if (this.selectedCell) {
      this.selectedCell.visible = false;
    }
  }

  private onMouseLeave(): void {
    if (this.selectedCell) {
      this.selectedCell.visible = false;
    }
  }

  private onCanvasClick(event: MouseEvent): void {
    if (!this.isActive) return;

    const canvas = this.sceneManager.getCanvas();
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.getCamera());

    const wallObjects = Array.from(this.wallMeshes.values());
    const wallIntersects = this.raycaster.intersectObjects(wallObjects, false);

    if (wallIntersects.length > 0) {
      const wall = wallIntersects[0].object as THREE.Mesh;
      const key = wall.userData.gridKey;
      if (key) {
        const [x, z] = key.split(',').map(Number);
        this.removeWall(x, z);
        return;
      }
    }

    const intersects = this.raycaster.intersectObject(this.groundMesh);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const gx = Math.round(point.x);
      const gz = Math.round(point.z);

      if (gx >= 0 && gx < this.mazeGrid.size && gz >= 0 && gz < this.mazeGrid.size) {
        if (this.mazeGrid.getWall(gx, gz)) {
          this.removeWall(gx, gz);
        } else {
          this.addWall(gx, gz);
        }
      }
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keys.add(event.key.toLowerCase());
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.key.toLowerCase());
  }

  private processInput(delta: number): void {
    this.lastKeyProcess += delta;
    if (this.lastKeyProcess < 0.016) return;
    this.lastKeyProcess = 0;

    const panSpeed = 8 * delta;

    if (this.keys.has('w')) this.sceneManager.panCamera(0, -panSpeed);
    if (this.keys.has('s')) this.sceneManager.panCamera(0, panSpeed);
    if (this.keys.has('a')) this.sceneManager.panCamera(-panSpeed, 0);
    if (this.keys.has('d')) this.sceneManager.panCamera(panSpeed, 0);

    const now = Date.now();
    if (this.keys.has('q') && now - (this as any)._lastQRotate > 300) {
      this.sceneManager.rotateCamera(-45);
      (this as any)._lastQRotate = now;
    }
    if (this.keys.has('e') && now - (this as any)._lastERotate > 300) {
      this.sceneManager.rotateCamera(45);
      (this as any)._lastERotate = now;
    }
  }

  private addWall(x: number, z: number): void {
    const key = `${x},${z}`;
    if (this.wallMeshes.has(key)) return;

    this.mazeGrid.setWall(x, z, true);

    const geo = new THREE.BoxGeometry(0.92, 1, 0.92);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.75,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0x1e40af,
      emissiveIntensity: 0.15
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.5, z);
    mesh.scale.y = 0.01;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.gridKey = key;
    mesh.userData.isWall = true;

    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.8 });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    mesh.add(wireframe);

    this.gridGroup.add(mesh);
    this.wallMeshes.set(key, mesh);

    this.wallAnimations.push({
      mesh,
      targetScale: 1,
      startTime: performance.now(),
      duration: 300,
      isGrowing: true
    });
  }

  private removeWall(x: number, z: number): void {
    const key = `${x},${z}`;
    const mesh = this.wallMeshes.get(key);
    if (!mesh) return;

    this.mazeGrid.setWall(x, z, false);
    this.spawnParticles(x, z);

    this.wallAnimations.push({
      mesh,
      targetScale: 0,
      startTime: performance.now(),
      duration: 250,
      isGrowing: false
    });

    this.wallMeshes.delete(key);
  }

  private spawnParticles(x: number, z: number): void {
    const colors = [0x3b82f6, 0x60a5fa, 0x93c5fd];
    for (let i = 0; i < 12; i++) {
      const geo = new THREE.BoxGeometry(0.08 + Math.random() * 0.1, 0.08 + Math.random() * 0.1, 0.08 + Math.random() * 0.1);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.6,
        0.3 + Math.random() * 0.5,
        z + (Math.random() - 0.5) * 0.6
      );
      this.gridGroup.add(mesh);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          1 + Math.random() * 2,
          (Math.random() - 0.5) * 3
        ),
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9
      });
    }
  }

  private update(delta: number): void {
    if (this.isActive) {
      this.processInput(delta);
    }

    const now = performance.now();
    for (let i = this.wallAnimations.length - 1; i >= 0; i--) {
      const anim = this.wallAnimations[i];
      const elapsed = now - anim.startTime;
      const t = Math.min(elapsed / anim.duration, 1);
      const eased = anim.isGrowing ? 1 - Math.pow(1 - t, 3) : t * t;

      anim.mesh.scale.y = eased * anim.targetScale + (1 - eased) * anim.mesh.scale.y;
      anim.mesh.scale.y = anim.isGrowing
        ? Math.min(anim.mesh.scale.y + delta * 5, 1)
        : Math.max(anim.mesh.scale.y - delta * 4, 0);

      if (t >= 1) {
        if (!anim.isGrowing) {
          this.gridGroup.remove(anim.mesh);
          anim.mesh.geometry.dispose();
          (anim.mesh.material as THREE.Material).dispose();
        }
        this.wallAnimations.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.velocity.y -= 6 * delta;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life / p.maxLife);
      p.mesh.rotation.x += delta * 8;
      p.mesh.rotation.y += delta * 6;

      if (p.life <= 0) {
        this.gridGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  setActive(active: boolean): void {
    this.isActive = active;
    if (!active && this.selectedCell) {
      this.selectedCell.visible = false;
    }
  }

  clearAllWalls(): void {
    for (const [key, mesh] of this.wallMeshes) {
      this.gridGroup.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.wallMeshes.clear();
    this.mazeGrid.reset();
  }

  getGridGroup(): THREE.Group {
    return this.gridGroup;
  }

  dispose(): void {
    const canvas = this.sceneManager.getCanvas();
    canvas.removeEventListener('click', this.onCanvasClick.bind(this));
    canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
    this.sceneManager.offUpdate(this.update.bind(this));
    this.clearAllWalls();
  }
}
