import * as THREE from 'three';

export type FormationType = 'v' | 'line' | 'wave' | 'circle' | 'diamond';
export type PathType = 'straight' | 'sine' | 'circular' | 'zigzag';

export interface FormationTemplate {
  type: FormationType;
  name: string;
  description: string;
  preview: string;
}

export interface PathConfig {
  type: PathType;
  amplitude?: number;
  frequency?: number;
  radius?: number;
  angularSpeed?: number;
}

export interface Enemy {
  id: number;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  collisionBox: THREE.LineSegments | null;
  trail: THREE.Line;
  trailPositions: THREE.Vector3[];
  trailOpacity: number;
  baseOffset: THREE.Vector3;
  spawnTime: number;
  health: number;
  isAlive: boolean;
  flashTimer: number;
  pathType: PathType;
  pathPhase: number;
  currentPos: THREE.Vector3;
}

export const FORMATION_TEMPLATES: FormationTemplate[] = [
  {
    type: 'v',
    name: 'V型编队',
    description: '经典V字突击阵型',
    preview: 'v'
  },
  {
    type: 'line',
    name: '直线编队',
    description: '水平直线排列',
    preview: 'line'
  },
  {
    type: 'wave',
    name: '波浪编队',
    description: '波浪式起伏排列',
    preview: 'wave'
  },
  {
    type: 'circle',
    name: '环形编队',
    description: '圆形环绕阵型',
    preview: 'circle'
  },
  {
    type: 'diamond',
    name: '菱形编队',
    description: '菱形密集阵型',
    preview: 'diamond'
  }
];

export class EnemyFleet {
  private scene: THREE.Scene;
  private enemies: Enemy[] = [];
  private enemyIdCounter: number = 0;
  private showCollisionBoxes: boolean = false;
  private collisionScale: number = 1.0;
  private flightSpeed: number = 5.0;

  private enemyGeometry!: THREE.BoxGeometry;
  private enemyMaterial!: THREE.MeshStandardMaterial;
  private glowMaterial!: THREE.MeshBasicMaterial;
  private trailMaterial!: THREE.LineBasicMaterial;

  private formationType: FormationType | null = null;
  private pathType: PathType = 'sine';
  private startTime: number = 0;
  private nextEnemyId: number = 0;

  private tempVec: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initGeometries();
  }

  private initGeometries(): void {
    this.enemyGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);

    this.enemyMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x222244
    });

    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  private getFormationOffsets(type: FormationType): THREE.Vector3[] {
    const offsets: THREE.Vector3[] = [];

    switch (type) {
      case 'v': {
        const size = 5;
        for (let i = 0; i < size; i++) {
          offsets.push(new THREE.Vector3(-i * 0.8, 0, i * 0.8));
          if (i > 0) {
            offsets.push(new THREE.Vector3(i * 0.8, 0, i * 0.8));
          }
        }
        break;
      }
      case 'line': {
        const size = 9;
        const spread = 1.0;
        const start = -(size - 1) / 2 * spread;
        for (let i = 0; i < size; i++) {
          offsets.push(new THREE.Vector3(start + i * spread, 0, 0));
        }
        break;
      }
      case 'wave': {
        const size = 9;
        const spread = 1.0;
        const start = -(size - 1) / 2 * spread;
        for (let i = 0; i < size; i++) {
          const y = Math.sin(i * 0.8) * 0.8;
          offsets.push(new THREE.Vector3(start + i * spread, y, 0));
        }
        break;
      }
      case 'circle': {
        const size = 8;
        const radius = 2.0;
        for (let i = 0; i < size; i++) {
          const angle = (i / size) * Math.PI * 2;
          offsets.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            0
          ));
        }
        break;
      }
      case 'diamond': {
        offsets.push(new THREE.Vector3(0, 0, 0));
        offsets.push(new THREE.Vector3(-0.8, 0.8, 0));
        offsets.push(new THREE.Vector3(0.8, 0.8, 0));
        offsets.push(new THREE.Vector3(-0.8, -0.8, 0));
        offsets.push(new THREE.Vector3(0.8, -0.8, 0));
        offsets.push(new THREE.Vector3(-1.6, 0, 0));
        offsets.push(new THREE.Vector3(1.6, 0, 0));
        offsets.push(new THREE.Vector3(0, 1.6, 0));
        offsets.push(new THREE.Vector3(0, -1.6, 0));
        break;
      }
    }

    return offsets;
  }

  public setFormation(type: FormationType, pathType: PathType = 'sine'): void {
    this.clearFleet();
    this.formationType = type;
    this.pathType = pathType;
    this.startTime = performance.now() / 1000;

    const offsets = this.getFormationOffsets(type);
    const baseX = -12;
    const baseY = 2;
    const baseZ = 0;

    offsets.forEach((offset, index) => {
      this.createEnemy(
        new THREE.Vector3(offset.x, offset.y, offset.z),
        new THREE.Vector3(
          baseX + offset.x,
          baseY + offset.y,
          baseZ + offset.z
        ),
        index
      );
    });
  }

  private createEnemy(
    baseOffset: THREE.Vector3,
    initialPos: THREE.Vector3,
    index: number
  ): Enemy {
    const id = this.nextEnemyId++;

    const mesh = new THREE.Mesh(this.enemyGeometry, this.enemyMaterial.clone());
    mesh.position.copy(initialPos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const glowMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      this.glowMaterial.clone()
    );
    mesh.add(glowMesh);

    const trailPositions: THREE.Vector3[] = [];
    for (let i = 0; i < 2; i++) {
      trailPositions.push(initialPos.clone());
    }

    const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPositions);
    const trail = new THREE.Line(trailGeo, this.trailMaterial.clone());
    trail.frustumCulled = false;

    this.scene.add(mesh);
    this.scene.add(trail);

    const enemy: Enemy = {
      id,
      mesh,
      glowMesh,
      collisionBox: null,
      trail,
      trailPositions,
      trailOpacity: 0.5,
      baseOffset,
      spawnTime: index * 0.08,
      health: 1,
      isAlive: true,
      flashTimer: 0,
      pathType: this.pathType,
      pathPhase: index * 0.3,
      currentPos: initialPos.clone()
    };

    if (this.showCollisionBoxes) {
      this.addCollisionBox(enemy);
    }

    this.enemies.push(enemy);
    return enemy;
  }

  private addCollisionBox(enemy: Enemy): void {
    if (enemy.collisionBox) return;

    const size = 0.5 * this.collisionScale;
    const boxGeo = new THREE.BoxGeometry(size, size, size);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const material = new THREE.LineBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });
    const lineSegments = new THREE.LineSegments(edges, material);
    enemy.mesh.add(lineSegments);
    enemy.collisionBox = lineSegments;
    boxGeo.dispose();
    edges.dispose();
  }

  private removeCollisionBox(enemy: Enemy): void {
    if (enemy.collisionBox) {
      enemy.mesh.remove(enemy.collisionBox);
      const geo = enemy.collisionBox.geometry as THREE.BufferGeometry;
      const mat = enemy.collisionBox.material as THREE.Material;
      geo.dispose();
      mat.dispose();
      enemy.collisionBox = null;
    }
  }

  public setShowCollisionBoxes(show: boolean): void {
    this.showCollisionBoxes = show;
    for (const enemy of this.enemies) {
      if (show) {
        this.addCollisionBox(enemy);
      } else {
        this.removeCollisionBox(enemy);
      }
    }
  }

  public setCollisionScale(scale: number): void {
    this.collisionScale = scale;
    for (const enemy of this.enemies) {
      this.removeCollisionBox(enemy);
      if (this.showCollisionBoxes && enemy.isAlive) {
        this.addCollisionBox(enemy);
      }
    }
  }

  public setFlightSpeed(speed: number): void {
    this.flightSpeed = speed;
  }

  public getFlightSpeed(): number {
    return this.flightSpeed;
  }

  private computePathPosition(
    enemy: Enemy,
    time: number,
    speed: number
  ): THREE.Vector3 {
    const t = Math.max(0, time - enemy.spawnTime);
    const x = -12 + t * speed;

    const baseX = x;
    let y = 2 + enemy.baseOffset.y;
    let z = 0 + enemy.baseOffset.z;

    const phase = enemy.pathPhase;
    switch (enemy.pathType) {
      case 'straight':
        y = 2 + enemy.baseOffset.y;
        z = 0 + enemy.baseOffset.z;
        break;
      case 'sine':
        y = 2 + enemy.baseOffset.y + Math.sin(t * 1.2 + phase) * 1.5;
        z = 0 + enemy.baseOffset.z + Math.cos(t * 0.8 + phase) * 0.8;
        break;
      case 'circular':
        y = 2 + enemy.baseOffset.y + Math.sin(t * 1.5 + phase) * 2;
        z = 0 + enemy.baseOffset.z + Math.cos(t * 1.5 + phase) * 2;
        break;
      case 'zigzag':
        const modT = (t * 2 + phase) % 4;
        if (modT < 2) {
          z = -2 + (modT / 2) * 4;
        } else {
          z = 2 - ((modT - 2) / 2) * 4;
        }
        z += enemy.baseOffset.z;
        y = 2 + enemy.baseOffset.y;
        break;
    }

    const finalX = baseX + enemy.baseOffset.x;
    this.tempVec.set(finalX, y, z);
    return this.tempVec;
  }

  public update(deltaTime: number, elapsedTime: number): void {
    const speed = this.flightSpeed;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (!enemy.isAlive) {
        if (enemy.flashTimer > 0) {
          enemy.flashTimer -= deltaTime;
          if (enemy.flashTimer <= 0) {
            this.removeEnemy(enemy, i);
          }
        }
        continue;
      }

      const newPos = this.computePathPosition(enemy, elapsedTime, speed);
      const oldPos = enemy.currentPos.clone();
      enemy.currentPos.copy(newPos);
      enemy.mesh.position.copy(newPos);

      this.updateTrail(enemy, oldPos, newPos, deltaTime);

      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= deltaTime;
        const mat = enemy.mesh.material as THREE.MeshStandardMaterial;
        if (enemy.flashTimer > 0) {
          mat.emissive.setHex(0xff2222);
          mat.emissiveIntensity = Math.max(0, enemy.flashTimer / 0.1) * 2;
        } else {
          mat.emissive.setHex(0x222244);
          mat.emissiveIntensity = 1;
        }
      }

      if (newPos.x > 15) {
        this.removeEnemy(enemy, i);
      }
    }
  }

  private updateTrail(
    enemy: Enemy,
    oldPos: THREE.Vector3,
    newPos: THREE.Vector3,
    delta: number
  ): void {
    const positions = enemy.trailPositions;
    const last = positions[positions.length - 1];
    const dist = last.distanceTo(newPos);

    if (dist > 0.08) {
      positions.push(newPos.clone());
      if (positions.length > 50) {
        positions.shift();
      }
    }

    enemy.trailOpacity = Math.max(0, enemy.trailOpacity - delta * 0.1);

    const material = enemy.trail.material as THREE.LineBasicMaterial;
    material.opacity = enemy.trailOpacity + 0.3;

    const trailGeo = enemy.trail.geometry as THREE.BufferGeometry;
    trailGeo.setFromPoints(positions);
    trailGeo.attributes.position.needsUpdate = true;
    trailGeo.computeBoundingSphere();
  }

  public triggerHit(enemy: Enemy): void {
    if (!enemy.isAlive) return;
    enemy.isAlive = false;
    enemy.flashTimer = 0.1;

    const mat = enemy.mesh.material as THREE.MeshStandardMaterial;
    mat.emissive.setHex(0xff2222);
    mat.emissiveIntensity = 3;

    enemy.glowMesh.visible = false;
  }

  private removeEnemy(enemy: Enemy, index: number): void {
    this.scene.remove(enemy.mesh);
    this.scene.remove(enemy.trail);
    this.removeCollisionBox(enemy);

    const trailGeo = enemy.trail.geometry as THREE.BufferGeometry;
    trailGeo.dispose();
    const trailMat = enemy.trail.material as THREE.Material;
    trailMat.dispose();

    const enemyMat = enemy.mesh.material as THREE.Material;
    enemyMat.dispose();
    const glowMat = enemy.glowMesh.material as THREE.Material;
    glowMat.dispose();

    this.enemies.splice(index, 1);
  }

  public clearFleet(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.removeEnemy(this.enemies[i], i);
    }
    this.formationType = null;
  }

  public getEnemies(): Enemy[] {
    return this.enemies;
  }

  public getAliveEnemies(): Enemy[] {
    return this.enemies.filter(e => e.isAlive);
  }

  public getCollisionScale(): number {
    return this.collisionScale;
  }

  public getEnemyCollisionRadius(): number {
    return 0.35 * this.collisionScale;
  }

  public dispose(): void {
    this.clearFleet();
    this.enemyGeometry.dispose();
    this.enemyMaterial.dispose();
    this.glowMaterial.dispose();
    this.trailMaterial.dispose();
  }
}
