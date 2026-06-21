import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

export interface CharacterParams {
  height: number;
  armLength: number;
  shoulderWidth: number;
}

export interface Joints {
  head: THREE.Object3D;
  neck: THREE.Object3D;
  torso: THREE.Object3D;
  leftShoulder: THREE.Object3D;
  leftUpperArm: THREE.Object3D;
  leftElbow: THREE.Object3D;
  leftLowerArm: THREE.Object3D;
  leftHand: THREE.Object3D;
  rightShoulder: THREE.Object3D;
  rightUpperArm: THREE.Object3D;
  rightElbow: THREE.Object3D;
  rightLowerArm: THREE.Object3D;
  rightHand: THREE.Object3D;
  hips: THREE.Object3D;
  leftUpperLeg: THREE.Object3D;
  leftKnee: THREE.Object3D;
  leftLowerLeg: THREE.Object3D;
  leftFoot: THREE.Object3D;
  rightUpperLeg: THREE.Object3D;
  rightKnee: THREE.Object3D;
  rightLowerLeg: THREE.Object3D;
  rightFoot: THREE.Object3D;
}

export class Character {
  public group: THREE.Group;
  public params: CharacterParams;
  public joints: Joints;
  public reachSphere: THREE.Mesh;
  public heightLabel: HTMLDivElement | null = null;

  private materials: {
    skin: THREE.MeshStandardMaterial;
    clothing: THREE.MeshStandardMaterial;
    pants: THREE.MeshStandardMaterial;
  };

  constructor(params: CharacterParams) {
    this.params = { ...params };
    this.group = new THREE.Group();
    
    this.materials = {
      skin: new THREE.MeshStandardMaterial({
        color: 0xffdbac,
        roughness: 0.8,
        metalness: 0.1
      }),
      clothing: new THREE.MeshStandardMaterial({
        color: 0x4a90d9,
        roughness: 0.7,
        metalness: 0.1
      }),
      pants: new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.9,
        metalness: 0.0
      })
    };

    this.joints = this.createSkeleton();
    this.reachSphere = this.createReachSphere();
    this.group.add(this.reachSphere);
    
    this.updateProportions();
  }

  private createSkeleton(): Joints {
    const hips = new THREE.Group();
    hips.position.y = 0;
    this.group.add(hips);

    const torso = new THREE.Group();
    hips.add(torso);

    const neck = new THREE.Group();
    torso.add(neck);

    const head = new THREE.Group();
    neck.add(head);

    const leftShoulder = new THREE.Group();
    torso.add(leftShoulder);

    const leftUpperArm = new THREE.Group();
    leftShoulder.add(leftUpperArm);

    const leftElbow = new THREE.Group();
    leftUpperArm.add(leftElbow);

    const leftLowerArm = new THREE.Group();
    leftElbow.add(leftLowerArm);

    const leftHand = new THREE.Group();
    leftLowerArm.add(leftHand);

    const rightShoulder = new THREE.Group();
    torso.add(rightShoulder);

    const rightUpperArm = new THREE.Group();
    rightShoulder.add(rightUpperArm);

    const rightElbow = new THREE.Group();
    rightUpperArm.add(rightElbow);

    const rightLowerArm = new THREE.Group();
    rightElbow.add(rightLowerArm);

    const rightHand = new THREE.Group();
    rightLowerArm.add(rightHand);

    const leftUpperLeg = new THREE.Group();
    hips.add(leftUpperLeg);

    const leftKnee = new THREE.Group();
    leftUpperLeg.add(leftKnee);

    const leftLowerLeg = new THREE.Group();
    leftKnee.add(leftLowerLeg);

    const leftFoot = new THREE.Group();
    leftLowerLeg.add(leftFoot);

    const rightUpperLeg = new THREE.Group();
    hips.add(rightUpperLeg);

    const rightKnee = new THREE.Group();
    rightUpperLeg.add(rightKnee);

    const rightLowerLeg = new THREE.Group();
    rightKnee.add(rightLowerLeg);

    const rightFoot = new THREE.Group();
    rightLowerLeg.add(rightFoot);

    this.createMeshParts({
      head, neck, torso, leftShoulder, leftUpperArm, leftElbow,
      leftLowerArm, leftHand, rightShoulder, rightUpperArm,
      rightElbow, rightLowerArm, rightHand, hips, leftUpperLeg,
      leftKnee, leftLowerLeg, leftFoot, rightUpperLeg, rightKnee,
      rightLowerLeg, rightFoot
    });

    return {
      head, neck, torso, leftShoulder, leftUpperArm, leftElbow,
      leftLowerArm, leftHand, rightShoulder, rightUpperArm,
      rightElbow, rightLowerArm, rightHand, hips, leftUpperLeg,
      leftKnee, leftLowerLeg, leftFoot, rightUpperLeg, rightKnee,
      rightLowerLeg, rightFoot
    };
  }

  private createMeshParts(joints: Joints): void {
    const headGeo = new THREE.SphereGeometry(1, 16, 16);
    const head = new THREE.Mesh(headGeo, this.materials.skin);
    head.castShadow = true;
    head.receiveShadow = true;
    joints.head.add(head);

    const neckGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.5, 8);
    const neck = new THREE.Mesh(neckGeo, this.materials.skin);
    neck.castShadow = true;
    neck.receiveShadow = true;
    joints.neck.add(neck);

    const torsoGeo = new THREE.BoxGeometry(1.5, 2, 0.8);
    const torso = new THREE.Mesh(torsoGeo, this.materials.clothing);
    torso.castShadow = true;
    torso.receiveShadow = true;
    joints.torso.add(torso);

    const upperArmGeo = new THREE.CylinderGeometry(0.28, 0.32, 1, 8);
    
    const leftUpperArmMesh = new THREE.Mesh(upperArmGeo, this.materials.clothing);
    leftUpperArmMesh.castShadow = true;
    leftUpperArmMesh.receiveShadow = true;
    leftUpperArmMesh.rotation.z = Math.PI / 2;
    joints.leftUpperArm.add(leftUpperArmMesh);

    const rightUpperArmMesh = new THREE.Mesh(upperArmGeo, this.materials.clothing);
    rightUpperArmMesh.castShadow = true;
    rightUpperArmMesh.receiveShadow = true;
    rightUpperArmMesh.rotation.z = -Math.PI / 2;
    joints.rightUpperArm.add(rightUpperArmMesh);

    const lowerArmGeo = new THREE.CylinderGeometry(0.22, 0.26, 1, 8);
    
    const leftLowerArmMesh = new THREE.Mesh(lowerArmGeo, this.materials.skin);
    leftLowerArmMesh.castShadow = true;
    leftLowerArmMesh.receiveShadow = true;
    leftLowerArmMesh.rotation.z = Math.PI / 2;
    joints.leftLowerArm.add(leftLowerArmMesh);

    const rightLowerArmMesh = new THREE.Mesh(lowerArmGeo, this.materials.skin);
    rightLowerArmMesh.castShadow = true;
    rightLowerArmMesh.receiveShadow = true;
    rightLowerArmMesh.rotation.z = -Math.PI / 2;
    joints.rightLowerArm.add(rightLowerArmMesh);

    const handGeo = new THREE.BoxGeometry(0.35, 0.5, 0.25);
    const leftHand = new THREE.Mesh(handGeo, this.materials.skin);
    leftHand.castShadow = true;
    leftHand.receiveShadow = true;
    joints.leftHand.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, this.materials.skin);
    rightHand.castShadow = true;
    rightHand.receiveShadow = true;
    joints.rightHand.add(rightHand);

    const upperLegGeo = new THREE.CylinderGeometry(0.38, 0.42, 1.2, 8);
    const leftUpperLeg = new THREE.Mesh(upperLegGeo, this.materials.pants);
    leftUpperLeg.castShadow = true;
    leftUpperLeg.receiveShadow = true;
    joints.leftUpperLeg.add(leftUpperLeg);

    const rightUpperLeg = new THREE.Mesh(upperLegGeo, this.materials.pants);
    rightUpperLeg.castShadow = true;
    rightUpperLeg.receiveShadow = true;
    joints.rightUpperLeg.add(rightUpperLeg);

    const lowerLegGeo = new THREE.CylinderGeometry(0.28, 0.32, 1.1, 8);
    const leftLowerLeg = new THREE.Mesh(lowerLegGeo, this.materials.pants);
    leftLowerLeg.castShadow = true;
    leftLowerLeg.receiveShadow = true;
    joints.leftLowerLeg.add(leftLowerLeg);

    const rightLowerLeg = new THREE.Mesh(lowerLegGeo, this.materials.pants);
    rightLowerLeg.castShadow = true;
    rightLowerLeg.receiveShadow = true;
    joints.rightLowerLeg.add(rightLowerLeg);

    const footGeo = new THREE.BoxGeometry(0.5, 0.2, 0.8);
    const leftFoot = new THREE.Mesh(footGeo, this.materials.pants);
    leftFoot.castShadow = true;
    leftFoot.receiveShadow = true;
    joints.leftFoot.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, this.materials.pants);
    rightFoot.castShadow = true;
    rightFoot.receiveShadow = true;
    joints.rightFoot.add(rightFoot);
  }

  private createReachSphere(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.visible = true;
    return sphere;
  }

  public updateProportions(): void {
    const scale = this.params.height / 170;

    this.group.scale.setScalar(scale);

    const headHeight = 0.25 * this.params.height;
    const torsoHeight = 0.3 * this.params.height;
    const upperArmLength = 0.18 * this.params.armLength;
    const lowerArmLength = 0.22 * this.params.armLength;
    const upperLegLength = 0.28 * this.params.height;
    const lowerLegLength = 0.27 * this.params.height;

    const shoulderWidth = this.params.shoulderWidth * 0.5;

    this.joints.hips.position.y = 0;

    this.joints.torso.position.y = lowerLegLength + upperLegLength + 0.05;
    this.joints.torso.position.x = 0;
    this.joints.torso.children[0].scale.set(1, torsoHeight / 2, 1);
    (this.joints.torso.children[0] as THREE.Mesh).position.y = torsoHeight / 2;

    this.joints.neck.position.y = torsoHeight;
    this.joints.neck.children[0].scale.setScalar(0.8);
    (this.joints.neck.children[0] as THREE.Mesh).position.y = 0.25;

    this.joints.head.position.y = 0.5;
    this.joints.head.children[0].scale.setScalar(headHeight / 2);
    (this.joints.head.children[0] as THREE.Mesh).position.y = headHeight / 2;

    this.joints.leftShoulder.position.set(shoulderWidth, torsoHeight * 0.85, 0);
    this.joints.leftShoulder.rotation.z = 0;

    this.joints.leftUpperArm.position.x = 0;
    this.joints.leftUpperArm.children[0].scale.set(1, upperArmLength / 1, 1);

    this.joints.leftElbow.position.x = upperArmLength;
    this.joints.leftElbow.rotation.z = 0;

    this.joints.leftLowerArm.position.x = 0;
    this.joints.leftLowerArm.children[0].scale.set(1, lowerArmLength / 1, 1);

    this.joints.leftHand.position.x = lowerArmLength;
    this.joints.leftHand.rotation.z = 0;

    this.joints.rightShoulder.position.set(-shoulderWidth, torsoHeight * 0.85, 0);
    this.joints.rightShoulder.rotation.z = 0;

    this.joints.rightUpperArm.position.x = 0;
    this.joints.rightUpperArm.children[0].scale.set(1, upperArmLength / 1, 1);

    this.joints.rightElbow.position.x = -upperArmLength;
    this.joints.rightElbow.rotation.z = 0;

    this.joints.rightLowerArm.position.x = 0;
    this.joints.rightLowerArm.children[0].scale.set(1, lowerArmLength / 1, 1);

    this.joints.rightHand.position.x = -lowerArmLength;
    this.joints.rightHand.rotation.z = 0;

    this.joints.leftUpperLeg.position.set(shoulderWidth * 0.4, 0, 0);
    this.joints.leftUpperLeg.children[0].scale.set(1, upperLegLength / 1.2, 1);
    (this.joints.leftUpperLeg.children[0] as THREE.Mesh).position.y = -upperLegLength / 2;

    this.joints.leftKnee.position.y = -upperLegLength;

    this.joints.leftLowerLeg.position.y = 0;
    this.joints.leftLowerLeg.children[0].scale.set(1, lowerLegLength / 1.1, 1);
    (this.joints.leftLowerLeg.children[0] as THREE.Mesh).position.y = -lowerLegLength / 2;

    this.joints.leftFoot.position.y = -lowerLegLength;
    (this.joints.leftFoot.children[0] as THREE.Mesh).position.y = -0.1;
    (this.joints.leftFoot.children[0] as THREE.Mesh).position.z = 0.2;

    this.joints.rightUpperLeg.position.set(-shoulderWidth * 0.4, 0, 0);
    this.joints.rightUpperLeg.children[0].scale.set(1, upperLegLength / 1.2, 1);
    (this.joints.rightUpperLeg.children[0] as THREE.Mesh).position.y = -upperLegLength / 2;

    this.joints.rightKnee.position.y = -upperLegLength;

    this.joints.rightLowerLeg.position.y = 0;
    this.joints.rightLowerLeg.children[0].scale.set(1, lowerLegLength / 1.1, 1);
    (this.joints.rightLowerLeg.children[0] as THREE.Mesh).position.y = -lowerLegLength / 2;

    this.joints.rightFoot.position.y = -lowerLegLength;
    (this.joints.rightFoot.children[0] as THREE.Mesh).position.y = -0.1;
    (this.joints.rightFoot.children[0] as THREE.Mesh).position.z = 0.2;

    const maxReach = this.params.armLength + this.params.shoulderWidth * 0.3;
    this.reachSphere.scale.setScalar(maxReach);
    this.reachSphere.position.copy(this.joints.rightShoulder.position);
    this.reachSphere.position.x -= this.params.shoulderWidth * 0.1;
  }

  public updateParams(params: Partial<CharacterParams>): void {
    Object.assign(this.params, params);
    this.updateProportions();
  }

  public getMaxReach(): number {
    return this.params.armLength + this.params.shoulderWidth * 0.3;
  }

  public getHandPosition(): THREE.Vector3 {
    const position = new THREE.Vector3();
    this.joints.rightHand.getWorldPosition(position);
    return position;
  }

  public getShoulderPosition(): THREE.Vector3 {
    const position = new THREE.Vector3();
    this.joints.rightShoulder.getWorldPosition(position);
    return position;
  }

  public getHeadPosition(): THREE.Vector3 {
    const position = new THREE.Vector3();
    this.joints.head.getWorldPosition(position);
    return position;
  }

  public reachForTarget(targetPosition: THREE.Vector3): Promise<void> {
    return new Promise((resolve) => {
      const shoulderPos = this.getShoulderPosition();
      const direction = new THREE.Vector3().subVectors(targetPosition, shoulderPos);
      const distance = direction.length();
      const maxReach = this.getMaxReach();
      const clampedDistance = Math.min(distance, maxReach * 0.95);
      direction.normalize();

      const finalTarget = shoulderPos.clone().add(direction.multiplyScalar(clampedDistance));

      const upperArmLength = this.params.armLength * 0.45;
      const lowerArmLength = this.params.armLength * 0.55;

      const angleAtElbow = Math.acos(
        Math.max(-1, Math.min(1, 
          (upperArmLength * upperArmLength + lowerArmLength * lowerArmLength - clampedDistance * clampedDistance) /
          (2 * upperArmLength * lowerArmLength)
        ))
      );

      const angleAtShoulder = Math.acos(
        Math.max(-1, Math.min(1,
          (upperArmLength * upperArmLength + clampedDistance * clampedDistance - lowerArmLength * lowerArmLength) /
          (2 * upperArmLength * clampedDistance)
        ))
      );

      const initialRotation = {
        shoulderX: this.joints.rightShoulder.rotation.x,
        shoulderY: this.joints.rightShoulder.rotation.y,
        shoulderZ: this.joints.rightShoulder.rotation.z,
        elbowZ: this.joints.rightElbow.rotation.z
      };

      const localTarget = new THREE.Vector3();
      this.joints.rightShoulder.worldToLocal(localTarget.copy(finalTarget));

      const targetShoulderY = Math.atan2(localTarget.x, localTarget.z);
      const targetShoulderX = -Math.atan2(localTarget.y, Math.sqrt(localTarget.x * localTarget.x + localTarget.z * localTarget.z)) + angleAtShoulder;
      const targetShoulderZ = 0;
      const targetElbowZ = -(Math.PI - angleAtElbow);

      new TWEEN.Tween(initialRotation)
        .to({
          shoulderX: targetShoulderX,
          shoulderY: targetShoulderY,
          shoulderZ: targetShoulderZ,
          elbowZ: targetElbowZ
        }, 1000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          this.joints.rightShoulder.rotation.x = initialRotation.shoulderX;
          this.joints.rightShoulder.rotation.y = initialRotation.shoulderY;
          this.joints.rightShoulder.rotation.z = initialRotation.shoulderZ;
          this.joints.rightElbow.rotation.z = initialRotation.elbowZ;
        })
        .onComplete(() => resolve())
        .start();
    });
  }

  public resetArmPosition(): Promise<void> {
    return new Promise((resolve) => {
      const initialRotation = {
        shoulderX: this.joints.rightShoulder.rotation.x,
        shoulderY: this.joints.rightShoulder.rotation.y,
        shoulderZ: this.joints.rightShoulder.rotation.z,
        elbowZ: this.joints.rightElbow.rotation.z
      };

      new TWEEN.Tween(initialRotation)
        .to({
          shoulderX: 0,
          shoulderY: 0,
          shoulderZ: 0,
          elbowZ: 0
        }, 800)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => {
          this.joints.rightShoulder.rotation.x = initialRotation.shoulderX;
          this.joints.rightShoulder.rotation.y = initialRotation.shoulderY;
          this.joints.rightShoulder.rotation.z = initialRotation.shoulderZ;
          this.joints.rightElbow.rotation.z = initialRotation.elbowZ;
        })
        .onComplete(() => resolve())
        .start();
    });
  }

  public setHelpersVisible(visible: boolean): void {
    this.reachSphere.visible = visible;
  }

  public dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
