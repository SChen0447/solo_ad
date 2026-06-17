import * as THREE from 'three';

export interface BuildingParams {
  floors: number;
  width: number;
  depth: number;
  height: number;
  color: THREE.Color;
  styleIndex: number;
  position: THREE.Vector3;
}

function adjustColor(baseColor: THREE.Color): THREE.Color {
  const color = baseColor.clone();
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  
  hsl.h += (Math.random() - 0.5) * 0.15;
  hsl.h = Math.max(0, Math.min(1, hsl.h));
  
  hsl.l += (Math.random() - 0.5) * 0.2;
  hsl.l = Math.max(0.1, Math.min(0.9, hsl.l));
  
  color.setHSL(hsl.h, hsl.s, hsl.l);
  return color;
}

function createWindowTexture(styleIndex: number): THREE.Texture {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, size, size);
  
  const windowSize = styleIndex > 0.5 ? 18 : 22;
  const windowGap = styleIndex > 0.5 ? 12 : 8;
  const cols = Math.floor(size / (windowSize + windowGap));
  const rows = Math.floor(size / (windowSize + windowGap));
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const x = j * (windowSize + windowGap) + windowGap / 2;
      const y = i * (windowSize + windowGap) + windowGap / 2;
      
      const isLit = Math.random() > 0.4;
      
      if (styleIndex > 0.5) {
        ctx.fillStyle = isLit ? '#FFD700' : '#333344';
        ctx.beginPath();
        ctx.moveTo(x + windowSize / 2, y);
        ctx.lineTo(x + windowSize, y + windowSize * 0.3);
        ctx.lineTo(x + windowSize, y + windowSize);
        ctx.lineTo(x, y + windowSize);
        ctx.lineTo(x, y + windowSize * 0.3);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = isLit ? '#FFD700' : '#2a2a3a';
        ctx.fillRect(x, y, windowSize, windowSize);
        
        ctx.strokeStyle = '#444466';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, windowSize, windowSize);
      }
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  
  return texture;
}

function createBuildingMesh(params: BuildingParams, lowPoly: boolean = false): THREE.Mesh {
  const group = new THREE.Group();
  
  const adjustedColor = adjustColor(params.color);
  
  const mainGeometry = new THREE.BoxGeometry(
    params.width,
    params.height,
    params.depth
  );
  
  const windowTexture = createWindowTexture(params.styleIndex);
  windowTexture.repeat.set(
    Math.max(1, Math.floor(params.width / 3)),
    Math.max(1, Math.floor(params.height / 4))
  );
  
  const materials: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 6; i++) {
    if (i === 2 || i === 3 || i === 4 || i === 5) {
      materials.push(new THREE.MeshStandardMaterial({
        color: adjustedColor,
        map: lowPoly ? null : windowTexture,
        transparent: true,
        opacity: 0.95,
        roughness: 0.7,
        metalness: 0.1
      }));
    } else {
      materials.push(new THREE.MeshStandardMaterial({
        color: adjustedColor,
        roughness: 0.8,
        metalness: 0.1
      }));
    }
  }
  
  const mainMesh = new THREE.Mesh(mainGeometry, materials);
  mainMesh.position.y = params.height / 2;
  mainMesh.castShadow = true;
  mainMesh.receiveShadow = true;
  group.add(mainMesh);
  
  if (!lowPoly) {
    if (params.styleIndex > 0.7) {
      const roofGeometry = new THREE.ConeGeometry(
        params.width * 0.7,
        params.height * 0.15,
        4
      );
      const roofMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#8B4513'),
        roughness: 0.9
      });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = params.height + params.height * 0.075;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);
    } else {
      const roofHeight = params.height * 0.05;
      const roofGeometry = new THREE.BoxGeometry(
        params.width * 0.9,
        roofHeight,
        params.depth * 0.9
      );
      const roofMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#555555'),
        roughness: 0.9
      });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = params.height + roofHeight / 2;
      roof.castShadow = true;
      group.add(roof);
    }
    
    if (params.styleIndex > 0.5) {
      const columnCount = Math.floor(params.width / 2);
      const columnRadius = params.width * 0.03;
      const columnHeight = params.height * 0.9;
      
      for (let i = 0; i < columnCount; i++) {
        const columnGeometry = new THREE.CylinderGeometry(
          columnRadius,
          columnRadius * 1.2,
          columnHeight,
          8
        );
        const columnMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#D2B48C'),
          roughness: 0.6
        });
        const column = new THREE.Mesh(columnGeometry, columnMaterial);
        const xPos = -params.width / 2 + (i + 0.5) * (params.width / columnCount);
        column.position.set(xPos, columnHeight / 2, params.depth / 2 + columnRadius);
        column.castShadow = true;
        group.add(column);
        
        const column2 = column.clone();
        column2.position.z = -params.depth / 2 - columnRadius;
        group.add(column2);
      }
    }
  }
  
  group.position.copy(params.position);
  
  const mergedGeometry = new THREE.BoxGeometry(
    params.width,
    params.height + (params.styleIndex > 0.7 ? params.height * 0.15 : params.height * 0.05),
    params.depth
  );
  const mergedMesh = new THREE.Mesh(mergedGeometry, materials[0]);
  mergedMesh.position.copy(params.position);
  mergedMesh.position.y = mergedGeometry.parameters.height / 2;
  
  return mainMesh;
}

export function createBuilding(params: BuildingParams): THREE.LOD {
  const lod = new THREE.LOD();
  
  const highPoly = createBuildingMesh(params, false);
  const lowPoly = createBuildingMesh(params, true);
  
  lod.addLevel(highPoly, 0);
  lod.addLevel(lowPoly, 50);
  
  lod.position.copy(params.position);
  lod.userData = { buildingParams: params };
  
  return lod;
}
