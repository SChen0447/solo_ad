import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

export type BuildingStyle = 'modern' | 'vintage' | 'cyber';

export interface BuildingConfig {
  density: number;
  style: BuildingStyle;
}

interface BuildingData {
  mesh: THREE.Mesh;
  targetHeight: number;
  currentHeight: number;
  targetOpacity: number;
  falling: boolean;
  fallSpeed: number;
  fallRotation: THREE.Euler;
  twinkling: boolean;
  twinkleTime: number;
  lightMesh: THREE.Mesh | null;
}

const STYLE_COLORS: Record<BuildingStyle, THREE.Color[]> = {
  modern: [
    new THREE.Color(0x5a7a9a),
    new THREE.Color(0x4a6a8a),
    new THREE.Color(0x6a8aaa),
    new THREE.Color(0x3a5a7a),
    new THREE.Color(0x7a9aba),
  ],
  vintage: [
    new THREE.Color(0xd4c5a0),
    new THREE.Color(0xc4b590),
    new THREE.Color(0xe4d5b0),
    new THREE.Color(0xb4a580),
    new THREE.Color(0xdcc89a),
  ],
  cyber: [
    new THREE.Color(0xaa44cc),
    new THREE.Color(0xcc44aa),
    new THREE.Color(0x8844ee),
    new THREE.Color(0xee44aa),
    new THREE.Color(0xbb55dd),
  ],
};

const LIGHT_COLORS: Record<BuildingStyle, THREE.Color> = {
  modern: new THREE.Color(0xaaccff),
  vintage: new THREE.Color(0xffeeaa),
  cyber: new THREE.Color(0xff44ff),
};

const GROUND_RADIUS = 100;
const MIN_HEIGHT = 10;
const MAX_HEIGHT = 80;
const MIN_WIDTH = 2;
const MAX_WIDTH = 5;

export class BuildingFactory {
  private buildings: BuildingData[] = [];
  private buildingGroup: THREE.Group;
  private style: BuildingStyle = 'modern';

  constructor(parentGroup: THREE.Group) {
    this.buildingGroup = new THREE.Group();
    parentGroup.add(this.buildingGroup);
  }

  generateBuildings(config: BuildingConfig): void {
    this.style = config.style;
    const targetCount = Math.floor(config.density * 400);

    const positions = this.generateNonOverlappingPositions(targetCount);

    const existing = this.buildings.slice();
    const toRemove = existing.length > targetCount
      ? existing.slice(targetCount)
      : [];
    const toKeep = existing.length > targetCount
      ? existing.slice(0, targetCount)
      : existing.slice();
    const toAdd = targetCount - toKeep.length;

    for (const b of toRemove) {
      this.collapseBuilding(b);
    }

    for (let i = 0; i < toKeep.length; i++) {
      const pos = positions[i];
      if (pos) {
        this.restyleBuilding(toKeep[i], pos, config.style);
      }
    }

    for (let i = 0; i < toAdd; i++) {
      const idx = toKeep.length + i;
      const pos = positions[idx];
      if (pos) {
        this.addBuilding(pos, config.style);
      }
    }
  }

  updateStyle(style: BuildingStyle): void {
    this.style = style;
    for (const b of this.buildings) {
      if (!b.falling) {
        this.restyleBuilding(b, new THREE.Vector3().copy(b.mesh.position), style);
      }
    }
  }

  setTwinkling(active: boolean): void {
    for (const b of this.buildings) {
      b.twinkling = active;
      b.twinkleTime = 0;
    }
  }

  update(delta: number): void {
    const toRemove: number[] = [];

    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i];

      if (b.falling) {
        b.fallSpeed += delta * 30;
        b.mesh.position.y -= b.fallSpeed * delta;
        b.mesh.rotation.x += b.fallRotation.x * delta;
        b.mesh.rotation.z += b.fallRotation.z * delta;
        const mat = b.mesh.material as THREE.MeshPhongMaterial;
        mat.opacity -= delta * 1.5;
        if (mat.opacity <= 0) {
          this.buildingGroup.remove(b.mesh);
          if (b.lightMesh) this.buildingGroup.remove(b.lightMesh);
          toRemove.push(i);
        }
        continue;
      }

      if (b.currentHeight < b.targetHeight) {
        b.currentHeight += (b.targetHeight - b.currentHeight) * Math.min(1, delta * 3);
        if (b.targetHeight - b.currentHeight < 0.1) {
          b.currentHeight = b.targetHeight;
        }
        b.mesh.scale.y = b.currentHeight / b.targetHeight;
        if (b.lightMesh) {
          b.lightMesh.position.y = b.currentHeight + 0.5;
        }
      }

      const mat = b.mesh.material as THREE.MeshPhongMaterial;
      if (mat.opacity < b.targetOpacity) {
        mat.opacity = Math.min(b.targetOpacity, mat.opacity + delta * 2);
      }

      if (b.twinkling && b.lightMesh) {
        b.twinkleTime += delta;
        const intensity = 0.3 + 0.7 * Math.abs(Math.sin(b.twinkleTime * (3 + Math.random() * 2)));
        const lm = b.lightMesh.material as THREE.MeshBasicMaterial;
        lm.opacity = intensity;
        b.lightMesh.position.y = b.currentHeight + 0.5;
      }
    }

    for (const idx of toRemove) {
      this.buildings.splice(idx, 1);
    }
  }

  getBuildingCount(): number {
    return this.buildings.filter(b => !b.falling).length;
  }

  private generateNonOverlappingPositions(count: number): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const occupied: { x: number; z: number; r: number }[] = [];
    let attempts = 0;
    const maxAttempts = count * 20;

    while (positions.length < count && attempts < maxAttempts) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (GROUND_RADIUS - 10);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const height = MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT);
      const widthScale = MIN_WIDTH + (height - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT) * (MAX_WIDTH - MIN_WIDTH);
      const halfW = widthScale / 2 + 1;

      let overlaps = false;
      for (const occ of occupied) {
        const dx = x - occ.x;
        const dz = z - occ.z;
        const minDist = halfW + occ.r;
        if (dx * dx + dz * dz < minDist * minDist) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        positions.push(new THREE.Vector3(x, 0, z));
        occupied.push({ x, z, r: halfW });
      }
    }

    return positions;
  }

  private addBuilding(position: THREE.Vector3, style: BuildingStyle): void {
    const height = MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT);
    const widthScale = MIN_WIDTH + (height - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT) * (MAX_WIDTH - MIN_WIDTH);

    const geometry = new THREE.BoxGeometry(widthScale, height, widthScale);
    geometry.translate(0, height / 2, 0);

    const colors = STYLE_COLORS[style];
    const color = colors[Math.floor(Math.random() * colors.length)].clone();

    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: 0,
      shininess: style === 'cyber' ? 100 : 40,
      emissive: style === 'cyber' ? color.clone().multiplyScalar(0.15) : new THREE.Color(0x000000),
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.buildingGroup.add(mesh);

    const lightColor = LIGHT_COLORS[style];
    const lightGeo = new THREE.SphereGeometry(0.3, 6, 6);
    const lightMat = new THREE.MeshBasicMaterial({
      color: lightColor,
      transparent: true,
      opacity: 0,
    });
    const lightMesh = new THREE.Mesh(lightGeo, lightMat);
    lightMesh.position.set(position.x, height + 0.5, position.z);
    this.buildingGroup.add(lightMesh);

    const data: BuildingData = {
      mesh,
      targetHeight: height,
      currentHeight: 0.1,
      targetOpacity: 1,
      falling: false,
      fallSpeed: 0,
      fallRotation: new THREE.Euler(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
      ),
      twinkling: false,
      twinkleTime: 0,
      lightMesh,
    };

    mesh.scale.y = 0.1 / height;
    this.buildings.push(data);
  }

  private collapseBuilding(b: BuildingData): void {
    b.falling = true;
    b.fallSpeed = 0;
    b.fallRotation = new THREE.Euler(
      (Math.random() - 0.5) * 4,
      0,
      (Math.random() - 0.5) * 4
    );
  }

  private restyleBuilding(
    b: BuildingData,
    _position: THREE.Vector3,
    style: BuildingStyle
  ): void {
    const colors = STYLE_COLORS[style];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = b.mesh.material as THREE.MeshPhongMaterial;

    new TWEEN.Tween(mat.color)
      .to({ r: color.r, g: color.g, b: color.b }, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .start();

    if (style === 'cyber') {
      mat.shininess = 100;
      new TWEEN.Tween(mat.emissive)
        .to({ r: color.r * 0.15, g: color.g * 0.15, b: color.b * 0.15 }, 1000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();
    } else {
      mat.shininess = 40;
      new TWEEN.Tween(mat.emissive)
        .to({ r: 0, g: 0, b: 0 }, 1000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();
    }

    if (b.lightMesh) {
      const lightColor = LIGHT_COLORS[style];
      const lMat = b.lightMesh.material as THREE.MeshBasicMaterial;
      new TWEEN.Tween(lMat.color)
        .to({ r: lightColor.r, g: lightColor.g, b: lightColor.b }, 1000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();
    }
  }
}
