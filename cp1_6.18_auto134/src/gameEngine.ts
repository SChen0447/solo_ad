import { SonarPhysics } from './sonarPhysics';
import { UIRenderer } from './uiRenderer';
import {
  createLevelData,
  type LevelData,
  type Mirror,
  type Enemy,
  type Obstacle,
  type Mechanism,
  type EnergyCore,
  type Particle,
  type Vector2,
} from './levelData';

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  onGround: boolean;
  health: number;
  maxHealth: number;
  facingRight: boolean;
  speedBoost: number;
  slimeTimer: number;
  invincibleTimer: number;
  coreGlowPhase: number;
}

interface GameInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  sonar: boolean;
}

interface SlimeBubble {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sonarPhysics: SonarPhysics;
  private uiRenderer: UIRenderer;
  private levelData: LevelData;

  private player: Player;
  private input: GameInput;

  private particles: Particle[] = [];
  private particleIdCounter = 0;
  private slimeBubbles: Map<number, SlimeBubble[]> = new Map();

  private animationFrameId: number = 0;
  private lastTime: number = 0;
  private fps: number = 60;
  private fpsTimer: number = 0;
  private fpsFrames: number = 0;
  private isRunning: boolean = false;

  private camera: Vector2 = { x: 0, y: 0 };
  private targetCamera: Vector2 = { x: 0, y: 0 };

  private sonarCooldown: number = 0;
  private sonarCooldownMax: number = 0.6;

  private collectedCores: number = 0;
  private totalCores: number = 0;

  private draggedMirror: Mirror | null = null;
  private isDragging: boolean = false;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;

  private audioContext: AudioContext | null = null;
  private audioEnabled: boolean = true;

  private gravity: number = 800;
  private moveSpeed: number = 200;
  private jumpForce: number = 400;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.levelData = createLevelData();

    this.sonarPhysics = new SonarPhysics(this.levelData.width, this.levelData.height);
    this.sonarPhysics.setLevelData(
      this.levelData.platforms,
      this.levelData.mirrors,
      this.levelData.enemies,
      this.levelData.obstacles,
      this.levelData.mechanisms
    );

    this.uiRenderer = new UIRenderer(canvas);

    this.player = {
      x: this.levelData.playerStart.x,
      y: this.levelData.playerStart.y,
      width: 28,
      height: 36,
      vx: 0,
      vy: 0,
      onGround: false,
      health: 3,
      maxHealth: 3,
      facingRight: true,
      speedBoost: 1,
      slimeTimer: 0,
      invincibleTimer: 0,
      coreGlowPhase: 0,
    };

    this.input = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      sonar: false,
    };

    this.totalCores = this.levelData.energyCores.length;
    this.uiRenderer.setTotalEnergyCores(this.totalCores);

    this.initSlimeBubbles();
    this.setupEventListeners();
    this.setupSonarCallbacks();
  }

  private initSlimeBubbles(): void {
    for (const obstacle of this.levelData.obstacles) {
      if (obstacle.type === 'slime') {
        const bubbles: SlimeBubble[] = [];
        for (let i = 0; i < 5; i++) {
          bubbles.push({
            x: Math.random() * obstacle.width,
            y: obstacle.height,
            size: Math.random() * 4 + 2,
            speed: Math.random() * 15 + 10,
            phase: Math.random() * Math.PI * 2,
          });
        }
        this.slimeBubbles.set(obstacle.id, bubbles);
      }
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private setupSonarCallbacks(): void {
    this.sonarPhysics.onEnemyAlert = (enemyId: number) => {
      const enemy = this.levelData.enemies.find(e => e.id === enemyId);
      if (enemy) {
        enemy.alerted = true;
        enemy.alertTimer = 2;
        this.playAlertSound();
      }
    };

    this.sonarPhysics.onMechanismActivate = (mechanismId: number) => {
      const mechanism = this.levelData.mechanisms.find(m => m.id === mechanismId);
      if (mechanism && !mechanism.activated) {
        mechanism.activated = true;
        mechanism.rotationSpeed = Math.PI * 4;
        mechanism.clickPlayed = false;

        for (const ladder of this.levelData.ladders) {
          if (ladder.targetMechanismId === mechanismId) {
            ladder.active = true;
          }
        }

        this.playClickSound();
      }
    };

    this.sonarPhysics.onObstacleHit = (obstacleId: number) => {
      const obstacle = this.levelData.obstacles.find(o => o.id === obstacleId);
      if (obstacle && obstacle.type === 'pillar' && obstacle.health > 0) {
        obstacle.health--;
        this.spawnRockParticles(obstacle.x + obstacle.width / 2, obstacle.y);

        if (obstacle.health <= 0) {
          this.spawnRockParticles(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, 15);
        }
      }
    };

    this.sonarPhysics.onCrystalBreak = (obstacleId: number) => {
      const obstacle = this.levelData.obstacles.find(o => o.id === obstacleId);
      if (obstacle && obstacle.type === 'crystal' && obstacle.health > 0) {
        obstacle.health = 0;
        this.spawnCrystalParticles(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
        this.playCrystalSound();
      }
    };
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.input.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.input.right = true;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.input.up = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.input.down = true;
        break;
      case 'Space':
        e.preventDefault();
        if (!this.input.sonar) {
          this.input.sonar = true;
          this.fireSonar();
        }
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        if (this.player.onGround) {
          this.input.jump = true;
        }
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.input.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.input.right = false;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.input.up = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.input.down = false;
        break;
      case 'Space':
        this.input.sonar = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.jump = false;
        break;
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) * (this.canvas.width / rect.width) + this.camera.x;
    const worldY = (e.clientY - rect.top) * (this.canvas.height / rect.height) + this.camera.y;

    for (const mirror of this.levelData.mirrors) {
      if (mirror.draggable) {
        const dx = worldX - mirror.x;
        const dy = worldY - mirror.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mirror.width / 2 + 10) {
          this.draggedMirror = mirror;
          this.isDragging = true;
          this.dragOffsetX = dx;
          this.dragOffsetY = dy;
          mirror.rotationAnimation = 1;
          break;
        }
      }
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    this.mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    const worldX = this.mouseX + this.camera.x;
    const worldY = this.mouseY + this.camera.y;

    if (this.isDragging && this.draggedMirror) {
      const targetAngle = Math.atan2(
        worldY - this.draggedMirror.y - this.dragOffsetY,
        worldX - this.draggedMirror.x - this.dragOffsetX
      );
      this.draggedMirror.angle = (targetAngle * 180) / Math.PI;
      this.draggedMirror.rotationAnimation = 1;

      this.sonarPhysics.setLevelData(
        this.levelData.platforms,
        this.levelData.mirrors,
        this.levelData.enemies,
        this.levelData.obstacles,
        this.levelData.mechanisms
      );
    }

    this.uiRenderer.handleMouseMove(this.mouseX, this.mouseY);
  }

  private handleMouseUp(): void {
    if (this.isDragging && this.draggedMirror) {
      this.draggedMirror.rotationAnimation = 0;
    }
    this.isDragging = false;
    this.draggedMirror = null;
  }

  private handleWheel(e: WheelEvent): void {
    if (this.isDragging && this.draggedMirror) {
      e.preventDefault();
      this.draggedMirror.angle += e.deltaY > 0 ? 5 : -5;
      this.draggedMirror.rotationAnimation = 1;

      this.sonarPhysics.setLevelData(
        this.levelData.platforms,
        this.levelData.mirrors,
        this.levelData.enemies,
        this.levelData.obstacles,
        this.levelData.mechanisms
      );
    }
  }

  private handleResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.uiRenderer.resize(this.canvas.width, this.canvas.height);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.uiRenderer.resize(this.canvas.width, this.canvas.height);

    this.uiRenderer.startSceneTransition('in');

    this.gameLoop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private gameLoop(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.fpsTimer += dt;
    this.fpsFrames++;
    if (this.fpsTimer >= 1) {
      this.fps = this.fpsFrames;
      this.fpsTimer = 0;
      this.fpsFrames = 0;
    }

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  private update(dt: number): void {
    if (this.sonarCooldown > 0) {
      this.sonarCooldown -= dt;
    }

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateMechanisms(dt);
    this.updateEnergyCores(dt);
    this.updateParticles(dt);
    this.updateSlimeBubbles(dt);
    this.updateMirrors(dt);
    this.sonarPhysics.update(dt);
    this.uiRenderer.update(dt);

    this.updateCamera(dt);
    this.updateUI();
    this.checkWinCondition();
  }

  private updatePlayer(dt: number): void {
    const p = this.player;

    if (p.slimeTimer > 0) {
      p.slimeTimer -= dt;
      p.speedBoost = 0.5;
    } else {
      p.speedBoost = 1;
    }

    if (p.invincibleTimer > 0) {
      p.invincibleTimer -= dt;
    }

    p.coreGlowPhase += dt * 2;

    let moveX = 0;
    if (this.input.left) moveX -= 1;
    if (this.input.right) moveX += 1;

    p.vx = moveX * this.moveSpeed * p.speedBoost;

    if (moveX > 0) p.facingRight = true;
    if (moveX < 0) p.facingRight = false;

    if (this.input.jump && p.onGround) {
      p.vy = -this.jumpForce;
      p.onGround = false;
      this.input.jump = false;
    }

    p.vy += this.gravity * dt;
    if (p.vy > 600) p.vy = 600;

    p.x += p.vx * dt;
    this.resolveHorizontalCollision(p);

    p.y += p.vy * dt;
    this.resolveVerticalCollision(p);

    this.checkObstacleCollision();
    this.checkEnemyCollision();
    this.checkEnergyCorePickup();
    this.checkLadderClimb();
  }

  private resolveHorizontalCollision(p: Player): void {
    for (const platform of this.levelData.platforms) {
      if (this.rectIntersect(p.x, p.y, p.width, p.height, platform.x, platform.y, platform.width, platform.height)) {
        if (p.vx > 0) {
          p.x = platform.x - p.width;
        } else if (p.vx < 0) {
          p.x = platform.x + platform.width;
        }
        p.vx = 0;
      }
    }

    for (const obstacle of this.levelData.obstacles) {
      if (obstacle.health <= 0 && obstacle.type !== 'slime') continue;
      if (obstacle.type === 'slime') continue;

      if (this.rectIntersect(p.x, p.y, p.width, p.height, obstacle.x, obstacle.y, obstacle.width, obstacle.height)) {
        if (p.vx > 0) {
          p.x = obstacle.x - p.width;
        } else if (p.vx < 0) {
          p.x = obstacle.x + obstacle.width;
        }
        p.vx = 0;
      }
    }
  }

  private resolveVerticalCollision(p: Player): void {
    p.onGround = false;

    for (const platform of this.levelData.platforms) {
      if (this.rectIntersect(p.x, p.y, p.width, p.height, platform.x, platform.y, platform.width, platform.height)) {
        if (p.vy > 0) {
          p.y = platform.y - p.height;
          p.onGround = true;
        } else if (p.vy < 0) {
          p.y = platform.y + platform.height;
        }
        p.vy = 0;
      }
    }

    for (const obstacle of this.levelData.obstacles) {
      if (obstacle.health <= 0 && obstacle.type !== 'slime') continue;
      if (obstacle.type === 'slime') continue;

      if (this.rectIntersect(p.x, p.y, p.width, p.height, obstacle.x, obstacle.y, obstacle.width, obstacle.height)) {
        if (p.vy > 0) {
          p.y = obstacle.y - p.height;
          p.onGround = true;
        } else if (p.vy < 0) {
          p.y = obstacle.y + obstacle.height;
        }
        p.vy = 0;
      }
    }
  }

  private checkObstacleCollision(): void {
    const p = this.player;

    for (const obstacle of this.levelData.obstacles) {
      if (obstacle.type !== 'slime') continue;

      if (this.rectIntersect(p.x, p.y, p.width, p.height, obstacle.x, obstacle.y, obstacle.width, obstacle.height)) {
        if (p.slimeTimer <= 0) {
          p.slimeTimer = 2;
        }
      }
    }
  }

  private checkEnemyCollision(): void {
    const p = this.player;
    if (p.invincibleTimer > 0) return;

    for (const enemy of this.levelData.enemies) {
      if (this.rectIntersect(p.x, p.y, p.width, p.height, enemy.x, enemy.y, enemy.width, enemy.height)) {
        this.damagePlayer(1);
        break;
      }
    }
  }

  private damagePlayer(amount: number): void {
    this.player.health -= amount;
    this.player.invincibleTimer = 1.5;
    this.uiRenderer.setHealth(this.player.health);

    this.playHurtSound();

    if (this.player.health <= 0) {
      this.gameOver();
    }
  }

  private checkEnergyCorePickup(): void {
    const p = this.player;

    for (const core of this.levelData.energyCores) {
      if (core.collected) continue;

      const dx = (p.x + p.width / 2) - core.x;
      const dy = (p.y + p.height / 2) - core.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < core.radius + Math.max(p.width, p.height) / 2) {
        core.collected = true;
        this.collectedCores++;
        this.uiRenderer.setEnergyCores(this.collectedCores);
        this.spawnCoreParticles(core.x, core.y);
        this.playCollectSound();
      }
    }
  }

  private checkLadderClimb(): void {
    for (const ladder of this.levelData.ladders) {
      if (!ladder.active) continue;

      if (this.rectIntersect(
        this.player.x, this.player.y, this.player.width, this.player.height,
        ladder.x, ladder.y, ladder.width, ladder.height
      )) {
        if (this.input.up) {
          this.player.vy = -150;
          this.player.onGround = false;
        }
      }
    }
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.levelData.enemies) {
      if (enemy.alertTimer > 0) {
        enemy.alertTimer -= dt;
        if (enemy.alertTimer <= 0) {
          enemy.alerted = false;
        }
      }

      const speed = enemy.alerted ? enemy.speed * 1.5 : enemy.speed;
      enemy.x += enemy.direction * speed;

      if (enemy.x <= enemy.patrolStart) {
        enemy.x = enemy.patrolStart;
        enemy.direction = 1;
      } else if (enemy.x + enemy.width >= enemy.patrolEnd) {
        enemy.x = enemy.patrolEnd - enemy.width;
        enemy.direction = -1;
      }
    }
  }

  private updateMechanisms(dt: number): void {
    for (const mechanism of this.levelData.mechanisms) {
      if (mechanism.rotationSpeed !== 0) {
        mechanism.rotationAngle += mechanism.rotationSpeed * dt;
        mechanism.rotationSpeed *= 0.95;

        if (Math.abs(mechanism.rotationSpeed) < 0.1) {
          mechanism.rotationSpeed = 0;
          mechanism.rotationAngle = 0;
        }
      }
    }
  }

  private updateEnergyCores(dt: number): void {
    for (const core of this.levelData.energyCores) {
      if (!core.collected) {
        core.glowPhase += dt * 3;
      }
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateSlimeBubbles(dt: number): void {
    for (const [obstacleId, bubbles] of this.slimeBubbles) {
      const obstacle = this.levelData.obstacles.find(o => o.id === obstacleId);
      if (!obstacle) continue;

      for (const bubble of bubbles) {
        bubble.phase += dt * bubble.speed * 0.1;
        bubble.y -= bubble.speed * dt * 0.3;

        if (bubble.y < -bubble.size) {
          bubble.y = obstacle.height;
          bubble.x = Math.random() * obstacle.width;
          bubble.size = Math.random() * 4 + 2;
        }
      }
    }
  }

  private updateMirrors(dt: number): void {
    for (const mirror of this.levelData.mirrors) {
      if (mirror.rotationAnimation > 0 && !this.isDragging) {
        mirror.rotationAnimation -= dt * 2;
        if (mirror.rotationAnimation < 0) mirror.rotationAnimation = 0;
      }
    }
  }

  private updateCamera(dt: number): void {
    this.targetCamera.x = this.player.x + this.player.width / 2 - this.canvas.width / 2;
    this.targetCamera.y = this.player.y + this.player.height / 2 - this.canvas.height / 2;

    this.targetCamera.x = Math.max(0, Math.min(this.levelData.width - this.canvas.width, this.targetCamera.x));
    this.targetCamera.y = Math.max(0, Math.min(this.levelData.height - this.canvas.height, this.targetCamera.y));

    this.camera.x += (this.targetCamera.x - this.camera.x) * 5 * dt;
    this.camera.y += (this.targetCamera.y - this.camera.y) * 5 * dt;
  }

  private updateUI(): void {
    const exploration = this.sonarPhysics.getExplorationPercentage();
    this.uiRenderer.setExplorationPercentage(exploration);
  }

  private checkWinCondition(): void {
    if (this.collectedCores >= this.totalCores) {
      this.uiRenderer.setGameState('win');
    }
  }

  private gameOver(): void {
    this.uiRenderer.setGameState('gameover');
  }

  private fireSonar(): void {
    if (this.sonarCooldown > 0) return;

    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;

    this.sonarPhysics.createPulse(px, py, 400);
    this.sonarCooldown = this.sonarCooldownMax;

    this.playSonarSound();
  }

  private spawnRockParticles(x: number, y: number, count: number = 6): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 100 + 50;
      this.particles.push({
        id: this.particleIdCounter++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: Math.random() * 0.5 + 0.3,
        maxLife: 0.8,
        color: '#5a5a6a',
        size: Math.random() * 4 + 2,
      });
    }
  }

  private spawnCrystalParticles(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = Math.random() * 150 + 100;
      this.particles.push({
        id: this.particleIdCounter++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 0.6 + 0.4,
        maxLife: 1,
        color: '#88ccff',
        size: Math.random() * 5 + 3,
      });
    }
  }

  private spawnCoreParticles(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 120 + 60;
      this.particles.push({
        id: this.particleIdCounter++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 0.8 + 0.4,
        maxLife: 1.2,
        color: '#ffd700',
        size: Math.random() * 4 + 2,
      });
    }
  }

  private playSonarSound(): void {
    if (!this.audioEnabled) return;
    this.initAudio();

    if (this.audioContext) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);

      gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.3);
    }
  }

  private playAlertSound(): void {
    if (!this.audioEnabled) return;
    this.initAudio();

    if (this.audioContext) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
      osc.frequency.setValueAtTime(880, this.audioContext.currentTime + 0.1);
      osc.frequency.setValueAtTime(440, this.audioContext.currentTime + 0.2);

      gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.3);
    }
  }

  private playClickSound(): void {
    if (!this.audioEnabled) return;
    this.initAudio();

    if (this.audioContext) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, this.audioContext.currentTime);

      gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.1);
    }
  }

  private playCrystalSound(): void {
    if (!this.audioEnabled) return;
    this.initAudio();

    if (this.audioContext) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.15);

      gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.15);
    }
  }

  private playCollectSound(): void {
    if (!this.audioEnabled) return;
    this.initAudio();

    if (this.audioContext) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, this.audioContext.currentTime);
      osc.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2);

      gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.3);
    }
  }

  private playHurtSound(): void {
    if (!this.audioEnabled) return;
    this.initAudio();

    if (this.audioContext) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.2);

      gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.2);
    }
  }

  private initAudio(): void {
    if (!this.audioContext && typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        this.audioEnabled = false;
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    this.renderBackground();
    this.renderMushrooms();
    this.renderPlatforms();
    this.renderLadders();
    this.renderObstacles();
    this.renderMechanisms();
    this.renderEnergyCores();
    this.renderMirrors();
    this.renderEnemies();
    this.renderPlayer();
    this.renderParticles();
    this.renderSonar();

    ctx.restore();

    this.uiRenderer.render();
    this.renderFpsCounter();
  }

  private renderBackground(): void {
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(0, 0, 0, this.levelData.height);
    gradient.addColorStop(0, '#0a1525');
    gradient.addColorStop(1, '#050a15');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.levelData.width, this.levelData.height);

    ctx.fillStyle = 'rgba(20, 30, 50, 0.5)';
    for (let i = 0; i < 8; i++) {
      const x = i * 160 + 50;
      const y = 100 + Math.sin(i * 0.8) * 50;
      const w = 80 + Math.sin(i * 1.2) * 30;
      const h = 400 + Math.cos(i * 0.6) * 100;

      ctx.beginPath();
      ctx.moveTo(x, this.levelData.height);
      ctx.lineTo(x, y + h * 0.3);
      ctx.quadraticCurveTo(x + w / 2, y, x + w, y + h * 0.2);
      ctx.lineTo(x + w, this.levelData.height);
      ctx.closePath();
      ctx.fill();
    }
  }

  private renderMushrooms(): void {
    const ctx = this.ctx;
    const time = performance.now() / 1000;

    for (const mushroom of this.levelData.mushrooms) {
      const pulse = Math.sin(time * 2 + mushroom.phase) * 0.3 + 0.7;
      const intensity = mushroom.intensity * pulse;

      const glowRadius = mushroom.radius * 8 * intensity;
      const gradient = ctx.createRadialGradient(
        mushroom.x, mushroom.y, 0,
        mushroom.x, mushroom.y, glowRadius
      );
      gradient.addColorStop(0, `rgba(100, 200, 150, ${intensity * 0.4})`);
      gradient.addColorStop(0.5, `rgba(80, 180, 120, ${intensity * 0.1})`);
      gradient.addColorStop(1, 'rgba(80, 180, 120, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(mushroom.x, mushroom.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(150, 255, 200, ${intensity})`;
      ctx.beginPath();
      ctx.arc(mushroom.x, mushroom.y, mushroom.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderPlatforms(): void {
    const ctx = this.ctx;

    for (const platform of this.levelData.platforms) {
      const gradient = ctx.createLinearGradient(
        platform.x, platform.y,
        platform.x, platform.y + platform.height
      );
      gradient.addColorStop(0, '#2a3040');
      gradient.addColorStop(0.3, '#1e2430');
      gradient.addColorStop(1, '#141822');

      ctx.fillStyle = gradient;
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

      ctx.fillStyle = 'rgba(60, 70, 90, 0.8)';
      ctx.fillRect(platform.x, platform.y, platform.width, 3);

      ctx.strokeStyle = 'rgba(40, 50, 70, 0.5)';
      ctx.lineWidth = 1;

      const rockLines = Math.floor(platform.width / 40);
      for (let i = 0; i < rockLines; i++) {
        const x = platform.x + i * 40 + 10;
        const y = platform.y + 8 + (i % 3) * 10;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 20, y + 5);
        ctx.stroke();
      }
    }
  }

  private renderLadders(): void {
    const ctx = this.ctx;

    for (const ladder of this.levelData.ladders) {
      if (!ladder.active) {
        ctx.strokeStyle = 'rgba(100, 100, 120, 0.3)';
        ctx.setLineDash([5, 5]);
      } else {
        ctx.strokeStyle = 'rgba(150, 180, 220, 0.8)';
        ctx.setLineDash([]);
      }

      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(ladder.x + 5, ladder.y);
      ctx.lineTo(ladder.x + 5, ladder.y + ladder.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ladder.x + ladder.width - 5, ladder.y);
      ctx.lineTo(ladder.x + ladder.width - 5, ladder.y + ladder.height);
      ctx.stroke();

      const rungs = Math.floor(ladder.height / 20);
      for (let i = 0; i <= rungs; i++) {
        const y = ladder.y + i * 20;
        ctx.beginPath();
        ctx.moveTo(ladder.x + 5, y);
        ctx.lineTo(ladder.x + ladder.width - 5, y);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }
  }

  private renderObstacles(): void {
    const ctx = this.ctx;

    for (const obstacle of this.levelData.obstacles) {
      if (obstacle.type === 'pillar') {
        this.renderPillar(obstacle);
      } else if (obstacle.type === 'crystal') {
        if (obstacle.health > 0) {
          this.renderCrystal(obstacle);
        }
      } else if (obstacle.type === 'slime') {
        this.renderSlime(obstacle);
      }
    }
  }

  private renderPillar(obstacle: Obstacle): void {
    const ctx = this.ctx;

    const healthRatio = obstacle.health / obstacle.maxHealth;

    const gradient = ctx.createLinearGradient(
      obstacle.x, obstacle.y,
      obstacle.x + obstacle.width, obstacle.y
    );
    gradient.addColorStop(0, '#4a4a5a');
    gradient.addColorStop(0.5, '#5a5a6a');
    gradient.addColorStop(1, '#3a3a4a');

    ctx.fillStyle = gradient;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

    if (healthRatio < 1) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1.5;

      const cracks = Math.floor((1 - healthRatio) * 5);
      for (let i = 0; i < cracks; i++) {
        const startX = obstacle.x + Math.random() * obstacle.width;
        const startY = obstacle.y + Math.random() * obstacle.height * 0.3;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        let cx = startX;
        let cy = startY;
        for (let j = 0; j < 3; j++) {
          cx += (Math.random() - 0.5) * 10;
          cy += obstacle.height * 0.25;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
    }
  }

  private renderCrystal(obstacle: Obstacle): void {
    const ctx = this.ctx;
    const time = performance.now() / 1000;
    const glow = Math.sin(time * 3) * 0.2 + 0.8;

    const cx = obstacle.x + obstacle.width / 2;
    const cy = obstacle.y + obstacle.height / 2;

    const glowRadius = obstacle.width * 2 * glow;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    gradient.addColorStop(0, `rgba(100, 200, 255, ${0.4 * glow})`);
    gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#88ddff';
    ctx.strokeStyle = '#aaffff';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(cx, obstacle.y);
    ctx.lineTo(obstacle.x + obstacle.width, cy);
    ctx.lineTo(cx, obstacle.y + obstacle.height);
    ctx.lineTo(obstacle.x, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(cx - 3, obstacle.y + 5);
    ctx.lineTo(cx + 3, obstacle.y + 8);
    ctx.lineTo(cx, cy - 5);
    ctx.closePath();
    ctx.fill();
  }

  private renderSlime(obstacle: Obstacle): void {
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(
      obstacle.x, obstacle.y,
      obstacle.x, obstacle.y + obstacle.height
    );
    gradient.addColorStop(0, 'rgba(80, 180, 100, 0.7)');
    gradient.addColorStop(0.5, 'rgba(60, 150, 80, 0.8)');
    gradient.addColorStop(1, 'rgba(40, 100, 60, 0.9)');

    ctx.fillStyle = gradient;
    this.roundRect(ctx, obstacle.x, obstacle.y, obstacle.width, obstacle.height, 8);
    ctx.fill();

    const bubbles = this.slimeBubbles.get(obstacle.id) || [];
    ctx.fillStyle = 'rgba(150, 255, 180, 0.6)';
    for (const bubble of bubbles) {
      const bx = obstacle.x + bubble.x;
      const by = obstacle.y + bubble.y;
      const wobble = Math.sin(bubble.phase) * 1;

      ctx.beginPath();
      ctx.arc(bx + wobble, by, bubble.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(100, 200, 130, 0.5)';
    for (let i = 0; i < 4; i++) {
      const bx = obstacle.x + (i + 0.5) * (obstacle.width / 4);
      const by = obstacle.y + 3;
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderMechanisms(): void {
    const ctx = this.ctx;
    const time = performance.now() / 1000;

    for (const mechanism of this.levelData.mechanisms) {
      ctx.save();
      ctx.translate(mechanism.x, mechanism.y);
      ctx.rotate(mechanism.rotationAngle);

      if (mechanism.activated) {
        const glowRadius = mechanism.radius * 2;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        gradient.addColorStop(0, 'rgba(255, 200, 50, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 200, 50, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      const baseGradient = ctx.createRadialGradient(
        -mechanism.radius * 0.3, -mechanism.radius * 0.3, 0,
        0, 0, mechanism.radius
      );
      baseGradient.addColorStop(0, mechanism.activated ? '#ffd700' : '#b8950a');
      baseGradient.addColorStop(0.7, mechanism.activated ? '#ffb300' : '#8a6e08');
      baseGradient.addColorStop(1, mechanism.activated ? '#cc8800' : '#6a5406');

      ctx.fillStyle = baseGradient;
      ctx.beginPath();
      ctx.arc(0, 0, mechanism.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = mechanism.activated ? '#fff8dc' : '#5a4a0a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = mechanism.activated ? '#fff8dc' : '#6a5a1a';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const innerR = mechanism.radius * 0.4;
        const outerR = mechanism.radius * 0.8;

        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
        ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
        ctx.stroke();
      }

      ctx.fillStyle = mechanism.activated ? '#fff8dc' : '#4a3a0a';
      ctx.beginPath();
      ctx.arc(0, 0, mechanism.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderEnergyCores(): void {
    const ctx = this.ctx;

    for (const core of this.levelData.energyCores) {
      if (core.collected) continue;

      const glow = Math.sin(core.glowPhase) * 0.3 + 0.7;

      const glowRadius = core.radius * 4 * glow;
      const gradient = ctx.createRadialGradient(
        core.x, core.y, 0,
        core.x, core.y, glowRadius
      );
      gradient.addColorStop(0, `rgba(255, 215, 0, ${0.6 * glow})`);
      gradient.addColorStop(0.5, `rgba(255, 200, 0, ${0.2 * glow})`);
      gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(core.x, core.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      const coreGradient = ctx.createRadialGradient(
        core.x - core.radius * 0.3, core.y - core.radius * 0.3, 0,
        core.x, core.y, core.radius
      );
      coreGradient.addColorStop(0, '#fff8dc');
      coreGradient.addColorStop(0.5, '#ffd700');
      coreGradient.addColorStop(1, '#daa520');

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(core.x, core.y, core.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(core.x - core.radius * 0.3, core.y - core.radius * 0.3, core.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderMirrors(): void {
    const ctx = this.ctx;

    for (const mirror of this.levelData.mirrors) {
      ctx.save();
      ctx.translate(mirror.x, mirror.y);
      ctx.rotate((mirror.angle * Math.PI) / 180);

      if (mirror.rotationAnimation > 0) {
        const glowSize = 20 + mirror.rotationAnimation * 20;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        gradient.addColorStop(0, `rgba(200, 220, 255, ${mirror.rotationAnimation * 0.5})`);
        gradient.addColorStop(1, 'rgba(200, 220, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(-glowSize, -glowSize, glowSize * 2, glowSize * 2);
      }

      const gradient = ctx.createLinearGradient(0, -mirror.height / 2, 0, mirror.height / 2);
      gradient.addColorStop(0, '#e8e8f0');
      gradient.addColorStop(0.3, '#ffffff');
      gradient.addColorStop(0.7, '#d0d0e0');
      gradient.addColorStop(1, '#a0a0b0');

      ctx.fillStyle = gradient;
      ctx.fillRect(-mirror.width / 2, -mirror.height / 2, mirror.width, mirror.height);

      ctx.strokeStyle = '#707080';
      ctx.lineWidth = 1;
      ctx.strokeRect(-mirror.width / 2, -mirror.height / 2, mirror.width, mirror.height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(-mirror.width / 2 + 2, -mirror.height / 2 + 1, mirror.width - 4, 2);

      if (mirror.draggable && this.isMouseNearMirror(mirror)) {
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-mirror.width / 2 - 5, -mirror.height / 2 - 5, mirror.width + 10, mirror.height + 10);
        ctx.setLineDash([]);
      }

      ctx.restore();
    }
  }

  private isMouseNearMirror(mirror: Mirror): boolean {
    const worldMouseX = this.mouseX + this.camera.x;
    const worldMouseY = this.mouseY + this.camera.y;
    const dx = worldMouseX - mirror.x;
    const dy = worldMouseY - mirror.y;
    return Math.sqrt(dx * dx + dy * dy) < mirror.width / 2 + 15;
  }

  private renderEnemies(): void {
    const ctx = this.ctx;

    for (const enemy of this.levelData.enemies) {
      const cx = enemy.x + enemy.width / 2;
      const cy = enemy.y + enemy.height / 2;

      ctx.fillStyle = enemy.alerted ? '#ff4444' : '#883344';
      ctx.beginPath();
      ctx.arc(cx, cy, enemy.width / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = enemy.alerted ? '#ff6666' : '#aa4455';
      ctx.lineWidth = 2;
      ctx.stroke();

      const eyeOffset = enemy.direction > 0 ? 4 : -4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + eyeOffset, cy - 3, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(cx + eyeOffset + enemy.direction * 1.5, cy - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (enemy.alerted) {
        const bob = Math.sin(performance.now() / 100) * 2;

        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', cx, cy - enemy.height / 2 - 8 + bob);
        ctx.textAlign = 'left';

        const pulseRadius = enemy.width + 10 + Math.sin(performance.now() / 80) * 5;
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private renderPlayer(): void {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer * 10) % 2 === 0) {
      return;
    }

    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;

    const glowRadius = p.width * 1.5;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    gradient.addColorStop(0, 'rgba(100, 180, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(100, 180, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const bodyGradient = ctx.createLinearGradient(p.x, p.y, p.x + p.width, p.y + p.height);
    bodyGradient.addColorStop(0, '#5a7aa0');
    bodyGradient.addColorStop(0.5, '#7a9ac0');
    bodyGradient.addColorStop(1, '#4a6a90');

    ctx.fillStyle = bodyGradient;
    this.roundRect(ctx, p.x, p.y + 6, p.width, p.height - 6, 6);
    ctx.fill();

    ctx.fillStyle = '#6a8ab0';
    this.roundRect(ctx, p.x + 3, p.y, p.width - 6, 12, 4);
    ctx.fill();

    const eyeX = p.facingRight ? p.x + p.width - 10 : p.x + 4;
    const eyeY = p.y + 5;

    ctx.fillStyle = '#aaddff';
    ctx.beginPath();
    ctx.arc(eyeX + 3, eyeY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeX + 4, eyeY - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();

    const coreGlow = Math.sin(p.coreGlowPhase) * 0.3 + 0.7;
    const coreX = cx;
    const coreY = cy + 2;

    const coreGradient = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, 10 * coreGlow);
    coreGradient.addColorStop(0, `rgba(100, 200, 255, ${coreGlow})`);
    coreGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');

    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 10 * coreGlow, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#88ddff';
    ctx.beginPath();
    ctx.arc(coreX, coreY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a5a70';
    ctx.fillRect(p.x + 4, p.y + p.height - 4, 6, 4);
    ctx.fillRect(p.x + p.width - 10, p.y + p.height - 4, 6, 4);

    if (p.slimeTimer > 0) {
      ctx.fillStyle = 'rgba(80, 180, 100, 0.4)';
      this.roundRect(ctx, p.x - 2, p.y + p.height - 8, p.width + 4, 10, 4);
      ctx.fill();
    }
  }

  private renderParticles(): void {
    const ctx = this.ctx;

    for (const particle of this.particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderSonar(): void {
    const ctx = this.ctx;
    const pulses = this.sonarPhysics.getPulses();

    for (const pulse of pulses) {
      if (!pulse.active) continue;

      const lifeRatio = pulse.life / pulse.maxLife;
      const alpha = lifeRatio;

      ctx.strokeStyle = `rgba(100, 180, 255, ${alpha * 0.8})`;
      ctx.lineWidth = 3 * lifeRatio + 1;

      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.currentRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(150, 200, 255, ${alpha * 0.4})`;
      ctx.lineWidth = 6 * lifeRatio;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.currentRadius, 0, Math.PI * 2);
      ctx.stroke();

      for (const reflection of pulse.reflections) {
        const refAlpha = reflection.intensity * alpha;
        ctx.strokeStyle = `rgba(255, 255, 255, ${refAlpha})`;
        ctx.lineWidth = 2 * reflection.intensity + 1;

        ctx.beginPath();
        ctx.arc(reflection.x, reflection.y, 8, reflection.arcStart, reflection.arcEnd);
        ctx.stroke();

        const sparkleAlpha = refAlpha * (0.5 + Math.sin(performance.now() / 50) * 0.5);
        ctx.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha})`;
        ctx.beginPath();
        ctx.arc(reflection.x, reflection.y, 3 * reflection.intensity, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const ray of pulse.rays) {
        if (ray.hitPoint && ray.hitType === 'mechanism') {
          const hitPulse = Math.sin(performance.now() / 100) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(255, 200, 50, ${alpha * hitPulse * 0.8})`;
          ctx.beginPath();
          ctx.arc(ray.hitPoint.x, ray.hitPoint.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  private renderFpsCounter(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px monospace';
    ctx.fillText(`FPS: ${this.fps}`, 10, this.canvas.height - 10);
  }

  private rectIntersect(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  public getPlayerHealth(): number {
    return this.player.health;
  }

  public getCollectedCores(): number {
    return this.collectedCores;
  }

  public getExplorationPercentage(): number {
    return this.sonarPhysics.getExplorationPercentage();
  }
}
