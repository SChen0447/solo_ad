export interface Vector2 {
  x: number;
  y: number;
}

export interface PlanetConfig {
  name: string;
  color: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  inclination: number;
  mass: number;
  hasRings?: boolean;
  hasStripes?: boolean;
}

export interface CelestialBody {
  id: string;
  position: Vector2;
  velocity: Vector2;
  mass: number;
  radius: number;
  color: string;
}

export interface Sun extends CelestialBody {
  type: 'sun';
}

export interface Planet extends CelestialBody {
  type: 'planet';
  name: string;
  orbitRadius: number;
  orbitSpeed: number;
  inclination: number;
  angle: number;
  hasRings: boolean;
  hasStripes: boolean;
  trail: Vector2[];
  semiMajorAxis: number;
  eccentricity: number;
}

export interface Asteroid extends CelestialBody {
  type: 'asteroid';
  trail: Vector2[];
  netForce: Vector2;
  totalForceMagnitude: number;
}

export interface SimulationConfig {
  G: number;
  sunMass: number;
  asteroidInitialVelX: number;
  asteroidInitialVelY: number;
  trailLength: number;
  timeScale: number;
}

export class Simulation {
  private sun: Sun;
  private planets: Planet[];
  private asteroids: Asteroid[];
  private config: SimulationConfig;
  private centerX: number;
  private centerY: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.centerX = canvasWidth / 2;
    this.centerY = canvasHeight / 2;
    this.asteroids = [];

    this.config = {
      G: 0.5,
      sunMass: 1000,
      asteroidInitialVelX: 0,
      asteroidInitialVelY: 0,
      trailLength: 30,
      timeScale: 1
    };

    this.sun = {
      id: 'sun',
      type: 'sun',
      position: { x: this.centerX, y: this.centerY },
      velocity: { x: 0, y: 0 },
      mass: this.config.sunMass,
      radius: 40,
      color: '#FFD700'
    };

    this.planets = this.createPlanets();
  }

  private createPlanets(): Planet[] {
    const planetConfigs: PlanetConfig[] = [
      {
        name: '水星',
        color: '#B5A642',
        radius: 8,
        orbitRadius: 80,
        orbitSpeed: 0.04,
        inclination: 0.1,
        mass: 5
      },
      {
        name: '金星',
        color: '#E6B87D',
        radius: 12,
        orbitRadius: 130,
        orbitSpeed: 0.03,
        inclination: 0.05,
        mass: 8
      },
      {
        name: '地球',
        color: '#6B93D6',
        radius: 13,
        orbitRadius: 180,
        orbitSpeed: 0.025,
        inclination: 0,
        mass: 10
      },
      {
        name: '木星',
        color: '#D8CA9D',
        radius: 28,
        orbitRadius: 280,
        orbitSpeed: 0.015,
        inclination: 0.03,
        mass: 50,
        hasStripes: true
      },
      {
        name: '土星',
        color: '#F4D59E',
        radius: 24,
        orbitRadius: 380,
        orbitSpeed: 0.01,
        inclination: 0.08,
        mass: 40,
        hasRings: true
      }
    ];

    return planetConfigs.map((config, index) => {
      const eccentricity = 0.05 + Math.random() * 0.1;
      const semiMajorAxis = config.orbitRadius;
      
      return {
        id: `planet-${index}`,
        type: 'planet',
        name: config.name,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        mass: config.mass,
        radius: config.radius,
        color: config.color,
        orbitRadius: config.orbitRadius,
        orbitSpeed: config.orbitSpeed,
        inclination: config.inclination,
        angle: Math.random() * Math.PI * 2,
        hasRings: config.hasRings || false,
        hasStripes: config.hasStripes || false,
        trail: [],
        semiMajorAxis,
        eccentricity
      };
    });
  }

  public setConfig<K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]): void {
    this.config[key] = value;
    if (key === 'sunMass') {
      this.sun.mass = value as number;
    }
  }

  public getConfig(): SimulationConfig {
    return { ...this.config };
  }

  public setPlanetMass(planetId: string, mass: number): void {
    const planet = this.planets.find(p => p.id === planetId);
    if (planet) {
      planet.mass = mass;
    }
  }

  public getSun(): Sun {
    return this.sun;
  }

  public getPlanets(): Planet[] {
    return this.planets;
  }

  public getAsteroids(): Asteroid[] {
    return this.asteroids;
  }

  public addAsteroid(x: number, y: number): void {
    const asteroid: Asteroid = {
      id: `asteroid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'asteroid',
      position: { x, y },
      velocity: {
        x: this.config.asteroidInitialVelX,
        y: this.config.asteroidInitialVelY
      },
      mass: 0.1,
      radius: 5,
      color: '#4CAF50',
      trail: [],
      netForce: { x: 0, y: 0 },
      totalForceMagnitude: 0
    };
    this.asteroids.push(asteroid);
  }

  public clearAsteroids(): void {
    this.asteroids = [];
  }

  public removeAsteroid(id: string): void {
    this.asteroids = this.asteroids.filter(a => a.id !== id);
  }

  public update(deltaTime: number): void {
    const dt = deltaTime * this.config.timeScale;

    this.updatePlanets(dt);
    this.updateAsteroids(dt);
  }

  private updatePlanets(dt: number): void {
    for (const planet of this.planets) {
      planet.angle += planet.orbitSpeed * dt * 60;

      const r = planet.orbitRadius;
      const cosAngle = Math.cos(planet.angle);
      const sinAngle = Math.sin(planet.angle);
      const cosInc = Math.cos(planet.inclination);

      planet.position.x = this.centerX + r * cosAngle;
      planet.position.y = this.centerY + r * sinAngle * cosInc;

      planet.trail.unshift({ ...planet.position });
      if (planet.trail.length > this.config.trailLength) {
        planet.trail.pop();
      }

      const nextAngle = planet.angle + planet.orbitSpeed * dt * 60;
      const nextX = this.centerX + r * Math.cos(nextAngle);
      const nextY = this.centerY + r * Math.sin(nextAngle) * cosInc;
      planet.velocity.x = (nextX - planet.position.x) / (dt * 60);
      planet.velocity.y = (nextY - planet.position.y) / (dt * 60);
    }
  }

  private updateAsteroids(dt: number): void {
    const G = this.config.G;
    const bodies: CelestialBody[] = [this.sun, ...this.planets];

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.asteroids[i];
      
      let netForceX = 0;
      let netForceY = 0;

      for (const body of bodies) {
        const dx = body.position.x - asteroid.position.x;
        const dy = body.position.y - asteroid.position.y;
        const distanceSq = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSq);

        if (distance < body.radius + asteroid.radius) {
          this.asteroids.splice(i, 1);
          continue;
        }

        const minDistanceSq = (body.radius * 0.5) ** 2;
        const effectiveDistanceSq = Math.max(distanceSq, minDistanceSq);

        const forceMagnitude = (G * body.mass * asteroid.mass) / effectiveDistanceSq;
        const forceX = (forceMagnitude * dx) / distance;
        const forceY = (forceMagnitude * dy) / distance;

        netForceX += forceX;
        netForceY += forceY;
      }

      if (!this.asteroids[i]) continue;

      asteroid.netForce = { x: netForceX, y: netForceY };
      asteroid.totalForceMagnitude = Math.sqrt(netForceX * netForceX + netForceY * netForceY);

      const accelerationX = netForceX / asteroid.mass;
      const accelerationY = netForceY / asteroid.mass;

      asteroid.velocity.x += accelerationX * dt;
      asteroid.velocity.y += accelerationY * dt;

      asteroid.position.x += asteroid.velocity.x * dt * 60;
      asteroid.position.y += asteroid.velocity.y * dt * 60;

      asteroid.trail.unshift({ ...asteroid.position });
      if (asteroid.trail.length > this.config.trailLength) {
        asteroid.trail.pop();
      }

      const margin = 500;
      if (
        asteroid.position.x < -margin ||
        asteroid.position.x > this.centerX * 2 + margin ||
        asteroid.position.y < -margin ||
        asteroid.position.y > this.centerY * 2 + margin
      ) {
        this.asteroids.splice(i, 1);
      }
    }
  }

  public getPlanetOrbitPoints(planet: Planet, segments: number = 100): Vector2[] {
    const points: Vector2[] = [];
    const r = planet.orbitRadius;
    const cosInc = Math.cos(planet.inclination);

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push({
        x: this.centerX + r * Math.cos(angle),
        y: this.centerY + r * Math.sin(angle) * cosInc
      });
    }

    return points;
  }

  public getPlanetPerihelion(planet: Planet): number {
    return planet.semiMajorAxis * (1 - planet.eccentricity);
  }

  public getPlanetAphelion(planet: Planet): number {
    return planet.semiMajorAxis * (1 + planet.eccentricity);
  }

  public getInfluenceRadius(planet: Planet): number {
    return planet.radius * 10;
  }

  public isInPlanetInfluence(asteroid: Asteroid, planet: Planet): boolean {
    const dx = asteroid.position.x - planet.position.x;
    const dy = asteroid.position.y - planet.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.getInfluenceRadius(planet);
  }

  public findPlanetAtPosition(x: number, y: number): Planet | null {
    for (const planet of this.planets) {
      const dx = x - planet.position.x;
      const dy = y - planet.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= planet.radius + 5) {
        return planet;
      }
    }
    return null;
  }

  public findAsteroidAtPosition(x: number, y: number): Asteroid | null {
    for (const asteroid of this.asteroids) {
      const dx = x - asteroid.position.x;
      const dy = y - asteroid.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= asteroid.radius + 8) {
        return asteroid;
      }
    }
    return null;
  }

  public resize(canvasWidth: number, canvasHeight: number): void {
    const oldCenterX = this.centerX;
    const oldCenterY = this.centerY;
    this.centerX = canvasWidth / 2;
    this.centerY = canvasHeight / 2;

    const offsetX = this.centerX - oldCenterX;
    const offsetY = this.centerY - oldCenterY;

    this.sun.position.x += offsetX;
    this.sun.position.y += offsetY;

    for (const planet of this.planets) {
      planet.position.x += offsetX;
      planet.position.y += offsetY;
      for (const point of planet.trail) {
        point.x += offsetX;
        point.y += offsetY;
      }
    }

    for (const asteroid of this.asteroids) {
      asteroid.position.x += offsetX;
      asteroid.position.y += offsetY;
      for (const point of asteroid.trail) {
        point.x += offsetX;
        point.y += offsetY;
      }
    }
  }
}
