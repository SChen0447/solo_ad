import * as THREE from 'three';
import { IslandData, LevelGenerator } from './LevelGenerator';

export interface PlayerRenderData {
  id: number;
  position: { x: number; y: number; z: number };
  color: string;
  isCharging: boolean;
  chargeTime: number;
  maxChargeTime: number;
  isJumping: boolean;
  isLanding: boolean;
  landTime: number;
  rotationY: number;
  fallCount: number;
}

export interface ParticleData {
  id: number;
  type: 'splash' | 'charge' | 'celebration';
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface SqueezeState {
  active: boolean;
  time: number;
  duration: number;
}

const PLAYER_COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe'];

export class RenderEngine {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private waterMesh: THREE.Mesh | null = null;
  private waterGeometry: THREE.PlaneGeometry | null = null;
  private islands: THREE.Group[] = [];
  private players: THREE.Group[] = [];
  private playerMeshes: THREE.Mesh[] = [];
  private chargeRings: THREE.Mesh[] = [];
  private targetRingMeshes: THREE.Mesh[] = [];

  private particles: THREE.Points | null = null;
  private particlePositions: Float32Array = new Float32Array(0);
  private particleColors: Float32Array = new Float32Array(0);
  private particleData: ParticleData[] = [];
  private maxParticles: number = 200;

  private time: number = 0;
  private lowFPUMode: boolean = false;

  private waterSegments: number = 32;
  private splashParticleCount: number = 20;

  private playerSqueezeStates: SqueezeState[] = [];
  private playerBobOffsets: number[] = [];

  private islandData: IslandData[] = [];

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 25;
    this.camera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      100
    );
    this.camera.position.set(15, 15, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.createWater();
    this.createParticles();

    window.addEventListener('resize', () => this.onResize());
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    this.scene.add(directionalLight);
  }

  private createWater(): void {
    const size = 100;
    this.waterGeometry = new THREE.PlaneGeometry(size, size, this.waterSegments, this.waterSegments);
    this.waterGeometry.rotateX(-Math.PI / 2);

    const waterMaterial = new THREE.MeshPhongMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.7,
      shininess: 100,
      side: THREE.DoubleSide
    });

    this.waterMesh = new THREE.Mesh(this.waterGeometry, waterMaterial);
    this.waterMesh.position.y = -0.5;
    this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);
  }

  private createParticles(): void {
    const geometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.maxParticles * 3);
    this.particleColors = new Float32Array(this.maxParticles * 3);

    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  loadLevel(islands: IslandData[]): void {
    for (const island of this.islands) {
      this.scene.remove(island);
    }
    this.islands = [];
    this.targetRingMeshes = [];
    this.islandData = islands;

    for (const islandData of islands) {
      const islandGroup = this.createIsland(islandData);
      islandGroup.position.set(islandData.position.x, islandData.position.y, islandData.position.z);
      this.islands.push(islandGroup);
      this.scene.add(islandGroup);
    }

    this.cameraPositionToLevel(islands);
  }

  private createIsland(islandData: IslandData): THREE.Group {
    const group = new THREE.Group();

    const geometry = new THREE.BoxGeometry(
      islandData.size.x,
      islandData.size.y,
      islandData.size.z
    );

    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(islandData.color),
      shininess: 30
    });

    const island = new THREE.Mesh(geometry, material);
    island.castShadow = true;
    island.receiveShadow = true;
    group.add(island);

    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 })
    );
    group.add(line);

    const ringGeometry = new THREE.RingGeometry(0.35, 0.4, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5252,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = islandData.size.y / 2 + 0.01;
    group.add(ring);
    this.targetRingMeshes.push(ring);

    if (islandData.isStart) {
      const startMarker = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.5, 4),
        new THREE.MeshPhongMaterial({ color: 0x4caf50 })
      );
      startMarker.position.y = islandData.size.y / 2 + 0.5;
      startMarker.rotation.y = Math.PI / 4;
      group.add(startMarker);
    }

    if (islandData.isEnd) {
      const endMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        new THREE.MeshPhongMaterial({ color: 0xffeb3b, emissive: 0xffa000, emissiveIntensity: 0.3 })
      );
      endMarker.position.y = islandData.size.y / 2 + 0.5;
      group.add(endMarker);
    }

    return group;
  }

  createPlayers(count: number): void {
    for (const player of this.players) {
      this.scene.remove(player);
    }
    this.players = [];
    this.playerMeshes = [];
    this.chargeRings = [];
    this.playerSqueezeStates = [];
    this.playerBobOffsets = [];

    for (let i = 0; i < count; i++) {
      const playerGroup = this.createPlayer(i);
      this.players.push(playerGroup);
      this.scene.add(playerGroup);
      this.playerSqueezeStates.push({ active: false, time: 0, duration: 0.15 });
      this.playerBobOffsets.push(Math.random() * Math.PI * 2);
    }
  }

  private createPlayer(playerId: number): THREE.Group {
    const group = new THREE.Group();

    const geometry = new THREE.SphereGeometry(0.4, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(PLAYER_COLORS[playerId]),
      transparent: true,
      opacity: 0.85,
      shininess: 100,
      specular: 0xffffff
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.castShadow = true;
    group.add(sphere);
    this.playerMeshes.push(sphere);

    const highlightGeometry = new THREE.SphereGeometry(0.42, 16, 16);
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0
    });
    const chargeRing = new THREE.Mesh(highlightGeometry, highlightMaterial);
    group.add(chargeRing);
    this.chargeRings.push(chargeRing);

    const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const pupilGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const pupilMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 0.1, 0.3);
    group.add(leftEye);

    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.15, 0.1, 0.36);
    group.add(leftPupil);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 0.1, 0.3);
    group.add(rightEye);

    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.15, 0.1, 0.36);
    group.add(rightPupil);

    return group;
  }

  private cameraPositionToLevel(islands: IslandData[]): void {
    if (islands.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const island of islands) {
      minX = Math.min(minX, island.position.x - island.size.x / 2 - 2);
      maxX = Math.max(maxX, island.position.x + island.size.x / 2 + 2);
      minZ = Math.min(minZ, island.position.z - island.size.z / 2 - 2);
      maxZ = Math.max(maxZ, island.position.z + island.size.z / 2 + 2);
    }

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const width = maxX - minX;
    const depth = maxZ - minZ;

    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = Math.max(width, depth / aspect) * 1.3;

    this.camera.left = -frustumSize * aspect / 2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();

    const cameraHeight = frustumSize * 0.8;
    this.camera.position.set(centerX + cameraHeight * 0.5, cameraHeight, centerZ + cameraHeight * 0.5);
    this.camera.lookAt(centerX, 0, centerZ);
  }

  updatePlayer(data: PlayerRenderData): void {
    const player = this.players[data.id];
    if (!player) return;

    player.position.set(data.position.x, data.position.y + 0.4, data.position.z);

    const mesh = this.playerMeshes[data.id];
    const squeezeState = this.playerSqueezeStates[data.id];

    let scaleX = 1;
    let scaleY = 1;
    let scaleZ = 1;

    if (data.isLanding || squeezeState.active) {
      if (!squeezeState.active) {
        squeezeState.active = true;
        squeezeState.time = 0;
      }

      const t = Math.min(squeezeState.time / squeezeState.duration, 1);
      const squeezeFactor = Math.sin(t * Math.PI);

      scaleY = 1 - 0.4 * squeezeFactor;
      scaleX = 1 + 0.3 * squeezeFactor;
      scaleZ = 1 + 0.3 * squeezeFactor;

      if (t >= 1) {
        squeezeState.active = false;
      }
    } else if (!data.isJumping) {
      const bobOffset = this.playerBobOffsets[data.id];
      const bobAmount = 0.02;
      const bobFrequency = 2;
      const bob = Math.sin(this.time * bobFrequency * Math.PI * 2 + bobOffset) * bobAmount;

      scaleY = 1 + bob;
      scaleX = 1 - bob * 0.5;
      scaleZ = 1 - bob * 0.5;
    }

    mesh.scale.set(scaleX, scaleY, scaleZ);

    player.rotation.y = data.rotationY;

    const chargeRing = this.chargeRings[data.id];
    if (data.isCharging) {
      const chargeRatio = data.chargeTime / data.maxChargeTime;
      const ringRadius = 0.3 + chargeRatio * 0.9;
      const opacity = 0.6 - chargeRatio * 0.5;

      chargeRing.scale.setScalar(ringRadius / 0.42);
      (chargeRing.material as THREE.MeshBasicMaterial).opacity = opacity;
      (chargeRing.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);

      if (chargeRatio >= 1) {
        const flash = Math.sin(this.time * 20) > 0 ? 1 : 0;
        (chargeRing.material as THREE.MeshBasicMaterial).opacity = 0.3 + flash * 0.5;
      }

      if (Math.random() < 0.3) {
        this.addChargeParticle(data);
      }
    } else {
      (chargeRing.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }

  triggerLanding(playerId: number): void {
    const squeezeState = this.playerSqueezeStates[playerId];
    squeezeState.active = true;
    squeezeState.time = 0;
  }

  spawnSplashParticles(x: number, z: number): void {
    const count = this.lowFPUMode ? 10 : this.splashParticleCount;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 2;
      const vy = 2 + Math.random() * 3;

      const t = Math.random();
      const color = t < 0.5 ? '#ffffff' : '#81d4fa';

      this.addParticle({
        id: Math.random(),
        type: 'splash',
        position: { x, y: -0.3, z },
        velocity: {
          x: Math.cos(angle) * speed,
          y: vy,
          z: Math.sin(angle) * speed
        },
        life: 1,
        maxLife: 1,
        color,
        size: 0.1 + Math.random() * 0.1
      });
    }
  }

  spawnCelebrationParticles(): void {
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#ffffff', '#ffd54f'];
    const count = 100;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      const vy = 2 + Math.random() * 4;

      this.addParticle({
        id: Math.random(),
        type: 'celebration',
        position: { x: 0, y: 5, z: 0 },
        velocity: {
          x: Math.cos(angle) * speed,
          y: vy,
          z: Math.sin(angle) * speed
        },
        life: 2,
        maxLife: 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 0.15 + Math.random() * 0.15
      });
    }
  }

  private addChargeParticle(data: PlayerRenderData): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.5 + Math.random() * 0.3;

    this.addParticle({
      id: Math.random(),
      type: 'charge',
      position: {
        x: data.position.x + Math.cos(angle) * radius,
        y: data.position.y + 0.4 + Math.random() * 0.2,
        z: data.position.z + Math.sin(angle) * radius
      },
      velocity: {
        x: Math.cos(angle) * 0.5,
        y: 0.5 + Math.random() * 0.5,
        z: Math.sin(angle) * 0.5
      },
      life: 0.5,
      maxLife: 0.5,
      color: '#ffffff',
      size: 0.08
    });
  }

  private addParticle(particle: ParticleData): void {
    if (this.particleData.length >= this.maxParticles) {
      this.particleData.shift();
    }
    this.particleData.push(particle);
  }

  setLowFPUMode(enabled: boolean): void {
    if (this.lowFPUMode === enabled) return;

    this.lowFPUMode = enabled;

    if (this.waterMesh && this.waterGeometry) {
      this.scene.remove(this.waterMesh);
      this.waterGeometry.dispose();

      this.waterSegments = enabled ? 16 : 32;
      this.splashParticleCount = enabled ? 10 : 20;

      const size = 100;
      this.waterGeometry = new THREE.PlaneGeometry(size, size, this.waterSegments, this.waterSegments);
      this.waterGeometry.rotateX(-Math.PI / 2);

      const waterMaterial = new THREE.MeshPhongMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.7,
        shininess: 100,
        side: THREE.DoubleSide
      });

      this.waterMesh = new THREE.Mesh(this.waterGeometry, waterMaterial);
      this.waterMesh.position.y = -0.5;
      this.waterMesh.receiveShadow = true;
      this.scene.add(this.waterMesh);
    }
  }

  update(deltaTime: number): void {
    this.time += deltaTime;

    this.updateWater();
    this.updateIslands();
    this.updateTargetRings();
    this.updateParticles(deltaTime);
    this.updateSqueezeStates(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  private updateWater(): void {
    if (!this.waterGeometry || !this.waterMesh) return;

    const positions = this.waterGeometry.attributes.position;
    const amplitude = 0.05;
    const frequency = 0.3;
    const wavelength = 2;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const wave1 = Math.sin(x / wavelength * Math.PI * 2 + this.time * frequency * Math.PI * 2) * amplitude;
      const wave2 = Math.sin(z / wavelength * Math.PI * 2 + this.time * frequency * Math.PI * 2 * 0.7) * amplitude * 0.5;

      positions.setY(i, wave1 + wave2);
    }

    positions.needsUpdate = true;
    this.waterGeometry.computeVertexNormals();
  }

  private updateIslands(): void {
    for (let i = 0; i < this.islandData.length; i++) {
      const islandData = this.islandData[i];
      const island = this.islands[i];

      if (islandData.isMoving && island) {
        const pos = LevelGenerator.getIslandPositionAtTime(islandData, this.time);
        island.position.x = pos.x;
        island.position.z = pos.z;
      }
    }
  }

  private updateTargetRings(): void {
    for (const ring of this.targetRingMeshes) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * Math.PI * 2);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.2 + pulse * 0.2;
    }
  }

  private updateParticles(deltaTime: number): void {
    const gravity = -9.8;

    for (let i = this.particleData.length - 1; i >= 0; i--) {
      const p = this.particleData[i];

      p.velocity.y += gravity * deltaTime;
      p.position.x += p.velocity.x * deltaTime;
      p.position.y += p.velocity.y * deltaTime;
      p.position.z += p.velocity.z * deltaTime;

      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particleData.splice(i, 1);
      }
    }

    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array as Float32Array;
      const colors = this.particles.geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < this.maxParticles; i++) {
        const idx = i * 3;
        if (i < this.particleData.length) {
          const p = this.particleData[i];
          positions[idx] = p.position.x;
          positions[idx + 1] = p.position.y;
          positions[idx + 2] = p.position.z;

          const color = new THREE.Color(p.color);
          const alpha = p.life / p.maxLife;
          colors[idx] = color.r * alpha;
          colors[idx + 1] = color.g * alpha;
          colors[idx + 2] = color.b * alpha;
        } else {
          positions[idx] = 0;
          positions[idx + 1] = -100;
          positions[idx + 2] = 0;
          colors[idx] = 0;
          colors[idx + 1] = 0;
          colors[idx + 2] = 0;
        }
      }

      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.geometry.attributes.color.needsUpdate = true;
    }
  }

  private updateSqueezeStates(deltaTime: number): void {
    for (const state of this.playerSqueezeStates) {
      if (state.active) {
        state.time += deltaTime;
      }
    }
  }

  private onResize(): void {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 25;

    this.camera.left = frustumSize * aspect / -2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = frustumSize / -2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.OrthographicCamera {
    return this.camera;
  }

  destroy(): void {
    this.renderer.dispose();
  }
}
