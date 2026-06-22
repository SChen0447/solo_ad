import * as THREE from 'three';

export type SculptureType = 'geometric' | 'portrait' | 'animal';

export class ModelLoader {
  private scene: THREE.Scene;
  private currentModel: THREE.Group | null = null;
  private modelCache: Map<SculptureType, THREE.Group> = new Map();
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionDuration: number = 0.6;
  private fadeOutModel: THREE.Group | null = null;
  private fadeInModel: THREE.Group | null = null;
  private defaultMetalness: number = 0.5;
  private defaultRoughness: number = 0.3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.preloadModels();
  }

  private preloadModels(): void {
    this.modelCache.set('geometric', this.createGeometricSculpture());
    this.modelCache.set('portrait', this.createPortraitSculpture());
    this.modelCache.set('animal', this.createAnimalSculpture());
  }

  private createGeometricSculpture(): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      color: 0xC0C0C0,
      metalness: this.defaultMetalness,
      roughness: this.defaultRoughness
    });

    const cubeGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const cube = new THREE.Mesh(cubeGeo, material);
    cube.position.y = 1.2;
    cube.rotation.y = Math.PI / 4;
    cube.castShadow = true;
    cube.receiveShadow = true;
    group.add(cube);

    const sphereGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const sphere = new THREE.Mesh(sphereGeo, material);
    sphere.position.set(0.6, 0.5, 0.3);
    sphere.castShadow = true;
    group.add(sphere);

    const torusGeo = new THREE.TorusGeometry(0.4, 0.1, 16, 48);
    const torus = new THREE.Mesh(torusGeo, material);
    torus.position.set(-0.5, 0.8, -0.2);
    torus.rotation.x = Math.PI / 3;
    torus.castShadow = true;
    group.add(torus);

    const coneGeo = new THREE.ConeGeometry(0.3, 0.8, 32);
    const cone = new THREE.Mesh(coneGeo, material);
    cone.position.set(0.2, 1.8, -0.3);
    cone.castShadow = true;
    group.add(cone);

    const octaGeo = new THREE.OctahedronGeometry(0.35, 0);
    const octa = new THREE.Mesh(octaGeo, material);
    octa.position.set(-0.6, 1.6, 0.4);
    octa.rotation.y = Math.PI / 6;
    octa.castShadow = true;
    group.add(octa);

    const baseGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.3, 32);
    const base = new THREE.Mesh(baseGeo, material);
    base.position.y = -0.1;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    return group;
  }

  private createPortraitSculpture(): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      color: 0xD4A574,
      metalness: this.defaultMetalness,
      roughness: this.defaultRoughness
    });

    const headGeo = new THREE.SphereGeometry(0.5, 48, 48);
    const head = new THREE.Mesh(headGeo, material);
    head.position.y = 1.8;
    head.scale.set(1, 1.1, 0.95);
    head.castShadow = true;
    group.add(head);

    const browGeo = new THREE.BoxGeometry(0.6, 0.08, 0.05);
    const leftBrow = new THREE.Mesh(browGeo, material);
    leftBrow.position.set(-0.15, 1.95, 0.42);
    leftBrow.rotation.z = 0.1;
    group.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, material);
    rightBrow.position.set(0.15, 1.95, 0.42);
    rightBrow.rotation.z = -0.1;
    group.add(rightBrow);

    const noseGeo = new THREE.ConeGeometry(0.06, 0.18, 8);
    const nose = new THREE.Mesh(noseGeo, material);
    nose.position.set(0, 1.7, 0.48);
    nose.rotation.x = -Math.PI / 2;
    group.add(nose);

    const mouthGeo = new THREE.BoxGeometry(0.2, 0.03, 0.02);
    const mouth = new THREE.Mesh(mouthGeo, material);
    mouth.position.set(0, 1.5, 0.46);
    group.add(mouth);

    const earGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const leftEar = new THREE.Mesh(earGeo, material);
    leftEar.position.set(-0.5, 1.75, 0);
    leftEar.scale.set(0.5, 1, 0.3);
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, material);
    rightEar.position.set(0.5, 1.75, 0);
    rightEar.scale.set(0.5, 1, 0.3);
    group.add(rightEar);

    const neckGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.3, 24);
    const neck = new THREE.Mesh(neckGeo, material);
    neck.position.y = 1.2;
    neck.castShadow = true;
    group.add(neck);

    const shoulderGeo = new THREE.SphereGeometry(0.5, 24, 24);
    const shoulders = new THREE.Mesh(shoulderGeo, material);
    shoulders.position.y = 0.7;
    shoulders.scale.set(1.8, 0.6, 1);
    shoulders.castShadow = true;
    shoulders.receiveShadow = true;
    group.add(shoulders);

    const baseGeo = new THREE.CylinderGeometry(0.7, 0.9, 0.4, 32);
    const base = new THREE.Mesh(baseGeo, material);
    base.position.y = 0.1;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    return group;
  }

  private createAnimalSculpture(): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B6914,
      metalness: this.defaultMetalness,
      roughness: this.defaultRoughness
    });

    const bodyGeo = new THREE.SphereGeometry(0.6, 32, 32);
    const body = new THREE.Mesh(bodyGeo, material);
    body.position.set(0, 0.8, 0);
    body.scale.set(1.2, 0.9, 1.5);
    body.castShadow = true;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const head = new THREE.Mesh(headGeo, material);
    head.position.set(0.7, 1.1, 0);
    head.scale.set(1, 1, 0.9);
    head.castShadow = true;
    group.add(head);

    const snoutGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const snout = new THREE.Mesh(snoutGeo, material);
    snout.position.set(1.0, 0.95, 0);
    snout.scale.set(1.2, 0.9, 1);
    group.add(snout);

    const earGeo = new THREE.ConeGeometry(0.1, 0.3, 8);
    const leftEar = new THREE.Mesh(earGeo, material);
    leftEar.position.set(0.6, 1.35, 0.18);
    leftEar.rotation.z = -0.3;
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, material);
    rightEar.position.set(0.6, 1.35, -0.18);
    rightEar.rotation.z = 0.3;
    group.add(rightEar);

    const eyeGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      metalness: 0.1,
      roughness: 0.5
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.85, 1.15, 0.15);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(0.85, 1.15, -0.15);
    group.add(rightEye);

    const legGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.7, 16);
    const positions = [
      [0.35, 0.35, 0.4],
      [0.35, 0.35, -0.4],
      [-0.35, 0.35, 0.4],
      [-0.35, 0.35, -0.4]
    ];
    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, material);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });

    const tailGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.5, 12);
    const tail = new THREE.Mesh(tailGeo, material);
    tail.position.set(-0.7, 1.0, 0);
    tail.rotation.z = Math.PI / 3;
    group.add(tail);

    const baseGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.3, 32);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B6914,
      metalness: this.defaultMetalness,
      roughness: this.defaultRoughness
    });
    const base = new THREE.Mesh(baseGeo, baseMaterial);
    base.position.y = -0.05;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    return group;
  }

  public loadModel(type: SculptureType): void {
    const model = this.modelCache.get(type);
    if (!model) return;

    this.currentModel = model.clone();
    this.currentModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.scene.add(this.currentModel);
  }

  public switchModel(type: SculptureType, duration: number): void {
    if (this.isTransitioning) return;

    const newModel = this.modelCache.get(type);
    if (!newModel) return;

    this.transitionDuration = duration;
    this.transitionProgress = 0;
    this.isTransitioning = true;
    this.fadeOutModel = this.currentModel;
    this.fadeInModel = newModel.clone();

    this.fadeInModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = (child.material as THREE.MeshStandardMaterial).clone();
        child.material.transparent = true;
        child.material.opacity = 0;
      }
    });

    this.scene.add(this.fadeInModel);

    if (this.fadeOutModel) {
      this.fadeOutModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = (child.material as THREE.MeshStandardMaterial).clone();
          child.material.transparent = true;
        }
      });
    }
  }

  public getCurrentModel(): THREE.Group | null {
    return this.currentModel;
  }

  public update(delta: number): void {
    if (!this.isTransitioning) return;

    this.transitionProgress += delta;
    const t = Math.min(this.transitionProgress / this.transitionDuration, 1);
    const easedT = this.easeInOut(t);

    if (this.fadeOutModel) {
      const outOpacity = 1 - easedT;
      this.fadeOutModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshStandardMaterial).opacity = outOpacity;
        }
      });
    }

    if (this.fadeInModel) {
      this.fadeInModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshStandardMaterial).opacity = easedT;
        }
      });
    }

    if (t >= 1) {
      if (this.fadeOutModel) {
        this.scene.remove(this.fadeOutModel);
        this.fadeOutModel = null;
      }
      if (this.fadeInModel) {
        this.fadeInModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material.transparent = false;
            child.material.opacity = 1;
          }
        });
        this.currentModel = this.fadeInModel;
        this.fadeInModel = null;
      }
      this.isTransitioning = false;
    }
  }

  public setMaterialProperties(metalness: number, roughness: number): void {
    const updateMaterial = (model: THREE.Group | null) => {
      if (!model) return;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.metalness = metalness;
          child.material.roughness = roughness;
          child.material.needsUpdate = true;
        }
      });
    };

    updateMaterial(this.currentModel);
    updateMaterial(this.fadeInModel);
    updateMaterial(this.fadeOutModel);
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}
