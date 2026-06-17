import * as THREE from 'three';
import { Terrain } from './terrain';

interface WheelInfo {
  offset: THREE.Vector3;
  height: number;
}

export class Vehicle {
  public group: THREE.Group;
  public wheels: THREE.Mesh[] = [];
  public wheelRadius: number = 0.3;
  public speed: number = 0;
  public tiltAngle: number = 0;
  public maxSpeed: number = 8;
  public acceleration: number = 12;
  public deceleration: number = 8;
  public turnSpeed: number = 2.5;
  public flipThreshold: number = 30 * Math.PI / 180;

  private body!: THREE.Mesh;
  private wheelInfos: WheelInfo[] = [];
  private initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private initialRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  private isFlipping: boolean = false;
  private flipProgress: number = 0;
  private targetQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private startQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private pitch: number = 0;
  private roll: number = 0;
  private smoothLerpFactor: number = 0.15;

  constructor() {
    this.group = new THREE.Group();
    this.createBody();
    this.createWheels();
    this.setupWheelOffsets();
  }

  private createBody(): void {
    const bodyGeometry = new THREE.BoxGeometry(2.5, 0.5, 1.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2196f3,
      metalness: 0.3,
      roughness: 0.4,
      flatShading: false
    });
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.position.y = this.wheelRadius + 0.25;
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.group.add(this.body);

    const cockpitGeometry = new THREE.BoxGeometry(1.2, 0.4, 1.2);
    const cockpitMaterial = new THREE.MeshStandardMaterial({
      color: 0x1976d2,
      metalness: 0.5,
      roughness: 0.3,
      transparent: true,
      opacity: 0.8
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(-0.2, this.wheelRadius + 0.7, 0);
    cockpit.castShadow = true;
    this.group.add(cockpit);
  }

  private createWheels(): void {
    const wheelGeometry = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, 0.2, 16);
    wheelGeometry.rotateZ(Math.PI / 2);

    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x212121,
      metalness: 0.8,
      roughness: 0.2
    });

    const tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9
    });

    const wheelPositions = [
      { x: 1, z: -0.65 },
      { x: 1, z: 0.65 },
      { x: 0, z: -0.75 },
      { x: 0, z: 0.75 },
      { x: -1, z: -0.65 },
      { x: -1, z: 0.65 }
    ];

    wheelPositions.forEach((pos) => {
      const wheelGroup = new THREE.Group();

      const tireGeometry = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, 0.22, 16);
      tireGeometry.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeometry, tireMaterial);
      tire.castShadow = true;
      wheelGroup.add(tire);

      const hubGeometry = new THREE.CylinderGeometry(this.wheelRadius * 0.5, this.wheelRadius * 0.5, 0.25, 8);
      hubGeometry.rotateZ(Math.PI / 2);
      const hub = new THREE.Mesh(hubGeometry, wheelMaterial);
      hub.castShadow = true;
      wheelGroup.add(hub);

      wheelGroup.position.set(pos.x, this.wheelRadius, pos.z);
      this.group.add(wheelGroup);
      this.wheels.push(wheelGroup as unknown as THREE.Mesh);
    });
  }

  private setupWheelOffsets(): void {
    this.wheelInfos = [
      { offset: new THREE.Vector3(1, 0, -0.65), height: 0 },
      { offset: new THREE.Vector3(1, 0, 0.65), height: 0 },
      { offset: new THREE.Vector3(0, 0, -0.75), height: 0 },
      { offset: new THREE.Vector3(0, 0, 0.75), height: 0 },
      { offset: new THREE.Vector3(-1, 0, -0.65), height: 0 },
      { offset: new THREE.Vector3(-1, 0, 0.65), height: 0 }
    ];
  }

  public update(terrain: Terrain, keys: Set<string>, deltaTime: number): void {
    if (this.isFlipping) {
      this.updateFlipAnimation(deltaTime);
      return;
    }

    this.handleInput(keys, deltaTime);
    this.updateWheelHeights(terrain);
    this.updatePosition(deltaTime);
    this.adjustAttitude();
    this.updateWheelRotation(deltaTime);
    this.checkFlip();
  }

  private handleInput(keys: Set<string>, deltaTime: number): void {
    const forward = keys.has('w') || keys.has('arrowup');
    const backward = keys.has('s') || keys.has('arrowdown');
    const left = keys.has('a') || keys.has('arrowleft');
    const right = keys.has('d') || keys.has('arrowright');

    if (forward) {
      this.speed = Math.min(this.speed + this.acceleration * deltaTime, this.maxSpeed);
    } else if (backward) {
      this.speed = Math.max(this.speed - this.acceleration * deltaTime, -this.maxSpeed * 0.5);
    } else {
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - this.deceleration * deltaTime);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + this.deceleration * deltaTime);
      }
    }

    const turnFactor = Math.abs(this.speed) / this.maxSpeed;
    if (left) {
      this.group.rotation.y += this.turnSpeed * turnFactor * deltaTime;
    }
    if (right) {
      this.group.rotation.y -= this.turnSpeed * turnFactor * deltaTime;
    }
  }

  private updateWheelHeights(terrain: Terrain): void {
    const worldPos = new THREE.Vector3();

    this.wheelInfos.forEach((wheelInfo, index) => {
      const offset = wheelInfo.offset.clone();
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);

      worldPos.copy(this.group.position).add(offset);
      wheelInfo.height = terrain.getHeightAt(worldPos.x, worldPos.z);

      const wheel = this.wheels[index];
      const localY = wheelInfo.height + this.wheelRadius;
      wheel.position.y = localY - this.group.position.y;
    });
  }

  private updatePosition(deltaTime: number): void {
    if (Math.abs(this.speed) < 0.001) return;

    const forward = new THREE.Vector3(1, 0, 0);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);

    const movement = forward.multiplyScalar(this.speed * deltaTime);
    this.group.position.add(movement);

    const avgHeight = this.wheelInfos.reduce((sum, w) => sum + w.height, 0) / this.wheelInfos.length;
    const targetY = avgHeight + this.wheelRadius + 0.25;
    this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, targetY, this.smoothLerpFactor);
  }

  private adjustAttitude(): void {
    const frontLeft = this.wheelInfos[0].height;
    const frontRight = this.wheelInfos[1].height;
    const rearLeft = this.wheelInfos[4].height;
    const rearRight = this.wheelInfos[5].height;

    const frontAvg = (frontLeft + frontRight) / 2;
    const rearAvg = (rearLeft + rearRight) / 2;
    const leftAvg = (frontLeft + rearLeft) / 2;
    const rightAvg = (frontRight + rearRight) / 2;

    const wheelBase = 2;
    const trackWidth = 1.3;

    const targetPitch = Math.atan2(rearAvg - frontAvg, wheelBase);
    const targetRoll = Math.atan2(rightAvg - leftAvg, trackWidth);

    this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, this.smoothLerpFactor);
    this.roll = THREE.MathUtils.lerp(this.roll, targetRoll, this.smoothLerpFactor);

    const euler = new THREE.Euler(this.pitch, this.group.rotation.y, this.roll, 'YXZ');
    this.group.quaternion.slerp(new THREE.Quaternion().setFromEuler(euler), this.smoothLerpFactor);

    const pitchDeg = Math.abs(this.pitch * 180 / Math.PI);
    const rollDeg = Math.abs(this.roll * 180 / Math.PI);
    this.tiltAngle = Math.max(pitchDeg, rollDeg);
  }

  private updateWheelRotation(deltaTime: number): void {
    const rotationAmount = (this.speed / this.wheelRadius) * deltaTime;
    this.wheels.forEach(wheel => {
      wheel.rotation.x += rotationAmount;
    });
  }

  private checkFlip(): void {
    const euler = new THREE.Euler().setFromQuaternion(this.group.quaternion, 'YXZ');
    const totalTilt = Math.sqrt(euler.x * euler.x + euler.z * euler.z);

    if (totalTilt > this.flipThreshold && !this.isFlipping) {
      this.startFlipAnimation();
    }
  }

  private startFlipAnimation(): void {
    this.isFlipping = true;
    this.flipProgress = 0;
    this.startQuaternion.copy(this.group.quaternion);
    this.targetQuaternion.setFromEuler(this.initialRotation);
    this.speed = 0;
  }

  private updateFlipAnimation(deltaTime: number): void {
    this.flipProgress += deltaTime * 1.5;

    if (this.flipProgress >= 1) {
      this.isFlipping = false;
      this.flipProgress = 0;
      this.reset();
      return;
    }

    const t = this.easeInOutCubic(this.flipProgress);
    this.group.quaternion.slerpQuaternions(this.startQuaternion, this.targetQuaternion, t);

    const flipHeight = Math.sin(t * Math.PI) * 2;
    const baseHeight = this.initialPosition.y;
    this.group.position.y = baseHeight + flipHeight;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public reset(): void {
    this.group.position.copy(this.initialPosition);
    this.group.rotation.copy(this.initialRotation);
    this.speed = 0;
    this.pitch = 0;
    this.roll = 0;
    this.tiltAngle = 0;
    this.isFlipping = false;
    this.flipProgress = 0;
  }

  public setInitialPosition(x: number, y: number, z: number): void {
    this.initialPosition.set(x, y, z);
    this.group.position.copy(this.initialPosition);
  }

  public getForwardDirection(): THREE.Vector3 {
    const forward = new THREE.Vector3(1, 0, 0);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
    return forward;
  }

  public dispose(): void {
    this.body.geometry.dispose();
    (this.body.material as THREE.Material).dispose();
    this.wheels.forEach(wheel => {
      wheel.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    });
  }
}
