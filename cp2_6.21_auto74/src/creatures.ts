import * as THREE from 'three';

const FISH_COUNT = 30;
const FISH_BODY_SEGMENTS = 3;
const FISH_SWAY_AMPLITUDE = 0.1;
const FISH_SWAY_FREQUENCY = 2;
const FISH_COLOR_START = new THREE.Color(0xFFA500);
const FISH_COLOR_END = new THREE.Color(0xFF6347);
const BOIDS_SEPARATION_DIST = 1.5;
const BOIDS_ALIGNMENT_DIST = 3;
const BOIDS_COHESION_DIST = 3;
const BOIDS_SEPARATION_WEIGHT = 1.5;
const BOIDS_ALIGNMENT_WEIGHT = 1.0;
const BOIDS_COHESION_WEIGHT = 1.0;
const TURTLE_COLOR = 0x2E8B57;
const TURTLE_LIMB_AMPLITUDE = 0.2;
const TURTLE_LIMB_PERIOD = 1.5;
const DIRECTION_CHANGE_INTERVAL = 5;
const DIRECTION_CHANGE_DURATION = 0.3;
const MIN_HEIGHT_ABOVE_TERRAIN = 0.5;
const MAX_HEIGHT_ABOVE_TERRAIN = 3.0;
const GRID_HALF = 20;

interface FishAgent {
  group: THREE.Group;
  bodySpheres: THREE.Mesh[];
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetDirection: THREE.Vector3;
  directionTimer: number;
  directionBlend: number;
  prevDirection: THREE.Vector3;
}

export class FishSchool {
  private agents: FishAgent[] = [];
  private group: THREE.Group;
  private maxSpeed: number = 1.0;

  constructor(getHeightAt: (x: number, z: number) => number) {
    this.group = new THREE.Group();
    for (let i = 0; i < FISH_COUNT; i++) {
      const agent = this.createFish(i, getHeightAt);
      this.agents.push(agent);
      this.group.add(agent.group);
    }
  }

  private createFish(index: number, getHeightAt: (x: number, z: number) => number): FishAgent {
    const fishGroup = new THREE.Group();
    const bodySpheres: THREE.Mesh[] = [];
    const t = index / FISH_COUNT;
    const color = FISH_COLOR_START.clone().lerp(FISH_COLOR_END, t);

    for (let s = 0; s < FISH_BODY_SEGMENTS; s++) {
      const segT = s / (FISH_BODY_SEGMENTS - 1);
      const radius = 0.12 * (1 - segT * 0.4);
      const geometry = new THREE.SphereGeometry(radius, 8, 6);
      const material = new THREE.MeshPhongMaterial({ color: color.clone() });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(-s * 0.22, 0, 0);
      bodySpheres.push(sphere);
      fishGroup.add(sphere);
    }

    const tailGeometry = new THREE.ConeGeometry(0.08, 0.2, 4);
    tailGeometry.rotateZ(Math.PI / 2);
    const tailMaterial = new THREE.MeshPhongMaterial({ color: color.clone() });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(-FISH_BODY_SEGMENTS * 0.22 - 0.1, 0, 0);
    fishGroup.add(tail);

    const x = (Math.random() - 0.5) * GRID_HALF * 1.6;
    const z = (Math.random() - 0.5) * GRID_HALF * 1.6;
    const terrainH = getHeightAt(x, z);
    const y = terrainH + MIN_HEIGHT_ABOVE_TERRAIN + Math.random() * (MAX_HEIGHT_ABOVE_TERRAIN - MIN_HEIGHT_ABOVE_TERRAIN);

    fishGroup.position.set(x, y, z);

    const angle = Math.random() * Math.PI * 2;
    const velocity = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));

    return {
      group: fishGroup,
      bodySpheres,
      position: fishGroup.position,
      velocity,
      targetDirection: velocity.clone().normalize(),
      directionTimer: Math.random() * DIRECTION_CHANGE_INTERVAL,
      directionBlend: 1,
      prevDirection: velocity.clone().normalize(),
    };
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  setActivity(activity: number): void {
    this.maxSpeed = THREE.MathUtils.lerp(0.5, 2.0, activity);
  }

  update(delta: number, time: number, getHeightAt: (x: number, z: number) => number): void {
    for (const agent of this.agents) {
      agent.directionTimer -= delta;
      if (agent.directionTimer <= 0) {
        agent.directionTimer = DIRECTION_CHANGE_INTERVAL + Math.random() * 2;
        agent.prevDirection.copy(agent.targetDirection);
        const randomAngle = Math.random() * Math.PI * 2;
        agent.targetDirection.set(Math.cos(randomAngle), (Math.random() - 0.5) * 0.3, Math.sin(randomAngle));
        agent.directionBlend = 0;
      }

      if (agent.directionBlend < 1) {
        agent.directionBlend = Math.min(1, agent.directionBlend + delta / DIRECTION_CHANGE_DURATION);
        const t = agent.directionBlend * agent.directionBlend * (3 - 2 * agent.directionBlend);
        const blended = agent.prevDirection.clone().lerp(agent.targetDirection, t).normalize();
        agent.velocity.copy(blended);
      }

      const boidsForce = this.computeBoids(agent);
      agent.velocity.add(boidsForce.multiplyScalar(delta));
      if (agent.velocity.length() > this.maxSpeed) {
        agent.velocity.normalize().multiplyScalar(this.maxSpeed);
      }
      agent.velocity.y *= 0.95;

      agent.position.add(agent.velocity.clone().multiplyScalar(delta));

      const halfBound = GRID_HALF - 1;
      if (agent.position.x > halfBound) agent.velocity.x -= 0.5;
      if (agent.position.x < -halfBound) agent.velocity.x += 0.5;
      if (agent.position.z > halfBound) agent.velocity.z -= 0.5;
      if (agent.position.z < -halfBound) agent.velocity.z += 0.5;

      const terrainH = getHeightAt(agent.position.x, agent.position.z);
      const minY = terrainH + MIN_HEIGHT_ABOVE_TERRAIN;
      const maxY = terrainH + MAX_HEIGHT_ABOVE_TERRAIN;
      if (agent.position.y < minY) { agent.position.y = minY; agent.velocity.y = Math.abs(agent.velocity.y) * 0.5; }
      if (agent.position.y > maxY) { agent.position.y = maxY; agent.velocity.y = -Math.abs(agent.velocity.y) * 0.5; }

      const dir = agent.velocity.clone();
      if (dir.length() > 0.01) {
        const angle = Math.atan2(dir.x, dir.z);
        agent.group.rotation.y = angle + Math.PI;
      }

      const swayAngle = Math.sin(time * FISH_SWAY_FREQUENCY * Math.PI * 2 + agent.position.x * 0.5) * FISH_SWAY_AMPLITUDE;
      for (let s = 0; s < agent.bodySpheres.length; s++) {
        const segSway = swayAngle * (s + 1) / agent.bodySpheres.length;
        agent.bodySpheres[s].position.z = segSway;
      }
    }
  }

  private computeBoids(agent: FishAgent): THREE.Vector3 {
    const separation = new THREE.Vector3();
    const alignment = new THREE.Vector3();
    const cohesion = new THREE.Vector3();
    let sepCount = 0;
    let aliCount = 0;
    let cohCount = 0;

    for (const other of this.agents) {
      if (other === agent) continue;
      const dist = agent.position.distanceTo(other.position);

      if (dist < BOIDS_SEPARATION_DIST && dist > 0) {
        const diff = agent.position.clone().sub(other.position).normalize().divideScalar(dist);
        separation.add(diff);
        sepCount++;
      }
      if (dist < BOIDS_ALIGNMENT_DIST) {
        alignment.add(other.velocity);
        aliCount++;
      }
      if (dist < BOIDS_COHESION_DIST) {
        cohesion.add(other.position);
        cohCount++;
      }
    }

    const result = new THREE.Vector3();
    if (sepCount > 0) {
      separation.divideScalar(sepCount).normalize();
      result.add(separation.multiplyScalar(BOIDS_SEPARATION_WEIGHT));
    }
    if (aliCount > 0) {
      alignment.divideScalar(aliCount).normalize();
      result.add(alignment.multiplyScalar(BOIDS_ALIGNMENT_WEIGHT));
    }
    if (cohCount > 0) {
      cohesion.divideScalar(cohCount).sub(agent.position).normalize();
      result.add(cohesion.multiplyScalar(BOIDS_COHESION_WEIGHT));
    }
    return result;
  }

  reset(getHeightAt: (x: number, z: number) => number): void {
    for (const agent of this.agents) {
      const x = (Math.random() - 0.5) * GRID_HALF * 1.6;
      const z = (Math.random() - 0.5) * GRID_HALF * 1.6;
      const terrainH = getHeightAt(x, z);
      const y = terrainH + MIN_HEIGHT_ABOVE_TERRAIN + Math.random() * (MAX_HEIGHT_ABOVE_TERRAIN - MIN_HEIGHT_ABOVE_TERRAIN);
      agent.position.set(x, y, z);
      const angle = Math.random() * Math.PI * 2;
      agent.velocity.set(Math.cos(angle), 0, Math.sin(angle));
      agent.targetDirection.copy(agent.velocity).normalize();
      agent.prevDirection.copy(agent.targetDirection);
      agent.directionBlend = 1;
      agent.directionTimer = DIRECTION_CHANGE_INTERVAL;
    }
  }

  getCreatureCount(): number {
    return FISH_COUNT;
  }
}

interface TurtleLimb {
  mesh: THREE.Mesh;
  side: number;
  phase: number;
}

export class Turtle {
  private group: THREE.Group;
  private limbs: TurtleLimb[] = [];
  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private targetDirection: THREE.Vector3;
  private directionTimer: number;
  private directionBlend: number;
  private prevDirection: THREE.Vector3;
  private speed: number = 0.4;

  constructor(getHeightAt: (x: number, z: number) => number) {
    this.group = new THREE.Group();
    const shellGeometry = new THREE.SphereGeometry(0.4, 12, 10);
    const shellMaterial = new THREE.MeshPhongMaterial({ color: TURTLE_COLOR });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.scale.set(1, 0.6, 1.2);
    this.group.add(shell);

    const headGeometry = new THREE.SphereGeometry(0.15, 8, 6);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0x3CB371 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0, 0.55);
    this.group.add(head);

    const limbPositions = [
      { x: 0.3, z: 0.25, side: 1, phase: 0 },
      { x: -0.3, z: 0.25, side: -1, phase: Math.PI },
      { x: 0.3, z: -0.2, side: 1, phase: Math.PI },
      { x: -0.3, z: -0.2, side: -1, phase: 0 },
    ];

    for (const lp of limbPositions) {
      const limbGeom = new THREE.SphereGeometry(0.1, 6, 4);
      const limbMat = new THREE.MeshPhongMaterial({ color: 0x3CB371 });
      const limb = new THREE.Mesh(limbGeom, limbMat);
      limb.scale.set(0.8, 0.5, 1.5);
      limb.position.set(lp.x, -0.1, lp.z);
      this.group.add(limb);
      this.limbs.push({ mesh: limb, side: lp.side, phase: lp.phase });
    }

    const tailGeom = new THREE.SphereGeometry(0.06, 6, 4);
    const tailMat = new THREE.MeshPhongMaterial({ color: 0x3CB371 });
    const tail = new THREE.Mesh(tailGeom, tailMat);
    tail.position.set(0, 0, -0.5);
    this.group.add(tail);

    const x = (Math.random() - 0.5) * GRID_HALF * 1.2;
    const z = (Math.random() - 0.5) * GRID_HALF * 1.2;
    const terrainH = getHeightAt(x, z);
    const y = terrainH + 0.5 + Math.random() * 1.5;
    this.group.position.set(x, y, z);
    this.position = this.group.position;

    const angle = Math.random() * Math.PI * 2;
    this.velocity = new THREE.Vector3(Math.cos(angle) * this.speed, 0, Math.sin(angle) * this.speed);
    this.targetDirection = this.velocity.clone().normalize();
    this.prevDirection = this.targetDirection.clone();
    this.directionTimer = DIRECTION_CHANGE_INTERVAL;
    this.directionBlend = 1;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  update(delta: number, time: number, getHeightAt: (x: number, z: number) => number): void {
    this.directionTimer -= delta;
    if (this.directionTimer <= 0) {
      this.directionTimer = DIRECTION_CHANGE_INTERVAL + Math.random() * 3;
      this.prevDirection.copy(this.targetDirection);
      const randomAngle = Math.random() * Math.PI * 2;
      this.targetDirection.set(Math.cos(randomAngle), 0, Math.sin(randomAngle));
      this.directionBlend = 0;
    }

    if (this.directionBlend < 1) {
      this.directionBlend = Math.min(1, this.directionBlend + delta / DIRECTION_CHANGE_DURATION);
      const t = this.directionBlend * this.directionBlend * (3 - 2 * this.directionBlend);
      const blended = this.prevDirection.clone().lerp(this.targetDirection, t).normalize();
      this.velocity.copy(blended.multiplyScalar(this.speed));
    }

    this.position.add(this.velocity.clone().multiplyScalar(delta));

    const halfBound = GRID_HALF - 1;
    if (this.position.x > halfBound) this.velocity.x = -Math.abs(this.velocity.x);
    if (this.position.x < -halfBound) this.velocity.x = Math.abs(this.velocity.x);
    if (this.position.z > halfBound) this.velocity.z = -Math.abs(this.velocity.z);
    if (this.position.z < -halfBound) this.velocity.z = Math.abs(this.velocity.z);

    const terrainH = getHeightAt(this.position.x, this.position.z);
    const minY = terrainH + 0.5;
    const maxY = terrainH + MAX_HEIGHT_ABOVE_TERRAIN;
    if (this.position.y < minY) { this.position.y = minY; this.velocity.y = Math.abs(this.velocity.y) * 0.3; }
    if (this.position.y > maxY) { this.position.y = maxY; this.velocity.y = -Math.abs(this.velocity.y) * 0.3; }

    const dir = this.velocity.clone();
    if (dir.length() > 0.01) {
      const angle = Math.atan2(dir.x, dir.z);
      this.group.rotation.y = angle;
    }

    const limbTime = time * (2 * Math.PI / TURTLE_LIMB_PERIOD);
    for (const limb of this.limbs) {
      const swing = Math.sin(limbTime + limb.phase) * TURTLE_LIMB_AMPLITUDE;
      limb.mesh.rotation.x = swing;
    }
  }

  reset(getHeightAt: (x: number, z: number) => number): void {
    const x = (Math.random() - 0.5) * GRID_HALF * 1.2;
    const z = (Math.random() - 0.5) * GRID_HALF * 1.2;
    const terrainH = getHeightAt(x, z);
    const y = terrainH + 0.5 + Math.random() * 1.5;
    this.position.set(x, y, z);
    const angle = Math.random() * Math.PI * 2;
    this.velocity.set(Math.cos(angle) * this.speed, 0, Math.sin(angle) * this.speed);
    this.targetDirection.copy(this.velocity).normalize();
    this.prevDirection.copy(this.targetDirection);
    this.directionBlend = 1;
    this.directionTimer = DIRECTION_CHANGE_INTERVAL;
  }

  getCreatureCount(): number {
    return 1;
  }
}
