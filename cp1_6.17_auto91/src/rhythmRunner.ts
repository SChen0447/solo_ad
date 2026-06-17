import * as THREE from 'three';
import type { BandEnergy } from './audioEngine';

export type PlayerState = 'running' | 'jumping' | 'sliding' | 'boosting' | 'hurt' | 'dead';
export type ObstacleType = 'spike' | 'bar' | 'wall';

export interface GameState {
  score: number;
  lives: number;
  maxLives: number;
  speed: number;
  baseSpeed: number;
  isPaused: boolean;
  isGameOver: boolean;
  isStarted: boolean;
  playerState: PlayerState;
}

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

export interface Obstacle {
  group: THREE.Group;
  type: ObstacleType;
  passed: boolean;
  warning: THREE.Mesh;
  warningTime: number;
  collider: { x: number; y: number; width: number; height: number };
  movingDirection?: number;
  movingRange?: number;
  startX?: number;
}

export interface PlatformSegment {
  mesh: THREE.Mesh;
  length: number;
}

const WORLD_UNIT = 1;
const GROUND_Y = -3;
const PLAYER_X = -6;
const GRAVITY = -55;
const JUMP_VELOCITY = 22;
const SLIDE_DURATION = 0.6;
const BOOST_DURATION = 0.8;
const BOOST_MULTIPLIER = 1.2;
const HURT_DURATION = 0.8;
const INVINCIBLE_DURATION = 1.5;

type GameEventListener = (event: string, data?: unknown) => void;

export class RhythmRunner {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  private clock: THREE.Clock;
  private animationId: number = 0;

  private player!: THREE.Group;
  private playerBody!: THREE.Mesh;
  private playerHead!: THREE.Mesh;
  private playerLegL!: THREE.Mesh;
  private playerLegR!: THREE.Mesh;
  private playerTrail: THREE.Mesh[] = [];

  private playerVelocity: number = 0;
  private playerY: number = GROUND_Y + 1.5;
  private playerScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private stateTimer: number = 0;
  private invincibleTimer: number = 0;
  private legPhase: number = 0;

  private platforms: PlatformSegment[] = [];
  private obstacles: Obstacle[] = [];
  private particles: Particle[] = [];

  private worldOffset: number = 0;
  private nextSpawnX: number = 20;
  private spawnInterval: number = 10;

  private bgStars: THREE.Points | null = null;
  private bgNeonLines: THREE.Line[] = [];

  public gameState: GameState = {
    score: 0,
    lives: 3,
    maxLives: 3,
    speed: 14,
    baseSpeed: 14,
    isPaused: false,
    isGameOver: false,
    isStarted: false,
    playerState: 'running'
  };

  private eventListeners: Map<string, GameEventListener[]> = new Map();
  private lastTime: number = 0;

  private width: number = 0;
  private height: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0014);
    this.scene.fog = new THREE.Fog(0x0a0014, 15, 50);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.OrthographicCamera(-12, 12, 6.75, -6.75, 0.1, 1000);
    this.camera.position.set(0, 0, 20);
    this.camera.lookAt(0, 0, 0);

    this.resize();
    this.setupLights();
    this.createBackground();
    this.createPlayer();
    this.createInitialPlatforms();

    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKeyDown);
  }

  public on(event: string, listener: GameEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  private emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => cb(event, data));
    }
  }

  private resize = (): void => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const aspect = this.width / this.height;
    const viewH = 13.5;
    const viewW = viewH * aspect;

    this.camera.left = -viewW / 2;
    this.camera.right = viewW / 2;
    this.camera.top = viewH / 2;
    this.camera.bottom = -viewH / 2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
  };

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x3d1a5c, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xff4fd8, 0.8);
    dirLight.position.set(5, 10, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(dirLight);

    const cyanLight = new THREE.DirectionalLight(0x00f0ff, 0.5);
    cyanLight.position.set(-5, 5, 5);
    this.scene.add(cyanLight);

    const pinkPoint = new THREE.PointLight(0xff4fd8, 1.5, 18);
    pinkPoint.position.set(-3, 0, 4);
    this.scene.add(pinkPoint);

    const cyanPoint = new THREE.PointLight(0x00f0ff, 1.2, 15);
    cyanPoint.position.set(3, -2, 3);
    this.scene.add(cyanPoint);
  }

  private createBackground(): void {
    const starCount = 300;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = (Math.random() - 0.3) * 30;
      positions[i * 3 + 2] = -Math.random() * 40 - 5;

      const c = Math.random();
      if (c < 0.33) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 0.31; colors[i * 3 + 2] = 0.85;
      } else if (c < 0.66) {
        colors[i * 3] = 0; colors[i * 3 + 1] = 0.94; colors[i * 3 + 2] = 1;
      } else {
        colors[i * 3] = 0.78; colors[i * 3 + 1] = 0.49; colors[i * 3 + 2] = 1;
      }
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.bgStars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.bgStars);

    const neonColors = [0xff4fd8, 0x00f0ff, 0xc77dff];
    for (let i = 0; i < 3; i++) {
      const points: THREE.Vector3[] = [];
      const y = -5 + i * 0.3;
      for (let x = -80; x <= 80; x += 2) {
        points.push(new THREE.Vector3(x, y + Math.sin(x * 0.05 + i) * 0.3, -12 + i * 2));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: neonColors[i],
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      });
      const line = new THREE.Line(geo, mat);
      this.bgNeonLines.push(line);
      this.scene.add(line);
    }
  }

  private createPlayer(): void {
    this.player = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(0.9, 1.4, 0.6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xff4fd8,
      emissive: 0xff4fd8,
      emissiveIntensity: 0.35,
      metalness: 0.6,
      roughness: 0.25
    });
    this.playerBody = new THREE.Mesh(bodyGeo, bodyMat);
    this.playerBody.position.y = 0;
    this.playerBody.castShadow = true;
    this.player.add(this.playerBody);

    const headGeo = new THREE.SphereGeometry(0.5, 24, 24);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffd4f0,
      emissive: 0xff8ae6,
      emissiveIntensity: 0.2,
      metalness: 0.3,
      roughness: 0.4
    });
    this.playerHead = new THREE.Mesh(headGeo, headMat);
    this.playerHead.position.y = 1.1;
    this.playerHead.castShadow = true;
    this.player.add(this.playerHead);

    const eyeGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.18, 1.15, 0.45);
    eyeR.position.set(0.18, 1.15, 0.45);
    this.player.add(eyeL, eyeR);

    const legGeo = new THREE.BoxGeometry(0.3, 0.9, 0.3);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00a0aa,
      emissiveIntensity: 0.3,
      metalness: 0.5,
      roughness: 0.3
    });
    this.playerLegL = new THREE.Mesh(legGeo, legMat);
    this.playerLegL.position.set(-0.22, -1.15, 0);
    this.playerLegL.castShadow = true;
    this.playerLegR = new THREE.Mesh(legGeo, legMat);
    this.playerLegR.position.set(0.22, -1.15, 0);
    this.playerLegR.castShadow = true;
    this.player.add(this.playerLegL, this.playerLegR);

    const haloGeo = new THREE.RingGeometry(0.8, 0.85, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xc77dff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -1.8;
    this.player.add(halo);

    this.player.position.set(PLAYER_X, this.playerY, 0);
    this.scene.add(this.player);

    for (let i = 0; i < 6; i++) {
      const trailGeo = new THREE.BoxGeometry(0.7, 1.2, 0.4);
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0xff4fd8,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
      });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      this.playerTrail.push(trail);
      this.scene.add(trail);
    }
  }

  private createInitialPlatforms(): void {
    for (let i = 0; i < 8; i++) {
      this.createPlatform(i * 15 - 15);
    }
  }

  private createPlatform(startX: number): PlatformSegment {
    const length = 12 + Math.random() * 8;
    const geo = new THREE.BoxGeometry(length, 1.2, 4);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a0a2e,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x3d0066,
      emissiveIntensity: 0.25
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(startX + length / 2, GROUND_Y - 0.1, 0);
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const edgeGeo = new THREE.BoxGeometry(length + 0.05, 0.08, 4.1);
    const edgeMat = new THREE.MeshBasicMaterial({
      color: Math.random() < 0.5 ? 0xff4fd8 : 0x00f0ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const edgeTop = new THREE.Mesh(edgeGeo, edgeMat);
    edgeTop.position.set(startX + length / 2, GROUND_Y + 0.5, 0);
    this.scene.add(edgeTop);

    const segment: PlatformSegment = { mesh, length };
    this.platforms.push(segment);
    this.nextSpawnX = Math.max(this.nextSpawnX, startX + length + 3);
    return segment;
  }

  private spawnObstacle(): void {
    const types: ObstacleType[] = ['spike', 'bar', 'wall'];
    const weights = [0.4, 0.35, 0.25];
    const r = Math.random();
    let cumulative = 0;
    let type: ObstacleType = 'spike';
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (r < cumulative) {
        type = types[i];
        break;
      }
    }

    const group = new THREE.Group();
    let collider = { x: 0, y: 0, width: 0, height: 0 };
    let warningColor = 0xff0000;

    if (type === 'spike') {
      warningColor = 0xff1744;
      const spikeCount = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < spikeCount; i++) {
        const spikeGeo = new THREE.ConeGeometry(0.35, 1.2, 4);
        const spikeMat = new THREE.MeshStandardMaterial({
          color: 0xff1744,
          emissive: 0xff1744,
          emissiveIntensity: 0.6,
          metalness: 0.8,
          roughness: 0.2
        });
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set(i * 0.7 - (spikeCount - 1) * 0.35, GROUND_Y + 0.6, 0);
        spike.rotation.y = Math.PI / 4;
        spike.castShadow = true;
        group.add(spike);
      }
      collider = { x: PLAYER_X + 0.3, y: GROUND_Y, width: spikeCount * 0.7, height: 1.2 };
    } else if (type === 'bar') {
      warningColor = 0x2979ff;
      const barGeo = new THREE.BoxGeometry(1.6, 0.3, 0.5);
      const barMat = new THREE.MeshStandardMaterial({
        color: 0x2979ff,
        emissive: 0x2979ff,
        emissiveIntensity: 0.6,
        metalness: 0.8,
        roughness: 0.2
      });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.y = GROUND_Y + 1.9;
      bar.castShadow = true;
      group.add(bar);

      const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8);
      const poleMat = new THREE.MeshStandardMaterial({
        color: 0x448aff,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x448aff,
        emissiveIntensity: 0.3
      });
      const poleL = new THREE.Mesh(poleGeo, poleMat);
      const poleR = new THREE.Mesh(poleGeo, poleMat);
      poleL.position.set(-0.85, GROUND_Y + 1.1, 0);
      poleR.position.set(0.85, GROUND_Y + 1.1, 0);
      group.add(poleL, poleR);

      collider = { x: PLAYER_X + 0.2, y: GROUND_Y + 1.55, width: 1.6, height: 0.8 };
    } else {
      warningColor = 0x00e676;
      const wallGeo = new THREE.BoxGeometry(0.7, 3.5, 0.6);
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x00e676,
        emissive: 0x00e676,
        emissiveIntensity: 0.5,
        metalness: 0.6,
        roughness: 0.3,
        transparent: true,
        opacity: 0.85
      });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.y = GROUND_Y + 1.75;
      wall.castShadow = true;
      group.add(wall);

      const stripesGeo = new THREE.BoxGeometry(0.72, 0.08, 0.62);
      const stripesMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      });
      for (let i = 0; i < 5; i++) {
        const stripe = new THREE.Mesh(stripesGeo, stripesMat);
        stripe.position.y = GROUND_Y + 0.5 + i * 0.7;
        group.add(stripe);
      }

      collider = { x: PLAYER_X + 0.1, y: GROUND_Y, width: 0.7, height: 3.5 };
    }

    const warnGeo = new THREE.RingGeometry(1.2, 1.5, 32);
    const warnMat = new THREE.MeshBasicMaterial({
      color: warningColor,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const warning = new THREE.Mesh(warnGeo, warnMat);
    warning.position.set(0, GROUND_Y + 1.5, -0.1);
    warning.scale.set(1, 1, 1);
    group.add(warning);

    const spawnX = this.nextSpawnX + 5 + Math.random() * this.spawnInterval;
    group.position.x = spawnX;

    const obstacle: Obstacle = {
      group,
      type,
      passed: false,
      warning,
      warningTime: 0,
      collider: { ...collider, x: collider.x - PLAYER_X + spawnX },
      movingDirection: type === 'wall' ? 1 : undefined,
      movingRange: type === 'wall' ? 0.8 : undefined,
      startX: type === 'wall' ? spawnX : undefined
    };

    this.obstacles.push(obstacle);
    this.scene.add(group);

    if (Math.random() < 0.35) {
      this.createPlatform(spawnX + 6 + Math.random() * 3);
    }
    this.nextSpawnX = spawnX + 10;
  }

  private spawnParticles(x: number, y: number, color: number, count: number = 20, power: number = 6): void {
    for (let i = 0; i < count; i++) {
      const size = 0.08 + Math.random() * 0.18;
      const geo = new THREE.SphereGeometry(size, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, Math.random() * 1 - 0.5);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = power * (0.3 + Math.random() * 0.7);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed + 2, 0),
        life: 0.6 + Math.random() * 0.4,
        maxLife: 0.6 + Math.random() * 0.4,
        color: new THREE.Color(color),
        size
      });
    }
  }

  public onBandTrigger(band: keyof BandEnergy): void {
    if (!this.gameState.isStarted || this.gameState.isPaused || this.gameState.isGameOver) return;

    switch (band) {
      case 'low':
        this.tryJump();
        break;
      case 'mid':
        this.trySlide();
        break;
      case 'high':
        this.tryBoost();
        break;
    }
  }

  private tryJump(): void {
    if (this.gameState.playerState === 'running' || this.gameState.playerState === 'boosting') {
      this.playerVelocity = JUMP_VELOCITY;
      this.gameState.playerState = 'jumping';
      this.stateTimer = 0;
      this.spawnParticles(PLAYER_X, GROUND_Y + 0.5, 0xff4fd8, 12, 3);
      this.emit('jump');
    }
  }

  private trySlide(): void {
    if (this.gameState.playerState === 'running' || this.gameState.playerState === 'boosting') {
      this.gameState.playerState = 'sliding';
      this.stateTimer = SLIDE_DURATION;
      this.spawnParticles(PLAYER_X, GROUND_Y + 0.5, 0x00e676, 10, 2);
      this.emit('slide');
    } else if (this.gameState.playerState === 'jumping') {
      this.playerVelocity = -JUMP_VELOCITY * 1.2;
      this.gameState.playerState = 'sliding';
      this.stateTimer = SLIDE_DURATION * 0.7;
      this.emit('slide');
    }
  }

  private tryBoost(): void {
    if (this.gameState.playerState === 'running' || this.gameState.playerState === 'jumping') {
      this.gameState.playerState = 'boosting';
      this.stateTimer = BOOST_DURATION;
      this.emit('boost');
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.gameState.isStarted) return;

    switch (e.code) {
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        e.preventDefault();
        this.tryJump();
        break;
      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        this.trySlide();
        break;
      case 'ArrowRight':
      case 'KeyD':
        e.preventDefault();
        this.tryBoost();
        break;
      case 'KeyP':
      case 'Escape':
        this.togglePause();
        break;
    }
  };

  public start(): void {
    if (this.gameState.isStarted) return;
    this.gameState.isStarted = true;
    this.gameState.isPaused = false;
    this.gameState.isGameOver = false;
    this.clock.start();
    this.lastTime = performance.now();
    this.loop();
    this.emit('start');
  }

  public togglePause(): void {
    if (this.gameState.isGameOver || !this.gameState.isStarted) return;
    this.gameState.isPaused = !this.gameState.isPaused;
    this.emit(this.gameState.isPaused ? 'pause' : 'resume');
    if (!this.gameState.isPaused) {
      this.lastTime = performance.now();
      this.clock.start();
    }
  }

  public reset(): void {
    this.gameState = {
      score: 0,
      lives: 3,
      maxLives: 3,
      speed: 14,
      baseSpeed: 14,
      isPaused: false,
      isGameOver: false,
      isStarted: false,
      playerState: 'running'
    };

    this.worldOffset = 0;
    this.nextSpawnX = 20;
    this.playerVelocity = 0;
    this.playerY = GROUND_Y + 1.5;
    this.player.position.y = this.playerY;
    this.stateTimer = 0;
    this.invincibleTimer = 0;
    this.playerScale.set(1, 1, 1);
    this.player.scale.copy(this.playerScale);

    this.obstacles.forEach((o) => this.scene.remove(o.group));
    this.obstacles = [];
    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.particles = [];
    this.platforms.forEach((p) => {
      this.scene.remove(p.mesh);
      this.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj !== p.mesh &&
            Math.abs(obj.position.x - p.mesh.position.x) < p.length / 2 + 1 &&
            Math.abs(obj.position.y - (GROUND_Y + 0.5)) < 0.1) {
          this.scene.remove(obj);
        }
      });
    });
    this.platforms = [];
    this.createInitialPlatforms();

    this.playerBody.material = new THREE.MeshStandardMaterial({
      color: 0xff4fd8,
      emissive: 0xff4fd8,
      emissiveIntensity: 0.35,
      metalness: 0.6,
      roughness: 0.25
    });
    this.emit('reset');
  }

  private getPlayerCollider(): { y: number; height: number } {
    const state = this.gameState.playerState;
    if (state === 'sliding') {
      return { y: this.playerY - 0.3, height: 1.2 };
    }
    return { y: this.playerY - 0.7, height: 2.6 };
  }

  private checkCollision(obstacle: Obstacle): boolean {
    const pc = this.getPlayerCollider();
    const pxMin = PLAYER_X - 0.4;
    const pxMax = PLAYER_X + 0.4;
    const pyMin = pc.y;
    const pyMax = pc.y + pc.height;

    const ox = obstacle.group.position.x;
    if (obstacle.type === 'wall' && obstacle.startX !== undefined && obstacle.movingRange !== undefined) {
      const t = performance.now() * 0.001;
      const offset = Math.sin(t * 1.8) * obstacle.movingRange;
      obstacle.group.position.x = obstacle.startX + this.worldOffset + offset;
      obstacle.collider.x = ox - PLAYER_X + PLAYER_X;
    }

    const oc = obstacle.collider;
    const oxMin = obstacle.group.position.x - oc.width / 2 + oc.x - (PLAYER_X + (obstacle.type !== 'wall' ? 0 : 0));
    const oxMinFinal = obstacle.group.position.x - oc.width / 2;
    const oxMaxFinal = obstacle.group.position.x + oc.width / 2;
    const oyMin = oc.y;
    const oyMax = oc.y + oc.height;

    if (pxMax > oxMinFinal && pxMin < oxMaxFinal &&
        pyMax > oyMin && pyMin < oyMax) {
      return true;
    }

    return oc.x !== undefined && (
      pxMax > obstacle.group.position.x - oc.width / 2 &&
      pxMin < obstacle.group.position.x + oc.width / 2 &&
      pyMax > oc.y && pyMin < oc.y + oc.height
    );
  }

  private handlePlayerState(dt: number): void {
    const state = this.gameState.playerState;
    this.stateTimer -= dt;
    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);

    if (state === 'jumping' || this.playerY > GROUND_Y + 1.51) {
      this.playerVelocity += GRAVITY * dt;
      this.playerY += this.playerVelocity * dt;

      if (this.playerY <= GROUND_Y + 1.5) {
        this.playerY = GROUND_Y + 1.5;
        this.playerVelocity = 0;
        if (state === 'jumping') {
          this.spawnParticles(PLAYER_X, GROUND_Y + 0.5, 0xc77dff, 10, 2);
          if (this.stateTimer <= 0) this.gameState.playerState = 'running';
        }
      }
    }

    if (this.stateTimer <= 0 && (state === 'sliding' || state === 'boosting' || state === 'hurt')) {
      if (this.playerY > GROUND_Y + 1.51) {
        this.gameState.playerState = 'jumping';
      } else if (state !== 'hurt') {
        this.gameState.playerState = 'running';
      } else {
        this.gameState.playerState = 'running';
      }
    }

    this.updatePlayerVisuals(dt);
  }

  private updatePlayerVisuals(dt: number): void {
    const state = this.gameState.playerState;
    const target = new THREE.Vector3(1, 1, 1);
    let headTilt = 0;

    if (state === 'jumping') {
      const jumpProgress = Math.max(0, Math.min(1, (this.playerY - (GROUND_Y + 1.5)) / 8));
      target.set(0.9, 1.15, 1);
      headTilt = -0.25 * jumpProgress;
    } else if (state === 'sliding') {
      target.set(1.3, 0.55, 1);
      headTilt = 0.3;
    } else if (state === 'boosting') {
      target.set(0.85, 1.1, 1.1);
      headTilt = 0.1;
    } else if (state === 'hurt') {
      target.set(0.9, 0.95, 0.9);
    }

    this.playerScale.lerp(target, Math.min(1, dt * 12));
    this.player.scale.copy(this.playerScale);

    this.player.position.y = this.playerY + (state === 'sliding' ? -0.8 : 0);
    this.playerHead.rotation.z = THREE.MathUtils.lerp(this.playerHead.rotation.z, headTilt, Math.min(1, dt * 10));

    if (state === 'hurt' && this.invincibleTimer > 0) {
      const flash = Math.sin(this.invincibleTimer * 40) > 0 ? 0.2 : 1;
      (this.playerBody.material as THREE.MeshStandardMaterial).opacity = flash;
      (this.playerBody.material as THREE.MeshStandardMaterial).transparent = true;
    } else {
      (this.playerBody.material as THREE.MeshStandardMaterial).opacity = 1;
      (this.playerBody.material as THREE.MeshStandardMaterial).transparent = false;
    }

    if (state === 'running' || state === 'boosting') {
      this.legPhase += dt * (state === 'boosting' ? 18 : 12);
      const legA = Math.sin(this.legPhase) * 0.5;
      this.playerLegL.rotation.x = legA;
      this.playerLegR.rotation.x = -legA;
    } else if (state === 'sliding') {
      this.playerLegL.rotation.x = THREE.MathUtils.lerp(this.playerLegL.rotation.x, -1.2, dt * 10);
      this.playerLegR.rotation.x = THREE.MathUtils.lerp(this.playerLegR.rotation.x, -1.2, dt * 10);
    } else if (state === 'jumping') {
      this.playerLegL.rotation.x = THREE.MathUtils.lerp(this.playerLegL.rotation.x, -0.3, dt * 8);
      this.playerLegR.rotation.x = THREE.MathUtils.lerp(this.playerLegR.rotation.x, 0.3, dt * 8);
    }

    if (state === 'boosting') {
      const currentX = PLAYER_X;
      for (let i = this.playerTrail.length - 1; i >= 0; i--) {
        const t = this.playerTrail[i];
        t.position.x = currentX - (i + 1) * 0.25;
        t.position.y = this.player.position.y;
        t.position.z = -0.5 - i * 0.05;
        t.scale.copy(this.playerScale).multiplyScalar(1 - i * 0.12);
        (t.material as THREE.MeshBasicMaterial).opacity = 0.35 - i * 0.05;
        (t.material as THREE.MeshBasicMaterial).color.setHSL(0.85 - i * 0.02, 1, 0.6);
      }
    } else {
      for (const t of this.playerTrail) {
        (t.material as THREE.MeshBasicMaterial).opacity *= 0.9;
      }
    }
  }

  private updateObstacles(dt: number, speed: number): void {
    const distance = speed * dt;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      if (obs.type === 'wall' && obs.startX !== undefined && obs.movingRange !== undefined) {
        const t = performance.now() * 0.001;
        obs.group.position.x = obs.startX + this.worldOffset + Math.sin(t * 2.2) * obs.movingRange;
      } else {
        obs.group.position.x -= distance;
        if (obs.startX !== undefined) obs.startX -= distance;
      }
      obs.collider.x = obs.group.position.x;

      const dx = obs.group.position.x - PLAYER_X;
      if (dx < 12 && dx > -1) {
        obs.warningTime += dt;
        const pulse = (Math.sin(obs.warningTime * 14) + 1) / 2;
        const alpha = Math.max(0, Math.min(1, 1 - dx / 12)) * (0.3 + pulse * 0.7);
        const scale = 1 + pulse * 0.25;
        (obs.warning.material as THREE.MeshBasicMaterial).opacity = alpha;
        obs.warning.scale.set(scale, scale, 1);
      } else {
        (obs.warning.material as THREE.MeshBasicMaterial).opacity = 0;
      }

      if (!obs.passed && obs.group.position.x < PLAYER_X - 2) {
        obs.passed = true;
        if (this.invincibleTimer <= 0) {
          if (this.checkDodgedCorrectly(obs)) {
            const successColor = obs.type === 'spike' ? 0x00e676 :
              obs.type === 'bar' ? 0x00e676 : 0x00e676;
            this.spawnParticles(PLAYER_X - 1, GROUND_Y + 1.5, successColor, 18, 5);
            this.gameState.score += obs.type === 'wall' ? 150 : 100;
            this.emit('score', this.gameState.score);
          }
        }
      }

      if (this.invincibleTimer <= 0 && this.checkCollision(obs)) {
        this.onPlayerHit(obs.group.position.x);
      }

      if (obs.group.position.x < -25) {
        this.scene.remove(obs.group);
        this.obstacles.splice(i, 1);
      }
    }
  }

  private checkDodgedCorrectly(obs: Obstacle): boolean {
    const state = this.gameState.playerState;
    const wasInAir = this.playerY > GROUND_Y + 4;

    switch (obs.type) {
      case 'spike':
        return wasInAir || state === 'jumping';
      case 'bar':
        return state === 'sliding';
      case 'wall':
        return state === 'boosting';
      default:
        return true;
    }
  }

  private onPlayerHit(obsX: number): void {
    this.gameState.lives--;
    this.invincibleTimer = INVINCIBLE_DURATION;
    this.gameState.playerState = 'hurt';
    this.stateTimer = HURT_DURATION;
    this.playerVelocity = 10;

    this.spawnParticles(obsX, GROUND_Y + 1.5, 0xff1744, 30, 8);
    this.spawnParticles(PLAYER_X, this.playerY, 0xff5252, 20, 5);

    this.emit('hit', this.gameState.lives);

    if (this.gameState.lives <= 0) {
      this.gameState.isGameOver = true;
      this.spawnParticles(PLAYER_X, this.playerY, 0xff4fd8, 50, 10);
      this.emit('gameover', this.gameState.score);
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.velocity.y += GRAVITY * 0.4 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.life -= dt;

      const alpha = Math.max(0, p.life / p.maxLife);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
      const s = 1 + (1 - alpha) * 0.6;
      p.mesh.scale.setScalar(s);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  private updateBackground(dt: number, speed: number): void {
    const parallax = speed * dt * 0.15;
    if (this.bgStars) {
      const posAttr = this.bgStars.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        let x = posAttr.getX(i);
        x -= parallax * (0.3 + (i % 5) * 0.1);
        if (x < -60) x += 120;
        posAttr.setX(i, x);
      }
      posAttr.needsUpdate = true;
    }

    for (let i = 0; i < this.bgNeonLines.length; i++) {
      const line = this.bgNeonLines[i];
      const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let j = 0; j < posAttr.count; j++) {
        let x = posAttr.getX(j);
        x -= parallax * (0.4 + i * 0.15);
        if (x < -80) x += 160;
        posAttr.setX(j, x);
      }
      posAttr.needsUpdate = true;
    }
  }

  private updatePlatforms(speed: number, dt: number): void {
    const distance = speed * dt;
    this.worldOffset -= distance;

    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i];
      p.mesh.position.x -= distance;
      if (p.mesh.position.x < -40) {
        this.scene.remove(p.mesh);
        this.platforms.splice(i, 1);
      }
    }

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj !== this.playerBody &&
          obj.material instanceof THREE.MeshBasicMaterial &&
          Math.abs(obj.position.y - (GROUND_Y + 0.5)) < 0.1) {
        obj.position.x -= distance;
        if (obj.position.x < -40) {
          this.scene.remove(obj);
        }
      }
    });

    if (this.nextSpawnX + this.worldOffset < 40) {
      this.spawnObstacle();
    }
  }

  private loop = (): void => {
    this.animationId = requestAnimationFrame(this.loop);

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    dt = Math.min(dt, 0.05);

    if (this.gameState.isPaused || !this.gameState.isStarted || this.gameState.isGameOver) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const state = this.gameState.playerState;
    const currentSpeed = this.gameState.baseSpeed * (state === 'boosting' ? BOOST_MULTIPLIER : 1);
    this.gameState.speed = currentSpeed;

    this.gameState.score += Math.floor(currentSpeed * dt * 8);
    this.emit('score', this.gameState.score);

    this.gameState.baseSpeed = Math.min(22, this.gameState.baseSpeed + dt * 0.08);

    this.handlePlayerState(dt);
    this.updatePlatforms(currentSpeed, dt);
    this.updateObstacles(dt, currentSpeed);
    this.updateParticles(dt);
    this.updateBackground(dt, currentSpeed);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKeyDown);
    this.renderer.dispose();
  }
}
