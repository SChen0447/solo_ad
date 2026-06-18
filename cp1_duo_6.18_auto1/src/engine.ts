export type EventType = 
  | 'chargeStart'
  | 'chargeUpdate'
  | 'chargeRelease'
  | 'ringPassed'
  | 'gameWin'
  | 'gameReset'
  | 'gravityChange';

export interface EventPayload {
  chargeStart?: { x: number; y: number };
  chargeUpdate?: { x: number; y: number; distance: number };
  chargeRelease?: { vx: number; vy: number };
  ringPassed?: { index: number; total: number };
  gameWin?: void;
  gameReset?: void;
  gravityChange?: { value: number };
}

export class EventBus {
  private listeners: Map<EventType, Array<(payload: EventPayload) => void>> = new Map();

  on<T extends EventType>(event: T, callback: (payload: EventPayload) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit<T extends EventType>(event: T, payload?: EventPayload): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(payload || {}));
    }
  }

  off<T extends EventType>(event: T, callback: (payload: EventPayload) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

export class Vector {
  constructor(public x: number = 0, public y: number = 0) {}

  add(v: Vector): Vector {
    return new Vector(this.x + v.x, this.y + v.y);
  }

  sub(v: Vector): Vector {
    return new Vector(this.x - v.x, this.y - v.y);
  }

  mul(scalar: number): Vector {
    return new Vector(this.x * scalar, this.y * scalar);
  }

  div(scalar: number): Vector {
    return new Vector(this.x / scalar, this.y / scalar);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector {
    const len = this.length();
    if (len === 0) return new Vector(0, 0);
    return this.div(len);
  }

  distance(v: Vector): number {
    return this.sub(v).length();
  }
}

export interface EnergyBallState {
  position: Vector;
  velocity: Vector;
  radius: number;
  isCharging: boolean;
  chargeStart: Vector | null;
  chargeCurrent: Vector | null;
  isLaunched: boolean;
  isAbsorbed: boolean;
  trail: Vector[];
}

export interface GravityBodyState {
  position: Vector;
  radius: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  stripeOffset: number;
}

export interface RingCheckpointState {
  position: Vector;
  radius: number;
  segments: number;
  rotation: number;
  passed: boolean;
  flashTime: number;
}

export interface BlackHoleState {
  position: Vector;
  radius: number;
  attractRadius: number;
  rotation: number;
  particles: ParticleState[];
}

export interface ParticleState {
  position: Vector;
  velocity: Vector;
  angle: number;
  distance: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export class GameEngine {
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;
  private gravityConstant: number = 0.01;
  private gravityInfluenceRadius: number = 300;

  energyBall: EnergyBallState;
  gravityBodies: GravityBodyState[] = [];
  ringCheckpoints: RingCheckpointState[] = [];
  blackHole: BlackHoleState;
  passedRings: number = 0;
  totalRings: number = 0;
  isGameWon: boolean = false;
  winAnimationTime: number = 0;

  private eventBus: EventBus;

  constructor(eventBus: EventBus, width: number, height: number) {
    this.eventBus = eventBus;
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.energyBall = this.createEnergyBall();
    this.blackHole = this.createBlackHole();
    this.generateGravityBodies();
    this.generateRingCheckpoints();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('chargeStart', (payload) => {
      if (payload.chargeStart && !this.energyBall.isLaunched && !this.isGameWon) {
        this.energyBall.isCharging = true;
        this.energyBall.chargeStart = new Vector(payload.chargeStart.x, payload.chargeStart.y);
        this.energyBall.chargeCurrent = new Vector(payload.chargeStart.x, payload.chargeStart.y);
      }
    });

    this.eventBus.on('chargeUpdate', (payload) => {
      if (payload.chargeUpdate && this.energyBall.isCharging) {
        this.energyBall.chargeCurrent = new Vector(payload.chargeUpdate.x, payload.chargeUpdate.y);
      }
    });

    this.eventBus.on('chargeRelease', (payload) => {
      if (payload.chargeRelease && this.energyBall.isCharging) {
        this.energyBall.isCharging = false;
        this.energyBall.isLaunched = true;
        this.energyBall.velocity = new Vector(payload.chargeRelease.vx, payload.chargeRelease.vy);
        this.energyBall.chargeStart = null;
        this.energyBall.chargeCurrent = null;
      }
    });

    this.eventBus.on('gameReset', () => {
      this.reset();
    });

    this.eventBus.on('gravityChange', (payload) => {
      if (payload.gravityChange) {
        this.gravityConstant = payload.gravityChange.value;
      }
    });
  }

  private createEnergyBall(): EnergyBallState {
    return {
      position: new Vector(this.canvasWidth / 2, this.canvasHeight / 2),
      velocity: new Vector(0, 0),
      radius: 20,
      isCharging: false,
      chargeStart: null,
      chargeCurrent: null,
      isLaunched: false,
      isAbsorbed: false,
      trail: []
    };
  }

  private createBlackHole(): BlackHoleState {
    const particles: ParticleState[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 150;
      particles.push({
        position: new Vector(0, 0),
        velocity: new Vector(0, 0),
        angle: angle,
        distance: distance,
        color: this.getParticleColor(distance),
        size: 2 + Math.random() * 3,
        life: Math.random(),
        maxLife: 1
      });
    }

    return {
      position: new Vector(this.canvasWidth - 120, this.canvasHeight / 2),
      radius: 50,
      attractRadius: 200,
      rotation: 0,
      particles: particles
    };
  }

  private getParticleColor(distance: number): string {
    const t = (distance - 50) / 150;
    const r = Math.floor(255 - t * 155);
    const g = Math.floor(80 - t * 40);
    const b = Math.floor(40 + t * 215);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private generateGravityBodies(): void {
    this.gravityBodies = [];
    const count = 10 + Math.floor(Math.random() * 6);
    const colors = ['#9B59B6', '#85C1E9', '#F4D03F'];
    
    for (let i = 0; i < count; i++) {
      let position: Vector;
      let attempts = 0;
      do {
        position = new Vector(
          100 + Math.random() * (this.canvasWidth - 300),
          80 + Math.random() * (this.canvasHeight - 160)
        );
        attempts++;
      } while (
        attempts < 50 &&
        (position.distance(this.energyBall.position) < 150 ||
         position.distance(this.blackHole.position) < 180 ||
         this.gravityBodies.some(body => position.distance(body.position) < 100))
      );

      const radius = 15 + Math.random() * 25;
      this.gravityBodies.push({
        position: position,
        radius: radius,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        stripeOffset: Math.random() * Math.PI
      });
    }
  }

  private generateRingCheckpoints(): void {
    this.ringCheckpoints = [];
    this.passedRings = 0;
    this.totalRings = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < this.totalRings; i++) {
      let position: Vector;
      let attempts = 0;
      do {
        position = new Vector(
          150 + Math.random() * (this.canvasWidth - 350),
          100 + Math.random() * (this.canvasHeight - 200)
        );
        attempts++;
      } while (
        attempts < 50 &&
        (position.distance(this.energyBall.position) < 120 ||
         position.distance(this.blackHole.position) < 150 ||
         this.gravityBodies.some(body => position.distance(body.position) < body.radius + 60) ||
         this.ringCheckpoints.some(ring => position.distance(ring.position) < 100))
      );

      this.ringCheckpoints.push({
        position: position,
        radius: 30 + Math.random() * 30,
        segments: 8,
        rotation: Math.random() * Math.PI * 2,
        passed: false,
        flashTime: 0
      });
    }
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 16) / 16;

    if (this.isGameWon) {
      this.winAnimationTime += deltaTime;
      this.updateBlackHoleParticles(dt);
      return;
    }

    this.gravityBodies.forEach(body => {
      body.rotation += body.rotationSpeed * dt;
      body.stripeOffset += 0.015 * dt;
    });

    this.ringCheckpoints.forEach(ring => {
      ring.rotation += 0.005 * dt;
      if (ring.flashTime > 0) {
        ring.flashTime = Math.max(0, ring.flashTime - deltaTime);
      }
    });

    this.updateBlackHoleParticles(dt);
    this.blackHole.rotation += 0.02 * dt;

    if (this.energyBall.isLaunched && !this.energyBall.isAbsorbed) {
      this.updateEnergyBallPhysics(dt);
      this.checkRingCollisions();
      this.checkBlackHoleCollision();
      this.checkBoundaryCollision();
    }
  }

  private updateEnergyBallPhysics(dt: number): void {
    const gravity = this.calculateGravity();
    this.energyBall.velocity = this.energyBall.velocity.add(gravity.mul(dt));
    this.energyBall.position = this.energyBall.position.add(this.energyBall.velocity.mul(dt));

    this.energyBall.trail.push(this.energyBall.position.add(new Vector(0, 0)));
    if (this.energyBall.trail.length > 50) {
      this.energyBall.trail.shift();
    }
  }

  private calculateGravity(): Vector {
    let totalGravity = new Vector(0, 0);
    const pos = this.energyBall.position;

    for (const body of this.gravityBodies) {
      const diff = body.position.sub(pos);
      const distance = diff.length();

      if (distance < body.radius) {
        continue;
      }

      if (distance > this.gravityInfluenceRadius) {
        continue;
      }

      const forceMagnitude = this.gravityConstant * body.radius / (distance * distance);
      const force = diff.normalize().mul(forceMagnitude);
      totalGravity = totalGravity.add(force);
    }

    const bhDiff = this.blackHole.position.sub(pos);
    const bhDistance = bhDiff.length();
    if (bhDistance < this.blackHole.attractRadius) {
      const bhForceMagnitude = 0.05 * this.blackHole.radius / (bhDistance * bhDistance);
      const bhForce = bhDiff.normalize().mul(bhForceMagnitude * 10);
      totalGravity = totalGravity.add(bhForce);
    }

    return totalGravity;
  }

  private checkRingCollisions(): void {
    const pos = this.energyBall.position;

    for (let i = 0; i < this.ringCheckpoints.length; i++) {
      const ring = this.ringCheckpoints[i];
      if (ring.passed) continue;

      const distance = pos.distance(ring.position);
      if (distance < ring.radius && distance > ring.radius - 20) {
        ring.passed = true;
        ring.flashTime = 500;
        this.passedRings++;
        this.eventBus.emit('ringPassed', {
          ringPassed: { index: this.passedRings, total: this.totalRings }
        });
      }
    }
  }

  private checkBlackHoleCollision(): void {
    const pos = this.energyBall.position;
    const distance = pos.distance(this.blackHole.position);

    if (distance < this.blackHole.radius) {
      this.energyBall.isAbsorbed = true;
      this.isGameWon = true;
      this.winAnimationTime = 0;
      this.eventBus.emit('gameWin');
    }
  }

  private checkBoundaryCollision(): void {
    const pos = this.energyBall.position;
    const margin = 100;

    if (pos.x < -margin || pos.x > this.canvasWidth + margin ||
        pos.y < -margin || pos.y > this.canvasHeight + margin) {
      this.resetEnergyBall();
    }
  }

  private updateBlackHoleParticles(dt: number): void {
    this.blackHole.particles.forEach(particle => {
      particle.angle += 0.03 * dt;
      particle.distance -= 0.3 * dt;
      particle.life -= 0.003 * dt;

      if (particle.distance < this.blackHole.radius || particle.life <= 0) {
        particle.angle = Math.random() * Math.PI * 2;
        particle.distance = this.blackHole.attractRadius;
        particle.life = 1;
        particle.color = this.getParticleColor(particle.distance);
      }

      particle.position = new Vector(
        this.blackHole.position.x + Math.cos(particle.angle) * particle.distance,
        this.blackHole.position.y + Math.sin(particle.angle) * particle.distance
      );
    });
  }

  private resetEnergyBall(): void {
    this.energyBall.position = new Vector(this.canvasWidth / 2, this.canvasHeight / 2);
    this.energyBall.velocity = new Vector(0, 0);
    this.energyBall.isLaunched = false;
    this.energyBall.isCharging = false;
    this.energyBall.chargeStart = null;
    this.energyBall.chargeCurrent = null;
    this.energyBall.trail = [];
  }

  reset(): void {
    this.energyBall = this.createEnergyBall();
    this.blackHole = this.createBlackHole();
    this.generateGravityBodies();
    this.generateRingCheckpoints();
    this.isGameWon = false;
    this.winAnimationTime = 0;
    this.passedRings = 0;
  }

  getGravityConstant(): number {
    return this.gravityConstant;
  }
}
