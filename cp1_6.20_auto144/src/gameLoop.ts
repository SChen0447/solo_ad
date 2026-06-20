import * as THREE from 'three';
import { GameState, EnergyCore, Particle, DustParticle, WALL_COLORS, PLAYER_RADIUS, CORE_RADIUS, CELL_SIZE, WALL_HEIGHT, DUST_PARTICLE_COUNT, MAX_PARTICLES, MazeData, BeatEvent } from './types';
import { AudioEngine } from './audioEngine';
import { MazeGenerator } from './mazeGenerator';
import { PlayerController } from './playerController';
import { ObstacleSpawner } from './obstacleSpawner';

class RhythmCorridorGame {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private audioEngine: AudioEngine;
  private mazeGenerator: MazeGenerator;
  private playerController: PlayerController;
  private obstacleSpawner: ObstacleSpawner;

  private gameState: GameState = 'title';
  private currentLevel: number = 1;
  private score: number = 0;
  private mazeData: MazeData | null = null;
  private energyCores: EnergyCore[] = [];
  private collectedCores: number = 0;
  private totalCores: number = 0;

  private playerMesh: THREE.Mesh | null = null;
  private playerGlow: THREE.Mesh | null = null;
  private playerLight: THREE.PointLight | null = null;
  private wallMeshes: THREE.Mesh[] = [];
  private floorMesh: THREE.Mesh | null = null;
  private obstacleMeshes: Map<number, THREE.Mesh> = new Map();
  private coreMeshes: Map<number, THREE.Mesh> = new Map();
  private coreGlowMeshes: Map<number, THREE.Mesh> = new Map();
  private particles: Particle[] = [];
  private particleMeshes: Map<number, THREE.Mesh> = new Map();
  private dustParticles: DustParticle[] = [];
  private dustMesh: THREE.Points | null = null;
  private explosionEffects: { mesh: THREE.Mesh; life: number; maxLife: number }[] = [];

  private nextParticleId: number = 0;
  private nextCoreId: number = 0;

  private hudLives: HTMLElement;
  private hudLevel: HTMLElement;
  private hudScore: HTMLElement;
  private hudProgressFill: HTMLElement;
  private hudProgressText: HTMLElement;
  private beatIndicator: HTMLElement;
  private titleScreen: HTMLElement;
  private pauseScreen: HTMLElement;
  private resultScreen: HTMLElement;
  private resultTitle: HTMLElement;
  private resultStats: HTMLElement;
  private nextBtn: HTMLElement;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.clock = new THREE.Clock();

    this.audioEngine = new AudioEngine();
    this.mazeGenerator = new MazeGenerator();
    this.playerController = new PlayerController();
    this.obstacleSpawner = new ObstacleSpawner(this.audioEngine);

    this.hudLives = document.getElementById('lives')!;
    this.hudLevel = document.getElementById('level')!;
    this.hudScore = document.getElementById('score-value')!;
    this.hudProgressFill = document.getElementById('progress-fill')!;
    this.hudProgressText = document.getElementById('progress-text')!;
    this.beatIndicator = document.getElementById('beat-indicator')!;
    this.titleScreen = document.getElementById('title-screen')!;
    this.pauseScreen = document.getElementById('pause-screen')!;
    this.resultScreen = document.getElementById('result-screen')!;
    this.resultTitle = document.getElementById('result-title')!;
    this.resultStats = document.getElementById('result-stats')!;
    this.nextBtn = document.getElementById('next-btn')!;

    this.init();
  }

  private init(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    document.getElementById('app')!.appendChild(this.renderer.domElement);

    this.setupBackground();
    this.setupLights();
    this.setupDustParticles();
    this.setupEventListeners();

    this.audioEngine.init();

    this.audioEngine.on('beat', (event: BeatEvent) => {
      this.showBeatIndicator();
    });

    this.playerController.on('pauseToggle', () => {
      if (this.gameState === 'playing') {
        this.pauseGame();
      } else if (this.gameState === 'paused') {
        this.resumeGame();
      }
    });

    this.playerController.on('hit', () => {
      this.spawnHitParticles();
      this.shakeCamera();
    });

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#0F0F23');
    gradient.addColorStop(1, '#1A1A3E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    this.playerLight = new THREE.PointLight(0x00D4FF, 2, 15);
    this.playerLight.position.set(0, 3, 0);
    this.scene.add(this.playerLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.4);
    topLight.position.set(0, 20, 0);
    this.scene.add(topLight);
  }

  private setupDustParticles(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(DUST_PARTICLE_COUNT * 3);
    const colors = new Float32Array(DUST_PARTICLE_COUNT * 3);
    const sizes = new Float32Array(DUST_PARTICLE_COUNT);

    for (let i = 0; i < DUST_PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 30;
      const y = Math.random() * 3;
      const z = (Math.random() - 0.5) * 30;
      const size = 0.02 + Math.random() * 0.03;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      colors[i * 3] = 0;
      colors[i * 3 + 1] = 0.83;
      colors[i * 3 + 2] = 1;

      sizes[i] = size;

      this.dustParticles.push({
        position: { x, y, z },
        baseY: y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        size
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.dustMesh = new THREE.Points(geometry, material);
    this.scene.add(this.dustMesh);
  }

  private setupEventListeners(): void {
    document.getElementById('start-btn')!.addEventListener('click', () => this.startGame());
    document.getElementById('resume-btn')!.addEventListener('click', () => this.resumeGame());
    document.getElementById('restart-pause-btn')!.addEventListener('click', () => this.restartGame());
    document.getElementById('restart-btn')!.addEventListener('click', () => this.restartGame());
    document.getElementById('next-btn')!.addEventListener('click', () => this.nextLevel());
  }

  private startGame(): void {
    this.titleScreen.classList.add('hidden');
    this.currentLevel = 1;
    this.score = 0;
    this.loadLevel(this.currentLevel);
    this.gameState = 'playing';
    this.audioEngine.start();
    this.updateHUD();
  }

  private pauseGame(): void {
    if (this.gameState !== 'playing') return;
    this.gameState = 'paused';
    this.pauseScreen.classList.remove('hidden');
    this.audioEngine.pause();
  }

  private resumeGame(): void {
    if (this.gameState !== 'paused') return;
    this.gameState = 'playing';
    this.pauseScreen.classList.add('hidden');
    this.audioEngine.start();
  }

  private restartGame(): void {
    this.pauseScreen.classList.add('hidden');
    this.resultScreen.classList.add('hidden');
    this.titleScreen.classList.add('hidden');
    this.currentLevel = 1;
    this.score = 0;
    this.loadLevel(this.currentLevel);
    this.gameState = 'playing';
    this.audioEngine.start();
    this.updateHUD();
  }

  private nextLevel(): void {
    this.resultScreen.classList.add('hidden');
    this.currentLevel++;
    this.loadLevel(this.currentLevel);
    this.gameState = 'playing';
    this.audioEngine.start();
    this.updateHUD();
  }

  private showWinScreen(): void {
    this.gameState = 'win';
    this.audioEngine.pause();
    this.resultTitle.textContent = '关卡完成!';
    this.resultTitle.className = 'result-text win';
    this.resultStats.textContent = `得分: ${this.score}  |  关卡: ${this.currentLevel}`;
    this.nextBtn.textContent = '下一关';
    this.nextBtn.style.display = '';
    this.resultScreen.classList.remove('hidden');
  }

  private showLoseScreen(): void {
    this.gameState = 'lose';
    this.audioEngine.stop();
    this.resultTitle.textContent = '游戏结束';
    this.resultTitle.className = 'result-text lose';
    this.resultStats.textContent = `最终得分: ${this.score}  |  到达关卡: ${this.currentLevel}`;
    this.nextBtn.style.display = 'none';
    this.resultScreen.classList.remove('hidden');
  }

  private loadLevel(level: number): void {
    this.clearLevel();

    this.mazeData = this.mazeGenerator.generate(level);
    this.playerController.setMazeData(this.mazeData);
    this.obstacleSpawner.setMazeData(this.mazeData);

    this.createFloor();
    this.createWalls();
    this.createPlayer();

    this.playerController.reset(this.mazeData.startPos);
    this.obstacleSpawner.clear();

    this.totalCores = 5 + level * 2;
    this.collectedCores = 0;
    this.spawnEnergyCores();

    const bpm = 100 + level * 10;
    this.audioEngine.setBPM(Math.min(bpm, 160));

    this.updateHUD();
  }

  private clearLevel(): void {
    this.wallMeshes.forEach(m => {
      this.scene.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
        else m.material.dispose();
      }
    });
    this.wallMeshes = [];

    this.obstacleMeshes.forEach(m => {
      this.scene.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
    this.obstacleMeshes.clear();

    this.coreMeshes.forEach(m => {
      this.scene.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
    this.coreMeshes.clear();

    this.coreGlowMeshes.forEach(m => {
      this.scene.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
    this.coreGlowMeshes.clear();

    if (this.floorMesh) {
      this.scene.remove(this.floorMesh);
      if (this.floorMesh.geometry) this.floorMesh.geometry.dispose();
      if (this.floorMesh.material) (this.floorMesh.material as THREE.Material).dispose();
      this.floorMesh = null;
    }

    if (this.playerMesh) {
      this.scene.remove(this.playerMesh);
    }
    if (this.playerGlow) {
      this.scene.remove(this.playerGlow);
    }

    this.particles.forEach(p => {
      const mesh = this.particleMeshes.get(p.id);
      if (mesh) {
        this.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) (mesh.material as THREE.Material).dispose();
      }
    });
    this.particles = [];
    this.particleMeshes.clear();

    this.explosionEffects.forEach(e => {
      this.scene.remove(e.mesh);
      if (e.mesh.geometry) e.mesh.geometry.dispose();
      if (e.mesh.material) (e.mesh.material as THREE.Material).dispose();
    });
    this.explosionEffects = [];

    this.energyCores = [];
  }

  private createFloor(): void {
    if (!this.mazeData) return;

    const width = this.mazeData.width * CELL_SIZE + 4;
    const height = this.mazeData.height * CELL_SIZE + 4;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#1A1A3E');
    gradient.addColorStop(0.5, '#151530');
    gradient.addColorStop(1, '#0F0F23');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 512; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(width / 4, height / 4);

    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.1
    });

    this.floorMesh = new THREE.Mesh(geometry, material);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = -0.5;
    this.scene.add(this.floorMesh);
  }

  private createWalls(): void {
    if (!this.mazeData) return;

    const geometry = new THREE.BoxGeometry(CELL_SIZE * 0.95, WALL_HEIGHT, CELL_SIZE * 0.95);

    this.mazeData.walls.forEach(wall => {
      const color = WALL_COLORS[Math.floor(Math.random() * WALL_COLORS.length)];
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.7,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.15,
        roughness: 0.3,
        metalness: 0.5
      });

      const mesh = new THREE.Mesh(geometry, material);
      const worldPos = this.mazeGenerator.gridToWorld(wall.x, wall.z, this.mazeData!);
      mesh.position.set(worldPos.x, WALL_HEIGHT / 2 - 0.5, worldPos.z);
      this.scene.add(mesh);
      this.wallMeshes.push(mesh);
    });
  }

  private createPlayer(): void {
    const playerGeometry = new THREE.SphereGeometry(PLAYER_RADIUS, 32, 32);
    const playerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1
    });
    this.playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    this.scene.add(this.playerMesh);

    const glowGeometry = new THREE.SphereGeometry(PLAYER_RADIUS * 1.8, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00D4FF,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    this.playerGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.scene.add(this.playerGlow);
  }

  private spawnEnergyCores(): void {
    if (!this.mazeData) return;

    const usedPositions: { x: number; z: number }[] = [];
    const startGrid = this.mazeGenerator.worldToGrid(this.mazeData.startPos.x, this.mazeData.startPos.z, this.mazeData);
    usedPositions.push(startGrid);

    for (let i = 0; i < this.totalCores; i++) {
      const passage = this.mazeGenerator.getRandomPassage(this.mazeData, usedPositions, 2);
      if (!passage) continue;

      usedPositions.push(passage);
      const worldPos = this.mazeGenerator.gridToWorld(passage.x, passage.z, this.mazeData);

      const core: EnergyCore = {
        id: this.nextCoreId++,
        position: worldPos,
        collected: false,
        pulsePhase: Math.random() * Math.PI * 2
      };
      this.energyCores.push(core);

      const geometry = new THREE.OctahedronGeometry(CORE_RADIUS, 0);
      const material = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(worldPos.x, 0.3, worldPos.z);
      this.scene.add(mesh);
      this.coreMeshes.set(core.id, mesh);

      const glowGeometry = new THREE.SphereGeometry(CORE_RADIUS * 1.5, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.set(worldPos.x, 0.3, worldPos.z);
      this.scene.add(glowMesh);
      this.coreGlowMeshes.set(core.id, glowMesh);
    }
  }

  private spawnHitParticles(): void {
    const pos = this.playerController.getPosition();
    const count = 20 + Math.floor(Math.random() * 11);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;

      const particle: Particle = {
        id: this.nextParticleId++,
        position: { x: pos.x, y: 0.3, z: pos.z },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.random() * 2,
          z: Math.sin(angle) * speed
        },
        life: 0.5,
        maxLife: 0.5,
        startSize: 0.1,
        endSize: 0,
        color: Math.random() > 0.5 ? '#FFFFFF' : '#FF6B6B'
      };

      this.particles.push(particle);

      const geometry = new THREE.SphereGeometry(particle.startSize, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(particle.color),
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(particle.position.x, particle.position.y, particle.position.z);
      this.scene.add(mesh);
      this.particleMeshes.set(particle.id, mesh);
    }
  }

  private spawnCollectEffect(position: { x: number; z: number }): void {
    const geometry = new THREE.RingGeometry(0.2, 0.25, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.position.set(position.x, 0.5, position.z);
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);

    this.explosionEffects.push({
      mesh: ring,
      life: 0.3,
      maxLife: 0.3
    });
  }

  private shakeCamera(): void {
    this.cameraShakeTime = 0.2;
    this.cameraShakeIntensity = 0.15;
  }

  private cameraShakeTime: number = 0;
  private cameraShakeIntensity: number = 0;

  private showBeatIndicator(): void {
    this.beatIndicator.classList.remove('pulse');
    void this.beatIndicator.offsetWidth;
    this.beatIndicator.classList.add('pulse');
  }

  private updateHUD(): void {
    let heartsHTML = '';
    const lives = this.playerController.getLives();
    for (let i = 0; i < 3; i++) {
      heartsHTML += i < lives ? '❤️' : '🖤';
    }
    this.hudLives.innerHTML = heartsHTML;

    this.hudLevel.textContent = String(this.currentLevel);
    this.hudScore.textContent = String(this.score);

    const progress = this.totalCores > 0 ? (this.collectedCores / this.totalCores) * 100 : 0;
    this.hudProgressFill.style.width = `${progress}%`;
    this.hudProgressText.textContent = `能量核心: ${this.collectedCores} / ${this.totalCores}`;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private update(dt: number): void {
    if (this.gameState !== 'playing') {
      this.audioEngine.update(dt);
      return;
    }

    this.audioEngine.update(dt);
    this.playerController.update(dt);
    this.obstacleSpawner.setPlayerPosition(this.playerController.getPosition());
    this.obstacleSpawner.update(dt);

    if (this.cameraShakeTime > 0) {
      this.cameraShakeTime -= dt;
    }

    const playerPos = this.playerController.getPosition();

    if (this.playerMesh) {
      this.playerMesh.position.set(playerPos.x, 0.3, playerPos.z);
      const isFlashing = this.playerController.isFlashing();
      const mat = this.playerMesh.material as THREE.MeshBasicMaterial;
      if (isFlashing) {
        mat.color.setHex(0xFF6B6B);
        mat.opacity = 0.5 + Math.sin(Date.now() * 0.05) * 0.5;
      } else {
        mat.color.setHex(0xFFFFFF);
        mat.opacity = 1;
      }
    }

    if (this.playerGlow) {
      this.playerGlow.position.set(playerPos.x, 0.3, playerPos.z);
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.1;
      this.playerGlow.scale.set(scale, scale, scale);
    }

    if (this.playerLight) {
      this.playerLight.position.set(playerPos.x, 3, playerPos.z);
    }

    const targetCamX = playerPos.x;
    const targetCamZ = playerPos.z + 12;
    const targetCamY = 10;

    let camShakeX = 0;
    let camShakeZ = 0;
    if (this.cameraShakeTime > 0) {
      camShakeX = (Math.random() - 0.5) * this.cameraShakeIntensity * 2;
      camShakeZ = (Math.random() - 0.5) * this.cameraShakeIntensity * 2;
    }

    this.camera.position.x += (targetCamX + camShakeX - this.camera.position.x) * 0.08;
    this.camera.position.y += (targetCamY - this.camera.position.y) * 0.08;
    this.camera.position.z += (targetCamZ + camShakeZ - this.camera.position.z) * 0.08;
    this.camera.lookAt(playerPos.x, 0, playerPos.z);

    const obstacles = this.obstacleSpawner.getObstacles();
    const existingIds = new Set(this.obstacleMeshes.keys());

    obstacles.forEach(obs => {
      let mesh = this.obstacleMeshes.get(obs.id);
      if (!mesh) {
        const geometry = new THREE.SphereGeometry(obs.radius, 16, 16);
        const material = new THREE.MeshBasicMaterial({
          color: 0xFF4444,
          transparent: true,
          opacity: 0.9
        });
        mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);
        this.obstacleMeshes.set(obs.id, mesh);
      }
      existingIds.delete(obs.id);
      mesh.position.set(obs.position.x, 0.3, obs.position.z);

      const pulseScale = 1 + Math.sin(Date.now() * 0.01 + obs.id) * 0.1;
      mesh.scale.set(pulseScale, pulseScale, pulseScale);
    });

    existingIds.forEach(id => {
      const mesh = this.obstacleMeshes.get(id);
      if (mesh) {
        this.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) (mesh.material as THREE.Material).dispose();
      }
      this.obstacleMeshes.delete(id);
    });

    this.energyCores.forEach(core => {
      const mesh = this.coreMeshes.get(core.id);
      const glowMesh = this.coreGlowMeshes.get(core.id);
      if (mesh && glowMesh && !core.collected) {
        core.pulsePhase += dt * 3;
        const pulse = 1 + Math.sin(core.pulsePhase) * 0.2;
        mesh.scale.set(pulse, pulse, pulse);
        mesh.rotation.y += dt * 2;
        mesh.rotation.x += dt * 1.5;

        const glowScale = pulse * 1.5;
        glowMesh.scale.set(glowScale, glowScale, glowScale);
      }
    });

    const hitObstacle = this.playerController.checkObstacleCollision(obstacles);
    if (hitObstacle) {
      const isDead = this.playerController.loseLife();
      this.updateHUD();
      if (isDead) {
        this.showLoseScreen();
        return;
      } else if (this.mazeData) {
        this.playerController.resetPosition(this.mazeData.startPos);
      }
    }

    const collectedCore = this.playerController.checkCoreCollision(this.energyCores);
    if (collectedCore) {
      collectedCore.collected = true;
      this.collectedCores++;
      this.score += 100 * this.currentLevel;
      this.spawnCollectEffect(collectedCore.position);

      const mesh = this.coreMeshes.get(collectedCore.id);
      const glowMesh = this.coreGlowMeshes.get(collectedCore.id);
      if (mesh) {
        this.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) (mesh.material as THREE.Material).dispose();
      }
      if (glowMesh) {
        this.scene.remove(glowMesh);
        if (glowMesh.geometry) glowMesh.geometry.dispose();
        if (glowMesh.material) (glowMesh.material as THREE.Material).dispose();
      }
      this.coreMeshes.delete(collectedCore.id);
      this.coreGlowMeshes.delete(collectedCore.id);

      this.updateHUD();

      if (this.collectedCores >= this.totalCores) {
        this.score += 500 * this.currentLevel;
        this.showWinScreen();
        return;
      }
    }

    this.updateParticles(dt);
    this.updateExplosionEffects(dt);
    this.updateDustParticles(dt);
  }

  private updateParticles(dt: number): void {
    const toRemove: number[] = [];

    this.particles.forEach(p => {
      p.life -= dt;
      if (p.life <= 0) {
        toRemove.push(p.id);
        return;
      }

      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;
      p.velocity.y -= 5 * dt;

      const mesh = this.particleMeshes.get(p.id);
      if (mesh) {
        mesh.position.set(p.position.x, p.position.y, p.position.z);
        const t = p.life / p.maxLife;
        const scale = p.startSize * t + p.endSize * (1 - t);
        mesh.scale.set(scale / p.startSize, scale / p.startSize, scale / p.startSize);
        (mesh.material as THREE.MeshBasicMaterial).opacity = t;
      }
    });

    toRemove.forEach(id => {
      const mesh = this.particleMeshes.get(id);
      if (mesh) {
        this.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) (mesh.material as THREE.Material).dispose();
      }
      this.particleMeshes.delete(id);
    });

    this.particles = this.particles.filter(p => !toRemove.includes(p.id));
  }

  private updateExplosionEffects(dt: number): void {
    const toRemove: number[] = [];

    this.explosionEffects.forEach((e, i) => {
      e.life -= dt;
      if (e.life <= 0) {
        toRemove.push(i);
        return;
      }

      const t = e.life / e.maxLife;
      const scale = 0.2 + (1 - t) * 5;
      e.mesh.scale.set(scale, scale, scale);
      (e.mesh.material as THREE.MeshBasicMaterial).opacity = t * 0.8;
    });

    toRemove.reverse().forEach(i => {
      const e = this.explosionEffects[i];
      this.scene.remove(e.mesh);
      if (e.mesh.geometry) e.mesh.geometry.dispose();
      if (e.mesh.material) (e.mesh.material as THREE.Material).dispose();
      this.explosionEffects.splice(i, 1);
    });
  }

  private updateDustParticles(dt: number): void {
    if (!this.dustMesh) return;

    const positions = this.dustMesh.geometry.attributes.position.array as Float32Array;

    this.dustParticles.forEach((d, i) => {
      d.phase += dt * d.speed;
      const newY = d.baseY + Math.sin(d.phase) * 0.3;
      positions[i * 3 + 1] = newY;
      d.position.y = newY;
    });

    this.dustMesh.geometry.attributes.position.needsUpdate = true;
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  destroy(): void {
    this.audioEngine.destroy();
    this.playerController.destroy();
    this.obstacleSpawner.destroy();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new RhythmCorridorGame();
});
