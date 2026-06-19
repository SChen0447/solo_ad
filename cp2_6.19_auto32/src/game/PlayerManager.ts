import * as THREE from 'three';

export type DisguiseType = 'box' | 'chair' | 'trashcan' | 'plant' | 'barrel' | 'crate';

export const DISGUISE_TYPES: DisguiseType[] = ['box', 'chair', 'trashcan', 'plant', 'barrel', 'crate'];

export interface GhostState {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  energy: number;
  isPerspectiveMode: boolean;
  perspectiveCooldown: number;
  score: number;
  catsCaught: number;
}

export interface CatState {
  id: string;
  position: THREE.Vector3;
  isDisguised: boolean;
  disguiseType: DisguiseType | null;
  isCaught: boolean;
  disguiseCount: number;
  score: number;
}

export class PlayerManager {
  private ghost: GhostState;
  private cats: Map<string, CatState> = new Map();
  private moveSpeed: number = 8;
  private catMoveSpeed: number = 6;
  private perspectiveCooldownTime: number = 2;
  private energyDrainRate: number = 10;
  private energyRecoverRate: number = 15;

  constructor() {
    this.ghost = {
      id: 'ghost-1',
      position: new THREE.Vector3(0, 1.6, 0),
      rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
      energy: 100,
      isPerspectiveMode: false,
      perspectiveCooldown: 0,
      score: 0,
      catsCaught: 0
    };
  }

  initCats(count: number): void {
    this.cats.clear();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 15;
      const cat: CatState = {
        id: `cat-${i}`,
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          0.5,
          Math.sin(angle) * radius
        ),
        isDisguised: false,
        disguiseType: null,
        isCaught: false,
        disguiseCount: 0,
        score: 0
      };
      this.cats.set(cat.id, cat);
    }
  }

  getGhost(): GhostState {
    return { ...this.ghost };
  }

  getGhostPosition(): THREE.Vector3 {
    return this.ghost.position.clone();
  }

  setGhostPosition(pos: THREE.Vector3): void {
    this.ghost.position.copy(pos);
  }

  setGhostRotation(euler: THREE.Euler): void {
    this.ghost.rotation.copy(euler);
  }

  getCats(): CatState[] {
    return Array.from(this.cats.values()).map(cat => ({ ...cat }));
  }

  getCat(id: string): CatState | undefined {
    const cat = this.cats.get(id);
    return cat ? { ...cat } : undefined;
  }

  getActiveCats(): CatState[] {
    return this.getCats().filter(c => !c.isCaught);
  }

  moveGhost(direction: THREE.Vector3, deltaTime: number): void {
    const moveDir = direction.clone().normalize();
    if (moveDir.length() === 0) return;

    const forward = new THREE.Vector3(
      -Math.sin(this.ghost.rotation.y),
      0,
      -Math.cos(this.ghost.rotation.y)
    );
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveVector = new THREE.Vector3();
    moveVector.addScaledVector(forward, -moveDir.z);
    moveVector.addScaledVector(right, moveDir.x);

    this.ghost.position.addScaledVector(moveVector, this.moveSpeed * deltaTime);
    this.clampPosition(this.ghost.position);
  }

  isCatDisguised(id: string): boolean {
    const cat = this.cats.get(id);
    return cat ? cat.isDisguised : false;
  }

  moveCat(id: string, direction: THREE.Vector3, deltaTime: number): void {
    const cat = this.cats.get(id);
    if (!cat || cat.isCaught || cat.isDisguised) return;

    const moveDir = direction.clone().normalize();
    if (moveDir.length() === 0) return;

    cat.position.addScaledVector(moveDir, this.catMoveSpeed * deltaTime);
    this.clampPosition(cat.position);
  }

  private clampPosition(pos: THREE.Vector3): void {
    const boundary = 24;
    pos.x = Math.max(-boundary, Math.min(boundary, pos.x));
    pos.z = Math.max(-boundary, Math.min(boundary, pos.z));
    if (pos.y < 0.5) pos.y = 0.5;
  }

  togglePerspectiveMode(): void {
    if (this.ghost.perspectiveCooldown > 0) return;
    if (this.ghost.energy <= 0) return;

    this.ghost.isPerspectiveMode = !this.ghost.isPerspectiveMode;
    if (this.ghost.isPerspectiveMode) {
      this.ghost.perspectiveCooldown = this.perspectiveCooldownTime;
    }
  }

  setPerspectiveMode(active: boolean): void {
    if (active && this.ghost.perspectiveCooldown > 0) return;
    if (active && this.ghost.energy <= 0) return;

    if (active && !this.ghost.isPerspectiveMode) {
      this.ghost.perspectiveCooldown = this.perspectiveCooldownTime;
    }
    this.ghost.isPerspectiveMode = active;
  }

  toggleDisguise(catId: string): void {
    const cat = this.cats.get(catId);
    if (!cat || cat.isCaught) return;

    if (cat.isDisguised) {
      cat.isDisguised = false;
      cat.disguiseType = null;
    } else {
      const randomType = DISGUISE_TYPES[Math.floor(Math.random() * DISGUISE_TYPES.length)];
      cat.isDisguised = true;
      cat.disguiseType = randomType;
      cat.disguiseCount++;
    }
  }

  catchCat(catId: string): boolean {
    const cat = this.cats.get(catId);
    if (!cat || cat.isCaught) return false;

    cat.isCaught = true;
    this.ghost.catsCaught++;
    this.ghost.score += 100;
    return true;
  }

  update(deltaTime: number): void {
    if (this.ghost.perspectiveCooldown > 0) {
      this.ghost.perspectiveCooldown = Math.max(0, this.ghost.perspectiveCooldown - deltaTime);
    }

    if (this.ghost.isPerspectiveMode) {
      this.ghost.energy = Math.max(0, this.ghost.energy - this.energyDrainRate * deltaTime);
      if (this.ghost.energy <= 0) {
        this.ghost.isPerspectiveMode = false;
      }
    } else {
      this.ghost.energy = Math.min(100, this.ghost.energy + this.energyRecoverRate * deltaTime);
    }
  }

  getGhostScore(): number {
    return this.ghost.score;
  }

  getTotalCatScore(): number {
    let total = 0;
    for (const cat of this.cats.values()) {
      if (!cat.isCaught) {
        total += 50;
      }
      total += cat.disguiseCount * 10;
    }
    return total;
  }

  getTotalDisguiseCount(): number {
    let total = 0;
    for (const cat of this.cats.values()) {
      total += cat.disguiseCount;
    }
    return total;
  }

  reset(): void {
    this.ghost.position.set(0, 1.6, 0);
    this.ghost.rotation.set(0, 0, 0);
    this.ghost.energy = 100;
    this.ghost.isPerspectiveMode = false;
    this.ghost.perspectiveCooldown = 0;
    this.ghost.score = 0;
    this.ghost.catsCaught = 0;
    this.initCats(this.cats.size || 3);
  }
}
