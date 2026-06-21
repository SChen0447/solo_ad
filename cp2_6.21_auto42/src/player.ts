import * as THREE from 'three';

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  facingRight: boolean;
}

export interface Afterimage {
  mesh: THREE.Mesh;
  createdAt: number;
  duration: number;
}

export interface DustParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class Player {
  public mesh: THREE.Group;
  public bodyMesh: THREE.Mesh;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public width: number = 16;
  public height: number = 16;
  public isGrounded: boolean = false;
  public facingRight: boolean = true;

  public moveSpeed: number = 120;
  public jumpHeight: number = 50;
  public jumpDuration: number = 0.3;
  public gravity: number = 0;

  public afterimages: Afterimage[] = [];
  public dustParticles: DustParticle[] = [];

  private jumpVelocity: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;

    this.gravity = (2 * this.jumpHeight) / (this.jumpDuration * this.jumpDuration);
    this.jumpVelocity = this.gravity * this.jumpDuration;

    this.mesh = new THREE.Group();
    this.mesh.position.set(x, y, 0);

    this.bodyMesh = this.createPixelRobot();
    this.mesh.add(this.bodyMesh);
  }

  private createPixelRobot(): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#5AC8FA';
    ctx.fillRect(4, 2, 8, 6);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(5, 4, 2, 2);
    ctx.fillRect(9, 4, 2, 2);

    ctx.fillStyle = '#000000';
    ctx.fillRect(6, 5, 1, 1);
    ctx.fillRect(10, 5, 1, 1);

    ctx.fillStyle = '#34C759';
    ctx.fillRect(7, 0, 2, 2);

    ctx.fillStyle = '#007AFF';
    ctx.fillRect(3, 8, 10, 5);

    ctx.fillStyle = '#FF3B30';
    ctx.fillRect(6, 9, 4, 2);

    ctx.fillStyle = '#8E8E93';
    ctx.fillRect(4, 13, 3, 3);
    ctx.fillRect(9, 13, 3, 3);

    ctx.fillStyle = '#FF9500';
    ctx.fillRect(1, 9, 2, 4);
    ctx.fillRect(13, 9, 2, 4);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });

    const geometry = new THREE.PlaneGeometry(16, 16);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, 0);

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

  public static aabbOverlap(a: AABB, b: AABB): boolean {
    return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
  }

  public jump(): void {
    if (this.isGrounded) {
      this.vy = this.jumpVelocity;
      this.isGrounded = false;
      this.spawnDustParticles(true);
    }
  }

  public spawnDustParticles(isJump: boolean = false): void {
    const count = isJump ? 3 : 5;
    for (let i = 0; i < count; i++) {
      const size = 2 + Math.random() * 2;
      const geometry = new THREE.PlaneGeometry(size, size);
      const material = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.8
      });
      const mesh = new THREE.Mesh(geometry, material);

      const vx = (Math.random() - 0.5) * 40;
      const vy = isJump ? -Math.random() * 20 : Math.random() * 10 - 5;

      this.dustParticles.push({
        mesh,
        vx,
        vy,
        life: 0.3,
        maxLife: 0.3
      });

      mesh.position.set(
        this.x + (Math.random() - 0.5) * 8,
        this.y - this.height / 2 + 2,
        0
      );

      this.mesh.parent?.add(mesh);
    }
  }

  public createAfterimage(scene: THREE.Scene): void {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const originalCanvas = (this.bodyMesh.material as THREE.MeshBasicMaterial).map?.image as HTMLCanvasElement;
    if (originalCanvas) {
      ctx.drawImage(originalCanvas, 0, 0);
    }

    const imageData = ctx.getImageData(0, 0, 16, 16);
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] > 0) {
        imageData.data[i] = 74;
        imageData.data[i + 1] = 144;
        imageData.data[i + 2] = 217;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });

    const geometry = new THREE.PlaneGeometry(16, 16);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(this.x, this.y, -1);
    mesh.scale.x = this.facingRight ? 1 : -1;

    scene.add(mesh);

    this.afterimages.push({
      mesh,
      createdAt: performance.now(),
      duration: 1000
    });
  }

  public updateAfterimages(scene: THREE.Scene): void {
    const now = performance.now();
    this.afterimages = this.afterimages.filter(afterimage => {
      const elapsed = now - afterimage.createdAt;
      if (elapsed >= afterimage.duration) {
        scene.remove(afterimage.mesh);
        afterimage.mesh.geometry.dispose();
        (afterimage.mesh.material as THREE.Material).dispose();
        return false;
      }

      const fadeStart = afterimage.duration * 0.5;
      if (elapsed > fadeStart) {
        const fadeProgress = (elapsed - fadeStart) / (afterimage.duration - fadeStart);
        (afterimage.mesh.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - fadeProgress);
      }

      return true;
    });
  }

  public updateDustParticles(dt: number, scene: THREE.Scene): void {
    this.dustParticles = this.dustParticles.filter(particle => {
      particle.life -= dt;
      if (particle.life <= 0) {
        scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        return false;
      }

      particle.mesh.position.x += particle.vx * dt;
      particle.mesh.position.y += particle.vy * dt;
      particle.vy -= 50 * dt;

      const opacity = particle.life / particle.maxLife;
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.8;

      return true;
    });
  }

  public getState(): PlayerState {
    return {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      isGrounded: this.isGrounded,
      facingRight: this.facingRight
    };
  }

  public setState(state: PlayerState): void {
    this.x = state.x;
    this.y = state.y;
    this.vx = state.vx;
    this.vy = state.vy;
    this.isGrounded = state.isGrounded;
    this.facingRight = state.facingRight;
    this.mesh.position.set(this.x, this.y, 0);
    this.bodyMesh.scale.x = this.facingRight ? 1 : -1;
  }

  public updateMesh(): void {
    this.mesh.position.set(this.x, this.y, 0);
    this.bodyMesh.scale.x = this.facingRight ? 1 : -1;
  }

  public clearAfterimages(scene: THREE.Scene): void {
    for (const afterimage of this.afterimages) {
      scene.remove(afterimage.mesh);
      afterimage.mesh.geometry.dispose();
      (afterimage.mesh.material as THREE.Material).dispose();
    }
    this.afterimages = [];
  }

  public clearDustParticles(scene: THREE.Scene): void {
    for (const particle of this.dustParticles) {
      scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    }
    this.dustParticles = [];
  }
}
