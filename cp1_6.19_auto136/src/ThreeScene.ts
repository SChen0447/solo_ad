import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { clamp, lerp, normalize, easeInOutQuad } from './utils';
import type { PlantType, PlantState } from './PlantGrowthModel';
import { PLANT_CONFIGS } from './PlantGrowthModel';
import type { SensorData, ControlParams } from './SensorSimulator';

interface PlantMesh {
  group: THREE.Group;
  branches: THREE.Mesh[];
  leaves: THREE.Mesh[];
  type: PlantType;
}

interface WaterParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class ThreeScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animationFrameId: number | null = null;
  private clock: THREE.Clock;

  private domeMesh: THREE.Mesh | null = null;
  private shadingBlinds: THREE.Mesh[] = [];
  private soilMesh: THREE.Mesh | null = null;
  private drySoilMaterial: THREE.MeshStandardMaterial | null = null;
  private wetSoilMaterial: THREE.MeshStandardMaterial | null = null;
  private groundMesh: THREE.Mesh | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private sunPivot: THREE.Group | null = null;
  private spotLightMesh: THREE.Mesh | null = null;

  private plants: Map<PlantType, PlantMesh> = new Map();
  private plantZones: Map<PlantType, THREE.Group> = new Map();
  private waterParticles: WaterParticle[] = [];
  private sectorDividers: THREE.Mesh[] = [];

  private sensorData: SensorData | null = null;
  private controlParams: ControlParams = { irrigation: 50, shading: 30, co2Concentration: 60 };
  private plantStates: Record<PlantType, PlantState> | null = null;

  private currentGlassOpacity: number = 0.3;
  private currentSoilWetness: number = 0.5;
  private targetShading: number = 0.3;
  private targetIrrigation: number = 0.5;
  private sunAngle: number = 0;

  private lastTime: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1b2a);
    this.scene.fog = new THREE.Fog(0x0d1b2a, 25, 60);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(15, 12, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 35;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 3, 0);

    this.clock = new THREE.Clock();

    this.setupLights();
    this.createGreenhouse();
    this.createSoil();
    this.createPlantZones();
    this.createPlants();
    this.createSunEffect();

    window.addEventListener('resize', this.handleResize);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x405060, 0.4);
    this.scene.add(ambientLight);

    this.sunPivot = new THREE.Group();
    this.scene.add(this.sunPivot);

    this.sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
    this.sunLight.position.set(10, 15, 8);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 50;
    this.sunLight.shadow.camera.left = -15;
    this.sunLight.shadow.camera.right = 15;
    this.sunLight.shadow.camera.top = 15;
    this.sunLight.shadow.camera.bottom = -15;
    this.sunLight.shadow.bias = -0.001;
    this.sunPivot.add(this.sunLight);

    const fillLight = new THREE.DirectionalLight(0x88aacc, 0.3);
    fillLight.position.set(-8, 6, -5);
    this.scene.add(fillLight);
  }

  private createGreenhouse(): void {
    const domeRadius = 8;
    const domeGeo = new THREE.SphereGeometry(domeRadius, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });
    this.domeMesh = new THREE.Mesh(domeGeo, domeMat);
    this.domeMesh.position.y = 0.01;
    this.scene.add(this.domeMesh);

    const ringGeo = new THREE.TorusGeometry(domeRadius, 0.15, 12, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x3a5060,
      metalness: 0.8,
      roughness: 0.3
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    this.scene.add(ring);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x5a7080,
      metalness: 0.7,
      roughness: 0.4
    });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      for (let j = 0; j <= 20; j++) {
        const phi = (j / 20) * (Math.PI / 2);
        const x = domeRadius * Math.sin(phi) * Math.cos(angle);
        const y = domeRadius * Math.cos(phi);
        const z = domeRadius * Math.sin(phi) * Math.sin(angle);
        points.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 40, 0.04, 8, false);
      const tube = new THREE.Mesh(tubeGeo, frameMat);
      this.scene.add(tube);
    }

    this.createShadingBlinds(domeRadius);
  }

  private createShadingBlinds(domeRadius: number): void {
    const blindMat = new THREE.MeshStandardMaterial({
      color: 0x2a3a4a,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const numBlinds = 32;
    for (let i = 0; i < numBlinds; i++) {
      const angle = (i / numBlinds) * Math.PI * 2;
      const blindWidth = (Math.PI * 2 * domeRadius) / numBlinds * 0.7;
      const blindGeo = new THREE.PlaneGeometry(blindWidth, domeRadius * 0.9);
      const blind = new THREE.Mesh(blindGeo, blindMat.clone());
      blind.position.set(
        Math.cos(angle) * (domeRadius - 0.05),
        domeRadius * 0.45,
        Math.sin(angle) * (domeRadius - 0.05)
      );
      blind.lookAt(0, blind.position.y, 0);
      blind.rotateY(Math.PI);
      blind.scale.y = 0;
      this.shadingBlinds.push(blind);
      this.scene.add(blind);
    }
  }

  private createSoil(): void {
    const groundRadius = 8;
    const groundGeo = new THREE.CircleGeometry(groundRadius, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1208,
      roughness: 0.95,
      metalness: 0.0
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    const soilRadius = 6.8;
    const soilGeo = new THREE.CircleGeometry(soilRadius, 64);
    this.drySoilMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b4423,
      roughness: 1.0,
      metalness: 0.0
    });
    this.wetSoilMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2810,
      roughness: 0.7,
      metalness: 0.0
    });
    this.soilMesh = new THREE.Mesh(soilGeo, this.drySoilMaterial.clone());
    this.soilMesh.rotation.x = -Math.PI / 2;
    this.soilMesh.position.y = 0.02;
    this.soilMesh.receiveShadow = true;
    this.scene.add(this.soilMesh);

    const dividerMat = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      metalness: 0.5,
      roughness: 0.5
    });
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const dividerGeo = new THREE.BoxGeometry(0.08, 0.3, soilRadius);
      const divider = new THREE.Mesh(dividerGeo, dividerMat);
      divider.position.set(
        Math.cos(angle + Math.PI / 4) * soilRadius * 0.5,
        0.15,
        Math.sin(angle + Math.PI / 4) * soilRadius * 0.5
      );
      divider.rotation.y = -angle - Math.PI / 4;
      divider.castShadow = true;
      this.sectorDividers.push(divider);
      this.scene.add(divider);
    }
  }

  private createPlantZones(): void {
    const plantTypes: PlantType[] = ['tomato', 'lettuce', 'eggplant', 'pepper'];
    plantTypes.forEach((type, i) => {
      const zone = new THREE.Group();
      this.plantZones.set(type, zone);
      this.scene.add(zone);
    });
  }

  private createPlants(): void {
    const plantTypes: PlantType[] = ['tomato', 'lettuce', 'eggplant', 'pepper'];
    const soilRadius = 6.5;

    plantTypes.forEach((type, idx) => {
      const config = PLANT_CONFIGS[type];
      const group = new THREE.Group();
      const sectorAngle = Math.PI / 2;
      const sectorStart = idx * sectorAngle - Math.PI / 2;

      const positions: { x: number; z: number; scale: number }[] = [];
      for (let ring = 0; ring < 3; ring++) {
        const ringRadius = 1.5 + ring * 1.5;
        const count = 3 + ring * 2;
        for (let j = 0; j < count; j++) {
          const angle = sectorStart + (j + 0.5) / count * sectorAngle * 0.7 + sectorAngle * 0.15;
          const r = ringRadius + (Math.random() - 0.5) * 0.5;
          positions.push({
            x: Math.cos(angle) * r,
            z: Math.sin(angle) * r,
            scale: 0.7 + Math.random() * 0.5
          });
        }
      }

      const branches: THREE.Mesh[] = [];
      const leaves: THREE.Mesh[] = [];

      positions.forEach((pos) => {
        const plantGroup = new THREE.Group();
        plantGroup.position.set(pos.x, 0.05, pos.z);
        plantGroup.scale.setScalar(pos.scale);

        const stemMat = new THREE.MeshStandardMaterial({
          color: 0x2d5016,
          roughness: 0.8
        });
        const stemGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.5, 8);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.25;
        stem.castShadow = true;
        plantGroup.add(stem);
        branches.push(stem);

        for (let b = 0; b < 4; b++) {
          const branchAngle = (b / 4) * Math.PI * 2 + Math.random() * 0.3;
          const branchGroup = new THREE.Group();
          branchGroup.position.y = 0.2 + b * 0.08;
          plantGroup.add(branchGroup);

          const branchGeo = new THREE.CylinderGeometry(0.015, 0.025, 0.35, 6);
          const branch = new THREE.Mesh(branchGeo, stemMat.clone());
          branch.position.set(
            Math.cos(branchAngle) * 0.15,
            0.15,
            Math.sin(branchAngle) * 0.15
          );
          branch.rotation.z = Math.cos(branchAngle) * 0.4;
          branch.rotation.x = Math.sin(branchAngle) * 0.4;
          branch.castShadow = true;
          branchGroup.add(branch);
          branches.push(branch);

          const leafColor = new THREE.Color(
            config.baseColor.r / 255,
            config.baseColor.g / 255,
            config.baseColor.b / 255
          );
          const leafMat = new THREE.MeshStandardMaterial({
            color: leafColor,
            roughness: 0.6,
            side: THREE.DoubleSide
          });
          const leafGeo = new THREE.SphereGeometry(0.12, 8, 6);
          leafGeo.scale(1, 0.5, 1.5);
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.position.set(
            Math.cos(branchAngle) * 0.3,
            0.3,
            Math.sin(branchAngle) * 0.3
          );
          leaf.rotation.y = branchAngle;
          leaf.rotation.x = -0.3;
          leaf.castShadow = true;
          leaf.visible = false;
          branchGroup.add(leaf);
          leaves.push(leaf);

          if (type === 'tomato' || type === 'pepper' || type === 'eggplant') {
            const fruitMat = new THREE.MeshStandardMaterial({
              color: leafColor,
              roughness: 0.4
            });
            const fruitGeo = new THREE.SphereGeometry(type === 'eggplant' ? 0.1 : 0.08, 12, 10);
            const fruit = new THREE.Mesh(fruitGeo, fruitMat);
            fruit.position.set(
              Math.cos(branchAngle) * 0.25,
              0.2,
              Math.sin(branchAngle) * 0.25
            );
            fruit.visible = false;
            fruit.castShadow = true;
            branchGroup.add(fruit);
            leaves.push(fruit);
          }
        }

        group.add(plantGroup);
      });

      this.plants.set(type, { group, branches, leaves, type });
      this.plantZones.get(type)!.add(group);
    });
  }

  private createSunEffect(): void {
    const spotGeo = new THREE.CircleGeometry(1.2, 32);
    const spotMat = new THREE.MeshBasicMaterial({
      color: 0xfff8dc,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    this.spotLightMesh = new THREE.Mesh(spotGeo, spotMat);
    this.spotLightMesh.rotation.x = -Math.PI / 2;
    this.spotLightMesh.position.y = 0.03;
    this.scene.add(this.spotLightMesh);
  }

  private updatePlants(plantStates: Record<PlantType, PlantState>): void {
    (Object.keys(plantStates) as PlantType[]).forEach((type) => {
      const state = plantStates[type];
      const plantMesh = this.plants.get(type);
      if (!plantMesh) return;

      const config = PLANT_CONFIGS[type];
      const heightNorm = normalize(state.height, 0.1, config.maxHeight);
      const targetScale = 0.3 + heightNorm * 1.5;

      plantMesh.group.scale.y = lerp(plantMesh.group.scale.y, targetScale, 0.05);
      plantMesh.group.scale.x = lerp(plantMesh.group.scale.x, 0.7 + heightNorm * 0.5, 0.05);
      plantMesh.group.scale.z = lerp(plantMesh.group.scale.z, 0.7 + heightNorm * 0.5, 0.05);

      const visibleLeaves = Math.floor(state.branchIteration * plantMesh.leaves.length / 8);
      plantMesh.leaves.forEach((leaf, i) => {
        leaf.visible = i < visibleLeaves;
        if (leaf.visible) {
          const mat = leaf.material as THREE.MeshStandardMaterial;
          const baseColor = new THREE.Color(
            config.baseColor.r / 255,
            config.baseColor.g / 255,
            config.baseColor.b / 255
          );
          const desaturated = baseColor.clone().lerp(new THREE.Color(0x888888), 1 - state.colorSaturation);
          mat.color.copy(desaturated);
        }
      });
    });
  }

  private updateEnvironment(): void {
    if (this.domeMesh) {
      const mat = this.domeMesh.material as THREE.MeshPhysicalMaterial;
      const targetOpacity = 0.2 + this.targetShading * 0.5;
      this.currentGlassOpacity = lerp(this.currentGlassOpacity, targetOpacity, 0.05);
      mat.opacity = this.currentGlassOpacity;
    }

    this.shadingBlinds.forEach((blind) => {
      const targetScale = easeInOutQuad(this.targetShading);
      blind.scale.y = lerp(blind.scale.y, targetScale, 0.06);
    });

    if (this.soilMesh) {
      const mat = this.soilMesh.material as THREE.MeshStandardMaterial;
      const targetWetness = this.targetIrrigation;
      this.currentSoilWetness = lerp(this.currentSoilWetness, targetWetness, 0.04);

      const dryColor = this.drySoilMaterial!.color;
      const wetColor = this.wetSoilMaterial!.color;
      mat.color.copy(dryColor).lerp(wetColor, this.currentSoilWetness);
      mat.roughness = lerp(1.0, 0.7, this.currentSoilWetness);
    }
  }

  private updateSun(deltaTime: number): void {
    this.sunAngle += deltaTime * 0.05;
    if (this.sunPivot && this.sunLight) {
      this.sunPivot.rotation.y = this.sunAngle;
      const dayFactor = (Math.sin(this.sunAngle * 0.3) + 1) / 2;
      this.sunLight.intensity = lerp(0.4, 1.4, dayFactor);
      const warmColor = new THREE.Color(0xffe4b5);
      const coolColor = new THREE.Color(0xcce0ff);
      this.sunLight.color.copy(warmColor).lerp(coolColor, 1 - dayFactor);
    }

    if (this.spotLightMesh) {
      const radius = 4;
      this.spotLightMesh.position.x = Math.cos(this.sunAngle) * radius;
      this.spotLightMesh.position.z = Math.sin(this.sunAngle * 0.7) * radius * 0.8;
      this.spotLightMesh.scale.setScalar(1.5 + Math.sin(this.sunAngle * 2) * 0.3);
    }
  }

  private spawnWaterParticles(): void {
    if (this.targetIrrigation < 0.1) return;
    const spawnRate = Math.floor(this.targetIrrigation * 3);
    for (let i = 0; i < spawnRate; i++) {
      if (this.waterParticles.length > 150) break;

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 5.5;
      const mat = new THREE.MeshBasicMaterial({
        color: 0x66bbff,
        transparent: true,
        opacity: 0.8
      });
      const geo = new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 6, 6);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        Math.cos(angle) * radius,
        1.5 + Math.random() * 0.5,
        Math.sin(angle) * radius
      );
      this.scene.add(mesh);
      this.waterParticles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          -0.03 - Math.random() * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        life: 1.0,
        maxLife: 1.5 + Math.random()
      });
    }
  }

  private updateWaterParticles(deltaTime: number): void {
    for (let i = this.waterParticles.length - 1; i >= 0; i--) {
      const p = this.waterParticles[i];
      p.mesh.position.addScaledVector(p.velocity, deltaTime * 60);
      p.life -= deltaTime / p.maxLife;

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = p.life * 0.8;

      if (p.life <= 0 || p.mesh.position.y <= 0.05) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.waterParticles.splice(i, 1);
      }
    }
  }

  public updateSensorData(data: SensorData): void {
    this.sensorData = data;
  }

  public updateControlParams(params: ControlParams): void {
    this.controlParams = params;
    this.targetShading = clamp(params.shading / 100, 0, 1);
    this.targetIrrigation = clamp(params.irrigation / 100, 0, 1);
  }

  public updatePlantStates(states: Record<PlantType, PlantState>): void {
    this.plantStates = states;
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    this.lastTime += deltaTime;

    this.controls.update();
    this.updateSun(deltaTime);
    this.updateEnvironment();
    this.spawnWaterParticles();
    this.updateWaterParticles(deltaTime);

    if (this.plantStates) {
      this.updatePlants(this.plantStates);
    }

    this.renderer.render(this.scene, this.camera);
  };

  public start(): void {
    this.animate();
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.controls.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
