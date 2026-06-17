import * as THREE from 'three';

export type RoomShape = 'rectangle' | 'lshape' | 'circle';

export interface WallPlane {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  width: number;
  height: number;
  mesh: THREE.Mesh;
}

export class RoomManager {
  private scene: THREE.Scene;
  private currentShape: RoomShape = 'rectangle';
  private roomGroup: THREE.Group = new THREE.Group();
  private walls: WallPlane[] = [];
  private floor!: THREE.Mesh;

  private readonly wallMaterial: THREE.MeshStandardMaterial;
  private readonly floorMaterial: THREE.MeshStandardMaterial;

  private readonly roomSize = 10;
  private readonly roomHeight = 4;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    this.wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x6688aa,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1
    });

    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3a4a,
      roughness: 0.9,
      metalness: 0.0
    });

    this.scene.add(this.roomGroup);
    this.createRoom(this.currentShape);
  }

  public getWalls(): WallPlane[] {
    return this.walls;
  }

  public getRoomSize(): number {
    return this.roomSize;
  }

  public getRoomHeight(): number {
    return this.roomHeight;
  }

  public getCurrentShape(): RoomShape {
    return this.currentShape;
  }

  public setShape(shape: RoomShape): void {
    if (this.currentShape === shape) return;
    this.currentShape = shape;
    this.clearRoom();
    this.createRoom(shape);
  }

  private clearRoom(): void {
    while (this.roomGroup.children.length > 0) {
      const child = this.roomGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
      this.roomGroup.remove(child);
    }
    this.walls = [];
  }

  private createRoom(shape: RoomShape): void {
    switch (shape) {
      case 'rectangle':
        this.createRectangleRoom();
        break;
      case 'lshape':
        this.createLShapeRoom();
        break;
      case 'circle':
        this.createCircleRoom();
        break;
    }
    this.createFloor();
  }

  private createFloor(): void {
    const floorGeometry = new THREE.PlaneGeometry(this.roomSize * 2, this.roomSize * 2, 20, 20);
    this.floor = new THREE.Mesh(floorGeometry, this.floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.roomGroup.add(this.floor);

    const gridHelper = new THREE.GridHelper(this.roomSize * 2, 20, 0x4488aa, 0x334455);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    gridHelper.position.y = 0.01;
    this.roomGroup.add(gridHelper);
  }

  private createWall(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    width: number,
    height: number
  ): void {
    const geometry = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geometry, this.wallMaterial.clone());
    mesh.position.copy(position);
    
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    mesh.rotation.setFromQuaternion(quaternion);

    this.roomGroup.add(mesh);
    this.walls.push({
      position: position.clone(),
      normal: normal.clone(),
      width,
      height,
      mesh
    });
  }

  private createRectangleRoom(): void {
    const s = this.roomSize;
    const h = this.roomHeight;

    this.createWall(
      new THREE.Vector3(0, h / 2, s),
      new THREE.Vector3(0, 0, -1),
      s * 2, h
    );

    this.createWall(
      new THREE.Vector3(0, h / 2, -s),
      new THREE.Vector3(0, 0, 1),
      s * 2, h
    );

    this.createWall(
      new THREE.Vector3(s, h / 2, 0),
      new THREE.Vector3(-1, 0, 0),
      s * 2, h
    );

    this.createWall(
      new THREE.Vector3(-s, h / 2, 0),
      new THREE.Vector3(1, 0, 0),
      s * 2, h
    );

    this.createWall(
      new THREE.Vector3(0, h, 0),
      new THREE.Vector3(0, -1, 0),
      s * 2, s * 2
    );
  }

  private createLShapeRoom(): void {
    const s = this.roomSize;
    const h = this.roomHeight;
    const t = s * 0.5;

    this.createWall(
      new THREE.Vector3(0, h / 2, s),
      new THREE.Vector3(0, 0, -1),
      s * 2, h
    );

    this.createWall(
      new THREE.Vector3(-s, h / 2, 0),
      new THREE.Vector3(1, 0, 0),
      s * 2, h
    );

    this.createWall(
      new THREE.Vector3(0, h / 2, -s),
      new THREE.Vector3(0, 0, 1),
      t, h
    );

    this.createWall(
      new THREE.Vector3(-t / 2, h / 2, -s),
      new THREE.Vector3(0, 0, 1),
      t, h
    );

    this.createWall(
      new THREE.Vector3(s, h / 2, t / 2),
      new THREE.Vector3(-1, 0, 0),
      t, h
    );

    this.createWall(
      new THREE.Vector3(s, h / 2, -s / 4),
      new THREE.Vector3(-1, 0, 0),
      s * 0.5, h
    );

    this.createWall(
      new THREE.Vector3(t / 2, h / 2, 0),
      new THREE.Vector3(-1, 0, 0),
      h, s
    );

    this.createWall(
      new THREE.Vector3(0, h / 2, -t / 2),
      new THREE.Vector3(0, 0, 1),
      t, h
    );

    this.createWall(
      new THREE.Vector3(t / 2, h / 2, -t / 2),
      new THREE.Vector3(-1, 0, 0),
      t, h
    );

    this.createWall(
      new THREE.Vector3(t / 2, h / 2, -t / 2),
      new THREE.Vector3(0, 0, 1),
      t, h
    );

    this.createWall(
      new THREE.Vector3(0, h, 0),
      new THREE.Vector3(0, -1, 0),
      s * 2, s * 2
    );
  }

  private createCircleRoom(): void {
    const s = this.roomSize;
    const h = this.roomHeight;
    const segments = 32;

    const cylinderGeometry = new THREE.CylinderGeometry(s, s, h, segments, 1, true);
    const cylinder = new THREE.Mesh(cylinderGeometry, this.wallMaterial.clone());
    cylinder.position.y = h / 2;
    this.roomGroup.add(cylinder);

    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;

      const x1 = Math.cos(angle1) * s;
      const z1 = Math.sin(angle1) * s;
      const x2 = Math.cos(angle2) * s;
      const z2 = Math.sin(angle2) * s;

      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;

      const normal = new THREE.Vector3(midX, 0, midZ).normalize();
      const position = new THREE.Vector3(midX, h / 2, midZ);

      const wallWidth = Math.abs(x2 - x1) + Math.abs(z2 - z1);

      const geometry = new THREE.PlaneGeometry(wallWidth, h);
      const mesh = new THREE.Mesh(geometry, this.wallMaterial.clone());
      mesh.position.copy(position);
      
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      mesh.rotation.setFromQuaternion(quaternion);

      this.walls.push({
        position,
        normal,
        width: wallWidth,
        height: h,
        mesh
      });
    }

    this.createWall(
      new THREE.Vector3(0, h, 0),
      new THREE.Vector3(0, -1, 0),
      s * 2, s * 2
    );
  }

  public isPointInsideRoom(point: THREE.Vector3): boolean {
    const s = this.roomSize;
    const h = this.roomHeight;
    
    if (point.y < 0 || point.y > h) return false;

    switch (this.currentShape) {
      case 'rectangle':
        return Math.abs(point.x) <= s * 0.95 && Math.abs(point.z) <= s * 0.95;
      
      case 'lshape':
        const t = s * 0.5;
        const inMain = point.x >= -s * 0.95 && point.x <= s * 0.95 && 
                       point.z >= -s * 0.95 && point.z <= t * 0.95;
        const inWing = point.x >= -s * 0.95 && point.x <= t * 0.95 && 
                       point.z >= -s * 0.95 && point.z <= s * 0.95;
        return inMain || inWing;
      
      case 'circle':
        return Math.sqrt(point.x * point.x + point.z * point.z) <= s * 0.95;
      
      default:
        return true;
    }
  }

  public clampPointToRoom(point: THREE.Vector3): THREE.Vector3 {
    const result = point.clone();
    const s = this.roomSize * 0.9;
    const h = this.roomHeight * 0.9;

    result.y = Math.max(0.1, Math.min(h, result.y));

    switch (this.currentShape) {
      case 'rectangle':
        result.x = Math.max(-s, Math.min(s, result.x));
        result.z = Math.max(-s, Math.min(s, result.z));
        break;
      
      case 'lshape':
        const t = s * 0.5;
        if (result.x > t && result.z > t) {
          if (result.x - t > result.z - t) {
            result.x = t;
          } else {
            result.z = t;
          }
        }
        result.x = Math.max(-s, Math.min(s, result.x));
        result.z = Math.max(-s, Math.min(s, result.z));
        break;
      
      case 'circle':
        const dist = Math.sqrt(result.x * result.x + result.z * result.z);
        if (dist > s) {
          const scale = s / dist;
          result.x *= scale;
          result.z *= scale;
        }
        break;
    }

    return result;
  }
}
