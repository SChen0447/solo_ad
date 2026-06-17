import * as THREE from 'three';
import { createBuilding, BuildingParams } from './buildingFactory';

export interface CityParams {
  gridSize: number;
  maxBuildingHeight: number;
  buildingDensity: number;
  roadWidth: number;
  blockColor: string;
  styleIndex: number;
}

interface Block {
  x: number;
  z: number;
  width: number;
  depth: number;
}

const MAX_BUILDINGS = 2000;

function createRoadMarkings(
  startX: number,
  startZ: number,
  length: number,
  isHorizontal: boolean,
  roadWidth: number
): THREE.Mesh[] {
  const markings: THREE.Mesh[] = [];
  const dashLength = 2;
  const gap = 2;
  const dashCount = Math.floor(length / (dashLength + gap));
  
  for (let i = 0; i < dashCount; i++) {
    const pos = i * (dashLength + gap) + gap / 2;
    
    const geometry = isHorizontal
      ? new THREE.PlaneGeometry(dashLength, roadWidth * 0.05)
      : new THREE.PlaneGeometry(roadWidth * 0.05, dashLength);
    
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    });
    
    const dash = new THREE.Mesh(geometry, material);
    dash.rotation.x = -Math.PI / 2;
    dash.position.y = 0.02;
    
    if (isHorizontal) {
      dash.position.set(startX + pos, 0.02, startZ);
    } else {
      dash.position.set(startX, 0.02, startZ + pos);
    }
    
    markings.push(dash);
  }
  
  return markings;
}

function createRoundabout(
  x: number,
  z: number,
  radius: number
): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(radius, 32);
  const material = new THREE.MeshStandardMaterial({
    color: 0x4A4A4A,
    roughness: 0.9
  });
  
  const circle = new THREE.Mesh(geometry, material);
  circle.rotation.x = -Math.PI / 2;
  circle.position.set(x, 0.01, z);
  
  return circle;
}

export function generateCity(params: CityParams): THREE.Object3D[] {
  const objects: THREE.Object3D[] = [];
  
  const gridSize = Math.floor(params.gridSize);
  const blockSize = 40;
  const totalSize = gridSize * (blockSize + params.roadWidth);
  const offset = -totalSize / 2 + params.roadWidth / 2;
  
  const baseColor = new THREE.Color(params.blockColor);
  
  const groundGeometry = new THREE.PlaneGeometry(totalSize * 1.5, totalSize * 1.5);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a3a,
    roughness: 1.0
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  objects.push(ground);
  
  const blocks: Block[] = [];
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const blockX = offset + i * (blockSize + params.roadWidth);
      const blockZ = offset + j * (blockSize + params.roadWidth);
      
      blocks.push({
        x: blockX,
        z: blockZ,
        width: blockSize,
        depth: blockSize
      });
      
      const roadMaterial = new THREE.MeshStandardMaterial({
        color: 0x4A4A4A,
        roughness: 0.9
      });
      
      const hRoadGeometry = new THREE.PlaneGeometry(blockSize + params.roadWidth, params.roadWidth);
      const hRoad = new THREE.Mesh(hRoadGeometry, roadMaterial);
      hRoad.rotation.x = -Math.PI / 2;
      hRoad.position.set(
        blockX + blockSize / 2,
        0.01,
        blockZ - params.roadWidth / 2
      );
      hRoad.receiveShadow = true;
      objects.push(hRoad);
      
      objects.push(...createRoadMarkings(
        blockX,
        blockZ - params.roadWidth / 2,
        blockSize + params.roadWidth,
        true,
        params.roadWidth
      ));
      
      const vRoadGeometry = new THREE.PlaneGeometry(params.roadWidth, blockSize + params.roadWidth);
      const vRoad = new THREE.Mesh(vRoadGeometry, roadMaterial);
      vRoad.rotation.x = -Math.PI / 2;
      vRoad.position.set(
        blockX - params.roadWidth / 2,
        0.01,
        blockZ + blockSize / 2
      );
      vRoad.receiveShadow = true;
      objects.push(vRoad);
      
      objects.push(...createRoadMarkings(
        blockX - params.roadWidth / 2,
        blockZ,
        blockSize + params.roadWidth,
        false,
        params.roadWidth
      ));
      
      if (i > 0 && j > 0) {
        const roundaboutRadius = Math.max(3, params.roadWidth * 0.8);
        const roundabout = createRoundabout(
          blockX - params.roadWidth / 2,
          blockZ - params.roadWidth / 2,
          roundaboutRadius
        );
        objects.push(roundabout);
      }
    }
  }
  
  for (let i = 0; i < gridSize; i++) {
    const blockX = offset + i * (blockSize + params.roadWidth);
    const hRoadGeometry = new THREE.PlaneGeometry(blockSize + params.roadWidth, params.roadWidth);
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x4A4A4A,
      roughness: 0.9
    });
    
    const hRoad = new THREE.Mesh(hRoadGeometry, roadMaterial);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(
      blockX + blockSize / 2,
      0.01,
      offset + gridSize * (blockSize + params.roadWidth) - params.roadWidth / 2
    );
    hRoad.receiveShadow = true;
    objects.push(hRoad);
    
    objects.push(...createRoadMarkings(
      blockX,
      offset + gridSize * (blockSize + params.roadWidth) - params.roadWidth / 2,
      blockSize + params.roadWidth,
      true,
      params.roadWidth
    ));
  }
  
  for (let j = 0; j < gridSize; j++) {
    const blockZ = offset + j * (blockSize + params.roadWidth);
    const vRoadGeometry = new THREE.PlaneGeometry(params.roadWidth, blockSize + params.roadWidth);
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x4A4A4A,
      roughness: 0.9
    });
    
    const vRoad = new THREE.Mesh(vRoadGeometry, roadMaterial);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(
      offset + gridSize * (blockSize + params.roadWidth) - params.roadWidth / 2,
      0.01,
      blockZ + blockSize / 2
    );
    vRoad.receiveShadow = true;
    objects.push(vRoad);
    
    objects.push(...createRoadMarkings(
      offset + gridSize * (blockSize + params.roadWidth) - params.roadWidth / 2,
      blockZ,
      blockSize + params.roadWidth,
      false,
      params.roadWidth
    ));
  }
  
  let buildingCount = 0;
  
  for (const block of blocks) {
    if (buildingCount >= MAX_BUILDINGS) break;
    
    const buildingsPerBlock = Math.floor(2 + params.buildingDensity * 6);
    
    for (let b = 0; b < buildingsPerBlock; b++) {
      if (buildingCount >= MAX_BUILDINGS) break;
      
      if (Math.random() > params.buildingDensity) continue;
      
      const buildingWidth = 4 + Math.random() * 10;
      const buildingDepth = 4 + Math.random() * 10;
      const buildingHeight = 5 + Math.random() * params.maxBuildingHeight;
      const floors = Math.floor(buildingHeight / 3);
      
      const margin = 3;
      const posX = block.x + margin + Math.random() * (block.width - 2 * margin - buildingWidth);
      const posZ = block.z + margin + Math.random() * (block.depth - 2 * margin - buildingDepth);
      
      const buildingParams: BuildingParams = {
        floors,
        width: buildingWidth,
        depth: buildingDepth,
        height: buildingHeight,
        color: baseColor.clone(),
        styleIndex: params.styleIndex,
        position: new THREE.Vector3(posX, 0, posZ)
      };
      
      const building = createBuilding(buildingParams);
      objects.push(building);
      buildingCount++;
    }
  }
  
  return objects;
}
