import * as THREE from 'three';
import type { BuildingData } from '../store/AppStore';

export interface BuildingMesh {
  group: THREE.Group;
  data: BuildingData;
  mainMeshes: THREE.Mesh[];
  edgeLines: THREE.LineSegments;
}

export class BuildingFactory {
  static createBuilding(data: BuildingData): BuildingMesh {
    const group = new THREE.Group();
    group.position.set(...data.position);
    group.userData.buildingId = data.id;

    const mainMeshes: THREE.Mesh[] = [];
    const edgeGeometries: THREE.BufferGeometry[] = [];

    switch (data.type) {
      case 'box': {
        const mesh = this.createBoxBuilding(data);
        group.add(mesh);
        mainMeshes.push(mesh);
        edgeGeometries.push(new THREE.EdgesGeometry(mesh.geometry));
        break;
      }
      case 'l-shape': {
        const parts = this.createLShapeBuilding(data);
        parts.forEach((mesh) => {
          group.add(mesh);
          mainMeshes.push(mesh);
          edgeGeometries.push(new THREE.EdgesGeometry(mesh.geometry));
        });
        break;
      }
      case 'arch': {
        const parts = this.createArchBuilding(data);
        parts.forEach((mesh) => {
          group.add(mesh);
          mainMeshes.push(mesh);
          edgeGeometries.push(new THREE.EdgesGeometry(mesh.geometry));
        });
        break;
      }
    }

    const mergedEdgeGeometry = this.mergeGeometries(edgeGeometries);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0
    });
    const edgeLines = new THREE.LineSegments(mergedEdgeGeometry, edgeMaterial);
    group.add(edgeLines);

    mainMeshes.forEach((mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.buildingId = data.id;
    });

    return { group, data, mainMeshes, edgeLines };
  }

  private static createBoxBuilding(data: BuildingData): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(
      data.dimensions.width,
      data.height,
      data.dimensions.depth
    );
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color),
      roughness: 0.7,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = data.height / 2;
    return mesh;
  }

  private static createLShapeBuilding(data: BuildingData): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    const { width, depth } = data.dimensions;
    const armThickness = Math.min(width, depth) * 0.4;

    const geo1 = new THREE.BoxGeometry(width, data.height, armThickness);
    const geo2 = new THREE.BoxGeometry(armThickness, data.height, depth - armThickness);

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color),
      roughness: 0.7,
      metalness: 0.1
    });

    const mesh1 = new THREE.Mesh(geo1, material);
    mesh1.position.set(0, data.height / 2, -(depth - armThickness) / 2);

    const mesh2 = new THREE.Mesh(geo2, material);
    mesh2.position.set(
      -(width - armThickness) / 2,
      data.height / 2,
      armThickness / 2
    );

    meshes.push(mesh1, mesh2);
    return meshes;
  }

  private static createArchBuilding(data: BuildingData): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    const { width, depth } = data.dimensions;
    const pillarWidth = width * 0.25;
    const archHeight = data.height * 0.5;
    const beamHeight = data.height * 0.2;

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color),
      roughness: 0.6,
      metalness: 0.15
    });

    const leftPillar = new THREE.Mesh(
      new THREE.BoxGeometry(pillarWidth, data.height, depth),
      material
    );
    leftPillar.position.set(-(width - pillarWidth) / 2, data.height / 2, 0);

    const rightPillar = new THREE.Mesh(
      new THREE.BoxGeometry(pillarWidth, data.height, depth),
      material
    );
    rightPillar.position.set((width - pillarWidth) / 2, data.height / 2, 0);

    const beamShape = new THREE.Shape();
    const archWidth = width - 2 * pillarWidth;
    beamShape.moveTo(-archWidth / 2, 0);
    beamShape.lineTo(archWidth / 2, 0);
    beamShape.lineTo(archWidth / 2, beamHeight);
    beamShape.absarc(0, beamHeight, archWidth / 2, 0, Math.PI, true);
    beamShape.lineTo(-archWidth / 2, beamHeight);
    beamShape.closePath();

    const archGeo = new THREE.ExtrudeGeometry(beamShape, {
      depth,
      bevelEnabled: false
    });
    archGeo.translate(0, 0, -depth / 2);

    const topBeam = new THREE.Mesh(archGeo, material);
    topBeam.position.set(0, archHeight + beamHeight, 0);
    topBeam.rotation.x = 0;

    meshes.push(leftPillar, rightPillar, topBeam);
    return meshes;
  }

  private static mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    if (geometries.length === 0) return new THREE.BufferGeometry();
    if (geometries.length === 1) return geometries[0];

    const positions: number[] = [];
    geometries.forEach((geo) => {
      const pos = geo.attributes.position;
      if (pos) {
        for (let i = 0; i < pos.count; i++) {
          positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        }
      }
    });

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return merged;
  }

  static createGround(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(200, 200, 20, 20);
    const material = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 0.9,
      metalness: 0
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    return ground;
  }

  static createGridHelper(): THREE.GridHelper {
    const grid = new THREE.GridHelper(200, 20, 0xcccccc, 0xdddddd);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    return grid;
  }

  static getBuildingFootprint(data: BuildingData): { x: number; z: number; width: number; depth: number } {
    return {
      x: data.position[0],
      z: data.position[2],
      width: data.dimensions.width,
      depth: data.dimensions.depth
    };
  }
}
