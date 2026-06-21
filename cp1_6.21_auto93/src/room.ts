import * as THREE from 'three';

export interface WallReflectivity {
  left: number;
  right: number;
  front: number;
  back: number;
  floor: number;
  ceiling: number;
}

export interface RoomConfig {
  width: number;
  depth: number;
  height: number;
}

export type WallName = 'left' | 'right' | 'front' | 'back' | 'floor' | 'ceiling';

export interface WallInfo {
  mesh: THREE.Mesh;
  name: WallName;
  label: string;
  originalMaterial: THREE.MeshPhysicalMaterial;
  labelSprite: THREE.Sprite;
}

export interface RoomData {
  group: THREE.Group;
  walls: WallInfo[];
  config: RoomConfig;
  reflectivity: WallReflectivity;
  getWallPlane: (name: WallName) => THREE.Plane;
  getBounds: () => { min: THREE.Vector3; max: THREE.Vector3 };
}

const MIN_DIM = 3;
const MAX_DIM = 15;

function createWoodFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8B7355';
  ctx.fillRect(0, 0, 512, 512);

  const plankHeight = 64;
  const colors = ['#8B7355', '#9C8164', '#A0826D', '#7A6448', '#8E7556'];
  for (let i = 0; i < 8; i++) {
    const y = i * plankHeight;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(0, y, 512, plankHeight - 2);

    for (let x = 0; x < 512; x += 32) {
      ctx.fillStyle = `rgba(70, 50, 30, ${0.05 + Math.random() * 0.1})`;
      ctx.fillRect(x + Math.random() * 10, y + 4, 2 + Math.random() * 20, plankHeight - 10);
    }

    ctx.strokeStyle = 'rgba(50, 40, 30, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + plankHeight - 1);
    ctx.lineTo(512, y + plankHeight - 1);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function createTextLabel(text: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(26, 26, 46, 0.85)';
  roundRect(ctx, 2, 2, 252, 60, 10);
  ctx.fill();

  ctx.strokeStyle = 'rgba(106, 183, 255, 0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, 2, 2, 252, 60, 10);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export class Room {
  private scene: THREE.Scene;
  public data!: RoomData;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.create({ width: 10, depth: 6, height: 4 });
  }

  public create(config: RoomConfig): RoomData {
    if (this.data) {
      this.scene.remove(this.data.group);
      this.data.walls.forEach((w) => {
        w.originalMaterial.dispose();
        w.mesh.geometry.dispose();
        w.labelSprite.material.dispose();
        if ((w.labelSprite.material as THREE.SpriteMaterial).map) {
          (w.labelSprite.material as THREE.SpriteMaterial).map!.dispose();
        }
      });
    }

    const group = new THREE.Group();
    const walls: WallInfo[] = [];
    const { width, depth, height } = config;
    const halfW = width / 2;
    const halfD = depth / 2;

    const floorTexture = createWoodFloorTexture();
    const edgeLineMaterial = new THREE.LineBasicMaterial({ color: 0x6ab7ff, transparent: true, opacity: 0.6 });

    const wallDefinitions: {
      name: WallName;
      label: string;
      size: THREE.Vector3;
      position: THREE.Vector3;
      rotation: THREE.Euler;
      materialProps: Partial<THREE.MeshPhysicalMaterialParameters>;
    }[] = [
      {
        name: 'floor',
        label: '地板',
        size: new THREE.Vector3(width, 0.05, depth),
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        materialProps: {
          color: 0xa0826d,
          map: floorTexture,
          roughness: 0.7,
          metalness: 0.05,
          transparent: true,
          opacity: 0.95,
          side: THREE.DoubleSide,
        },
      },
      {
        name: 'ceiling',
        label: '天花板',
        size: new THREE.Vector3(width, 0.05, depth),
        position: new THREE.Vector3(0, height, 0),
        rotation: new THREE.Euler(0, 0, 0),
        materialProps: {
          color: 0xf5f5f5,
          roughness: 0.95,
          metalness: 0,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
        },
      },
      {
        name: 'left',
        label: '左墙',
        size: new THREE.Vector3(0.05, height, depth),
        position: new THREE.Vector3(-width / 2, height / 2, 0),
        rotation: new THREE.Euler(0, 0, 0),
        materialProps: {
          color: 0x9a9ab0,
          roughness: 0.5,
          metalness: 0.1,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        },
      },
      {
        name: 'right',
        label: '右墙',
        size: new THREE.Vector3(0.05, height, depth),
        position: new THREE.Vector3(width / 2, height / 2, 0),
        rotation: new THREE.Euler(0, 0, 0),
        materialProps: {
          color: 0x9a9ab0,
          roughness: 0.5,
          metalness: 0.1,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        },
      },
      {
        name: 'back',
        label: '后墙',
        size: new THREE.Vector3(width, height, 0.05),
        position: new THREE.Vector3(0, height / 2, -depth / 2),
        rotation: new THREE.Euler(0, 0, 0),
        materialProps: {
          color: 0x9a9ab0,
          roughness: 0.5,
          metalness: 0.1,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        },
      },
      {
        name: 'front',
        label: '前墙',
        size: new THREE.Vector3(width, height, 0.05),
        position: new THREE.Vector3(0, height / 2, depth / 2),
        rotation: new THREE.Euler(0, 0, 0),
        materialProps: {
          color: 0x9a9ab0,
          roughness: 0.5,
          metalness: 0.1,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        },
      },
    ];

    wallDefinitions.forEach((def) => {
      const geometry = new THREE.BoxGeometry(def.size.x, def.size.y, def.size.z);
      const material = new THREE.MeshPhysicalMaterial(def.materialProps);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(def.position);
      mesh.rotation.copy(def.rotation);
      mesh.userData.wallName = def.name;
      group.add(mesh);

      const edges = new THREE.EdgesGeometry(geometry);
      const edgeLine = new THREE.LineSegments(edges, edgeLineMaterial);
      edgeLine.position.copy(def.position);
      edgeLine.rotation.copy(def.rotation);
      group.add(edgeLine);

      const labelTexture = createTextLabel(def.label);
      const labelMaterial = new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true,
        depthTest: false,
      });
      const labelSprite = new THREE.Sprite(labelMaterial);
      labelSprite.scale.set(1.5, 0.375, 1);

      const halfW = width / 2;
      const halfD = depth / 2;
      const labelOffset = 0.5;
      switch (def.name) {
        case 'left':
          labelSprite.position.set(-halfW - labelOffset, height / 2, 0);
          break;
        case 'right':
          labelSprite.position.set(halfW + labelOffset, height / 2, 0);
          break;
        case 'front':
          labelSprite.position.set(0, height / 2, halfD + labelOffset);
          break;
        case 'back':
          labelSprite.position.set(0, height / 2, -halfD - labelOffset);
          break;
        case 'floor':
          labelSprite.position.set(0, -labelOffset, halfD * 0.7);
          break;
        case 'ceiling':
          labelSprite.position.set(0, height + labelOffset, halfD * 0.7);
          break;
      }
      group.add(labelSprite);

      walls.push({
        mesh,
        name: def.name,
        label: def.label,
        originalMaterial: material,
        labelSprite,
      });
    });

    const gridHelper = new THREE.GridHelper(Math.max(width, depth), 20, 0x3a4a6a, 0x2a3a5a);
    gridHelper.position.y = 0.026;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    group.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(1);
    axesHelper.position.set(-halfW + 0.1, 0.03, -halfD + 0.1);
    group.add(axesHelper);

    this.scene.add(group);

    const reflectivity: WallReflectivity = {
      left: 0.75,
      right: 0.75,
      front: 0.75,
      back: 0.75,
      floor: 0.6,
      ceiling: 0.8,
    };

    this.data = {
      group,
      walls,
      config: { ...config },
      reflectivity,
      getWallPlane: (name: WallName) => this.getWallPlane(name, config),
      getBounds: () => ({
        min: new THREE.Vector3(-width / 2, 0, -depth / 2),
        max: new THREE.Vector3(width / 2, height, depth / 2),
      }),
    };

    return this.data;
  }

  private getWallPlane(name: WallName, config: RoomConfig): THREE.Plane {
    const { width, depth, height } = config;
    const halfW = width / 2;
    const halfD = depth / 2;

    switch (name) {
      case 'left':
        return new THREE.Plane(new THREE.Vector3(-1, 0, 0), halfW);
      case 'right':
        return new THREE.Plane(new THREE.Vector3(1, 0, 0), halfW);
      case 'front':
        return new THREE.Plane(new THREE.Vector3(0, 0, 1), halfD);
      case 'back':
        return new THREE.Plane(new THREE.Vector3(0, 0, -1), halfD);
      case 'floor':
        return new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
      case 'ceiling':
        return new THREE.Plane(new THREE.Vector3(0, 1, 0), -height);
    }
  }

  public getAllPlanes(): { name: WallName; plane: THREE.Plane }[] {
    return (['left', 'right', 'front', 'back', 'floor', 'ceiling'] as WallName[]).map((name) => ({
      name,
      plane: this.data.getWallPlane(name),
    }));
  }

  public highlightWall(name: WallName | null): void {
    this.data.walls.forEach((w) => {
      const mat = w.mesh.material as THREE.MeshPhysicalMaterial;
      if (name === w.name) {
        mat.color.lerp(new THREE.Color(0x44ff88), 0.6);
        mat.opacity = w.name === 'floor' || w.name === 'ceiling' ? 0.9 : 0.55;
      } else {
        mat.color.copy(w.originalMaterial.color);
        mat.opacity = w.originalMaterial.opacity;
      }
      mat.needsUpdate = true;
    });
  }

  public static clampConfig(config: Partial<RoomConfig>): RoomConfig {
    return {
      width: Math.min(MAX_DIM, Math.max(MIN_DIM, config.width ?? 10)),
      depth: Math.min(MAX_DIM, Math.max(MIN_DIM, config.depth ?? 6)),
      height: Math.min(MAX_DIM, Math.max(MIN_DIM, config.height ?? 4)),
    };
  }

  public static get MIN_DIM(): number { return MIN_DIM; }
  public static get MAX_DIM(): number { return MAX_DIM; }
}
