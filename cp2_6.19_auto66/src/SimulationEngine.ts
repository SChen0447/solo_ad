import * as THREE from 'three';

export interface PlanetData {
  id: string;
  name: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mass: number;
  radius: number;
  color: number;
  trail: THREE.Vector3[];
  selected: boolean;
  orbitalRadius: number;
  orbitalPeriod: number;
  angle: number;
}

export interface StarData {
  position: THREE.Vector3;
  mass: number;
  radius: number;
  color: number;
}

export interface CollisionEvent {
  planetAId: string;
  planetBId: string;
  position: THREE.Vector3;
  mergedColor: number;
}

export interface ParticleData {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: number;
  life: number;
  maxLife: number;
}

export class SimulationEngine {
  private planets: PlanetData[] = [];
  private star: StarData;
  private particles: ParticleData[] = [];
  private G: number = 1;
  private timeScale: number = 1;
  private velocityMultiplier: number = 1;
  private selectedPlanetId: string | null = null;
  private collisionListeners: ((event: CollisionEvent) => void)[] = [];
  private maxTrailPoints: number = 200;

  private planetColors: number[] = [0xff4444, 0x4488ff, 0x44ff44, 0xaa44ff];
  private planetNames: string[] = ['火星', '海王星', '翠金星', '紫霞星'];

  constructor() {
    this.star = {
      position: new THREE.Vector3(0, 0, 0),
      mass: 1000,
      radius: 3,
      color: 0xffdd44
    };
    this.initializePlanets();
  }

  private initializePlanets(): void {
    for (let i = 0; i < 4; i++) {
      const orbitalRadius = 8 + Math.random() * 12;
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.5 + Math.random() * 0.7;
      const mass = radius * radius * radius * 2;

      const position = new THREE.Vector3(
        Math.cos(angle) * orbitalRadius,
        (Math.random() - 0.5) * 2,
        Math.sin(angle) * orbitalRadius
      );

      const speed = Math.sqrt((this.G * this.star.mass) / orbitalRadius) * this.velocityMultiplier;
      const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).normalize();
      const velocity = tangent.multiplyScalar(speed);

      this.planets.push({
        id: `planet-${i}`,
        name: this.planetNames[i],
        position,
        velocity,
        mass,
        radius,
        color: this.planetColors[i],
        trail: [],
        selected: false,
        orbitalRadius,
        orbitalPeriod: (2 * Math.PI * orbitalRadius) / speed,
        angle
      });
    }
  }

  public update(deltaTime: number): void {
    if (deltaTime <= 0) return;

    const dt = deltaTime * this.timeScale;

    for (const planet of this.planets) {
      const toStar = new THREE.Vector3().subVectors(this.star.position, planet.position);
      const distance = toStar.length();
      if (distance < 0.001) continue;

      const forceMagnitude = (this.G * this.star.mass * planet.mass) / (distance * distance);
      const acceleration = toStar.normalize().multiplyScalar(forceMagnitude / planet.mass);

      planet.velocity.add(acceleration.multiplyScalar(dt));
      planet.position.add(planet.velocity.clone().multiplyScalar(dt));

      const distFromStar = planet.position.distanceTo(this.star.position);
      planet.orbitalRadius = distFromStar;
      const speed = planet.velocity.length();
      if (speed > 0) {
        planet.orbitalPeriod = (2 * Math.PI * distFromStar) / speed;
      }

      planet.trail.push(planet.position.clone());
      if (planet.trail.length > this.maxTrailPoints) {
        planet.trail.shift();
      }
    }

    this.checkCollisions();
    this.updateParticles(dt);
  }

  private checkCollisions(): void {
    const toRemove: Set<string> = new Set();
    const newPlanets: PlanetData[] = [];

    for (let i = 0; i < this.planets.length; i++) {
      if (toRemove.has(this.planets[i].id)) continue;

      for (let j = i + 1; j < this.planets.length; j++) {
        if (toRemove.has(this.planets[j].id)) continue;

        const a = this.planets[i];
        const b = this.planets[j];
        const distance = a.position.distanceTo(b.position);

        if (distance < a.radius + b.radius) {
          const mergedMass = a.mass + b.mass;
          const mergedRadius = Math.cbrt(a.radius ** 3 + b.radius ** 3);
          const mergedPosition = new THREE.Vector3()
            .addVectors(
              a.position.clone().multiplyScalar(a.mass),
              b.position.clone().multiplyScalar(b.mass)
            )
            .divideScalar(mergedMass);

          const mergedVelocity = new THREE.Vector3()
            .addVectors(
              a.velocity.clone().multiplyScalar(a.mass),
              b.velocity.clone().multiplyScalar(b.mass)
            )
            .divideScalar(mergedMass);

          const colorA = new THREE.Color(a.color);
          const colorB = new THREE.Color(b.color);
          const mergedColor = colorA.clone().lerp(colorB, 0.5).getHex();

          const mergedPlanet: PlanetData = {
            id: `planet-${Date.now()}-${Math.random()}`,
            name: `合并星`,
            position: mergedPosition,
            velocity: mergedVelocity,
            mass: mergedMass,
            radius: mergedRadius,
            color: mergedColor,
            trail: [],
            selected: false,
            orbitalRadius: mergedPosition.distanceTo(this.star.position),
            orbitalPeriod: 0,
            angle: 0
          };

          this.emitCollision({
            planetAId: a.id,
            planetBId: b.id,
            position: mergedPosition.clone(),
            mergedColor
          });

          this.createExplosionParticles(mergedPosition, mergedColor);

          toRemove.add(a.id);
          toRemove.add(b.id);
          newPlanets.push(mergedPlanet);
          break;
        }
      }
    }

    this.planets = this.planets.filter(p => !toRemove.has(p.id));
    this.planets.push(...newPlanets);
  }

  private createExplosionParticles(position: THREE.Vector3, color: number): void {
    for (let i = 0; i < 50; i++) {
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const speed = 2 + Math.random() * 4;
      this.particles.push({
        id: `particle-${Date.now()}-${i}`,
        position: position.clone(),
        velocity: direction.multiplyScalar(speed),
        color,
        life: 0.5,
        maxLife: 0.5
      });
    }
  }

  private updateParticles(dt: number): void {
    this.particles = this.particles.filter(p => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.position.add(p.velocity.clone().multiplyScalar(dt));
      return true;
    });
  }

  private emitCollision(event: CollisionEvent): void {
    for (const listener of this.collisionListeners) {
      listener(event);
    }
  }

  public onCollision(listener: (event: CollisionEvent) => void): void {
    this.collisionListeners.push(listener);
  }

  public selectPlanet(id: string | null): void {
    for (const planet of this.planets) {
      planet.selected = planet.id === id;
    }
    this.selectedPlanetId = id;
  }

  public getSelectedPlanet(): PlanetData | null {
    return this.planets.find(p => p.id === this.selectedPlanetId) || null;
  }

  public selectPlanetByIndex(index: number): void {
    if (index >= 0 && index < this.planets.length) {
      this.selectPlanet(this.planets[index].id);
    }
  }

  public clearAllTrails(): void {
    for (const planet of this.planets) {
      planet.trail = [];
    }
  }

  public getPlanets(): PlanetData[] {
    return this.planets;
  }

  public getStar(): StarData {
    return this.star;
  }

  public getParticles(): ParticleData[] {
    return this.particles;
  }

  public setG(value: number): void {
    this.G = value;
  }

  public getG(): number {
    return this.G;
  }

  public setTimeScale(value: number): void {
    this.timeScale = value;
  }

  public getTimeScale(): number {
    return this.timeScale;
  }

  public setVelocityMultiplier(value: number): void {
    this.velocityMultiplier = value;
  }

  public getVelocityMultiplier(): number {
    return this.velocityMultiplier;
  }

  public getPlanetCount(): number {
    return this.planets.length;
  }
}
