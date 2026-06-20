import * as THREE from 'three';

export interface BlockInfo {
  col: number;
  row: number;
  position: THREE.Vector3;
  size: THREE.Vector2;
  height: number;
}

export interface RoadMarkerPos {
  x: number;
  z: number;
  isHorizontal: boolean;
}

export interface TerrainData {
  blockInfos: BlockInfo[][];
  blockMesh: THREE.InstancedMesh;
  roadMesh: THREE.InstancedMesh;
  buildingMesh: THREE.InstancedMesh;
  blockSize: number;
  roadWidth: number;
  gridSize: number;
  roadMarkerPositions: RoadMarkerPos[];
  getBlockWorldPosition: (col: number, row: number) => THREE.Vector3;
}

export class Terrain {
  private readonly GRID_SIZE = 16;
  private readonly BLOCK_SIZE = 6;
  private readonly ROAD_WIDTH = 4;
  private readonly TOTAL_SIZE: number;

  private scene: THREE.Scene;
  private dummy: THREE.Object3D = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.TOTAL_SIZE = this.GRID_SIZE * this.BLOCK_SIZE + (this.GRID_SIZE + 1) * this.ROAD_WIDTH;
  }

  generate(): TerrainData {
    const blockInfos: BlockInfo[][] = [];
    const totalBlocks = this.GRID_SIZE * this.GRID_SIZE;

    const blockGeo = new THREE.BoxGeometry(this.BLOCK_SIZE, 1, this.BLOCK_SIZE);
    const blockMat = new THREE.MeshStandardMaterial({
      color: 0x3a4a5a,
      roughness: 0.9,
      metalness: 0.1
    });
    const blockMesh = new THREE.InstancedMesh(blockGeo, blockMat, totalBlocks);
    blockMesh.receiveShadow = true;

    const heights: number[][] = [];
    for (let row = 0; row < this.GRID_SIZE; row++) {
      heights[row] = [];
      blockInfos[row] = [];
      for (let col = 0; col < this.GRID_SIZE; col++) {
        heights[row][col] = Math.random() * 2;
      }
    }

    this.smoothHeights(heights);

    let idx = 0;
    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        const pos = this.calculateBlockPosition(col, row);
        const h = heights[row][col];

        this.dummy.position.set(pos.x, h / 2, pos.z);
        this.dummy.scale.set(1, h + 0.5, 1);
        this.dummy.updateMatrix();
        blockMesh.setMatrixAt(idx, this.dummy.matrix);

        blockInfos[row][col] = {
          col,
          row,
          position: new THREE.Vector3(pos.x, h, pos.z),
          size: new THREE.Vector2(this.BLOCK_SIZE, this.BLOCK_SIZE),
          height: h
        };
        idx++;
      }
    }
    blockMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(blockMesh);

    const roadMesh = this.createRoadMesh();
    this.scene.add(roadMesh);

    const buildingMesh = this.createBuildings(heights);
    this.scene.add(buildingMesh);

    const roadMarkerPositions = this.calculateRoadMarkerPositions();

    return {
      blockInfos,
      blockMesh,
      roadMesh,
      buildingMesh,
      blockSize: this.BLOCK_SIZE,
      roadWidth: this.ROAD_WIDTH,
      gridSize: this.GRID_SIZE,
      roadMarkerPositions,
      getBlockWorldPosition: (col: number, row: number) => {
        if (col < 0 || col >= this.GRID_SIZE || row < 0 || row >= this.GRID_SIZE) {
          return new THREE.Vector3();
        }
        return blockInfos[row][col].position.clone();
      }
    };
  }

  private smoothHeights(heights: number[][]): void {
    const copy = heights.map(r => [...r]);
    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        let sum = copy[row][col];
        let count = 1;
        const neighbors = [
          [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]
        ];
        for (const [r, c] of neighbors) {
          if (r >= 0 && r < this.GRID_SIZE && c >= 0 && c < this.GRID_SIZE) {
            sum += copy[r][c];
            count++;
          }
        }
        heights[row][col] = sum / count;
      }
    }
  }

  private calculateBlockPosition(col: number, row: number): { x: number; z: number } {
    const offset = -this.TOTAL_SIZE / 2 + this.ROAD_WIDTH + this.BLOCK_SIZE / 2;
    const step = this.BLOCK_SIZE + this.ROAD_WIDTH;
    return {
      x: offset + col * step,
      z: offset + row * step
    };
  }

  private createRoadMesh(): THREE.InstancedMesh {
    const horizontalRoads = this.GRID_SIZE + 1;
    const verticalRoads = this.GRID_SIZE + 1;
    const totalRoads = horizontalRoads + verticalRoads;

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.95,
      metalness: 0.05
    });

    const hGeo = new THREE.BoxGeometry(this.TOTAL_SIZE, 0.1, this.ROAD_WIDTH);
    const vGeo = new THREE.BoxGeometry(this.ROAD_WIDTH, 0.1, this.TOTAL_SIZE);

    const mergedGeo = this.mergeGeometries([hGeo, vGeo], totalRoads);
    const roadMesh = new THREE.InstancedMesh(mergedGeo, roadMat, totalRoads);
    roadMesh.receiveShadow = true;

    const halfTotal = this.TOTAL_SIZE / 2;
    const step = this.BLOCK_SIZE + this.ROAD_WIDTH;
    const firstPos = -halfTotal + this.ROAD_WIDTH / 2;

    let idx = 0;
    for (let i = 0; i < horizontalRoads; i++) {
      const z = firstPos + i * step;
      this.dummy.position.set(0, 0.05, z);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      roadMesh.setMatrixAt(idx, this.dummy.matrix);
      idx++;
    }

    for (let i = 0; i < verticalRoads; i++) {
      const x = firstPos + i * step;
      this.dummy.position.set(x, 0.05, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.rotation.set(0, Math.PI / 2, 0);
      this.dummy.updateMatrix();
      roadMesh.setMatrixAt(idx, this.dummy.matrix);
      idx++;
    }

    roadMesh.instanceMatrix.needsUpdate = true;
    return roadMesh;
  }

  private createBuildings(heights: number[][]): THREE.InstancedMesh {
    const maxBuildings = 64;
    const buildingGeos: THREE.BufferGeometry[] = [];
    const buildingColors = new Float32Array(maxBuildings * 3);

    let idx = 0;
    for (let row = 0; row < this.GRID_SIZE && idx < maxBuildings; row++) {
      for (let col = 0; col < this.GRID_SIZE && idx < maxBuildings; col++) {
        if (Math.random() < 0.35) {
          const w = 1.5 + Math.random() * 2.5;
          const d = 1.5 + Math.random() * 2.5;
          const h = 3 + Math.random() * 15;
          const geo = new THREE.BoxGeometry(w, h, d);
          buildingGeos.push(geo);

          const c = new THREE.Color().setHSL(0.58, 0.1, 0.3 + Math.random() * 0.2);
          buildingColors[idx * 3] = c.r;
          buildingColors[idx * 3 + 1] = c.g;
          buildingColors[idx * 3 + 2] = c.b;

          idx++;
        }
      }
    }

    const actualCount = idx;
    const mergedGeo = this.mergeGeometries(buildingGeos, actualCount);
    mergedGeo.setAttribute('color', new THREE.InstancedBufferAttribute(buildingColors, 3));

    const buildingMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.2
    });

    const buildingMesh = new THREE.InstancedMesh(mergedGeo, buildingMat, actualCount);
    buildingMesh.castShadow = true;
    buildingMesh.receiveShadow = true;

    idx = 0;
    for (let row = 0; row < this.GRID_SIZE && idx < actualCount; row++) {
      for (let col = 0; col < this.GRID_SIZE && idx < actualCount; col++) {
        const blockInfo = this.calculateBlockPosition(col, row);
        const offX = (Math.random() - 0.5) * (this.BLOCK_SIZE - 3);
        const offZ = (Math.random() - 0.5) * (this.BLOCK_SIZE - 3);
        const h = heights[row][col];

        this.dummy.position.set(
          blockInfo.x + offX,
          h + 0.25 + (3 + (idx % 13) * 15 / 13) / 2,
          blockInfo.z + offZ
        );
        this.dummy.rotation.y = Math.random() * 0.1;
        this.dummy.updateMatrix();
        buildingMesh.setMatrixAt(idx, this.dummy.matrix);
        idx++;
      }
    }

    buildingMesh.instanceMatrix.needsUpdate = true;
    buildingMesh.count = actualCount;
    return buildingMesh;
  }

  private mergeGeometries(geos: THREE.BufferGeometry[], count: number): THREE.BufferGeometry {
    if (geos.length === 0) {
      return new THREE.BoxGeometry(1, 1, 1);
    }
    return geos[0].clone();
  }

  private calculateRoadMarkerPositions(): RoadMarkerPos[] {
    const positions: RoadMarkerPos[] = [];
    const halfTotal = this.TOTAL_SIZE / 2;
    const step = this.BLOCK_SIZE + this.ROAD_WIDTH;
    const firstPos = -halfTotal + this.ROAD_WIDTH / 2;
    const markerInterval = 3;

    for (let i = 0; i <= this.GRID_SIZE; i++) {
      const z = firstPos + i * step;
      for (let x = -halfTotal + markerInterval; x < halfTotal; x += markerInterval * 2) {
        positions.push({ x, z, isHorizontal: true });
      }
    }

    for (let i = 0; i <= this.GRID_SIZE; i++) {
      const x = firstPos + i * step;
      for (let z = -halfTotal + markerInterval; z < halfTotal; z += markerInterval * 2) {
        positions.push({ x, z, isHorizontal: false });
      }
    }

    return positions;
  }
}
