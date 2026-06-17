import * as THREE from 'three';
import { GameScene, TileData } from './gameScene';
import { ObstacleManager } from './obstacles';
import { ParticleSystem } from './particles';
import { SoundFX } from './soundFX';

interface Orb {
  mesh: THREE.Mesh;
  color: THREE.Color;
  collected: boolean;
  originalY: number;
  pulsePhase: number;
}

export class BallController {
  public mesh: THREE.Mesh;
  public radius = 0.35;
  private scene: THREE.Scene;
  private gameScene: GameScene;
  private obstacles: ObstacleManager;
  private particles: ParticleSystem;
  private soundFX: SoundFX;

  private velocity = new THREE.Vector3();
  private inputTilt = new THREE.Vector2();
  private gravity = -18;
  private baseAcceleration = 22;
  private maxSpeed = 9;
  private friction = 2.5;
  private restitution = 0.45;

  public speedMultiplier = 1.0;
  private boostTimer = 0;
  private boostDuration = 1.5;

  private keys: Record<string, boolean> = {};
  private deviceOrientation = { beta: 0, gamma: 0 };
  private orbs: Orb[] = [];
  private orbColors = [
    new THREE.Color(0xff3344),
    new THREE.Color(0xff8822),
    new THREE.Color(0xffdd22),
    new THREE.Color(0x33dd66),
    new THREE.Color(0xaa44ff)
  ];

  public onDamageFlash: (() => void) | null = null;
  public onWin: (() => void) | null = null;
  public won = false;

  private trailCounter = 0;
  private rollSoundCounter = 0;
  private lastTileColor = new THREE.Color(0x0d1a4d);

  constructor(
    gameScene: GameScene,
    obstacles: ObstacleManager,
    particles: ParticleSystem,
    soundFX: SoundFX
  ) {
    this.gameScene = gameScene;
    this.scene = gameScene.scene;
    this.obstacles = obstacles;
    this.particles = particles;
    this.soundFX = soundFX;

    this.mesh = this.createBall();
    this.mesh.position.copy(gameScene.startPos);
    this.scene.add(this.mesh);

    this.setupInput();
    this.createOrbs();
  }

  private createBall(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(this.radius, 48, 48);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xccddee,
      metalness: 0.95,
      roughness: 0.08,
      envMapIntensity: 1.5
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const envScene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.gameScene.renderer);
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128);
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Color().setHSL(0.55 + i * 0.08, 0.8, 0.25);
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })
      );
      const dirs = [
        [1, 0, 0, 0, Math.PI / 2],
        [-1, 0, 0, 0, -Math.PI / 2],
        [0, 1, 0, -Math.PI / 2, 0],
        [0, -1, 0, Math.PI / 2, 0],
        [0, 0, 1, 0, 0],
        [0, 0, -1, 0, Math.PI]
      ];
      plane.position.set(dirs[i][0] * 5, dirs[i][1] * 5, dirs[i][2] * 5);
      plane.rotation.set(dirs[i][3], dirs[i][4], 0);
      envScene.add(plane);
    }
    const envTex = pmrem.fromScene(envScene, 0).texture;
    cubeRenderTarget;
    mat.envMap = envTex;

    const glowGeo = new THREE.SphereGeometry(this.radius * 1.15, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00ffc8,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    mesh.add(glow);

    return mesh;
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      this.keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.keys[e.key.toLowerCase()] = false;
    });

    window.addEventListener('deviceorientation', (e) => {
      if (e.beta !== null) this.deviceOrientation.beta = e.beta;
      if (e.gamma !== null) this.deviceOrientation.gamma = e.gamma;
    });

    const requestOrientation = () => {
      const DO = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      if (DO && typeof DO.requestPermission === 'function') {
        DO.requestPermission().then(() => {}).catch(() => {});
      }
    };
    window.addEventListener('touchstart', requestOrientation, { once: true });
  }

  private createOrbs(): void {
    const positions = this.gameScene.getRandomPathPositions(5);
    for (let i = 0; i < Math.min(5, positions.length); i++) {
      const color = this.orbColors[i % this.orbColors.length];
      const group = new THREE.Group();

      const orbGeo = new THREE.SphereGeometry(0.3, 32, 32);
      const orbMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 1.8,
        transparent: true,
        opacity: 0.92,
        metalness: 0.3,
        roughness: 0.15
      });
      const orbMesh = new THREE.Mesh(orbGeo, orbMat);
      group.add(orbMesh);

      const haloGeo = new THREE.RingGeometry(0.4, 0.5, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      group.add(halo);

      const coreGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const core = new THREE.Mesh(coreGeo, coreMat);
      group.add(core);

      const light = new THREE.PointLight(color, 1.2, 6, 1.8);
      group.add(light);

      group.position.copy(positions[i]);
      this.scene.add(group);

      this.orbs.push({
        mesh: group as unknown as THREE.Mesh,
        color: color,
        collected: false,
        originalY: positions[i].y,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  private updateInput(): void {
    let x = 0;
    let z = 0;

    if (this.keys['ArrowLeft'] || this.keys['KeyA'] || this.keys['a']) x -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD'] || this.keys['d']) x += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['w']) z -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS'] || this.keys['s']) z += 1;

    if (Math.abs(this.deviceOrientation.gamma) > 2) {
      const g = THREE.MathUtils.clamp(this.deviceOrientation.gamma / 35, -1, 1);
      x += g;
    }
    if (Math.abs(this.deviceOrientation.beta) > 2) {
      const b = THREE.MathUtils.clamp(this.deviceOrientation.beta / 35, -1, 1);
      z += b;
    }

    const len = Math.sqrt(x * x + z * z);
    if (len > 1) {
      x /= len;
      z /= len;
    }

    this.inputTilt.x = THREE.MathUtils.lerp(this.inputTilt.x, x, 0.25);
    this.inputTilt.y = THREE.MathUtils.lerp(this.inputTilt.y, z, 0.25);
  }

  public update(delta: number, elapsed: number): void {
    if (this.won) return;

    this.updateInput();

    const currentAccel = this.baseAcceleration * this.speedMultiplier;
    this.velocity.x += this.inputTilt.x * currentAccel * delta;
    this.velocity.z += this.inputTilt.y * currentAccel * delta;
    this.velocity.y += this.gravity * delta;

    const horizontalSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    const currentMaxSpeed = this.maxSpeed * this.speedMultiplier;
    if (horizontalSpeed > currentMaxSpeed) {
      const s = currentMaxSpeed / horizontalSpeed;
      this.velocity.x *= s;
      this.velocity.z *= s;
    }

    const frictionFactor = Math.pow(0.01, delta * this.friction * 0.1);
    this.velocity.x *= frictionFactor;
    this.velocity.z *= frictionFactor;

    const newPos = this.mesh.position.clone();
    newPos.add(this.velocity.clone().multiplyScalar(delta));

    this.handlePlatformCollision(newPos, delta);
    this.handleGroundCollision(newPos, delta);
    this.handleFenceCollision(newPos, delta);
    this.handleFallBounds(newPos);
    this.handleTileEdges(newPos);

    this.mesh.position.copy(newPos);

    this.updateBallRotation(delta);
    this.updateTrail(delta, elapsed);
    this.updateRollSound(horizontalSpeed, delta);
    this.updateOrbs(elapsed);
    this.checkOrbCollision();
    this.checkWin();
    this.updateBoost(delta);
  }

  private handlePlatformCollision(pos: THREE.Vector3, _delta: number): void {
    const result = this.obstacles.checkPlatformCollision(pos, this.radius);
    if (result.hit && result.platform && this.velocity.y <= 0.5) {
      const distToTop = pos.y - this.radius - (result.platform.mesh.position.y + 0.175);
      if (distToTop < 0.2 && distToTop > -0.5) {
        pos.y = result.pushY;
        if (this.velocity.y < -0.3 && result.platform.pressedAmount < 0.01) {
          this.obstacles.pressPlatform(result.platform);
        }
        if (this.velocity.y < -1.5) {
          this.velocity.y = -this.velocity.y * this.restitution * 0.3;
        } else {
          this.velocity.y = Math.max(0, this.velocity.y * 0.2);
        }
      }
    }
  }

  private handleGroundCollision(pos: THREE.Vector3, _delta: number): void {
    const tile = this.gameScene.getTileAt(pos.x, pos.z);
    const tileTopY = (this.gameScene.tileSize * 0.3) / 2;

    if (tile) {
      this.lastTileColor = tile.baseColor.clone();
      if (pos.y - this.radius <= tileTopY + 0.001) {
        pos.y = tileTopY + this.radius;
        if (this.velocity.y < -1.0) {
          this.velocity.y = -this.velocity.y * this.restitution;
          this.soundFX.playRoll(Math.min(0.15, Math.abs(this.velocity.y) * 0.05));
        } else {
          this.velocity.y = Math.max(0, this.velocity.y);
        }
      }
    } else {
      const neighbors = [
        { dx: -0.4, dz: 0 },
        { dx: 0.4, dz: 0 },
        { dx: 0, dz: -0.4 },
        { dx: 0, dz: 0.4 }
      ];
      let bestTile: TileData | null = null;
      let bestDist = Infinity;

      for (const n of neighbors) {
        const nt = this.gameScene.getTileAt(pos.x + n.dx, pos.z + n.dz);
        if (nt) {
          const d = Math.abs(n.dx) + Math.abs(n.dz);
          if (d < bestDist) {
            bestDist = d;
            bestTile = nt;
          }
        }
      }

      if (bestTile) {
        const half = this.gameScene.tileSize / 2;
        const bx = Math.max(bestTile.mesh.position.x - half, Math.min(bestTile.mesh.position.x + half, pos.x));
        const bz = Math.max(bestTile.mesh.position.z - half, Math.min(bestTile.mesh.position.z + half, pos.z));
        const edgeDist = Math.sqrt((pos.x - bx) ** 2 + (pos.z - bz) ** 2);
        if (edgeDist < this.radius + 0.15 && pos.y - this.radius <= tileTopY + 0.3) {
          const nx = (pos.x - bx) / (edgeDist || 1);
          const nz = (pos.z - bz) / (edgeDist || 1);
          const push = this.radius + 0.15 - edgeDist;
          pos.x += nx * push * 0.5;
          pos.z += nz * push * 0.5;
          this.velocity.x -= nx * Math.abs(this.velocity.x) * 0.3;
          this.velocity.z -= nz * Math.abs(this.velocity.z) * 0.3;
        }
      }
    }
  }

  private handleFenceCollision(pos: THREE.Vector3, _delta: number): void {
    const velFlat = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
    if (this.obstacles.checkFenceCollision(pos, this.radius)) {
      const len = velFlat.length();
      if (len > 0.01) {
        velFlat.normalize();
        this.velocity.x = -velFlat.x * len * this.restitution * 1.3;
        this.velocity.z = -velFlat.z * len * this.restitution * 1.3;
        this.velocity.y = Math.max(this.velocity.y, 3);
      }
      this.velocity.x *= 0.9;
      this.velocity.z *= 0.9;

      this.soundFX.playHit();
      if (this.onDamageFlash) this.onDamageFlash();
    }
  }

  private handleFallBounds(pos: THREE.Vector3): void {
    if (pos.y < -15) {
      pos.copy(this.gameScene.startPos);
      this.velocity.set(0, 0, 0);
    }
  }

  private handleTileEdges(_pos: THREE.Vector3): void {
  }

  private updateBallRotation(delta: number): void {
    const axis = new THREE.Vector3(this.velocity.z, 0, -this.velocity.x).normalize();
    const angle = (this.velocity.length() * delta) / this.radius;
    if (isFinite(angle) && isFinite(axis.x)) {
      const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      this.mesh.quaternion.premultiply(q);
    }
  }

  private updateTrail(delta: number, _elapsed: number): void {
    this.trailCounter += delta;
    if (this.trailCounter > 0.03) {
      this.trailCounter = 0;
      const horizSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
      if (horizSpeed > 0.3) {
        this.particles.addTrailPoint(this.mesh.position.clone(), this.lastTileColor);
      }
    }
  }

  private updateRollSound(speed: number, delta: number): void {
    this.rollSoundCounter += delta;
    if (speed > 1.5 && this.rollSoundCounter > 0.12) {
      this.rollSoundCounter = 0;
      this.soundFX.playRoll(Math.min(0.2, speed * 0.02));
    }
  }

  private updateOrbs(elapsed: number): void {
    for (const orb of this.orbs) {
      if (orb.collected) continue;
      orb.mesh.position.y = orb.originalY + Math.sin(elapsed * 2 + orb.pulsePhase) * 0.25;
      orb.mesh.rotation.y += 0.02;
      const halo = orb.mesh.children[1] as THREE.Mesh;
      if (halo) {
        halo.rotation.z += 0.03;
        const s = 1 + Math.sin(elapsed * 3 + orb.pulsePhase) * 0.15;
        halo.scale.setScalar(s);
      }
    }
  }

  private checkOrbCollision(): void {
    for (let i = 0; i < this.orbs.length; i++) {
      const orb = this.orbs[i];
      if (orb.collected) continue;
      const dist = this.mesh.position.distanceTo(orb.mesh.position);
      if (dist < this.radius + 0.35) {
        orb.collected = true;
        this.scene.remove(orb.mesh);

        this.particles.spawnBurst(orb.mesh.position.clone(), orb.color, 100);
        this.soundFX.playCollect(i);
        this.activateBoost();

        const mat = this.mesh.material as THREE.MeshStandardMaterial;
        mat.emissive = orb.color.clone().multiplyScalar(0.5);
        setTimeout(() => {
          if (this.mesh.material) {
            (this.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
          }
        }, 600);
      }
    }
  }

  private activateBoost(): void {
    this.boostTimer = this.boostDuration;
    this.speedMultiplier = 1.5;
  }

  private updateBoost(delta: number): void {
    if (this.boostTimer > 0) {
      this.boostTimer -= delta;
      if (this.boostTimer <= 0) {
        this.speedMultiplier = 1.0;
      }
    }
  }

  private checkWin(): void {
    const dist = this.mesh.position.distanceTo(this.gameScene.endPos);
    if (dist < 1.2 && !this.won) {
      this.won = true;
      this.velocity.set(0, 0, 0);
      this.particles.spawnBurst(this.gameScene.endPos.clone(), new THREE.Color(0xffdd00), 180);
      this.soundFX.playWin();
      if (this.onWin) this.onWin();
    }
  }

  public reset(): void {
    this.mesh.position.copy(this.gameScene.startPos);
    this.velocity.set(0, 0, 0);
    this.speedMultiplier = 1.0;
    this.boostTimer = 0;
    this.won = false;
    this.mesh.quaternion.identity();

    for (const orb of this.orbs) {
      if (orb.collected) {
        orb.collected = false;
        this.scene.add(orb.mesh);
      }
    }
  }

  public getOrbsRemaining(): number {
    return this.orbs.filter(o => !o.collected).length;
  }
}
