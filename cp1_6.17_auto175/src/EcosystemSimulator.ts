import * as THREE from 'three';
import {
  EnvironmentParams,
  TreeType,
  AnimalType,
  TreeEntity,
  AnimalEntity,
  GrassBladeData,
  EcosystemMetrics,
  DEFAULT_ENVIRONMENT,
  TREE_COLORS,
  easeInOutCubic,
  lerp,
  clamp
} from './types';

const TREE_COUNT = 55;
const GRASS_COUNT = 2000;
const ANIMAL_COUNT = 12;
const TRANSITION_DURATION = 3.0;
const FOREST_RADIUS = 35;
const GRASS_RADIUS = 38;

export class EcosystemSimulator {
  private scene: THREE.Scene;
  private currentParams: EnvironmentParams = { ...DEFAULT_ENVIRONMENT };
  private targetParams: EnvironmentParams = { ...DEFAULT_ENVIRONMENT };
  private transitionProgress = 1;
  private elapsedTime = 0;

  private trees: TreeEntity[] = [];
  private treeMeshes: Map<string, THREE.Group> = new Map();
  private treeMaterials: Map<string, THREE.MeshStandardMaterial> = new Map();

  private grassData: GrassBladeData[] = [];
  private grassMesh: THREE.InstancedMesh | null = null;
  private grassDummy: THREE.Object3D = new THREE.Object3D();

  private animals: AnimalEntity[] = [];
  private animalMeshes: Map<string, THREE.Group> = new Map();

  private streamGroup: THREE.Group = new THREE.Group();
  private waterMesh: THREE.Mesh | null = null;
  private waterNormalTexture: THREE.DataTexture | null = null;
  private streamWaterLevel = 0.15;
  private targetStreamWaterLevel = 0.15;

  private ground: THREE.Mesh | null = null;
  private directionalLight: THREE.DirectionalLight;

  constructor(scene: THREE.Scene, directionalLight: THREE.DirectionalLight) {
    this.scene = scene;
    this.directionalLight = directionalLight;
    this.initializeGround();
    this.initializeStream();
    this.initializeTrees();
    this.initializeGrass();
    this.initializeAnimals();
  }

  private initializeGround(): void {
    const groundGeo = new THREE.CircleGeometry(50, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2d4a2d,
      roughness: 0.9,
      metalness: 0.05
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  private initializeStream(): void {
    this.scene.add(this.streamGroup);

    const streamPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = lerp(-25, 25, t);
      const z = lerp(-15, 20, t) + Math.sin(t * Math.PI * 2) * 5;
      streamPoints.push(new THREE.Vector3(x, 0.02, z));
    }

    const streamBankShape = new THREE.Shape();
    const width = 3;
    for (let i = 0; i < streamPoints.length; i++) {
      const p = streamPoints[i];
      const perp = i === 0
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3().subVectors(streamPoints[i], streamPoints[i - 1]).normalize().cross(new THREE.Vector3(0, 1, 0));

      if (i === 0) {
        streamBankShape.moveTo(p.x + perp.x * width, p.z + perp.z * width);
      }
      streamBankShape.lineTo(p.x + perp.x * width, p.z + perp.z * width);
    }
    for (let i = streamPoints.length - 1; i >= 0; i--) {
      const p = streamPoints[i];
      const perp = i === streamPoints.length - 1
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3().subVectors(streamPoints[i], streamPoints[i - 1]).normalize().cross(new THREE.Vector3(0, 1, 0));
      streamBankShape.lineTo(p.x - perp.x * width, p.z - perp.z * width);
    }

    const bankGeo = new THREE.ShapeGeometry(streamBankShape);
    bankGeo.rotateX(-Math.PI / 2);
    const bankMat = new THREE.MeshStandardMaterial({
      color: 0x4a5d3a,
      roughness: 1,
      metalness: 0
    });
    const bankMesh = new THREE.Mesh(bankGeo, bankMat);
    bankMesh.position.y = 0.03;
    bankMesh.receiveShadow = true;
    this.streamGroup.add(bankMesh);

    const waterWidth = 2.2;
    const waterShape = new THREE.Shape();
    for (let i = 0; i < streamPoints.length; i++) {
      const p = streamPoints[i];
      const perp = i === 0
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3().subVectors(streamPoints[i], streamPoints[i - 1]).normalize().cross(new THREE.Vector3(0, 1, 0));

      if (i === 0) {
        waterShape.moveTo(p.x + perp.x * waterWidth, p.z + perp.z * waterWidth);
      }
      waterShape.lineTo(p.x + perp.x * waterWidth, p.z + perp.z * waterWidth);
    }
    for (let i = streamPoints.length - 1; i >= 0; i--) {
      const p = streamPoints[i];
      const perp = i === streamPoints.length - 1
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3().subVectors(streamPoints[i], streamPoints[i - 1]).normalize().cross(new THREE.Vector3(0, 1, 0));
      waterShape.lineTo(p.x - perp.x * waterWidth, p.z - perp.z * waterWidth);
    }

    const waterGeo = new THREE.ShapeGeometry(waterShape);
    waterGeo.rotateX(-Math.PI / 2);

    const normalData = this.generateWaterNormalMap(256, 256) as unknown as Uint8Array;
    this.waterNormalTexture = new THREE.DataTexture(normalData, 256, 256, THREE.RGBAFormat);
    this.waterNormalTexture.wrapS = THREE.RepeatWrapping;
    this.waterNormalTexture.wrapT = THREE.RepeatWrapping;
    this.waterNormalTexture.repeat.set(8, 8);
    this.waterNormalTexture.needsUpdate = true;

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2196F3,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
      metalness: 0.3,
      normalMap: this.waterNormalTexture,
      normalScale: new THREE.Vector2(0.8, 0.8)
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = this.streamWaterLevel;
    this.streamGroup.add(this.waterMesh);

    this.scene.userData.streamPoints = streamPoints;
  }

  private generateWaterNormalMap(width: number, height: number): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const nx = Math.sin(x * 0.15) * Math.cos(y * 0.12) * 0.5 + 0.5;
        const ny = Math.cos(x * 0.11 + y * 0.08) * 0.5 + 0.5;
        const nz = 0.9;
        data[idx] = Math.floor(nx * 255);
        data[idx + 1] = Math.floor(ny * 255);
        data[idx + 2] = Math.floor(nz * 255);
        data[idx + 3] = 255;
      }
    }
    return data;
  }

  private initializeTrees(): void {
    const treeTypes: TreeType[] = ['pine', 'oak', 'sakura'];
    const streamPoints: THREE.Vector3[] = this.scene.userData.streamPoints || [];

    let created = 0;
    let attempts = 0;
    while (created < TREE_COUNT && attempts < TREE_COUNT * 10) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.random() * FOREST_RADIUS;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      let tooCloseToStream = false;
      for (const sp of streamPoints) {
        if (Math.hypot(x - sp.x, z - sp.z) < 3.5) {
          tooCloseToStream = true;
          break;
        }
      }
      if (tooCloseToStream) continue;

      let tooCloseToOther = false;
      for (const tree of this.trees) {
        if (Math.hypot(x - tree.position.x, z - tree.position.z) < 3.5) {
          tooCloseToOther = true;
          break;
        }
      }
      if (tooCloseToOther) continue;

      const type = treeTypes[Math.floor(Math.random() * treeTypes.length)];
      const initialGrowth = 0.7 + Math.random() * 0.3;

      const tree: TreeEntity = {
        id: `tree_${created}`,
        position: { x, y: 0, z },
        type,
        currentState: {
          health: 70 + Math.random() * 30,
          growth: initialGrowth,
          saturation: 0.8 + Math.random() * 0.2
        },
        targetState: {
          health: 85,
          growth: 1,
          saturation: 1
        },
        canopyScale: initialGrowth,
        targetCanopyScale: 1,
        baseYRotation: Math.random() * Math.PI * 2,
        windOffset: Math.random() * Math.PI * 2
      };

      this.trees.push(tree);
      this.createTreeMesh(tree);
      created++;
    }
  }

  private createTreeMesh(tree: TreeEntity): void {
    const group = new THREE.Group();
    const scale = 0.8 + Math.random() * 0.4;

    const trunkHeight = tree.type === 'pine' ? 2.5 : tree.type === 'oak' ? 1.8 : 1.5;
    const trunkGeo = new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, trunkHeight * scale, 8);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5D4037,
      roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = (trunkHeight * scale) / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    const colors = TREE_COLORS[tree.type];
    const canopyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors.canopy),
      roughness: 0.8,
      metalness: 0
    });
    this.treeMaterials.set(tree.id, canopyMat);

    if (tree.type === 'pine') {
      for (let i = 0; i < 4; i++) {
        const coneScale = (1 - i * 0.18) * scale * 1.3;
        const coneGeo = new THREE.ConeGeometry(1.1 * coneScale, 1.4 * coneScale, 8);
        const cone = new THREE.Mesh(coneGeo, canopyMat);
        cone.position.y = (trunkHeight * scale) + i * 0.6 * coneScale;
        cone.castShadow = true;
        cone.receiveShadow = true;
        group.add(cone);
      }
    } else if (tree.type === 'oak') {
      const positions = [
        [0, 1.6, 0, 1.4],
        [-0.7, 1.3, 0.3, 1],
        [0.6, 1.4, -0.4, 0.95],
        [0.2, 2.0, 0.2, 1.1],
        [-0.3, 1.8, -0.5, 0.85]
      ];
      for (const [px, py, pz, r] of positions) {
        const sphereGeo = new THREE.SphereGeometry(r * scale, 12, 10);
        const sphere = new THREE.Mesh(sphereGeo, canopyMat);
        sphere.position.set(px * scale, (trunkHeight * scale) * 0.6 + py * scale, pz * scale);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        group.add(sphere);
      }
    } else {
      const positions: [number, number, number, number][] = [];
      const bloomCount = 8;
      for (let i = 0; i < bloomCount; i++) {
        const a = (i / bloomCount) * Math.PI * 2;
        const r = 1 + Math.random() * 0.3;
        positions.push([
          Math.cos(a) * r * 0.8,
          1.3 + Math.random() * 0.5,
          Math.sin(a) * r * 0.8,
          0.7 + Math.random() * 0.4
        ]);
      }
      positions.push([0, 1.8, 0, 0.9]);
      for (const [px, py, pz, r] of positions) {
        const sphereGeo = new THREE.SphereGeometry(r * scale, 10, 8);
        const sphere = new THREE.Mesh(sphereGeo, canopyMat);
        sphere.position.set(px * scale, (trunkHeight * scale) * 0.5 + py * scale, pz * scale);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        group.add(sphere);
      }
    }

    group.position.set(tree.position.x, tree.position.y, tree.position.z);
    group.rotation.y = tree.baseYRotation;
    this.treeMeshes.set(tree.id, group);
    this.scene.add(group);
  }

  private initializeGrass(): void {
    const streamPoints: THREE.Vector3[] = this.scene.userData.streamPoints || [];

    for (let i = 0; i < GRASS_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.5) * GRASS_RADIUS;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      let tooCloseToStream = false;
      for (const sp of streamPoints) {
        if (Math.hypot(x - sp.x, z - sp.z) < 2.5) {
          tooCloseToStream = true;
          break;
        }
      }
      if (tooCloseToStream) continue;

      const baseHeight = 0.2 + Math.random() * 0.4;
      this.grassData.push({
        baseHeight,
        currentHeight: baseHeight,
        targetHeight: baseHeight * 1.5,
        x,
        z,
        rotation: Math.random() * Math.PI * 2
      });
    }

    const grassGeo = new THREE.PlaneGeometry(0.06, 1, 1, 3);
    grassGeo.translate(0, 0.5, 0);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x4CAF50,
      roughness: 0.85,
      side: THREE.DoubleSide,
      metalness: 0
    });
    this.grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, this.grassData.length);
    this.grassMesh.receiveShadow = true;
    this.scene.add(this.grassMesh);

    for (let i = 0; i < this.grassData.length; i++) {
      const g = this.grassData[i];
      this.grassDummy.position.set(g.x, 0, g.z);
      this.grassDummy.rotation.y = g.rotation;
      this.grassDummy.scale.set(1, g.currentHeight, 1);
      this.grassDummy.updateMatrix();
      this.grassMesh.setMatrixAt(i, this.grassDummy.matrix);
    }
    this.grassMesh.instanceMatrix.needsUpdate = true;
  }

  private initializeAnimals(): void {
    const animalTypes: AnimalType[] = ['rabbit', 'squirrel', 'butterfly'];
    const counts = { rabbit: 4, squirrel: 4, butterfly: 4 };
    let idx = 0;

    for (const type of animalTypes) {
      for (let i = 0; i < counts[type]; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 25;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = type === 'butterfly' ? 1.5 + Math.random() * 2 : 0.05;

        let nearTreeForSquirrel: string | undefined;
        if (type === 'squirrel') {
          let minDist = Infinity;
          for (const tree of this.trees) {
            const d = Math.hypot(x - tree.position.x, z - tree.position.z);
            if (d < minDist) {
              minDist = d;
              nearTreeForSquirrel = tree.id;
            }
          }
        }

        const animal: AnimalEntity = {
          id: `animal_${idx}`,
          position: { x, y, z },
          type,
          currentState: {
            health: 90 + Math.random() * 10,
            growth: 1,
            saturation: 1
          },
          targetState: {
            health: 95,
            growth: 1,
            saturation: 1
          },
          velocity: { x: 0, y: 0, z: 0 },
          targetPosition: { x, y, z },
          activityLevel: 0.8,
          targetActivityLevel: 0.8,
          moveTimer: Math.random() * 3,
          hopHeight: 0,
          climbOffset: Math.random() * Math.PI * 2,
          baseTreeId: nearTreeForSquirrel
        };

        this.animals.push(animal);
        this.createAnimalMesh(animal);
        idx++;
      }
    }
  }

  private createAnimalMesh(animal: AnimalEntity): void {
    const group = new THREE.Group();

    if (animal.type === 'rabbit') {
      const bodyGeo = new THREE.SphereGeometry(0.18, 10, 8);
      bodyGeo.scale(1.3, 0.8, 1);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xFAFAFA, roughness: 0.7 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.12;
      body.castShadow = true;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.1, 10, 8);
      const head = new THREE.Mesh(headGeo, bodyMat);
      head.position.set(0.18, 0.2, 0);
      head.castShadow = true;
      group.add(head);

      const earGeo = new THREE.CapsuleGeometry(0.025, 0.18, 4, 6);
      const earL = new THREE.Mesh(earGeo, bodyMat);
      earL.position.set(0.22, 0.36, 0.04);
      earL.rotation.z = 0.2;
      earL.castShadow = true;
      group.add(earL);
      const earR = earL.clone();
      earR.position.z = -0.04;
      earR.rotation.z = -0.2;
      group.add(earR);

      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x212121 });
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.015), eyeMat);
      eyeL.position.set(0.26, 0.22, 0.05);
      group.add(eyeL);
      const eyeR = eyeL.clone();
      eyeR.position.z = -0.05;
      group.add(eyeR);
    } else if (animal.type === 'squirrel') {
      const brownMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.6 });
      const bodyGeo = new THREE.SphereGeometry(0.12, 10, 8);
      bodyGeo.scale(1, 1.3, 0.9);
      const body = new THREE.Mesh(bodyGeo, brownMat);
      body.position.y = 0.15;
      body.castShadow = true;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.08, 10, 8);
      const head = new THREE.Mesh(headGeo, brownMat);
      head.position.set(0, 0.3, 0.1);
      head.castShadow = true;
      group.add(head);

      const tailGeo = new THREE.SphereGeometry(0.14, 10, 8);
      tailGeo.scale(0.6, 1.4, 0.6);
      const tail = new THREE.Mesh(tailGeo, brownMat);
      tail.position.set(0, 0.3, -0.18);
      tail.rotation.x = 0.5;
      tail.castShadow = true;
      group.add(tail);

      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x212121 });
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.012), eyeMat);
      eyeL.position.set(0.04, 0.32, 0.16);
      group.add(eyeL);
      const eyeR = eyeL.clone();
      eyeR.position.x = -0.04;
      group.add(eyeR);
    } else {
      const wingColors = [0xFF7043, 0xAB47BC, 0x42A5F5, 0x66BB6A];
      const wingColor = wingColors[Math.floor(Math.random() * wingColors.length)];
      const wingMat = new THREE.MeshStandardMaterial({
        color: wingColor,
        roughness: 0.4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });

      const wingGeo = new THREE.ConeGeometry(0.12, 0.2, 4);
      const wingL = new THREE.Mesh(wingGeo, wingMat);
      wingL.rotation.y = Math.PI / 4;
      wingL.position.x = -0.05;
      wingL.userData.isWing = true;
      wingL.userData.side = 'left';
      group.add(wingL);

      const wingR = wingL.clone();
      wingR.rotation.y = -Math.PI / 4;
      wingR.position.x = 0.05;
      wingR.userData.side = 'right';
      group.add(wingR);

      const bodyGeo = new THREE.CapsuleGeometry(0.015, 0.08, 4, 6);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x424242 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.x = Math.PI / 2;
      group.add(body);

      group.userData.wingL = wingL;
      group.userData.wingR = wingR;
    }

    group.position.set(animal.position.x, animal.position.y, animal.position.z);
    this.animalMeshes.set(animal.id, group);
    this.scene.add(group);
  }

  public setEnvironmentParams(params: EnvironmentParams): void {
    this.targetParams = { ...params };
    this.transitionProgress = 0;
    this.recalculateTargetStates();
  }

  private recalculateTargetStates(): void {
    const p = this.targetParams;
    const lightNorm = p.light / 100;
    const rainNorm = p.rain / 100;
    const tempNorm = clamp((p.temp + 10) / 50, 0, 1);
    const windNorm = p.wind / 100;

    const stressFactor = (
      Math.abs(lightNorm - 0.6) * 0.8 +
      Math.abs(rainNorm - 0.5) * 0.8 +
      Math.abs(tempNorm - 0.5) * 1.2 +
      windNorm * 0.4
    );
    const healthBase = clamp(100 - stressFactor * 60, 10, 100);
    const growthBase = clamp(1 - stressFactor * 0.7, 0.25, 1);
    const saturationBase = clamp(1 - stressFactor * 0.8, 0.15, 1);

    for (const tree of this.trees) {
      tree.targetState = {
        health: clamp(healthBase + (Math.random() - 0.5) * 10, 5, 100),
        growth: clamp(growthBase + (Math.random() - 0.5) * 0.1, 0.2, 1),
        saturation: clamp(saturationBase + (Math.random() - 0.5) * 0.1, 0.1, 1)
      };
      tree.targetCanopyScale = tree.targetState.growth;
    }

    const grassHeightBase = lerp(0.2, 1.2, clamp((rainNorm * 0.5 + tempNorm * 0.3 + lightNorm * 0.2), 0, 1));
    for (const g of this.grassData) {
      g.targetHeight = g.baseHeight + grassHeightBase * 0.7;
    }

    this.targetStreamWaterLevel = lerp(0.05, 0.35, rainNorm);

    const coldStress = clamp((5 - p.temp) / 15, 0, 1);
    const heatStress = clamp((p.temp - 35) / 5, 0, 1);
    const tempActivity = clamp(1 - (coldStress + heatStress), 0, 1);
    const windActivity = clamp(1 - windNorm * 0.5, 0, 1);
    const targetActivity = clamp(tempActivity * windActivity, 0, 1);

    for (const animal of this.animals) {
      animal.targetActivityLevel = targetActivity;
    }
  }

  public updateScene(deltaTime: number): EcosystemMetrics {
    this.elapsedTime += deltaTime;

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / TRANSITION_DURATION);
      const t = easeInOutCubic(this.transitionProgress);
      this.currentParams.light = lerp(this.currentParams.light, this.targetParams.light, t);
      this.currentParams.rain = lerp(this.currentParams.rain, this.targetParams.rain, t);
      this.currentParams.wind = lerp(this.currentParams.wind, this.targetParams.wind, t);
      this.currentParams.temp = lerp(this.currentParams.temp, this.targetParams.temp, t);
    }

    this.updateLighting();
    this.updateTrees(deltaTime);
    this.updateGrass(deltaTime);
    this.updateStream(deltaTime);
    this.updateAnimals(deltaTime);

    return this.calculateMetrics();
  }

  private updateLighting(): void {
    const lightIntensity = lerp(0.2, 1.5, this.currentParams.light / 100);
    this.directionalLight.intensity = lightIntensity;
    const tempColor = this.currentParams.temp < 10
      ? new THREE.Color(0xB3E5FC)
      : this.currentParams.temp > 30
        ? new THREE.Color(0xFFE0B2)
        : new THREE.Color(0xFFFFFF);
    this.directionalLight.color.copy(tempColor);
  }

  private updateTrees(deltaTime: number): void {
    const windStrength = this.currentParams.wind / 100;

    for (const tree of this.trees) {
      const t = easeInOutCubic(clamp(this.transitionProgress, 0, 1));
      tree.currentState.health = lerp(tree.currentState.health, tree.targetState.health, t * 0.15);
      tree.currentState.growth = lerp(tree.currentState.growth, tree.targetState.growth, t * 0.1);
      tree.currentState.saturation = lerp(tree.currentState.saturation, tree.targetState.saturation, t * 0.12);
      tree.canopyScale = lerp(tree.canopyScale, tree.targetCanopyScale, t * 0.1);

      const mesh = this.treeMeshes.get(tree.id);
      const mat = this.treeMaterials.get(tree.id);
      if (mesh) {
        const baseScale = 0.85 + tree.canopyScale * 0.3;
        const swayAmount = windStrength * 0.04;
        const sway = Math.sin(this.elapsedTime * (1.2 + windStrength * 2) + tree.windOffset) * swayAmount;
        mesh.scale.set(baseScale, baseScale * (1 + sway * 0.5), baseScale);
        mesh.rotation.z = sway;
        mesh.rotation.x = sway * 0.4;
      }

      if (mat) {
        const colors = TREE_COLORS[tree.type];
        const healthy = new THREE.Color(colors.healthy);
        const stressed = new THREE.Color(colors.stressed);
        const sat = tree.currentState.saturation;
        const targetColor = stressed.clone().lerp(healthy, sat);
        mat.color.lerp(targetColor, 0.05);
      }
    }
  }

  private updateGrass(deltaTime: number): void {
    if (!this.grassMesh) return;

    const windStrength = this.currentParams.wind / 100;
    const t = easeInOutCubic(clamp(this.transitionProgress, 0, 1));

    for (let i = 0; i < this.grassData.length; i++) {
      const g = this.grassData[i];
      g.currentHeight = lerp(g.currentHeight, g.targetHeight, t * 0.08);

      const sway = Math.sin(this.elapsedTime * 2 + g.x * 0.5 + g.z * 0.3) * windStrength * 0.3;
      this.grassDummy.position.set(g.x, 0, g.z);
      this.grassDummy.rotation.set(sway * 0.5, g.rotation, sway * 0.3);
      this.grassDummy.scale.set(1, g.currentHeight, 1);
      this.grassDummy.updateMatrix();
      this.grassMesh.setMatrixAt(i, this.grassDummy.matrix);
    }
    this.grassMesh.instanceMatrix.needsUpdate = true;
  }

  private updateStream(deltaTime: number): void {
    if (this.waterMesh && this.waterNormalTexture) {
      const t = easeInOutCubic(clamp(this.transitionProgress, 0, 1));
      this.streamWaterLevel = lerp(this.streamWaterLevel, this.targetStreamWaterLevel, t * 0.05);
      this.waterMesh.position.y = this.streamWaterLevel;

      const flowSpeed = 0.2 + (this.currentParams.rain / 100) * 1.2;
      this.waterNormalTexture.offset.x += deltaTime * flowSpeed * 0.3;
      this.waterNormalTexture.offset.y += deltaTime * flowSpeed * 0.15;
      this.waterNormalTexture.needsUpdate = true;

      const mat = this.waterMesh.material as THREE.MeshStandardMaterial;
      const opacity = 0.55 + (this.currentParams.rain / 100) * 0.35;
      mat.opacity = lerp(mat.opacity, opacity, 0.02);
    }
  }

  private updateAnimals(deltaTime: number): void {
    const windStrength = this.currentParams.wind / 100;
    const temp = this.currentParams.temp;

    for (const animal of this.animals) {
      const mesh = this.animalMeshes.get(animal.id);
      if (!mesh) continue;

      animal.moveTimer -= deltaTime;

      const activitySpeed = 0.08;
      animal.activityLevel = lerp(animal.activityLevel, animal.targetActivityLevel, activitySpeed);

      const shouldHibernate = temp < -2 || temp > 38;
      if (shouldHibernate) {
        mesh.visible = animal.activityLevel > 0.15;
      } else {
        mesh.visible = true;
      }

      if (animal.moveTimer <= 0) {
        animal.moveTimer = lerp(2, 6, 1 - animal.activityLevel) + Math.random() * 2;

        if (animal.activityLevel > 0.1) {
          const wanderRadius = animal.type === 'butterfly' ? 8 : animal.type === 'rabbit' ? 4 : 2;
          animal.targetPosition = {
            x: clamp(animal.position.x + (Math.random() - 0.5) * wanderRadius, -30, 30),
            y: animal.type === 'butterfly'
              ? 1.2 + Math.random() * 2.5
              : animal.type === 'squirrel'
                ? 0.1 + Math.random() * 2
                : 0.05,
            z: clamp(animal.position.z + (Math.random() - 0.5) * wanderRadius, -30, 30)
          };
        }
      }

      if (animal.type === 'squirrel' && animal.baseTreeId) {
        const tree = this.trees.find(t => t.id === animal.baseTreeId);
        if (tree && animal.activityLevel > 0.2) {
          const climbPhase = (this.elapsedTime * 0.3 + animal.climbOffset) % 1;
          animal.targetPosition.x = tree.position.x + Math.sin(climbPhase * Math.PI * 2) * 0.5;
          animal.targetPosition.z = tree.position.z + Math.cos(climbPhase * Math.PI * 2) * 0.5;
          animal.targetPosition.y = 0.1 + climbPhase * 2.5;
        }
      }

      const baseSpeed = animal.type === 'butterfly' ? 1.8 : animal.type === 'rabbit' ? 2.5 : 0.8;
      const moveSpeed = baseSpeed * animal.activityLevel;
      const moveT = clamp(deltaTime * moveSpeed * 0.5, 0, 1);

      animal.position.x = lerp(animal.position.x, animal.targetPosition.x, moveT);
      animal.position.z = lerp(animal.position.z, animal.targetPosition.z, moveT);
      animal.position.y = lerp(animal.position.y, animal.targetPosition.y, moveT * 0.5);

      if (animal.type === 'rabbit' && animal.activityLevel > 0.3) {
        animal.hopHeight = Math.abs(Math.sin(this.elapsedTime * 6 * animal.activityLevel)) * 0.25 * animal.activityLevel;
        mesh.position.y = animal.position.y + animal.hopHeight;
      } else if (animal.type === 'butterfly') {
        const wingFlap = Math.sin(this.elapsedTime * 18) * 0.7;
        const wL = mesh.userData.wingL as THREE.Mesh;
        const wR = mesh.userData.wingR as THREE.Mesh;
        if (wL) wL.rotation.y = Math.PI / 4 + wingFlap * 0.8;
        if (wR) wR.rotation.y = -Math.PI / 4 - wingFlap * 0.8;

        const windShake = Math.sin(this.elapsedTime * 4) * windStrength * 0.3;
        mesh.rotation.z = windShake;
        mesh.rotation.x = windShake * 0.5;
        mesh.position.copy(new THREE.Vector3(animal.position.x, animal.position.y, animal.position.z));
      } else {
        mesh.position.copy(new THREE.Vector3(animal.position.x, animal.position.y, animal.position.z));
      }

      if (animal.type !== 'butterfly') {
        const dx = animal.targetPosition.x - animal.position.x;
        const dz = animal.targetPosition.z - animal.position.z;
        if (Math.abs(dx) + Math.abs(dz) > 0.01) {
          const targetRot = Math.atan2(dx, dz);
          mesh.rotation.y = lerp(mesh.rotation.y, targetRot, 0.1);
        }
      }

      if (windStrength > 0.6 && animal.type === 'rabbit') {
        mesh.visible = animal.activityLevel > 0.4;
      }
    }
  }

  private calculateMetrics(): EcosystemMetrics {
    const avgTreeHealth = this.trees.reduce((s, t) => s + t.currentState.health, 0) / this.trees.length;
    const avgGrowth = this.trees.reduce((s, t) => s + t.currentState.growth, 0) / this.trees.length;
    const activeAnimals = this.animals.filter(a => a.activityLevel > 0.2).length;

    return {
      healthIndex: Math.round(clamp(avgTreeHealth, 0, 100)),
      biodiversity: Math.round(clamp(30 + activeAnimals / ANIMAL_COUNT * 70, 0, 100)),
      growthActivity: Math.round(clamp(avgGrowth * 100, 0, 100)),
      humidity: Math.round(clamp((this.currentParams.rain * 0.7 + (50 - Math.abs(this.currentParams.temp - 20)) * 0.6), 5, 100)),
      treeCount: this.trees.length
    };
  }

  public reset(): void {
    this.setEnvironmentParams({ ...DEFAULT_ENVIRONMENT });
  }

  public getCurrentParams(): EnvironmentParams {
    return { ...this.currentParams };
  }
}
