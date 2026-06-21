import * as THREE from 'three';
import { AABB } from './player';

export enum PlatformType {
  FIXED = 'fixed',
  MOVING = 'moving',
  DISAPPEARING = 'disappearing',
  TRIGGER = 'trigger'
}

export interface PlatformState {
  id: number;
  type: PlatformType;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  visible: boolean;
  moveOffset: number;
  standTime: number;
  flashCount: number;
  flashTimer: number;
  flashVisible: boolean;
  triggered: boolean;
}

export class Platform {
  public id: number;
  public type: PlatformType;
  public mesh: THREE.Mesh;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public active: boolean = true;
  public visible: boolean = true;

  public moveSpeed: number = 0;
  public moveRange: number = 0;
  public moveDirection: number = 1;
  public moveOffset: number = 0;
  public moveAxis: 'x' | 'y' = 'x';
  public startX: number;
  public startY: number;

  public standTime: number = 0;
  public disappearDelay: number = 1.5;
  public flashCount: number = 0;
  public flashTimer: number = 0;
  public flashVisible: boolean = true;
  public isDisappeared: boolean = false;
  public respawnTimer: number = 0;
  public respawnDelay: number = 3;

  public triggered: boolean = false;
  public linkedDoorId: number = -1;

  constructor(
    id: number,
    type: PlatformType,
    x: number,
    y: number,
    width: number,
    height: number,
    options: Partial<Platform> = {}
  ) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.startX = x;
    this.startY = y;

    Object.assign(this, options);

    this.mesh = this.createMesh();
    this.updateMeshPosition();
  }

  private createMesh(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(this.width, this.height);
    let color: number;

    switch (this.type) {
      case PlatformType.FIXED:
        color = 0x8E8E93;
        break;
      case PlatformType.MOVING:
        color = 0x007AFF;
        break;
      case PlatformType.DISAPPEARING:
        color = 0xFF3B30;
        break;
      case PlatformType.TRIGGER:
        color = 0xFF9500;
        break;
      default:
        color = 0x8E8E93;
    }

    const material = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    const line = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(line);

    return mesh;
  }

  public getAABB(): AABB {
    return {
      minX: this.x - this.width / 2,
      minY: this.y - this.height / 2,
      maxX: this.x + this.width / 2,
      maxY: this.y + this.height / 2
    };
  }

  public updateMeshPosition(): void {
    this.mesh.position.set(this.x, this.y, 0);
  }

  public update(dt: number, playerOnPlatform: boolean): void {
    if (this.type === PlatformType.MOVING) {
      this.moveOffset += this.moveSpeed * this.moveDirection * dt;

      if (Math.abs(this.moveOffset) >= this.moveRange) {
        this.moveDirection *= -1;
        this.moveOffset = Math.sign(this.moveOffset) * this.moveRange;
      }

      if (this.moveAxis === 'x') {
        this.x = this.startX + this.moveOffset;
      } else {
        this.y = this.startY + this.moveOffset;
      }

      this.updateMeshPosition();
    }

    if (this.type === PlatformType.DISAPPEARING) {
      if (this.isDisappeared) {
        this.respawnTimer += dt;
        if (this.respawnTimer >= this.respawnDelay) {
          this.respawn();
        }
        return;
      }

      if (playerOnPlatform) {
        this.standTime += dt;

        if (this.standTime >= this.disappearDelay) {
          this.startFlashing();
        } else if (this.standTime >= this.disappearDelay - 0.9) {
          this.flashTimer += dt;
          if (this.flashTimer >= 0.15) {
            this.flashTimer = 0;
            this.flashVisible = !this.flashVisible;
            this.flashCount++;
            this.updateFlashVisual();

            if (this.flashCount >= 6) {
              this.disappear();
            }
          }
        }
      } else {
        this.standTime = Math.max(0, this.standTime - dt * 0.5);
      }
    }

    if (this.type === PlatformType.TRIGGER) {
      if (playerOnPlatform && !this.triggered) {
        this.triggered = true;
        this.active = true;
      }
    }
  }

  private startFlashing(): void {
    if (this.flashCount === 0) {
      this.flashCount = 0;
      this.flashTimer = 0;
      this.flashVisible = true;
    }
  }

  private updateFlashVisual(): void {
    const material = this.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = this.flashVisible ? 1 : 0.3;
    material.transparent = true;
  }

  private disappear(): void {
    this.isDisappeared = true;
    this.visible = false;
    this.active = false;
    this.mesh.visible = false;
    this.respawnTimer = 0;
  }

  public respawn(): void {
    this.isDisappeared = false;
    this.visible = true;
    this.active = true;
    this.mesh.visible = true;
    this.standTime = 0;
    this.flashCount = 0;
    this.flashTimer = 0;
    this.flashVisible = true;

    const material = this.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = 1;
    material.transparent = false;
  }

  public getState(): PlatformState {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      active: this.active,
      visible: this.visible,
      moveOffset: this.moveOffset,
      standTime: this.standTime,
      flashCount: this.flashCount,
      flashTimer: this.flashTimer,
      flashVisible: this.flashVisible,
      triggered: this.triggered
    };
  }

  public setState(state: PlatformState): void {
    this.x = state.x;
    this.y = state.y;
    this.active = state.active;
    this.visible = state.visible;
    this.moveOffset = state.moveOffset;
    this.standTime = state.standTime;
    this.flashCount = state.flashCount;
    this.flashTimer = state.flashTimer;
    this.flashVisible = state.flashVisible;
    this.triggered = state.triggered;

    if (this.type === PlatformType.DISAPPEARING) {
      this.isDisappeared = !state.visible;
      this.mesh.visible = state.visible;

      const material = this.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = state.flashVisible ? 1 : 0.3;
      material.transparent = !state.flashVisible || this.flashCount > 0;
    }

    if (this.type === PlatformType.TRIGGER) {
      const material = this.mesh.material as THREE.MeshBasicMaterial;
      material.color.setHex(state.triggered ? 0x34C759 : 0xFF9500);
    }

    this.updateMeshPosition();
  }

  public resetTrigger(): void {
    if (this.type === PlatformType.TRIGGER) {
      this.triggered = false;
      const material = this.mesh.material as THREE.MeshBasicMaterial;
      material.color.setHex(0xFF9500);
    }
  }
}

export class Level {
  public platforms: Platform[] = [];
  public goalX: number = 0;
  public goalY: number = 0;
  public goalMesh: THREE.Mesh | null = null;
  public bounds: { minX: number; maxX: number; minY: number; maxY: number };
  public boundaryLines: THREE.Line | null = null;

  constructor() {
    this.bounds = { minX: -400, maxX: 400, minY: -300, maxY: 300 };
  }

  public createLevel(scene: THREE.Scene): void {
    this.platforms = [];

    this.platforms.push(new Platform(0, PlatformType.FIXED, 0, -200, 600, 20));
    this.platforms.push(new Platform(1, PlatformType.FIXED, -280, -100, 100, 16));
    this.platforms.push(new Platform(2, PlatformType.FIXED, 100, -80, 80, 16));
    this.platforms.push(new Platform(3, PlatformType.FIXED, 250, -20, 100, 16));

    const movingPlatform = new Platform(4, PlatformType.MOVING, -100, -50, 80, 16, {
      moveSpeed: 60,
      moveRange: 80,
      moveDirection: 1,
      moveAxis: 'x'
    });
    this.platforms.push(movingPlatform);

    const disappearingPlatform1 = new Platform(5, PlatformType.DISAPPEARING, 50, 30, 70, 16, {
      disappearDelay: 1.5,
      respawnDelay: 3
    });
    this.platforms.push(disappearingPlatform1);

    const disappearingPlatform2 = new Platform(6, PlatformType.DISAPPEARING, 180, 60, 70, 16, {
      disappearDelay: 1.5,
      respawnDelay: 3
    });
    this.platforms.push(disappearingPlatform2);

    const triggerPlatform = new Platform(7, PlatformType.TRIGGER, -180, 50, 60, 16, {
      linkedDoorId: 8
    });
    this.platforms.push(triggerPlatform);

    const doorPlatform = new Platform(8, PlatformType.FIXED, -280, 20, 20, 80, {
      active: true
    });
    this.platforms.push(doorPlatform);

    this.platforms.push(new Platform(9, PlatformType.FIXED, 320, 120, 120, 16));

    const movingPlatform2 = new Platform(10, PlatformType.MOVING, -50, 100, 70, 16, {
      moveSpeed: 40,
      moveRange: 60,
      moveDirection: 1,
      moveAxis: 'y'
    });
    this.platforms.push(movingPlatform2);

    this.platforms.push(new Platform(11, PlatformType.FIXED, -300, 150, 80, 16));

    this.goalX = 280;
    this.goalY = 150;
    this.createGoal(scene);

    for (const platform of this.platforms) {
      scene.add(platform.mesh);
    }

    this.createBoundary(scene);
  }

  private createGoal(scene: THREE.Scene): void {
    const geometry = new THREE.PlaneGeometry(30, 40);
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#FFD700';
    ctx.fillRect(14, 0, 2, 40);

    ctx.fillStyle = '#FF3B30';
    ctx.beginPath();
    ctx.moveTo(16, 2);
    ctx.lineTo(28, 8);
    ctx.lineTo(16, 14);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.goalMesh = new THREE.Mesh(geometry, material);
    this.goalMesh.position.set(this.goalX, this.goalY + 20, 0);
    scene.add(this.goalMesh);
  }

  private createBoundary(scene: THREE.Scene): void {
    const points = [];
    points.push(new THREE.Vector3(this.bounds.minX, this.bounds.minY, 0));
    points.push(new THREE.Vector3(this.bounds.maxX, this.bounds.minY, 0));
    points.push(new THREE.Vector3(this.bounds.maxX, this.bounds.maxY, 0));
    points.push(new THREE.Vector3(this.bounds.minX, this.bounds.maxY, 0));
    points.push(new THREE.Vector3(this.bounds.minX, this.bounds.minY, 0));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    this.boundaryLines = new THREE.Line(geometry, material);
    if (this.boundaryLines) {
      scene.add(this.boundaryLines);
    }
  }

  public getActivePlatforms(): Platform[] {
    return this.platforms.filter(p => p.active && p.visible);
  }

  public getState(): PlatformState[] {
    return this.platforms.map(p => p.getState());
  }

  public setState(states: PlatformState[]): void {
    for (const state of states) {
      const platform = this.platforms.find(p => p.id === state.id);
      if (platform) {
        platform.setState(state);
      }
    }
  }

  public checkGoal(playerX: number, playerY: number): boolean {
    const dist = Math.sqrt(
      Math.pow(playerX - this.goalX, 2) +
      Math.pow(playerY - this.goalY, 2)
    );
    return dist < 30;
  }

  public dispose(scene: THREE.Scene): void {
    for (const platform of this.platforms) {
      scene.remove(platform.mesh);
      platform.mesh.geometry.dispose();
      (platform.mesh.material as THREE.Material).dispose();
    }

    if (this.goalMesh) {
      scene.remove(this.goalMesh);
      this.goalMesh.geometry.dispose();
      (this.goalMesh.material as THREE.Material).dispose();
    }

    if (this.boundaryLines) {
      scene.remove(this.boundaryLines);
      this.boundaryLines.geometry.dispose();
      (this.boundaryLines.material as THREE.Material).dispose();
    }
  }
}
