import * as THREE from 'three';
import gsap from 'gsap';
import { Building, BuildingType, ERAS, getBuildingHeight } from '../data/BuildingData';

interface BuildingMesh {
  group: THREE.Group;
  base: THREE.Mesh;
  body: THREE.Mesh;
  data: Building;
  currentHeight: number;
  isHovered: boolean;
  originalY: number;
}

const COLORS: Record<BuildingType, { light: number; dark: number }> = {
  commercial: { light: 0x6B5B95, dark: 0x4B3F72 },
  residential: { light: 0xFFA07A, dark: 0xE07B4A },
  public: { light: 0x3CB371, dark: 0x228B22 }
};

export class BuildingRenderer {
  private scene: THREE.Scene;
  private buildingMeshes: Map<string, BuildingMesh> = new Map();
  private buildingGroup: THREE.Group;
  private currentEra: number = 1990;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredBuilding: BuildingMesh | null = null;
  private labelContainer: HTMLElement;
  private labelElement: HTMLElement | null = null;
  private camera: THREE.Camera;

  public onBuildingClick: ((building: Building) => void) | null = null;

  constructor(
    scene: THREE.Scene,
    buildings: Building[],
    labelContainer: HTMLElement,
    camera: THREE.Camera
  ) {
    this.scene = scene;
    this.labelContainer = labelContainer;
    this.camera = camera;
    this.buildingGroup = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.createBuildings(buildings);
    this.scene.add(this.buildingGroup);

    this.createLabel();
  }

  private createBuildings(buildings: Building[]): void {
    const baseGeometry = new THREE.BoxGeometry(3.2, 0.5, 3.2);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0d0d0,
      roughness: 0.8,
      metalness: 0.1
    });

    buildings.forEach(building => {
      const group = new THREE.Group();
      group.position.set(building.x, 0, building.z);
      group.userData.buildingId = building.id;

      const base = new THREE.Mesh(baseGeometry, baseMaterial.clone());
      base.position.y = 0.25;
      base.receiveShadow = true;
      base.castShadow = true;
      group.add(base);

      const bodyHeight = 0.1;
      const bodyGeometry = new THREE.BoxGeometry(3, bodyHeight, 3);
      const color = this.getBuildingColor(building.type);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.5,
        metalness: 0.2
      });

      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.5 + bodyHeight / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.buildingId = building.id;
      group.add(body);

      const buildingMesh: BuildingMesh = {
        group,
        base,
        body,
        data: building,
        currentHeight: 0,
        isHovered: false,
        originalY: 0
      };

      this.buildingMeshes.set(building.id, buildingMesh);
      this.buildingGroup.add(group);
    });

    this.updateBuildingsForEra(1990, false);
  }

  private getBuildingColor(type: BuildingType): number {
    return COLORS[type].light;
  }

  public updateBuildingsForEra(era: number, animate: boolean = true): void {
    this.currentEra = era;

    this.buildingMeshes.forEach((bm, id) => {
      const targetHeight = getBuildingHeight(bm.data, era);

      if (animate) {
        this.animateBuildingHeight(bm, targetHeight, 2);
        this.animateBuildingColor(bm, era, 1);
      } else {
        this.setBuildingHeight(bm, targetHeight);
        this.setBuildingColor(bm, era);
      }
    });
  }

  private setBuildingHeight(bm: BuildingMesh, height: number): void {
    bm.currentHeight = height;
    const visibleHeight = Math.max(height, 0.01);

    bm.body.scale.y = visibleHeight / 3;
    bm.body.position.y = 0.5 + visibleHeight / 2;

    bm.group.visible = height > 0.01;
  }

  private animateBuildingHeight(bm: BuildingMesh, targetHeight: number, duration: number): void {
    const obj = { height: bm.currentHeight };

    const wasVisible = bm.currentHeight > 0.01;
    const willBeVisible = targetHeight > 0.01;

    if (!wasVisible && willBeVisible) {
      bm.group.visible = true;
      bm.group.scale.setScalar(0.8);
      gsap.to(bm.group.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: duration * 0.6,
        ease: 'back.out(1.2)'
      });
    }

    gsap.to(obj, {
      height: targetHeight,
      duration: duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const visibleHeight = Math.max(obj.height, 0.01);
        bm.body.scale.y = visibleHeight / 3;
        bm.body.position.y = 0.5 + visibleHeight / 2;
        bm.currentHeight = obj.height;
      },
      onComplete: () => {
        if (targetHeight <= 0.01) {
          bm.group.visible = false;
        }
      }
    });
  }

  private setBuildingColor(bm: BuildingMesh, era: number): void {
    const colorFactor = this.getColorFactor(era, bm.data.buildYear);
    const baseColor = COLORS[bm.data.type];
    const color = this.interpolateColor(baseColor.dark, baseColor.light, colorFactor);
    (bm.body.material as THREE.MeshStandardMaterial).color.setHex(color);
  }

  private animateBuildingColor(bm: BuildingMesh, era: number, duration: number): void {
    const material = bm.body.material as THREE.MeshStandardMaterial;
    const startColor = material.color.clone();

    const colorFactor = this.getColorFactor(era, bm.data.buildYear);
    const baseColor = COLORS[bm.data.type];
    const targetColorHex = this.interpolateColor(baseColor.dark, baseColor.light, colorFactor);
    const targetColor = new THREE.Color(targetColorHex);

    const obj = { t: 0 };
    gsap.to(obj, {
      t: 1,
      duration: duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        material.color.copy(startColor).lerp(targetColor, obj.t);
      }
    });
  }

  private getColorFactor(era: number, buildYear: number): number {
    if (buildYear > era) return 0;
    const yearsSince = era - buildYear;
    return Math.min(yearsSince / 40, 1);
  }

  private interpolateColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 255;
    const g1 = (color1 >> 8) & 255;
    const b1 = color1 & 255;

    const r2 = (color2 >> 16) & 255;
    const g2 = (color2 >> 8) & 255;
    const b2 = color2 & 255;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  private createLabel(): void {
    this.labelElement = document.createElement('div');
    this.labelElement.className = 'building-label';
    this.labelContainer.appendChild(this.labelElement);
  }

  public updateRaycaster(
    clientX: number,
    clientY: number,
    clientWidth: number,
    clientHeight: number
  ): Building | null {
    this.mouse.x = (clientX / clientWidth) * 2 - 1;
    this.mouse.y = -(clientY / clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const bodies: THREE.Mesh[] = [];
    this.buildingMeshes.forEach(bm => {
      if (bm.group.visible) {
        bodies.push(bm.body);
      }
    });

    const intersects = this.raycaster.intersectObjects(bodies);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const buildingId = mesh.userData.buildingId;
      const bm = this.buildingMeshes.get(buildingId);
      if (bm) {
        return bm.data;
      }
    }

    return null;
  }

  public setHoveredBuilding(building: Building | null): void {
    if (this.hoveredBuilding?.data.id === building?.id) return;

    if (this.hoveredBuilding) {
      this.removeHoverEffect(this.hoveredBuilding);
    }

    if (building) {
      const bm = this.buildingMeshes.get(building.id);
      if (bm && bm.group.visible) {
        this.hoveredBuilding = bm;
        this.addHoverEffect(bm);
        this.showLabel(bm);
      }
    } else {
      this.hoveredBuilding = null;
      this.hideLabel();
    }
  }

  private addHoverEffect(bm: BuildingMesh): void {
    if (bm.isHovered) return;
    bm.isHovered = true;
    bm.originalY = bm.group.position.y;

    gsap.to(bm.group.position, {
      y: bm.originalY + 0.5,
      duration: 0.2,
      ease: 'power2.out'
    });

    const material = bm.body.material as THREE.MeshStandardMaterial;
    gsap.to(material.emissive, {
      r: 0.1,
      g: 0.1,
      b: 0.15,
      duration: 0.2
    });
  }

  private removeHoverEffect(bm: BuildingMesh): void {
    if (!bm.isHovered) return;
    bm.isHovered = false;

    gsap.to(bm.group.position, {
      y: bm.originalY,
      duration: 0.2,
      ease: 'power2.in'
    });

    const material = bm.body.material as THREE.MeshStandardMaterial;
    gsap.to(material.emissive, {
      r: 0,
      g: 0,
      b: 0,
      duration: 0.2
    });
  }

  private showLabel(bm: BuildingMesh): void {
    if (!this.labelElement) return;

    this.labelElement.textContent = bm.data.name;
    this.labelElement.classList.add('visible');
    this.updateLabelPosition(bm);
  }

  private hideLabel(): void {
    if (this.labelElement) {
      this.labelElement.classList.remove('visible');
    }
  }

  public updateLabelPosition(bm?: BuildingMesh): void {
    if (!this.labelElement || !bm || !this.labelElement.classList.contains('visible')) {
      if (this.hoveredBuilding) {
        this.updateLabelPositionForMesh(this.hoveredBuilding);
      }
      return;
    }
    this.updateLabelPositionForMesh(bm);
  }

  private updateLabelPositionForMesh(bm: BuildingMesh): void {
    if (!this.labelElement) return;

    const topPosition = new THREE.Vector3(
      bm.group.position.x,
      0.5 + bm.currentHeight + 1,
      bm.group.position.z
    );

    const screenPos = topPosition.clone().project(this.camera);

    const rect = this.labelContainer.getBoundingClientRect();
    const x = (screenPos.x + 1) / 2 * rect.width;
    const y = (-screenPos.y + 1) / 2 * rect.height;

    this.labelElement.style.left = `${x}px`;
    this.labelElement.style.top = `${y}px`;
  }

  public getBuildingMeshById(id: string): BuildingMesh | undefined {
    return this.buildingMeshes.get(id);
  }

  public getCurrentEra(): number {
    return this.currentEra;
  }
}
