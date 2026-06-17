export interface ParticleData {
  position: Float32Array;
  velocity: Float32Array;
  density: Float32Array;
  pressure: Float32Array;
  count: number;
}

export interface FluidParams {
  viscosity: number;
  density: number;
  pressureStrength: number;
  particleRadius: number;
  velocityDamping: number;
  boundaryForce: number;
}

const BOUNDARY_RADIUS = 5.0;
const GRAVITY = -9.8;
const REST_DENSITY = 1000.0;
const GAS_CONSTANT = 200.0;
const TIME_STEP = 0.008;

export class FluidSimulator {
  private particles: ParticleData;
  private params: FluidParams;
  private spatialGrid: Map<string, number[]>;
  private cellSize: number;
  private kernelRadius: number;
  private targetParams: FluidParams | null;
  private transitionProgress: number;

  constructor(count: number, params: FluidParams) {
    this.params = { ...params };
    this.targetParams = null;
    this.transitionProgress = 1.0;
    this.kernelRadius = params.particleRadius * 4.0;
    this.cellSize = this.kernelRadius;
    this.spatialGrid = new Map();
    this.particles = this.initializeParticles(count);
  }

  private initializeParticles(count: number): ParticleData {
    const position = new Float32Array(count * 3);
    const velocity = new Float32Array(count * 3);
    const density = new Float32Array(count);
    const pressure = new Float32Array(count);

    const gridSize = Math.ceil(Math.cbrt(count));
    const spacing = this.params.particleRadius * 2.5;
    const offset = (gridSize - 1) * spacing / 2;
    let idx = 0;

    for (let x = 0; x < gridSize && idx < count; x++) {
      for (let y = 0; y < gridSize && idx < count; y++) {
        for (let z = 0; z < gridSize && idx < count; z++) {
          position[idx * 3] = (x * spacing - offset) * 0.5 + (Math.random() - 0.5) * 0.1;
          position[idx * 3 + 1] = (y * spacing - offset) * 0.5 + (Math.random() - 0.5) * 0.1;
          position[idx * 3 + 2] = (z * spacing - offset) * 0.5 + (Math.random() - 0.5) * 0.1;

          velocity[idx * 3] = (Math.random() - 0.5) * 0.5;
          velocity[idx * 3 + 1] = (Math.random() - 0.5) * 0.2;
          velocity[idx * 3 + 2] = (Math.random() - 0.5) * 0.5;

          density[idx] = REST_DENSITY;
          pressure[idx] = 0;
          idx++;
        }
      }
    }

    return { position, velocity, density, pressure, count: idx };
  }

  public getParticles(): ParticleData {
    return this.particles;
  }

  public setParams(params: Partial<FluidParams>): void {
    Object.assign(this.params, params);
    this.kernelRadius = this.params.particleRadius * 4.0;
    this.cellSize = this.kernelRadius;
  }

  public startTransition(targetParams: FluidParams): void {
    this.targetParams = { ...targetParams };
    this.transitionProgress = 0;
  }

  private updateTransition(deltaTime: number): void {
    if (!this.targetParams || this.transitionProgress >= 1.0) return;

    this.transitionProgress += deltaTime / 2.0;
    if (this.transitionProgress > 1.0) this.transitionProgress = 1.0;

    const t = this.transitionProgress;
    this.params.viscosity = this.lerp(this.params.viscosity, this.targetParams.viscosity, t);
    this.params.density = this.lerp(this.params.density, this.targetParams.density, t);
    this.params.pressureStrength = this.lerp(this.params.pressureStrength, this.targetParams.pressureStrength, t);
    this.params.particleRadius = this.lerp(this.params.particleRadius, this.targetParams.particleRadius, t);
    this.params.velocityDamping = this.lerp(this.params.velocityDamping, this.targetParams.velocityDamping, t);
    this.params.boundaryForce = this.lerp(this.params.boundaryForce, this.targetParams.boundaryForce, t);

    this.kernelRadius = this.params.particleRadius * 4.0;
    this.cellSize = this.kernelRadius;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private getCellKey(x: number, y: number, z: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)},${Math.floor(z / this.cellSize)}`;
  }

  private buildSpatialGrid(): void {
    this.spatialGrid.clear();
    const { position, count } = this.particles;

    for (let i = 0; i < count; i++) {
      const key = this.getCellKey(position[i * 3], position[i * 3 + 1], position[i * 3 + 2]);
      if (!this.spatialGrid.has(key)) {
        this.spatialGrid.set(key, []);
      }
      this.spatialGrid.get(key)!.push(i);
    }
  }

  private getNeighbors(i: number): number[] {
    const neighbors: number[] = [];
    const { position } = this.particles;
    const px = position[i * 3];
    const py = position[i * 3 + 1];
    const pz = position[i * 3 + 2];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = this.getCellKey(
            px + dx * this.cellSize,
            py + dy * this.cellSize,
            pz + dz * this.cellSize
          );
          const cell = this.spatialGrid.get(key);
          if (cell) {
            neighbors.push(...cell);
          }
        }
      }
    }
    return neighbors;
  }

  private kernelPoly6(r: number, h: number): number {
    if (r > h) return 0;
    const diff = h * h - r * r;
    return (315 / (64 * Math.PI * Math.pow(h, 9))) * diff * diff * diff;
  }

  private kernelSpikyGradient(r: number, h: number): number {
    if (r > h || r < 0.0001) return 0;
    const diff = h - r;
    return (-45 / (Math.PI * Math.pow(h, 6))) * diff * diff;
  }

  private kernelViscosityLaplacian(r: number, h: number): number {
    if (r > h) return 0;
    return (45 / (Math.PI * Math.pow(h, 6))) * (h - r);
  }

  private computeDensityAndPressure(): void {
    const { position, density, pressure, count } = this.particles;
    const h = this.kernelRadius;
    const restDensity = REST_DENSITY * this.params.density;

    for (let i = 0; i < count; i++) {
      let dens = 0;
      const neighbors = this.getNeighbors(i);

      for (const j of neighbors) {
        const dx = position[j * 3] - position[i * 3];
        const dy = position[j * 3 + 1] - position[i * 3 + 1];
        const dz = position[j * 3 + 2] - position[i * 3 + 2];
        const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
        dens += this.kernelPoly6(r, h);
      }

      density[i] = dens;
      pressure[i] = GAS_CONSTANT * this.params.pressureStrength * 0.01 * Math.max(0, dens - restDensity);
    }
  }

  private computeForces(): Float32Array {
    const { position, velocity, density, pressure, count } = this.particles;
    const forces = new Float32Array(count * 3);
    const h = this.kernelRadius;

    for (let i = 0; i < count; i++) {
      const neighbors = this.getNeighbors(i);
      const pi = pressure[i];
      const rhoi = density[i] > 0.001 ? density[i] : 1;

      let fx = 0, fy = GRAVITY, fz = 0;

      for (const j of neighbors) {
        if (i === j) continue;

        const dx = position[j * 3] - position[i * 3];
        const dy = position[j * 3 + 1] - position[i * 3 + 1];
        const dz = position[j * 3 + 2] - position[i * 3 + 2];
        const r = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (r < 0.0001 || r > h) continue;

        const pj = pressure[j];
        const rhoj = density[j] > 0.001 ? density[j] : 1;

        const pressureGrad = this.kernelSpikyGradient(r, h);
        const pressureForce = -((pi / (rhoi * rhoi)) + (pj / (rhoj * rhoj))) * pressureGrad;

        fx += pressureForce * (dx / r);
        fy += pressureForce * (dy / r);
        fz += pressureForce * (dz / r);

        const viscLap = this.kernelViscosityLaplacian(r, h);
        const viscForce = this.params.viscosity * viscLap * (1.0 / rhoj + 1.0 / rhoi) * 0.5;

        fx += viscForce * (velocity[j * 3] - velocity[i * 3]);
        fy += viscForce * (velocity[j * 3 + 1] - velocity[i * 3 + 1]);
        fz += viscForce * (velocity[j * 3 + 2] - velocity[i * 3 + 2]);
      }

      const px = position[i * 3];
      const py = position[i * 3 + 1];
      const pz = position[i * 3 + 2];
      const dist = Math.sqrt(px * px + py * py + pz * pz);

      if (dist > BOUNDARY_RADIUS) {
        const boundaryStrength = this.params.boundaryForce * 50;
        const norm = dist > 0 ? 1 / dist : 0;
        fx -= (px * norm) * boundaryStrength * (dist - BOUNDARY_RADIUS);
        fy -= (py * norm) * boundaryStrength * (dist - BOUNDARY_RADIUS);
        fz -= (pz * norm) * boundaryStrength * (dist - BOUNDARY_RADIUS);
      }

      forces[i * 3] = fx;
      forces[i * 3 + 1] = fy;
      forces[i * 3 + 2] = fz;
    }

    return forces;
  }

  private integrate(forces: Float32Array, deltaTime: number): void {
    const { position, velocity, count } = this.particles;
    const dt = Math.min(deltaTime, TIME_STEP);
    const damping = this.params.velocityDamping;

    for (let i = 0; i < count; i++) {
      velocity[i * 3] += forces[i * 3] * dt;
      velocity[i * 3 + 1] += forces[i * 3 + 1] * dt;
      velocity[i * 3 + 2] += forces[i * 3 + 2] * dt;

      velocity[i * 3] *= damping;
      velocity[i * 3 + 1] *= damping;
      velocity[i * 3 + 2] *= damping;

      position[i * 3] += velocity[i * 3] * dt;
      position[i * 3 + 1] += velocity[i * 3 + 1] * dt;
      position[i * 3 + 2] += velocity[i * 3 + 2] * dt;
    }
  }

  public step(deltaTime: number): ParticleData {
    this.updateTransition(deltaTime);

    this.buildSpatialGrid();
    this.computeDensityAndPressure();
    const forces = this.computeForces();
    this.integrate(forces, deltaTime);

    return this.particles;
  }
}
