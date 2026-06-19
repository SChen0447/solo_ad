export interface PlanetData {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  acceleration: { x: number; y: number; z: number };
  mass: number;
  radius: number;
  color: string;
  isStar: boolean;
  orbitRadius: number;
  orbitalPeriod: number;
  trail: { x: number; y: number; z: number }[];
}

export interface CollisionEvent {
  planet1: PlanetData;
  planet2: PlanetData;
  mergedPlanet: PlanetData;
  position: { x: number; y: number; z: number };
  color1: string;
  color2: string;
}

export interface SimulationParams {
  gravityConstant: number;
  velocityMultiplier: number;
  timeScale: number;
}

const MAX_TRAIL_POINTS = 200;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function mixColors(color1: string, color2: string): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex((c1.r + c2.r) / 2, (c1.g + c2.g) / 2, (c1.b + c2.b) / 2);
}

function generateId(): string {
  return 'planet_' + Math.random().toString(36).substr(2, 9);
}

export class SimulationEngine {
  private star: PlanetData;
  private planets: PlanetData[] = [];
  private params: SimulationParams;
  private collisionListeners: ((event: CollisionEvent) => void)[] = [];
  private lastOrbitUpdateTime: Map<string, { angle: number; period: number; lastUpdate: number }> = new Map();
  private simulationTime: number = 0;

  constructor() {
    this.params = {
      gravityConstant: 1.0,
      velocityMultiplier: 1.0,
      timeScale: 1.0,
    };

    this.star = this.createStar();
    this.planets = this.createInitialPlanets();
    this.initializeOrbitTracking();
  }

  private createStar(): PlanetData {
    return {
      id: 'star',
      name: '恒星',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 1000,
      radius: 3,
      color: '#FFD700',
      isStar: true,
      orbitRadius: 0,
      orbitalPeriod: 0,
      trail: [],
    };
  }

  private createInitialPlanets(): PlanetData[] {
    const planetConfigs = [
      { name: '红色行星', color: '#FF4444', minSize: 0.5, maxSize: 0.8 },
      { name: '蓝色行星', color: '#4488FF', minSize: 0.7, maxSize: 1.0 },
      { name: '绿色行星', color: '#44FF88', minSize: 0.6, maxSize: 0.9 },
      { name: '紫色行星', color: '#CC66FF', minSize: 0.8, maxSize: 1.2 },
    ];

    const planets: PlanetData[] = [];
    const minOrbit = 8;
    const orbitStep = 6;

    planetConfigs.forEach((config, index) => {
      const orbitRadius = minOrbit + orbitStep * index + Math.random() * 2;
      const radius = config.minSize + Math.random() * (config.maxSize - config.minSize);
      const mass = 1 + radius * 2;
      const angle = Math.random() * Math.PI * 2;

      const speed = this.calculateCircularOrbitSpeed(orbitRadius, this.star.mass);
      const adjustedSpeed = speed * this.params.velocityMultiplier;

      const position = {
        x: Math.cos(angle) * orbitRadius,
        y: 0,
        z: Math.sin(angle) * orbitRadius,
      };

      const velocity = {
        x: -Math.sin(angle) * adjustedSpeed,
        y: 0,
        z: Math.cos(angle) * adjustedSpeed,
      };

      planets.push({
        id: generateId(),
        name: config.name,
        position,
        velocity,
        acceleration: { x: 0, y: 0, z: 0 },
        mass,
        radius,
        color: config.color,
        isStar: false,
        orbitRadius,
        orbitalPeriod: (2 * Math.PI * orbitRadius) / adjustedSpeed,
        trail: [],
      });
    });

    return planets;
  }

  private calculateCircularOrbitSpeed(orbitRadius: number, centralMass: number): number {
    return Math.sqrt((this.params.gravityConstant * centralMass) / orbitRadius);
  }

  private initializeOrbitTracking(): void {
    this.planets.forEach((planet) => {
      const angle = Math.atan2(planet.position.z, planet.position.x);
      this.lastOrbitUpdateTime.set(planet.id, {
        angle,
        period: planet.orbitalPeriod,
        lastUpdate: this.simulationTime,
      });
    });
  }

  setParams(params: Partial<SimulationParams>): void {
    const oldG = this.params.gravityConstant;
    const oldVelMult = this.params.velocityMultiplier;

    Object.assign(this.params, params);

    if (params.gravityConstant !== undefined && params.gravityConstant !== oldG) {
      this.planets.forEach((planet) => {
        const currentOrbit = Math.sqrt(
          planet.position.x ** 2 + planet.position.y ** 2 + planet.position.z ** 2
        );
        const newSpeed = this.calculateCircularOrbitSpeed(currentOrbit, this.star.mass);
        const speedRatio = newSpeed / this.calculateCircularOrbitSpeed(currentOrbit, this.star.mass);
        const currentSpeed = Math.sqrt(
          planet.velocity.x ** 2 + planet.velocity.y ** 2 + planet.velocity.z ** 2
        );
        if (currentSpeed > 0) {
          const factor = (speedRatio * this.params.velocityMultiplier) / oldVelMult;
          planet.velocity.x *= factor;
          planet.velocity.y *= factor;
          planet.velocity.z *= factor;
        }
      });
    }

    if (params.velocityMultiplier !== undefined && params.velocityMultiplier !== oldVelMult) {
      const factor = params.velocityMultiplier / oldVelMult;
      this.planets.forEach((planet) => {
        planet.velocity.x *= factor;
        planet.velocity.y *= factor;
        planet.velocity.z *= factor;
      });
    }
  }

  getParams(): SimulationParams {
    return { ...this.params };
  }

  getStar(): PlanetData {
    return { ...this.star, trail: [...this.star.trail] };
  }

  getPlanets(): PlanetData[] {
    return this.planets.map((p) => ({
      ...p,
      position: { ...p.position },
      velocity: { ...p.velocity },
      acceleration: { ...p.acceleration },
      trail: [...p.trail],
    }));
  }

  getAllBodies(): PlanetData[] {
    return [this.getStar(), ...this.getPlanets()];
  }

  getPlanetById(id: string): PlanetData | null {
    if (id === 'star') return this.getStar();
    const planet = this.planets.find((p) => p.id === id);
    return planet
      ? {
          ...planet,
          position: { ...planet.position },
          velocity: { ...planet.velocity },
          acceleration: { ...planet.acceleration },
          trail: [...planet.trail],
        }
      : null;
  }

  getPlanetByIndex(index: number): PlanetData | null {
    if (index < 0 || index >= this.planets.length) return null;
    return this.getPlanetById(this.planets[index].id);
  }

  addPlanet(planet: Omit<PlanetData, 'id' | 'trail'>): PlanetData {
    const newPlanet: PlanetData = {
      ...planet,
      id: generateId(),
      trail: [],
    };
    this.planets.push(newPlanet);
    const angle = Math.atan2(newPlanet.position.z, newPlanet.position.x);
    this.lastOrbitUpdateTime.set(newPlanet.id, {
      angle,
      period: newPlanet.orbitalPeriod,
      lastUpdate: this.simulationTime,
    });
    return this.getPlanetById(newPlanet.id)!;
  }

  removePlanet(id: string): boolean {
    const index = this.planets.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.planets.splice(index, 1);
    this.lastOrbitUpdateTime.delete(id);
    return true;
  }

  clearAllTrails(): void {
    this.planets.forEach((p) => {
      p.trail = [];
    });
  }

  onCollision(listener: (event: CollisionEvent) => void): () => void {
    this.collisionListeners.push(listener);
    return () => {
      const idx = this.collisionListeners.indexOf(listener);
      if (idx !== -1) this.collisionListeners.splice(idx, 1);
    };
  }

  private emitCollision(event: CollisionEvent): void {
    this.collisionListeners.forEach((listener) => listener(event));
  }

  update(deltaTime: number): void {
    const dt = deltaTime * this.params.timeScale;
    if (dt <= 0) return;

    this.simulationTime += dt;

    const allBodies = [this.star, ...this.planets];

    this.planets.forEach((planet) => {
      planet.acceleration = { x: 0, y: 0, z: 0 };

      allBodies.forEach((other) => {
        if (other.id === planet.id) return;

        const dx = other.position.x - planet.position.x;
        const dy = other.position.y - planet.position.y;
        const dz = other.position.z - planet.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);

        if (dist < 0.001) return;

        const force = (this.params.gravityConstant * other.mass) / distSq;
        const invDist = 1 / dist;

        planet.acceleration.x += force * dx * invDist;
        planet.acceleration.y += force * dy * invDist;
        planet.acceleration.z += force * dz * invDist;
      });
    });

    this.planets.forEach((planet) => {
      planet.velocity.x += planet.acceleration.x * dt;
      planet.velocity.y += planet.acceleration.y * dt;
      planet.velocity.z += planet.acceleration.z * dt;

      planet.position.x += planet.velocity.x * dt;
      planet.position.y += planet.velocity.y * dt;
      planet.position.z += planet.velocity.z * dt;

      planet.trail.push({ ...planet.position });
      if (planet.trail.length > MAX_TRAIL_POINTS) {
        planet.trail.shift();
      }

      this.updateOrbitParameters(planet);
    });

    this.checkCollisions();
  }

  private updateOrbitParameters(planet: PlanetData): void {
    const distance = Math.sqrt(
      planet.position.x ** 2 + planet.position.y ** 2 + planet.position.z ** 2
    );
    planet.orbitRadius = distance;

    const tracking = this.lastOrbitUpdateTime.get(planet.id);
    const currentAngle = Math.atan2(planet.position.z, planet.position.x);

    if (tracking) {
      let angleDiff = currentAngle - tracking.angle;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;

      const timeDiff = this.simulationTime - tracking.lastUpdate;
      if (Math.abs(angleDiff) > Math.PI * 0.01 && timeDiff > 0.1) {
        const angularSpeed = Math.abs(angleDiff) / timeDiff;
        if (angularSpeed > 0.0001) {
          planet.orbitalPeriod = (2 * Math.PI) / angularSpeed;
          tracking.period = planet.orbitalPeriod;
        }
      }
      tracking.angle = currentAngle;
      tracking.lastUpdate = this.simulationTime;
    }
  }

  private checkCollisions(): void {
    const toMerge: [number, number][] = [];
    const allBodies = [this.star, ...this.planets];

    for (let i = 0; i < allBodies.length; i++) {
      for (let j = i + 1; j < allBodies.length; j++) {
        const a = allBodies[i];
        const b = allBodies[j];

        if (a.isStar && b.isStar) continue;

        const dx = a.position.x - b.position.x;
        const dy = a.position.y - b.position.y;
        const dz = a.position.z - b.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDist = a.radius + b.radius;

        if (dist < minDist) {
          const idxA = i === 0 ? -1 : i - 1;
          const idxB = j === 0 ? -1 : j - 1;

          if (a.isStar && idxB >= 0) {
            this.absorbByStar(idxB);
          } else if (b.isStar && idxA >= 0) {
            this.absorbByStar(idxA);
          } else if (idxA >= 0 && idxB >= 0) {
            if (!toMerge.some(([x, y]) => x === idxA || y === idxA || x === idxB || y === idxB)) {
              toMerge.push([idxA, idxB]);
            }
          }
        }
      }
    }

    toMerge.reverse().forEach(([i, j]) => {
      this.mergePlanets(i, j);
    });
  }

  private absorbByStar(planetIndex: number): void {
    const planet = this.planets[planetIndex];
    this.star.mass += planet.mass;
    this.star.radius = Math.cbrt(this.star.radius ** 3 + planet.radius ** 3) * 0.9;
    this.lastOrbitUpdateTime.delete(planet.id);
    this.planets.splice(planetIndex, 1);
  }

  private mergePlanets(i: number, j: number): void {
    const idx1 = Math.min(i, j);
    const idx2 = Math.max(i, j);

    const planet1 = this.planets[idx1];
    const planet2 = this.planets[idx2];

    const totalMass = planet1.mass + planet2.mass;
    const collisionPoint = {
      x: (planet1.position.x * planet2.mass + planet2.position.x * planet1.mass) / totalMass,
      y: (planet1.position.y * planet2.mass + planet2.position.y * planet1.mass) / totalMass,
      z: (planet1.position.z * planet2.mass + planet2.position.z * planet1.mass) / totalMass,
    };

    const newColor = mixColors(planet1.color, planet2.color);
    const newRadius = Math.cbrt(planet1.radius ** 3 + planet2.radius ** 3);

    const merged: PlanetData = {
      id: generateId(),
      name: `合并行星-${planet1.name.replace('行星', '')}${planet2.name.replace('行星', '')}`,
      position: collisionPoint,
      velocity: {
        x: (planet1.velocity.x * planet1.mass + planet2.velocity.x * planet2.mass) / totalMass,
        y: (planet1.velocity.y * planet1.mass + planet2.velocity.y * planet2.mass) / totalMass,
        z: (planet1.velocity.z * planet1.mass + planet2.velocity.z * planet2.mass) / totalMass,
      },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: totalMass,
      radius: newRadius,
      color: newColor,
      isStar: false,
      orbitRadius: 0,
      orbitalPeriod: 0,
      trail: [],
    };

    merged.orbitRadius = Math.sqrt(
      merged.position.x ** 2 + merged.position.y ** 2 + merged.position.z ** 2
    );
    const speed = Math.sqrt(merged.velocity.x ** 2 + merged.velocity.y ** 2 + merged.velocity.z ** 2);
    merged.orbitalPeriod = speed > 0 ? (2 * Math.PI * merged.orbitRadius) / speed : 0;

    this.emitCollision({
      planet1: { ...planet1 },
      planet2: { ...planet2 },
      mergedPlanet: { ...merged },
      position: { ...collisionPoint },
      color1: planet1.color,
      color2: planet2.color,
    });

    this.lastOrbitUpdateTime.delete(planet1.id);
    this.lastOrbitUpdateTime.delete(planet2.id);

    this.planets.splice(idx2, 1);
    this.planets.splice(idx1, 1);
    this.planets.push(merged);

    const angle = Math.atan2(merged.position.z, merged.position.x);
    this.lastOrbitUpdateTime.set(merged.id, {
      angle,
      period: merged.orbitalPeriod,
      lastUpdate: this.simulationTime,
    });
  }

  getPlanetCount(): number {
    return this.planets.length;
  }
}
