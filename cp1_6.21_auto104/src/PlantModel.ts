import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

export type PlantSpecies = 'pothos' | 'monstera' | 'snakePlant' | 'fiddleLeaf' | 'succulent';

export type StatusRating = 'excellent' | 'normal' | 'warning' | 'danger';

export interface PlantConfig {
  species: PlantSpecies;
  name: string;
  idealLightMin: number;
  idealLightMax: number;
  baseSize: number;
  leafCount: number;
  colorHealthy: number;
  colorStressed: number;
}

export interface PlantState {
  size: number;
  leafDensity: number;
  color: THREE.Color;
  droopAmount: number;
  swayAmount: number;
  receivedLight: number;
  status: StatusRating;
}

export const PLANT_CONFIGS: Record<PlantSpecies, PlantConfig> = {
  pothos: {
    species: 'pothos',
    name: '绿萝',
    idealLightMin: 50,
    idealLightMax: 150,
    baseSize: 0.6,
    leafCount: 12,
    colorHealthy: 0x66BB6A,
    colorStressed: 0x8D6E63,
  },
  monstera: {
    species: 'monstera',
    name: '龟背竹',
    idealLightMin: 100,
    idealLightMax: 200,
    baseSize: 0.9,
    leafCount: 8,
    colorHealthy: 0x4CAF50,
    colorStressed: 0x795548,
  },
  snakePlant: {
    species: 'snakePlant',
    name: '虎尾兰',
    idealLightMin: 50,
    idealLightMax: 250,
    baseSize: 0.7,
    leafCount: 10,
    colorHealthy: 0x81C784,
    colorStressed: 0x9E9D24,
  },
  fiddleLeaf: {
    species: 'fiddleLeaf',
    name: '琴叶榕',
    idealLightMin: 150,
    idealLightMax: 300,
    baseSize: 1.2,
    leafCount: 14,
    colorHealthy: 0x388E3C,
    colorStressed: 0x6D4C41,
  },
  succulent: {
    species: 'succulent',
    name: '多肉',
    idealLightMin: 200,
    idealLightMax: 400,
    baseSize: 0.4,
    leafCount: 20,
    colorHealthy: 0xA5D6A7,
    colorStressed: 0xBCAAA4,
  },
};

export class Plant {
  public id: string;
  public config: PlantConfig;
  public group: THREE.Group;
  public position: THREE.Vector3;
  public targetState: PlantState;
  public currentState: PlantState;
  public labelElement: HTMLElement | null;

  private leaves: THREE.Mesh[] = [];
  private potMesh: THREE.Mesh;
  private stemGroup: THREE.Group;
  private leafBaseColors: THREE.Color[] = [];

  constructor(species: PlantSpecies, position: THREE.Vector3) {
    this.id = uuidv4();
    this.config = PLANT_CONFIGS[species];
    this.position = position.clone();
    this.labelElement = null;

    this.group = new THREE.Group();
    this.group.position.copy(position);

    this.stemGroup = new THREE.Group();
    this.group.add(this.stemGroup);

    this.potMesh = this.createPot();
    this.group.add(this.potMesh);

    this.createLeaves();

    this.targetState = this.createInitialState();
    this.currentState = this.createInitialState();
  }

  private createPot(): THREE.Mesh {
    const potGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.25, 8);
    const potMaterial = new THREE.MeshLambertMaterial({
      color: 0x8D6E63,
      flatShading: true,
    });
    const pot = new THREE.Mesh(potGeometry, potMaterial);
    pot.position.y = 0.125;
    pot.castShadow = true;
    return pot;
  }

  private createLeaves(): void {
    const { species, baseSize, leafCount, colorHealthy } = this.config;
    const healthyColor = new THREE.Color(colorHealthy);

    for (let i = 0; i < leafCount; i++) {
      let leafGeometry: THREE.BufferGeometry;
      let leafMaterial: THREE.MeshLambertMaterial;

      switch (species) {
        case 'pothos':
          leafGeometry = new THREE.SphereGeometry(0.08 * baseSize, 6, 4);
          leafGeometry.scale(1, 0.4, 1.5);
          break;
        case 'monstera':
          leafGeometry = new THREE.CircleGeometry(0.15 * baseSize, 7);
          leafGeometry.rotateX(-Math.PI / 2);
          break;
        case 'snakePlant':
          leafGeometry = new THREE.BoxGeometry(0.03 * baseSize, 0.3 * baseSize, 0.08 * baseSize);
          break;
        case 'fiddleLeaf':
          leafGeometry = new THREE.SphereGeometry(0.12 * baseSize, 6, 5);
          leafGeometry.scale(1, 0.3, 0.8);
          break;
        case 'succulent':
          leafGeometry = new THREE.ConeGeometry(0.06 * baseSize, 0.15 * baseSize, 5);
          break;
        default:
          leafGeometry = new THREE.SphereGeometry(0.1 * baseSize, 6, 5);
      }

      leafMaterial = new THREE.MeshLambertMaterial({
        color: healthyColor.clone(),
        flatShading: true,
        side: THREE.DoubleSide,
      });

      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      leaf.castShadow = true;

      const angle = (i / leafCount) * Math.PI * 2;
      const radius = 0.1 + Math.random() * 0.1;
      const height = 0.3 + Math.random() * 0.4;

      if (species === 'snakePlant') {
        leaf.position.set(
          Math.cos(angle) * radius * 0.3,
          height * baseSize * 0.5,
          Math.sin(angle) * radius * 0.3
        );
        leaf.rotation.y = angle + Math.random() * 0.3;
      } else if (species === 'succulent') {
        leaf.position.set(
          Math.cos(angle) * radius * 0.5,
          0.25 + Math.sin(i * 0.5) * 0.05,
          Math.sin(angle) * radius * 0.5
        );
        leaf.rotation.x = Math.PI / 4 + Math.random() * 0.2;
        leaf.rotation.y = angle;
        leaf.rotation.z = Math.random() * 0.2;
      } else {
        leaf.position.set(
          Math.cos(angle) * radius,
          height * baseSize,
          Math.sin(angle) * radius
        );
        leaf.rotation.y = angle + Math.random() * 0.5;
        leaf.rotation.x = -Math.PI / 4 + Math.random() * 0.3;
        leaf.rotation.z = Math.random() * 0.2 - 0.1;
      }

      this.leaves.push(leaf);
      this.leafBaseColors.push(healthyColor.clone());
      this.stemGroup.add(leaf);
    }

    this.stemGroup.position.y = 0.25;
  }

  private createInitialState(): PlantState {
    return {
      size: this.config.baseSize,
      leafDensity: 1,
      color: new THREE.Color(this.config.colorHealthy),
      droopAmount: 0,
      swayAmount: 0.02,
      receivedLight: 100,
      status: 'normal',
    };
  }

  public updateTargetState(lightIntensity: number): void {
    const { idealLightMin, idealLightMax } = this.config;
    const idealMid = (idealLightMin + idealLightMax) / 2;
    const idealRange = idealLightMax - idealLightMin;

    this.targetState.receivedLight = Math.round(lightIntensity);

    let healthFactor: number;
    if (lightIntensity >= idealLightMin && lightIntensity <= idealLightMax) {
      const distFromMid = Math.abs(lightIntensity - idealMid) / (idealRange / 2);
      healthFactor = 1 - distFromMid * 0.3;
      this.targetState.status = distFromMid < 0.5 ? 'excellent' : 'normal';
    } else if (lightIntensity < idealLightMin) {
      const deficit = idealLightMin - lightIntensity;
      healthFactor = Math.max(0.2, 1 - (deficit / idealLightMin) * 1.5);
      this.targetState.status = deficit < idealLightMin * 0.3 ? 'warning' : 'danger';
    } else {
      const excess = lightIntensity - idealLightMax;
      healthFactor = Math.max(0.3, 1 - (excess / idealLightMax) * 0.8);
      this.targetState.status = excess < idealLightMax * 0.5 ? 'warning' : 'danger';
    }

    this.targetState.size = this.config.baseSize * (0.7 + healthFactor * 0.5);
    this.targetState.leafDensity = 0.5 + healthFactor * 0.5;

    const healthyColor = new THREE.Color(this.config.colorHealthy);
    const stressedColor = new THREE.Color(this.config.colorStressed);
    this.targetState.color = stressedColor.clone().lerp(healthyColor, healthFactor);

    if (lightIntensity < idealLightMin) {
      this.targetState.droopAmount = ((idealLightMin - lightIntensity) / idealLightMin) * 0.5;
      this.targetState.swayAmount = 0.005;
    } else {
      this.targetState.droopAmount = 0;
      this.targetState.swayAmount = 0.01 + healthFactor * 0.02;
    }
  }

  public updateCurrentState(deltaTime: number): void {
    const easeSpeed = 1 / 2;
    const t = 1 - Math.exp(-easeSpeed * deltaTime);

    this.currentState.size += (this.targetState.size - this.currentState.size) * t;
    this.currentState.leafDensity += (this.targetState.leafDensity - this.currentState.leafDensity) * t;
    this.currentState.droopAmount += (this.targetState.droopAmount - this.currentState.droopAmount) * t;
    this.currentState.swayAmount += (this.targetState.swayAmount - this.currentState.swayAmount) * t;
    this.currentState.color.lerp(this.targetState.color, t);
    this.currentState.receivedLight = this.targetState.receivedLight;
    this.currentState.status = this.targetState.status;
  }

  public applyVisualState(time: number): void {
    this.group.scale.setScalar(this.currentState.size);

    for (let i = 0; i < this.leaves.length; i++) {
      const leaf = this.leaves[i];
      const material = leaf.material as THREE.MeshLambertMaterial;
      material.color.copy(this.currentState.color);

      const swayOffset = i * 0.5;
      const swayX = Math.sin(time * 1.5 + swayOffset) * this.currentState.swayAmount;
      const swayZ = Math.cos(time * 1.2 + swayOffset) * this.currentState.swayAmount * 0.7;
      
      leaf.rotation.x = -Math.PI / 4 + swayX - this.currentState.droopAmount * 0.5;
      leaf.rotation.z = swayZ - this.currentState.droopAmount * 0.3;
    }

    this.stemGroup.rotation.x = -this.currentState.droopAmount * 0.2;
  }

  public getHeight(): number {
    return this.config.baseSize * this.currentState.size * 1.2;
  }
}
