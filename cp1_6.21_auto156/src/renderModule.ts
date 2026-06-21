import * as THREE from 'three';
import type { BulletData, ObstacleData, ParticleEvent, ObstacleType } from './physicsEngine';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector2;
  life: number;
  maxLife: number;
}

interface BulletRenderData {
  mesh: THREE.Mesh;
  trailLine: THREE.Line;
  trailGeometry: THREE.BufferGeometry;
  trailPositions: Float32Array;
}

export class RenderModule {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  private planeGroup: THREE.Group;
  private plane: THREE.Mesh;
  private gridHelper: THREE.GridHelper;
  private obstacleGroup: THREE.Group;
  private obstacleMesh: THREE.Mesh | null = null;
  private obstacleBorder: THREE.LineSegments | null = null;
  private hitMarksGroup: THREE.Group;

  private bulletGroup: THREE.Group;
  private bulletRenderMap: Map<number, BulletRenderData> = new Map();

  private particleGroup: THREE.Group;
  private particles: Particle[] = [];

  private showTrails: boolean = true;
  private readonly PLANE_WIDTH = 16;
  private readonly PLANE_HEIGHT = 9;
  private readonly MAX_PARTICLES = 200;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 15, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight);

    this.planeGroup = new THREE.Group();
    this.scene.add(this.planeGroup);

    this.plane = this.createPlane();
    this.planeGroup.add(this.plane);

    this.gridHelper = this.createGrid();
    this.planeGroup.add(this.gridHelper);

    this.obstacleGroup = new THREE.Group();
    this.planeGroup.add(this.obstacleGroup);

    this.hitMarksGroup = new THREE.Group();
    this.planeGroup.add(this.hitMarksGroup);

    this.bulletGroup = new THREE.Group();
    this.planeGroup.add(this.bulletGroup);

    this.particleGroup = new THREE.Group();
    this.planeGroup.add(this.particleGroup);

    this.planeGroup.rotation.x = -Math.PI / 2;

    window.addEventListener('resize', () => this.onResize(container));
  }

  private createPlane(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(this.PLANE_WIDTH, this.PLANE_HEIGHT);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  private createGrid(): THREE.GridHelper {
    const divisions = 32;
    const grid = new THREE.GridHelper(
      Math.max(this.PLANE_WIDTH, this.PLANE_HEIGHT),
      divisions,
      0x4a4a6e,
      0x3a3a5e
    );
    grid.rotation.x = Math.PI / 2;
    grid.position.z = 0.001;
    const material = grid.material as THREE.Material;
    material.transparent = true;
    material.opacity = 0.6;
    return grid;
  }

  public updateObstacle(obstacle: ObstacleData): void {
    this.clearObstacle();
    this.obstacleMesh = this.createObstacleMesh(obstacle.type, obstacle.size);
    this.obstacleMesh.position.set(obstacle.position.x, obstacle.position.y, 0.05);
    this.obstacleMesh.rotation.z = obstacle.rotation;
    this.obstacleGroup.add(this.obstacleMesh);

    this.obstacleBorder = this.createObstacleBorder(obstacle.type, obstacle.size);
    this.obstacleBorder.position.set(obstacle.position.x, obstacle.position.y, 0.06);
    this.obstacleBorder.rotation.z = obstacle.rotation;
    this.obstacleGroup.add(this.obstacleBorder);

    this.updateHitMarks(obstacle);
  }

  private clearObstacle(): void {
    if (this.obstacleMesh) {
      this.obstacleGroup.remove(this.obstacleMesh);
      if (this.obstacleMesh.geometry) this.obstacleMesh.geometry.dispose();
      if (this.obstacleMesh.material) {
        const mat = this.obstacleMesh.material as THREE.Material;
        mat.dispose();
      }
      this.obstacleMesh = null;
    }
    if (this.obstacleBorder) {
      this.obstacleGroup.remove(this.obstacleBorder);
      const geo = this.obstacleBorder.geometry as THREE.BufferGeometry;
      if (geo) geo.dispose();
      const mat = this.obstacleBorder.material as THREE.Material;
      if (mat) mat.dispose();
      this.obstacleBorder = null;
    }
  }

  private createObstacleMesh(type: ObstacleType, size: THREE.Vector2): THREE.Mesh {
    let geometry: THREE.BufferGeometry;

    switch (type) {
      case 'circle':
        geometry = new THREE.CircleGeometry(size.x / 2, 48);
        break;
      case 'rectangle':
        geometry = new THREE.PlaneGeometry(size.x, size.y);
        break;
      case 'triangle':
        geometry = this.createTriangleGeometry(size.x);
        break;
      default:
        geometry = new THREE.CircleGeometry(size.x / 2, 48);
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.5,
      roughness: 0.3,
      metalness: 0.4,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  }

  private createTriangleGeometry(size: number): THREE.BufferGeometry {
    const h = size * 0.866;
    const vertices = new Float32Array([
      0, h / 2, 0,
      -size / 2, -h / 2, 0,
      size / 2, -h / 2, 0
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex([0, 1, 2]);
    geometry.computeVertexNormals();
    return geometry;
  }

  private createObstacleBorder(type: ObstacleType, size: THREE.Vector2): THREE.LineSegments {
    let geometry: THREE.BufferGeometry;

    switch (type) {
      case 'circle':
        geometry = this.createCircleBorder(size.x / 2);
        break;
      case 'rectangle':
        geometry = this.createRectangleBorder(size.x, size.y);
        break;
      case 'triangle':
        geometry = this.createTriangleBorder(size.x);
        break;
      default:
        geometry = this.createCircleBorder(size.x / 2);
    }

    const material = new THREE.LineBasicMaterial({
      color: 0xa78bfa,
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });

    return new THREE.LineSegments(geometry, material);
  }

  private createCircleBorder(radius: number): THREE.BufferGeometry {
    const segments = 64;
    const points: number[] = [];
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;
      points.push(
        Math.cos(angle1) * radius, Math.sin(angle1) * radius, 0,
        Math.cos(angle2) * radius, Math.sin(angle2) * radius, 0
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geometry;
  }

  private createRectangleBorder(w: number, h: number): THREE.BufferGeometry {
    const halfW = w / 2;
    const halfH = h / 2;
    const points = [
      -halfW, -halfH, 0, halfW, -halfH, 0,
      halfW, -halfH, 0, halfW, halfH, 0,
      halfW, halfH, 0, -halfW, halfH, 0,
      -halfW, halfH, 0, -halfW, -halfH, 0
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geometry;
  }

  private createTriangleBorder(size: number): THREE.BufferGeometry {
    const h = size * 0.866;
    const points = [
      0, h / 2, 0, -size / 2, -h / 2, 0,
      -size / 2, -h / 2, 0, size / 2, -h / 2, 0,
      size / 2, -h / 2, 0, 0, h / 2, 0
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geometry;
  }

  private updateHitMarks(obstacle: ObstacleData): void {
    while (this.hitMarksGroup.children.length > 0) {
      const child = this.hitMarksGroup.children[0];
      this.hitMarksGroup.remove(child);
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const mat = mesh.material as THREE.Material;
        mat.dispose();
      }
    }

    const now = performance.now() / 1000;
    for (const mark of obstacle.hitMarks) {
      const age = now - mark.createdAt;
      const alpha = Math.max(0, 1 - age / mark.duration);

      const geometry = new THREE.CircleGeometry(0.1, 16);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffaa44,
        transparent: true,
        opacity: alpha * 0.8
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(mark.position.x, mark.position.y, 0.07);
      this.hitMarksGroup.add(mesh);
    }
  }

  public updateBullets(bullets: BulletData[]): void {
    const activeIds = new Set(bullets.map(b => b.id));

    for (const [id] of this.bulletRenderMap) {
      if (!activeIds.has(id)) {
        this.removeBulletRender(id);
      }
    }

    for (const bullet of bullets) {
      if (!this.bulletRenderMap.has(bullet.id)) {
        this.createBulletRender(bullet);
      }
      this.updateBulletRender(bullet);
    }
  }

  private createBulletRender(bullet: BulletData): void {
    const geometry = new THREE.CircleGeometry(bullet.radius, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(bullet.position.x, bullet.position.y, 0.1);

    const maxTrailPoints = 200;
    const trailPositions = new Float32Array(maxTrailPoints * 3);
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setDrawRange(0, 0);

    const trailMaterial = new THREE.LineDashedMaterial({
      color: 0xff6666,
      dashSize: 0.1,
      gapSize: 0.05,
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    });

    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    trailLine.computeLineDistances();
    trailLine.visible = this.showTrails;

    this.bulletGroup.add(mesh);
    this.bulletGroup.add(trailLine);

    this.bulletRenderMap.set(bullet.id, {
      mesh,
      trailLine,
      trailGeometry,
      trailPositions
    });
  }

  private updateBulletRender(bullet: BulletData): void {
    const data = this.bulletRenderMap.get(bullet.id);
    if (!data) return;

    data.mesh.position.set(bullet.position.x, bullet.position.y, 0.1);

    if (this.showTrails && bullet.trail.length > 1) {
      const points = bullet.trail;
      const count = Math.min(points.length, data.trailPositions.length / 3);

      for (let i = 0; i < count; i++) {
        data.trailPositions[i * 3] = points[i].x;
        data.trailPositions[i * 3 + 1] = points[i].y;
        data.trailPositions[i * 3 + 2] = 0.09;
      }

      data.trailGeometry.setDrawRange(0, count);
      const posAttr = data.trailGeometry.getAttribute('position') as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
      data.trailLine.computeLineDistances();
      data.trailLine.visible = true;
    } else {
      data.trailLine.visible = false;
    }
  }

  private removeBulletRender(id: number): void {
    const data = this.bulletRenderMap.get(id);
    if (!data) return;

    this.bulletGroup.remove(data.mesh);
    this.bulletGroup.remove(data.trailLine);

    if (data.mesh.geometry) data.mesh.geometry.dispose();
    if (data.mesh.material) {
      const mat = data.mesh.material as THREE.Material;
      mat.dispose();
    }

    if (data.trailGeometry) data.trailGeometry.dispose();
    if (data.trailLine.material) {
      const mat = data.trailLine.material as THREE.Material;
      mat.dispose();
    }

    this.bulletRenderMap.delete(id);
  }

  public spawnParticles(event: ParticleEvent): void {
    for (let i = 0; i < event.count; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) {
        const old = this.particles.shift();
        if (old) {
          this.particleGroup.remove(old.mesh);
          if (old.mesh.geometry) old.mesh.geometry.dispose();
          if (old.mesh.material) {
            const mat = old.mesh.material as THREE.Material;
            mat.dispose();
          }
        }
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      const velocity = new THREE.Vector2(
        Math.cos(angle) * speed + event.direction.x * 2,
        Math.sin(angle) * speed + event.direction.y * 2
      );

      const geometry = new THREE.CircleGeometry(0.03 + Math.random() * 0.03, 8);
      const color = new THREE.Color().setHSL(0.08 + Math.random() * 0.08, 1, 0.6);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(event.position.x, event.position.y, 0.15);

      this.particleGroup.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 0.3,
        maxLife: 0.3
      });
    }
  }

  public updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= deltaTime;

      if (particle.life <= 0) {
        this.particleGroup.remove(particle.mesh);
        if (particle.mesh.geometry) particle.mesh.geometry.dispose();
        if (particle.mesh.material) {
          const mat = particle.mesh.material as THREE.Material;
          mat.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      particle.mesh.position.x += particle.velocity.x * deltaTime;
      particle.mesh.position.y += particle.velocity.y * deltaTime;
      particle.velocity.y -= 2 * deltaTime;

      const mat = particle.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = particle.life / particle.maxLife;

      const scale = particle.life / particle.maxLife;
      particle.mesh.scale.setScalar(scale);
    }
  }

  public setShowTrails(show: boolean): void {
    this.showTrails = show;
    for (const data of this.bulletRenderMap.values()) {
      data.trailLine.visible = show;
    }
  }

  public getShowTrails(): boolean {
    return this.showTrails;
  }

  public clearAll(): void {
    for (const id of Array.from(this.bulletRenderMap.keys())) {
      this.removeBulletRender(id);
    }

    while (this.particles.length > 0) {
      const p = this.particles.pop()!;
      this.particleGroup.remove(p.mesh);
      if (p.mesh.geometry) p.mesh.geometry.dispose();
      if (p.mesh.material) {
        const mat = p.mesh.material as THREE.Material;
        mat.dispose();
      }
    }

    while (this.hitMarksGroup.children.length > 0) {
      const child = this.hitMarksGroup.children[0];
      this.hitMarksGroup.remove(child);
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const mat = mesh.material as THREE.Material;
        mat.dispose();
      }
    }
  }

  public resetCamera(): void {
    this.camera.position.set(0, 15, 15);
    this.camera.lookAt(0, 0, 0);
  }

  private onResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
    window.removeEventListener('resize', () => this.onResize);
  }

  public getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public screenToWorld(clientX: number, clientY: number, container: HTMLElement): THREE.Vector2 | null {
    const rect = container.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(plane, intersection);

    if (hit) {
      const invQuat = this.planeGroup.quaternion.clone().invert();
      const localPoint = intersection.clone().applyQuaternion(invQuat);

      const halfW = this.PLANE_WIDTH / 2;
      const halfH = this.PLANE_HEIGHT / 2;
      if (
        localPoint.x >= -halfW &&
        localPoint.x <= halfW &&
        localPoint.y >= -halfH &&
        localPoint.y <= halfH
      ) {
        return new THREE.Vector2(localPoint.x, localPoint.y);
      }
    }
    return null;
  }
}
