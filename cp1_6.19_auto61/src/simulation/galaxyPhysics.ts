export interface Particle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
}

export interface SimulationParams {
  particleMass: number;
  initialAngularMomentum: number;
  collisionDamping: number;
  darkMatterMass: number;
  initialTemperature: number;
  timeScale: number;
}

export interface SimulationStats {
  particleCount: number;
  averageVelocity: number;
  totalKineticEnergy: number;
  totalPotentialEnergy: number;
}

const G = 0.5;
const SOFTENING = 0.1;
const GRID_SIZE = 8;

function randomGaussian(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function initializeParticles(
  params: SimulationParams,
  count: number
): Particle[] {
  const particles: Particle[] = [];
  const scaleRadius = 3.0;
  const scaleHeight = 0.5 * params.initialAngularMomentum;

  for (let i = 0; i < count; i++) {
    const r = scaleRadius * Math.log(1 / Math.random());
    const theta = Math.random() * Math.PI * 2;
    const z = scaleHeight * randomGaussian();

    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);

    const darkMatterFactor = 1 + params.darkMatterMass * 0.3;
    const vCircular = Math.sqrt((G * params.particleMass * darkMatterFactor) / Math.max(r, SOFTENING)) * params.initialAngularMomentum;

    const vx = -vCircular * Math.sin(theta);
    const vy = vCircular * Math.cos(theta);

    const tempVel = Math.sqrt(params.initialTemperature) * 0.3;
    const vxFinal = vx + tempVel * randomGaussian();
    const vyFinal = vy + tempVel * randomGaussian();
    const vzFinal = tempVel * randomGaussian() * 0.5;

    const size = 0.02 + Math.random() * 0.06;

    particles.push({
      id: i,
      x,
      y,
      z,
      vx: vxFinal,
      vy: vyFinal,
      vz: vzFinal,
      size,
    });
  }

  return particles;
}

function calculateGravity(
  particles: Particle[],
  params: SimulationParams
): Float32Array {
  const n = particles.length;
  const accelerations = new Float32Array(n * 3);

  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const p of particles) {
    bounds.minX = Math.min(bounds.minX, p.x);
    bounds.maxX = Math.max(bounds.maxX, p.x);
    bounds.minY = Math.min(bounds.minY, p.y);
    bounds.maxY = Math.max(bounds.maxY, p.y);
    bounds.minZ = Math.min(bounds.minZ, p.z);
    bounds.maxZ = Math.max(bounds.maxZ, p.z);
  }

  const cellSize = Math.max(
    (bounds.maxX - bounds.minX) / GRID_SIZE,
    (bounds.maxY - bounds.minY) / GRID_SIZE,
    (bounds.maxZ - bounds.minZ) / GRID_SIZE,
    0.5
  );

  const grid: Map<string, number[]> = new Map();

  for (let i = 0; i < n; i++) {
    const p = particles[i];
    const gx = Math.floor((p.x - bounds.minX) / cellSize);
    const gy = Math.floor((p.y - bounds.minY) / cellSize);
    const gz = Math.floor((p.z - bounds.minZ) / cellSize);
    const key = `${gx},${gy},${gz}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(i);
  }

  for (let i = 0; i < n; i++) {
    const pi = particles[i];
    let ax = 0, ay = 0, az = 0;

    const gx = Math.floor((pi.x - bounds.minX) / cellSize);
    const gy = Math.floor((pi.y - bounds.minY) / cellSize);
    const gz = Math.floor((pi.z - bounds.minZ) / cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${gx + dx},${gy + dy},${gz + dz}`;
          const cell = grid.get(key);
          if (!cell) continue;

          for (const j of cell) {
            if (i === j) continue;
            const pj = particles[j];
            const dxv = pj.x - pi.x;
            const dyv = pj.y - pi.y;
            const dzv = pj.z - pi.z;
            const distSq = dxv * dxv + dyv * dyv + dzv * dzv + SOFTENING * SOFTENING;
            const dist = Math.sqrt(distSq);
            const force = G * params.particleMass / (distSq * dist);
            ax += dxv * force;
            ay += dyv * force;
            az += dzv * force;
          }
        }
      }
    }

    if (params.darkMatterMass > 0) {
      const r = Math.sqrt(pi.x * pi.x + pi.y * pi.y + pi.z * pi.z);
      if (r > 0.1) {
        const dmForce = G * params.darkMatterMass * params.particleMass / (r * r);
        ax -= (pi.x / r) * dmForce;
        ay -= (pi.y / r) * dmForce;
        az -= (pi.z / r) * dmForce;
      }
    }

    accelerations[i * 3] = ax;
    accelerations[i * 3 + 1] = ay;
    accelerations[i * 3 + 2] = az;
  }

  return accelerations;
}

export function simulateStep(
  particles: Particle[],
  params: SimulationParams,
  dt: number
): Particle[] {
  const n = particles.length;
  const accelerations = calculateGravity(particles, params);
  const damping = 1 - params.collisionDamping * 0.01;
  const adjustedDt = dt * params.timeScale;

  const newParticles: Particle[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const p = particles[i];
    const ax = accelerations[i * 3];
    const ay = accelerations[i * 3 + 1];
    const az = accelerations[i * 3 + 2];

    let vx = (p.vx + ax * adjustedDt) * damping;
    let vy = (p.vy + ay * adjustedDt) * damping;
    let vz = (p.vz + az * adjustedDt) * damping;

    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const maxSpeed = 15;
    if (speed > maxSpeed) {
      vx = (vx / speed) * maxSpeed;
      vy = (vy / speed) * maxSpeed;
      vz = (vz / speed) * maxSpeed;
    }

    newParticles[i] = {
      ...p,
      x: p.x + vx * adjustedDt,
      y: p.y + vy * adjustedDt,
      z: p.z + vz * adjustedDt,
      vx,
      vy,
      vz,
    };
  }

  return newParticles;
}

export function calculateStats(particles: Particle[], params: SimulationParams): SimulationStats {
  const n = particles.length;
  let totalSpeed = 0;
  let totalKE = 0;
  let totalPE = 0;

  for (let i = 0; i < n; i++) {
    const p = particles[i];
    const speedSq = p.vx * p.vx + p.vy * p.vy + p.vz * p.vz;
    const speed = Math.sqrt(speedSq);
    totalSpeed += speed;
    totalKE += 0.5 * params.particleMass * speedSq;

    const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
    if (r > 0) {
      totalPE -= G * params.particleMass * params.particleMass * n / r;
    }
  }

  return {
    particleCount: n,
    averageVelocity: totalSpeed / n,
    totalKineticEnergy: totalKE,
    totalPotentialEnergy: totalPE,
  };
}
