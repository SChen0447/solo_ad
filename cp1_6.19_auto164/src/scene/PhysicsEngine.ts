import * as CANNON from 'cannon-es';
import type { PhysicsConfig, SandboxConfig } from '../utils/types';

export class PhysicsEngine {
  private world: CANNON.World;
  private particles: Map<number, CANNON.Body> = new Map();
  private sandboxConfig: SandboxConfig;
  private physicsConfig: PhysicsConfig;
  private groundBody!: CANNON.Body;
  private wallBodies: CANNON.Body[] = [];
  private nextParticleId: number = 0;

  constructor(sandboxConfig: SandboxConfig, physicsConfig: PhysicsConfig) {
    this.sandboxConfig = sandboxConfig;
    this.physicsConfig = physicsConfig;
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -physicsConfig.gravity, 0),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    (this.world as any).sleepSpeedLimit = 0.1;
    (this.world as any).sleepTimeLimit = 0.5;
    this.createWalls();
  }

  private createWalls() {
    const { width, height, depth } = this.sandboxConfig;
    const halfW = width / 2;
    const halfH = height / 2;
    const halfD = depth / 2;
    const wallThickness = 0.2;

    const groundShape = new CANNON.Box(new CANNON.Vec3(halfW, wallThickness, halfD));
    this.groundBody = new CANNON.Body({
      mass: 0,
      shape: groundShape,
      position: new CANNON.Vec3(0, -halfH + wallThickness, 0),
      material: new CANNON.Material({
        friction: this.physicsConfig.friction,
        restitution: this.physicsConfig.restitution,
      }),
    });
    this.world.addBody(this.groundBody);

    const wallMaterial = new CANNON.Material({
      friction: this.physicsConfig.friction,
      restitution: this.physicsConfig.restitution,
    });

    const wallConfigs = [
      { pos: new CANNON.Vec3(-halfW + wallThickness, 0, 0), size: new CANNON.Vec3(wallThickness, halfH, halfD) },
      { pos: new CANNON.Vec3(halfW - wallThickness, 0, 0), size: new CANNON.Vec3(wallThickness, halfH, halfD) },
      { pos: new CANNON.Vec3(0, 0, -halfD + wallThickness), size: new CANNON.Vec3(halfW, halfH, wallThickness) },
      { pos: new CANNON.Vec3(0, 0, halfD - wallThickness), size: new CANNON.Vec3(halfW, halfH, wallThickness) },
    ];

    wallConfigs.forEach((config) => {
      const shape = new CANNON.Box(config.size);
      const body = new CANNON.Body({
        mass: 0,
        shape,
        position: config.pos,
        material: wallMaterial,
      });
      this.world.addBody(body);
      this.wallBodies.push(body);
    });
  }

  addParticle(
    position: { x: number; y: number; z: number },
    velocity: { x: number; y: number; z: number },
    radius: number,
    mass: number
  ): number {
    const id = this.nextParticleId++;
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
      mass,
      shape,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      velocity: new CANNON.Vec3(velocity.x, velocity.y, velocity.z),
      material: new CANNON.Material({
        friction: this.physicsConfig.friction,
        restitution: this.physicsConfig.restitution,
      }),
      linearDamping: 0.1,
      angularDamping: 0.1,
    });
    body.allowSleep = true;
    body.sleepSpeedLimit = 0.05;
    body.sleepTimeLimit = 0.3;
    this.world.addBody(body);
    this.particles.set(id, body);
    return id;
  }

  removeParticle(id: number): boolean {
    const body = this.particles.get(id);
    if (body) {
      this.world.removeBody(body);
      this.particles.delete(id);
      return true;
    }
    return false;
  }

  removeAllParticles(): void {
    this.particles.forEach((body) => {
      this.world.removeBody(body);
    });
    this.particles.clear();
    this.nextParticleId = 0;
  }

  getParticlePosition(id: number): { x: number; y: number; z: number } | null {
    const body = this.particles.get(id);
    if (body) {
      return {
        x: body.position.x,
        y: body.position.y,
        z: body.position.z,
      };
    }
    return null;
  }

  setGravity(gravity: number): void {
    this.physicsConfig.gravity = gravity;
    this.world.gravity.set(0, -gravity, 0);
  }

  setFriction(friction: number): void {
    this.physicsConfig.friction = friction;
    this.particles.forEach((body) => {
      if (body.material) {
        body.material.friction = friction;
      }
    });
    if (this.groundBody.material) {
      this.groundBody.material.friction = friction;
    }
    this.wallBodies.forEach((body) => {
      if (body.material) {
        body.material.friction = friction;
      }
    });
  }

  step(deltaTime: number): void {
    const fixedTimeStep = 1 / 60;
    const maxSubSteps = 3;
    this.world.step(fixedTimeStep, deltaTime, maxSubSteps);
  }

  getParticleCount(): number {
    return this.particles.size;
  }

  getAllParticleIds(): number[] {
    return Array.from(this.particles.keys());
  }

  getParticleBody(id: number): CANNON.Body | undefined {
    return this.particles.get(id);
  }

  getAverageHeight(): number {
    if (this.particles.size === 0) return 0;
    let totalHeight = 0;
    this.particles.forEach((body) => {
      totalHeight += body.position.y;
    });
    return totalHeight / this.particles.size;
  }

  getHeightGrid(gridSize: number): number[][] {
    const { width, depth } = this.sandboxConfig;
    const halfW = width / 2;
    const halfD = depth / 2;
    const cellW = width / gridSize;
    const cellD = depth / gridSize;

    const grid: number[][] = [];
    for (let i = 0; i < gridSize; i++) {
      grid[i] = [];
      for (let j = 0; j < gridSize; j++) {
        grid[i][j] = 0;
      }
    }

    this.particles.forEach((body) => {
      const x = body.position.x;
      const y = body.position.y;
      const z = body.position.z;

      const gridX = Math.floor((x + halfW) / cellW);
      const gridZ = Math.floor((z + halfD) / cellD);

      if (gridX >= 0 && gridX < gridSize && gridZ >= 0 && gridZ < gridSize) {
        if (y > grid[gridX][gridZ]) {
          grid[gridX][gridZ] = y;
        }
      }
    });

    return grid;
  }
}
