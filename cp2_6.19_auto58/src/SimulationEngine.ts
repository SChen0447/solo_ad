export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TrajectoryPoint extends Vec3 {}

export interface Planet {
  id: number;
  name: string;
  mass: number;
  radius: number;
  color: string;
  position: Vec3;
  velocity: Vec3;
  trajectory: TrajectoryPoint[];
  selected: boolean;
  orbitalRadius: number;
  orbitalPeriod: number;
  initialAngle: number;
  initialOrbitalRadius: number;
}

export interface Star {
  mass: number;
  radius: number;
  color: string;
  position: Vec3;
  pulsePhase: number;
}

export interface Particle {
  id: number;
  position: Vec3;
  velocity: Vec3;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface EngineParams {
  G: number;
  timeScale: number;
  velocityMultiplier: number;
}

export interface MergeEvent {
  planetAId: number;
  planetBId: number;
  newPlanetId: number;
  position: Vec3;
  color: string;
}

type Listener<T> = (event: T) => void;

const PLANET_COLORS = ['#ff4444', '#4488ff', '#44ff44', '#aa44ff'];
const PLANET_NAMES = ['火星', '地球', '金星', '海王'];

export class SimulationEngine {
  public star: Star;
  public planets: Planet[] = [];
  public particles: Particle[] = [];
  public params: EngineParams;
  public mergeEvents: MergeEvent[] = [];

  private nextPlanetId = 1;
  private nextParticleId = 1;
  private time: number = 0;

  private mergeListeners: Listener<MergeEvent>[] = [];

  constructor() {
    this.params = {
      G: 1.0,
      timeScale: 1.0,
      velocityMultiplier: 1.0
    };

    this.star = {
      mass: 1000,
      radius: 3,
      color: '#ffcc00',
      position: { x: 0, y: 0, z: 0 },
      pulsePhase: 0
    };

    this.initDefaultPlanets();
  }

  private initDefaultPlanets(): void {
    for (let i = 0; i < 4; i++) {
      const orbitalRadius = 8 + Math.random() * 12;
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.5 + Math.random() * 0.7;
      const mass = 0.5 + Math.random() * 1.5;

      const speed = this.calculateOrbitalSpeed(orbitalRadius) * this.params.velocityMultiplier;

      const position: Vec3 = {
        x: Math.cos(angle) * orbitalRadius,
        y: (Math.random() - 0.5) * 2,
        z: Math.sin(angle) * orbitalRadius
      };

      const tangentDir: Vec3 = {
        x: -Math.sin(angle),
        y: 0,
        z: Math.cos(angle)
      };

      const velocity: Vec3 = {
        x: tangentDir.x * speed,
        y: (Math.random() - 0.5) * 0.1,
        z: tangentDir.z * speed
      };

      this.planets.push({
        id: this.nextPlanetId++,
        name: PLANET_NAMES[i],
        mass,
        radius,
        color: PLANET_COLORS[i],
        position,
        velocity,
        trajectory: [],
        selected: false,
        orbitalRadius,
        orbitalPeriod: this.calculateOrbitalPeriod(orbitalRadius),
        initialAngle: angle,
        initialOrbitalRadius: orbitalRadius
      });
    }
  }

  private calculateOrbitalSpeed(orbitalRadius: number): number {
    return Math.sqrt(this.params.G * this.star.mass / orbitalRadius);
  }

  private calculateOrbitalPeriod(orbitalRadius: number): number {
    if (this.params.G === 0 || this.star.mass === 0) return Infinity;
    return 2 * Math.PI * Math.sqrt(Math.pow(orbitalRadius, 3) / (this.params.G * this.star.mass));
  }

  private sub(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  private add(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  private scale(v: Vec3, s: number): Vec3 {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  }

  private length(v: Vec3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  private normalize(v: Vec3): Vec3 {
    const len = this.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  private dist(a: Vec3, b: Vec3): number {
    return this.length(this.sub(a, b));
  }

  public update(deltaTime: number): void {
    const dt = deltaTime * this.params.timeScale;
    this.time += dt;

    this.star.pulsePhase += deltaTime * Math.PI;

    this.updatePlanets(dt);
    this.checkCollisions();
    this.updateOrbitalData();
    this.updateParticles(dt);
  }

  private updatePlanets(dt: number): void {
    const accelerations: Vec3[] = this.planets.map(() => ({ x: 0, y: 0, z: 0 }));

    for (let i = 0; i < this.planets.length; i++) {
      const planet = this.planets[i];
      const toStar = this.sub(this.star.position, planet.position);
      const distToStar = this.length(toStar);
      if (distToStar > 0.001) {
        const forceMag = this.params.G * this.star.mass * planet.mass / (distToStar * distToStar);
        const accMag = forceMag / planet.mass;
        const dir = this.normalize(toStar);
        accelerations[i] = this.add(accelerations[i], this.scale(dir, accMag));
      }
    }

    for (let i = 0; i < this.planets.length; i++) {
      for (let j = i + 1; j < this.planets.length; j++) {
        const pi = this.planets[i];
        const pj = this.planets[j];
        const diff = this.sub(pj.position, pi.position);
        const dist = this.length(diff);
        if (dist > 0.001) {
          const forceMag = this.params.G * pi.mass * pj.mass / (dist * dist);
          const accMagI = forceMag / pi.mass;
          const accMagJ = forceMag / pj.mass;
          const dir = this.normalize(diff);
          accelerations[i] = this.add(accelerations[i], this.scale(dir, accMagI));
          accelerations[j] = this.add(accelerations[j], this.scale(dir, -accMagJ));
        }
      }
    }

    for (let i = 0; i < this.planets.length; i++) {
      const planet = this.planets[i];
      const acc = accelerations[i];

      planet.velocity = this.add(planet.velocity, this.scale(acc, dt));
      planet.position = this.add(planet.position, this.scale(planet.velocity, dt));

      planet.trajectory.push({ x: planet.position.x, y: planet.position.y, z: planet.position.z });
      if (planet.trajectory.length > 200) {
        planet.trajectory.splice(0, planet.trajectory.length - 200);
      }
    }
  }

  private checkCollisions(): void {
    const toRemove = new Set<number>();
    const toAdd: Planet[] = [];
    const newMergeEvents: MergeEvent[] = [];

    for (let i = 0; i < this.planets.length; i++) {
      if (toRemove.has(this.planets[i].id)) continue;
      for (let j = i + 1; j < this.planets.length; j++) {
        if (toRemove.has(this.planets[j].id)) continue;
        const pi = this.planets[i];
        const pj = this.planets[j];
        const collisionDist = pi.radius + pj.radius;
        const actualDist = this.dist(pi.position, pj.position);

        if (actualDist < collisionDist) {
          toRemove.add(pi.id);
          toRemove.add(pj.id);

          const newMass = pi.mass + pj.mass;
          const newRadius = Math.cbrt(Math.pow(pi.radius, 3) + Math.pow(pj.radius, 3));
          const newPosition = this.scale(
            this.add(
              this.scale(pi.position, pi.mass),
              this.scale(pj.position, pj.mass)
            ),
            1 / newMass
          );
          const newVelocity = this.scale(
            this.add(
              this.scale(pi.velocity, pi.mass),
              this.scale(pj.velocity, pj.mass)
            ),
            1 / newMass
          );
          const mixedColor = this.mixColors(pi.color, pj.color);

          const newPlanet: Planet = {
            id: this.nextPlanetId++,
            name: `${pi.name}-${pj.name}`,
            mass: newMass,
            radius: newRadius,
            color: mixedColor,
            position: newPosition,
            velocity: newVelocity,
            trajectory: [],
            selected: false,
            orbitalRadius: this.length(newPosition),
            orbitalPeriod: 0,
            initialAngle: Math.atan2(newPosition.z, newPosition.x),
            initialOrbitalRadius: this.length(newPosition)
          };

          toAdd.push(newPlanet);
          this.spawnMergeParticles(newPosition, mixedColor);

          newMergeEvents.push({
            planetAId: pi.id,
            planetBId: pj.id,
            newPlanetId: newPlanet.id,
            position: newPosition,
            color: mixedColor
          });
          break;
        }
      }
    }

    if (toRemove.size > 0) {
      this.planets = this.planets.filter(p => !toRemove.has(p.id));
      this.planets.push(...toAdd);
      this.mergeEvents.push(...newMergeEvents);
      newMergeEvents.forEach(e => {
        this.mergeListeners.forEach(l => l(e));
      });
    }
  }

  private spawnMergeParticles(position: Vec3, color: string): void {
    const count = 50;
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 5;

      const direction: Vec3 = {
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.sin(phi) * Math.sin(theta),
        z: Math.cos(phi)
      };

      this.particles.push({
        id: this.nextParticleId++,
        position: { ...position },
        velocity: this.scale(direction, speed),
        color,
        life: 0.5,
        maxLife: 0.5,
        size: 0.1 + Math.random() * 0.15
      });
    }
  }

  private mixColors(colorA: string, colorB: string): string {
    const hex = (c: string) => parseInt(c, 16);
    const r = Math.floor((hex(colorA.slice(1, 3)) + hex(colorB.slice(1, 3))) / 2);
    const g = Math.floor((hex(colorA.slice(3, 5)) + hex(colorB.slice(3, 5))) / 2);
    const b = Math.floor((hex(colorA.slice(5, 7)) + hex(colorB.slice(5, 7))) / 2);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private updateOrbitalData(): void {
    for (const planet of this.planets) {
      planet.orbitalRadius = this.dist(planet.position, this.star.position);
      planet.orbitalPeriod = this.calculateOrbitalPeriod(planet.orbitalRadius);
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      particle.position = this.add(particle.position, this.scale(particle.velocity, dt));
      particle.velocity = this.scale(particle.velocity, 0.98);
    }
  }

  public clearTrajectories(): void {
    for (const planet of this.planets) {
      planet.trajectory = [];
    }
  }

  public selectPlanet(id: number | null): void {
    for (const planet of this.planets) {
      planet.selected = planet.id === id;
    }
  }

  public selectPlanetByIndex(index: number): Planet | null {
    if (index >= 0 && index < this.planets.length) {
      this.selectPlanet(this.planets[index].id);
      return this.planets[index];
    }
    return null;
  }

  public getSelectedPlanet(): Planet | null {
    return this.planets.find(p => p.selected) || null;
  }

  public getPlanetById(id: number): Planet | undefined {
    return this.planets.find(p => p.id === id);
  }

  public setParam<K extends keyof EngineParams>(key: K, value: EngineParams[K]): void {
    this.params[key] = value;
  }

  public consumeMergeEvents(): MergeEvent[] {
    const events = this.mergeEvents;
    this.mergeEvents = [];
    return events;
  }

  public onMerge(listener: Listener<MergeEvent>): () => void {
    this.mergeListeners.push(listener);
    return () => {
      this.mergeListeners = this.mergeListeners.filter(l => l !== listener);
    };
  }

  public getTime(): number {
    return this.time;
  }
}
