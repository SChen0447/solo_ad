import * as THREE from 'three';

interface Boid {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetDirection: THREE.Vector3;
  currentDirection: THREE.Vector3;
  turnProgress: number;
  turnStart: THREE.Vector3;
  turnEnd: THREE.Vector3;
  group: THREE.Group;
  bodyParts: THREE.Mesh[];
  color: THREE.Color;
}

export interface CreatureParams {
  fishActivity: number;
}

export class FishSchool {
  private fish: Boid[] = [];
  private scene: THREE.Scene;
  private count = 30;
  private controlDistance = 3;
  private maxSpeed = 1.5;
  private minSpeed = 0.5;
  private directionChangeInterval = 5;
  private lastDirectionChange = 0;
  private bounds = { minX: -18, maxX: 18, minZ: -18, maxZ: 18, minY: 0.5, maxY: 3 };
  private fishGeometry: THREE.SphereGeometry;
  private materials: THREE.MeshStandardMaterial[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.fishGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    this.createMaterials();
    this.createFish();
  }

  private createMaterials(): void {
    const startColor = new THREE.Color(0xffa500);
    const endColor = new THREE.Color(0xff6347);
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const color = startColor.clone().lerp(endColor, t);
      const material = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.3,
        roughness: 0.5,
      });
      this.materials.push(material);
    }
  }

  private createFish(): void {
    for (let i = 0; i < this.count; i++) {
      const group = new THREE.Group();
      const bodyParts: THREE.Mesh[] = [];

      const material = this.materials[i % this.materials.length];

      const head = new THREE.Mesh(this.fishGeometry, material);
      head.position.x = 0.2;
      head.scale.set(1, 0.8, 0.8);
      group.add(head);
      bodyParts.push(head);

      const body = new THREE.Mesh(this.fishGeometry, material);
      body.scale.set(1.2, 0.9, 0.9);
      group.add(body);
      bodyParts.push(body);

      const tail = new THREE.Mesh(this.fishGeometry, material);
      tail.position.x = -0.2;
      tail.scale.set(0.7, 0.6, 0.6);
      group.add(tail);
      bodyParts.push(tail);

      const position = this.getRandomPosition();
      group.position.copy(position);

      const direction = new THREE.Vector3(
        Math.random() - 0.5,
        0,
        Math.random() - 0.5
      ).normalize();

      const boid: Boid = {
        position: group.position.clone(),
        velocity: direction.clone().multiplyScalar(this.minSpeed),
        targetDirection: direction.clone(),
        currentDirection: direction.clone(),
        turnProgress: 1,
        turnStart: direction.clone(),
        turnEnd: direction.clone(),
        group,
        bodyParts,
        color: material.color.clone(),
      };

      this.fish.push(boid);
      this.scene.add(group);
    }
  }

  private getRandomPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      (Math.random() - 0.5) * 36,
      Math.random() * 2.5 + 0.5,
      (Math.random() - 0.5) * 36
    );
  }

  private randomDirection(): THREE.Vector3 {
    return new THREE.Vector3(
      Math.random() - 0.5,
      (Math.random() - 0.5) * 0.3,
      Math.random() - 0.5
    ).normalize();
  }

  reset(): void {
    this.fish.forEach((boid, i) => {
      boid.group.position.copy(this.getRandomPosition());
      boid.position.copy(boid.group.position);
      const direction = this.randomDirection();
      boid.targetDirection.copy(direction);
      boid.currentDirection.copy(direction);
      boid.turnProgress = 1;
      boid.turnStart.copy(direction);
      boid.turnEnd.copy(direction);
      boid.group.visible = false;

      const material = boid.bodyParts[0].material as THREE.MeshStandardMaterial;
      material.transparent = true;
      material.opacity = 0;

      setTimeout(() => {
        boid.group.visible = true;
        const startTime = performance.now();
        const fadeIn = () => {
          const elapsed = (performance.now() - startTime) / 300;
          if (elapsed < 1) {
            material.opacity = elapsed;
            requestAnimationFrame(fadeIn);
          } else {
            material.opacity = 1;
            material.transparent = false;
          }
        };
        fadeIn();
      }, i * 20);
    });
  }

  update(deltaTime: number, currentTime: number, params: CreatureParams): void {
    const speed = this.minSpeed + (this.maxSpeed - this.minSpeed) * params.fishActivity;

    if (currentTime - this.lastDirectionChange > this.directionChangeInterval) {
      this.lastDirectionChange = currentTime;
      for (const boid of this.fish) {
        boid.turnStart.copy(boid.currentDirection);
        boid.turnEnd.copy(this.randomDirection());
        boid.turnProgress = 0;
      }
    }

    for (let i = 0; i < this.fish.length; i++) {
      const boid = this.fish[i];

      if (boid.turnProgress < 1) {
        boid.turnProgress += deltaTime / 0.3;
        const t = Math.min(boid.turnProgress, 1);
        boid.currentDirection.lerpVectors(boid.turnStart, boid.turnEnd, t).normalize();
      }

      const separation = new THREE.Vector3();
      const alignment = new THREE.Vector3();
      const cohesion = new THREE.Vector3();
      let neighborCount = 0;

      for (let j = 0; j < this.fish.length; j++) {
        if (i === j) continue;
        const other = this.fish[j];
        const distance = boid.position.distanceTo(other.position);

        if (distance < this.controlDistance * 2) {
          neighborCount++;

          if (distance < this.controlDistance) {
            const diff = boid.position.clone().sub(other.position);
            diff.normalize().divideScalar(distance || 0.1);
            separation.add(diff);
          }

          alignment.add(other.velocity);
          cohesion.add(other.position);
        }
      }

      if (neighborCount > 0) {
        separation.normalize().multiplyScalar(1.5);
        alignment.divideScalar(neighborCount).normalize().multiplyScalar(1.0);
        cohesion.divideScalar(neighborCount).sub(boid.position).normalize().multiplyScalar(1.0);

        boid.velocity.add(separation);
        boid.velocity.add(alignment);
        boid.velocity.add(cohesion);
      }

      boid.velocity.add(boid.currentDirection.clone().multiplyScalar(0.5));

      if (boid.position.x < this.bounds.minX) boid.velocity.x += 0.5;
      if (boid.position.x > this.bounds.maxX) boid.velocity.x -= 0.5;
      if (boid.position.z < this.bounds.minZ) boid.velocity.z += 0.5;
      if (boid.position.z > this.bounds.maxZ) boid.velocity.z -= 0.5;
      if (boid.position.y < this.bounds.minY) boid.velocity.y += 0.3;
      if (boid.position.y > this.bounds.maxY) boid.velocity.y -= 0.3;

      boid.velocity.normalize().multiplyScalar(speed);
      boid.position.add(boid.velocity.clone().multiplyScalar(deltaTime));
      boid.group.position.copy(boid.position);

      if (boid.velocity.lengthSq() > 0.001) {
        const targetRotation = Math.atan2(boid.velocity.z, boid.velocity.x);
        boid.group.rotation.y = targetRotation;
      }

      const swingAngle = Math.sin(currentTime * Math.PI * 4) * 0.1;
      boid.bodyParts[2].rotation.z = swingAngle;
      boid.bodyParts[1].rotation.z = swingAngle * 0.5;
    }
  }

  getCount(): number {
    return this.count;
  }

  getMeshes(): THREE.Group[] {
    return this.fish.map(f => f.group);
  }
}

export class Turtle {
  private group: THREE.Group;
  private scene: THREE.Scene;
  private velocity: THREE.Vector3;
  private targetDirection: THREE.Vector3;
  private currentDirection: THREE.Vector3;
  private turnProgress = 1;
  private turnStart: THREE.Vector3;
  private turnEnd: THREE.Vector3;
  private directionChangeInterval = 5;
  private lastDirectionChange = 0;
  private speed = 0.8;
  private bounds = { minX: -18, maxX: 18, minZ: -18, maxZ: 18, minY: 0.5, maxY: 3 };
  private flippers: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    const shellMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e8b57,
      metalness: 0.2,
      roughness: 0.6,
    });

    const shellGeometry = new THREE.SphereGeometry(0.5, 12, 12);
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.scale.set(1.2, 0.6, 1);
    this.group.add(shell);

    const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const head = new THREE.Mesh(headGeometry, shellMaterial);
    head.position.set(0.6, 0, 0);
    this.group.add(head);

    const flipperGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const flipperPositions = [
      { x: 0.3, y: 0, z: 0.4 },
      { x: 0.3, y: 0, z: -0.4 },
      { x: -0.3, y: 0, z: 0.4 },
      { x: -0.3, y: 0, z: -0.4 },
    ];

    for (const pos of flipperPositions) {
      const flipper = new THREE.Mesh(flipperGeometry, shellMaterial);
      flipper.position.set(pos.x, pos.y, pos.z);
      flipper.scale.set(1.5, 0.3, 2);
      this.group.add(flipper);
      this.flippers.push(flipper);
    }

    const position = this.getRandomPosition();
    this.group.position.copy(position);

    this.velocity = new THREE.Vector3(
      Math.random() - 0.5,
      0,
      Math.random() - 0.5
    ).normalize().multiplyScalar(this.speed);

    this.targetDirection = this.velocity.clone().normalize();
    this.currentDirection = this.targetDirection.clone();
    this.turnStart = this.targetDirection.clone();
    this.turnEnd = this.targetDirection.clone();

    this.scene.add(this.group);
  }

  private getRandomPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      (Math.random() - 0.5) * 36,
      Math.random() * 2.5 + 0.5,
      (Math.random() - 0.5) * 36
    );
  }

  private randomDirection(): THREE.Vector3 {
    return new THREE.Vector3(
      Math.random() - 0.5,
      (Math.random() - 0.5) * 0.2,
      Math.random() - 0.5
    ).normalize();
  }

  reset(): void {
    this.group.position.copy(this.getRandomPosition());
    const direction = this.randomDirection();
    this.targetDirection.copy(direction);
    this.currentDirection.copy(direction);
    this.turnProgress = 1;
    this.turnStart.copy(direction);
    this.turnEnd.copy(direction);
    this.velocity.copy(direction).multiplyScalar(this.speed);

    this.group.visible = false;
    const materials = this.group.children.map(
      child => (child as THREE.Mesh).material as THREE.MeshStandardMaterial
    );
    materials.forEach(m => {
      m.transparent = true;
      m.opacity = 0;
    });

    setTimeout(() => {
      this.group.visible = true;
      const startTime = performance.now();
      const fadeIn = () => {
        const elapsed = (performance.now() - startTime) / 300;
        if (elapsed < 1) {
          materials.forEach(m => { m.opacity = elapsed; });
          requestAnimationFrame(fadeIn);
        } else {
          materials.forEach(m => {
            m.opacity = 1;
            m.transparent = false;
          });
        }
      };
      fadeIn();
    }, 100);
  }

  update(deltaTime: number, currentTime: number): void {
    if (currentTime - this.lastDirectionChange > this.directionChangeInterval) {
      this.lastDirectionChange = currentTime;
      this.turnStart.copy(this.currentDirection);
      this.turnEnd.copy(this.randomDirection());
      this.turnProgress = 0;
    }

    if (this.turnProgress < 1) {
      this.turnProgress += deltaTime / 0.3;
      const t = Math.min(this.turnProgress, 1);
      this.currentDirection.lerpVectors(this.turnStart, this.turnEnd, t).normalize();
    }

    this.velocity.copy(this.currentDirection).multiplyScalar(this.speed);

    const pos = this.group.position;
    if (pos.x < this.bounds.minX) this.velocity.x += 0.2;
    if (pos.x > this.bounds.maxX) this.velocity.x -= 0.2;
    if (pos.z < this.bounds.minZ) this.velocity.z += 0.2;
    if (pos.z > this.bounds.maxZ) this.velocity.z -= 0.2;
    if (pos.y < this.bounds.minY) this.velocity.y += 0.15;
    if (pos.y > this.bounds.maxY) this.velocity.y -= 0.15;

    this.group.position.add(this.velocity.clone().multiplyScalar(deltaTime));

    if (this.velocity.lengthSq() > 0.001) {
      const targetRotation = Math.atan2(this.velocity.z, this.velocity.x);
      this.group.rotation.y = targetRotation;
    }

    const strokePhase = (currentTime * Math.PI * 2) / 1.5;
    const flipperAngle = Math.sin(strokePhase) * 0.2;

    this.flippers[0].rotation.y = flipperAngle;
    this.flippers[2].rotation.y = -flipperAngle;
    this.flippers[1].rotation.y = -flipperAngle;
    this.flippers[3].rotation.y = flipperAngle;
  }

  getCount(): number {
    return 1;
  }

  getMesh(): THREE.Group {
    return this.group;
  }
}
