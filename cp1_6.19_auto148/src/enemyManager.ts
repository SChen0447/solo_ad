import * as THREE from 'three';
import { Game } from './main';

type EnemyType = 'scout' | 'cruiser' | 'flagship';

interface EnemyStats {
  hp: number;
  speed: number;
  color: number;
  scale: number;
}

const ENEMY_STATS: Record<EnemyType, EnemyStats> = {
  scout: { hp: 1, speed: 2.0, color: 0x66ffaa, scale: 0.6 },
  cruiser: { hp: 3, speed: 1.0, color: 0xffaa44, scale: 0.9 },
  flagship: { hp: 8, speed: 0.5, color: 0xff6688, scale: 1.3 }
};

export class Enemy {
  scene: THREE.Scene;
  group: THREE.Group;
  type: EnemyType;
  stats: EnemyStats;
  hp: number;
  maxHp: number;
  progress: number;
  path: THREE.CatmullRomCurve3;
  pathLength: number;
  color: number;
  dead: boolean;
  hpBar?: THREE.Mesh;
  hpBarBg?: THREE.Mesh;

  constructor(
    scene: THREE.Scene,
    type: EnemyType,
    path: THREE.CatmullRomCurve3,
    pathLength: number
  ) {
    this.scene = scene;
    this.type = type;
    this.stats = ENEMY_STATS[type];
    this.hp = this.stats.hp;
    this.maxHp = this.stats.hp;
    this.progress = 0;
    this.path = path;
    this.pathLength = pathLength;
    this.color = this.stats.color;
    this.dead = false;
    this.group = new THREE.Group();
    this.build();
    const startPos = path.getPointAt(0);
    this.group.position.copy(startPos);
    this.group.position.y += 0.4;
    scene.add(this.group);
  }

  build() {
    const s = this.stats.scale;
    if (this.type === 'scout') {
      const geom = new THREE.ConeGeometry(0.35 * s, 0.9 * s, 3);
      const mat = new THREE.MeshStandardMaterial({
        color: this.stats.color,
        emissive: this.stats.color,
        emissiveIntensity: 0.4,
        metalness: 0.6,
        roughness: 0.4,
        flatShading: true
      });
      const body = new THREE.Mesh(geom, mat);
      body.rotation.x = Math.PI / 2;
      body.castShadow = true;
      this.group.add(body);

      const wingGeom = new THREE.BoxGeometry(1.0 * s, 0.05 * s, 0.4 * s);
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0x336655,
        metalness: 0.7,
        roughness: 0.3
      });
      const wing = new THREE.Mesh(wingGeom, wingMat);
      wing.position.z = -0.1 * s;
      wing.castShadow = true;
      this.group.add(wing);

      const glowGeom = new THREE.SphereGeometry(0.15 * s, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: this.stats.color,
        transparent: true,
        opacity: 0.7
      });
      const glow = new THREE.Mesh(glowGeom, glowMat);
      glow.position.z = 0.3 * s;
      this.group.add(glow);
    } else if (this.type === 'cruiser') {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.5 * s);
      shape.lineTo(0.4 * s, 0);
      shape.lineTo(0, -0.5 * s);
      shape.lineTo(-0.4 * s, 0);
      shape.closePath();
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: 0.35 * s,
        bevelEnabled: true,
        bevelThickness: 0.05 * s,
        bevelSize: 0.05 * s,
        bevelSegments: 3
      });
      geom.translate(0, 0, -0.175 * s);
      const mat = new THREE.MeshStandardMaterial({
        color: this.stats.color,
        emissive: this.stats.color,
        emissiveIntensity: 0.25,
        metalness: 0.7,
        roughness: 0.35
      });
      const body = new THREE.Mesh(geom, mat);
      body.rotation.x = -Math.PI / 2;
      body.castShadow = true;
      this.group.add(body);

      const topGeom = new THREE.ConeGeometry(0.2 * s, 0.4 * s, 4);
      const topMat = new THREE.MeshStandardMaterial({
        color: 0x553311,
        metalness: 0.6,
        roughness: 0.5
      });
      const top = new THREE.Mesh(topGeom, topMat);
      top.rotation.x = Math.PI / 2;
      top.position.z = 0.2 * s;
      this.group.add(top);

      for (let i = -1; i <= 1; i += 2) {
        const engineGeom = new THREE.CylinderGeometry(0.08 * s, 0.12 * s, 0.25 * s, 8);
        const engineMat = new THREE.MeshBasicMaterial({
          color: 0xff6600,
          transparent: true,
          opacity: 0.85
        });
        const engine = new THREE.Mesh(engineGeom, engineMat);
        engine.rotation.x = Math.PI / 2;
        engine.position.set(i * 0.25 * s, 0, -0.3 * s);
        this.group.add(engine);
      }
    } else if (this.type === 'flagship') {
      const shape = new THREE.Shape();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 2;
        const px = Math.cos(a) * 0.55 * s;
        const py = Math.sin(a) * 0.55 * s;
        if (i === 0) shape.moveTo(px, py);
        else shape.lineTo(px, py);
      }
      shape.closePath();
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: 0.45 * s,
        bevelEnabled: true,
        bevelThickness: 0.08 * s,
        bevelSize: 0.08 * s,
        bevelSegments: 3
      });
      geom.translate(0, 0, -0.225 * s);
      const mat = new THREE.MeshStandardMaterial({
        color: this.stats.color,
        emissive: this.stats.color,
        emissiveIntensity: 0.2,
        metalness: 0.8,
        roughness: 0.3
      });
      const body = new THREE.Mesh(geom, mat);
      body.rotation.x = -Math.PI / 2;
      body.castShadow = true;
      this.group.add(body);

      const coreGeom = new THREE.OctahedronGeometry(0.22 * s, 0);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffccdd,
        transparent: true,
        opacity: 0.9
      });
      const core = new THREE.Mesh(coreGeom, coreMat);
      core.position.y = 0.1 * s;
      (this.group as any).core = core;
      this.group.add(core);

      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const engineGeom = new THREE.CylinderGeometry(0.06 * s, 0.1 * s, 0.3 * s, 8);
        const engineMat = new THREE.MeshBasicMaterial({
          color: 0xff4466,
          transparent: true,
          opacity: 0.8
        });
        const engine = new THREE.Mesh(engineGeom, engineMat);
        engine.rotation.x = Math.PI / 2;
        engine.position.set(
          Math.cos(a) * 0.35 * s,
          0,
          Math.sin(a) * 0.35 * s - 0.25 * s
        );
        this.group.add(engine);
      }

      const ringGeom = new THREE.TorusGeometry(0.7 * s, 0.03 * s, 6, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff88aa,
        transparent: true,
        opacity: 0.5
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      (this.group as any).ring = ring;
      this.group.add(ring);
    }

    const hpBarBgGeom = new THREE.PlaneGeometry(1.0 * s, 0.1);
    const hpBarBgMat = new THREE.MeshBasicMaterial({
      color: 0x330000,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });
    const hpBarBg = new THREE.Mesh(hpBarBgGeom, hpBarBgMat);
    hpBarBg.position.y = 1.0 * s + 0.3;
    this.group.add(hpBarBg);
    this.hpBarBg = hpBarBg;

    const hpBarGeom = new THREE.PlaneGeometry(1.0 * s, 0.1);
    const hpBarMat = new THREE.MeshBasicMaterial({
      color: 0x44ff44,
      transparent: true,
      opacity: 0.9,
      depthTest: false
    });
    const hpBar = new THREE.Mesh(hpBarGeom, hpBarMat);
    hpBar.position.y = 1.0 * s + 0.3;
    hpBar.position.z = 0.001;
    this.group.add(hpBar);
    this.hpBar = hpBar;
  }

  takeDamage(damage: number) {
    if (this.dead) return;
    this.hp -= damage;
    this.updateHpBar();
    if (this.hp <= 0) {
      this.dead = true;
    }
  }

  updateHpBar() {
    if (!this.hpBar) return;
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBar.scale.x = ratio;
    this.hpBar.position.x = -(1 - ratio) * 0.5 * this.stats.scale;
    const mat = this.hpBar.material as THREE.MeshBasicMaterial;
    if (ratio > 0.6) {
      mat.color.setHex(0x44ff44);
    } else if (ratio > 0.3) {
      mat.color.setHex(0xffcc00);
    } else {
      mat.color.setHex(0xff4444);
    }
  }

  update(delta: number, camera: THREE.Camera) {
    if (this.dead) return;
    this.progress += (this.stats.speed * delta) / this.pathLength;
    if (this.progress >= 1) {
      this.progress = 1;
      return;
    }
    const pos = this.path.getPointAt(this.progress);
    const nextPos = this.path.getPointAt(Math.min(this.progress + 0.005, 1));
    this.group.position.x = pos.x;
    this.group.position.z = pos.z;
    this.group.position.y = 0.4;
    const dir = new THREE.Vector3().subVectors(nextPos, pos).normalize();
    if (dir.lengthSq() > 0) {
      const targetYaw = Math.atan2(dir.x, dir.z);
      this.group.rotation.y = targetYaw;
    }
    if (this.type === 'flagship') {
      const core = (this.group as any).core as THREE.Mesh;
      if (core) {
        core.rotation.y += delta * 2;
        core.rotation.x += delta * 1.5;
      }
      const ring = (this.group as any).ring as THREE.Mesh;
      if (ring) {
        ring.rotation.z += delta * 1.5;
      }
    }
    if (this.hpBar) {
      this.hpBar.lookAt(camera.position);
    }
    if (this.hpBarBg) {
      this.hpBarBg.lookAt(camera.position);
    }
  }

  reachedEnd(): boolean {
    return this.progress >= 1;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(c => {
      if ((c as any).isMesh) {
        ((c as THREE.Mesh).geometry as THREE.BufferGeometry).dispose();
        const m = (c as THREE.Mesh).material;
        if (Array.isArray(m)) {
          m.forEach(mm => mm.dispose());
        } else {
          (m as THREE.Material).dispose();
        }
      }
    });
  }
}

export class EnemyManager {
  scene: THREE.Scene;
  game: Game;
  path: THREE.CatmullRomCurve3;
  pathLength: number;
  enemies: Enemy[] = [];
  waveQueue: EnemyType[] = [];
  spawnTimer: number = 0;
  spawnInterval: number = 1.2;
  waveInProgress: boolean = false;
  currentWave: number = 0;

  constructor(scene: THREE.Scene, game: Game, path: THREE.CatmullRomCurve3) {
    this.scene = scene;
    this.game = game;
    this.path = path;
    this.pathLength = path.getLength();
  }

  waveComplete(): boolean {
    if (this.waveInProgress) return false;
    return this.enemies.every(e => e.dead || e.reachedEnd()) && this.waveQueue.length === 0;
  }

  startWave(wave: number) {
    this.currentWave = wave;
    this.waveQueue = [];
    const scoutCount = 3 + wave * 2;
    const cruiserCount = Math.max(0, Math.floor((wave - 1) * 1.5));
    const flagshipCount = Math.max(0, Math.floor((wave - 3) / 2));
    for (let i = 0; i < scoutCount; i++) this.waveQueue.push('scout');
    for (let i = 0; i < cruiserCount; i++) this.waveQueue.push('cruiser');
    for (let i = 0; i < flagshipCount; i++) this.waveQueue.push('flagship');
    this.waveQueue.sort(() => Math.random() - 0.5);
    this.spawnInterval = Math.max(0.5, 1.3 - wave * 0.05);
    this.spawnTimer = 0;
    this.waveInProgress = true;
  }

  spawnEnemy(type: EnemyType) {
    const enemy = new Enemy(this.scene, type, this.path, this.pathLength);
    this.enemies.push(enemy);
  }

  update(delta: number) {
    if (this.waveInProgress && this.waveQueue.length > 0) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        const type = this.waveQueue.shift()!;
        this.spawnEnemy(type);
      }
    }
    if (this.waveInProgress && this.waveQueue.length === 0) {
      this.waveInProgress = false;
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(delta, this.game.camera);
      if (enemy.reachedEnd() && !enemy.dead) {
        this.game.loseLife();
        enemy.dead = true;
      }
      if (enemy.dead) {
        enemy.dispose();
        this.enemies.splice(i, 1);
      }
    }
  }
}
