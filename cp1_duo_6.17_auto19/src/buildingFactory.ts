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

interface WindowData {
  mesh: THREE.Mesh;
  baseIntensity: number;
  flickerSpeed: number;
  flickerOffset: number;
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

function createWindowMaterial(isLit: boolean): THREE.MeshStandardMaterial {
  const litColor = new THREE.Color('#FFD700');
  const darkColor = new THREE.Color('#1a1a2e');
  
  return new THREE.MeshStandardMaterial({
    color: isLit ? litColor : darkColor,
    emissive: isLit ? litColor : new THREE.Color('#000000'),
    emissiveIntensity: isLit ? 0.8 : 0,
    transparent: true,
    opacity: isLit ? 0.9 : 0.7,
    roughness: 0.3,
    metalness: 0.1
  });
}

function createWindows(
  width: number,
  height: number,
  depth: number,
  buildingHeight: number,
  styleIndex: number,
  isFront: boolean,
  isSide: boolean
): WindowData[] {
  const windows: WindowData[] = [];
  
  const windowWidth = styleIndex > 0.5 ? 1.2 : 1.5;
  const windowHeight = styleIndex > 0.5 ? 1.8 : 2.0;
  const floorHeight = buildingHeight / Math.max(1, Math.floor(buildingHeight / 3));
  
  const cols = Math.floor((width - 2) / (windowWidth + 1.5));
  const rows = Math.floor((buildingHeight - 2) / (floorHeight * 0.8));
  
  const faceWidth = isSide ? depth : width;
  const actualCols = Math.floor((faceWidth - 2) / (windowWidth + 1.5));
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < actualCols; col++) {
      if (Math.random() > 0.85) continue;
      
      const offsetX = (Math.random() - 0.5) * 0.5;
      const offsetY = (Math.random() - 0.5) * 0.3;
      
      const x = -faceWidth / 2 + 1.5 + col * (windowWidth + 1.5) + windowWidth / 2 + offsetX;
      const y = 2 + row * floorHeight * 0.8 + floorHeight * 0.3 + offsetY;
      
      if (y + windowHeight / 2 > buildingHeight - 1) continue;
      
      const isLit = Math.random() > 0.35;
      
      let wWidth = windowWidth;
      let wHeight = windowHeight;
      if (styleIndex > 0.7 && Math.random() > 0.7) {
        wWidth *= 1.3;
        wHeight *= 1.2;
      }
      
      const geometry = styleIndex > 0.5
        ? createArchedWindowGeometry(wWidth, wHeight)
        : new THREE.PlaneGeometry(wWidth, wHeight);
      
      const material = createWindowMaterial(isLit);
      const windowMesh = new THREE.Mesh(geometry, material);
      
      const baseIntensity = isLit ? 0.5 + Math.random() * 0.5 : 0;
      const flickerSpeed = isLit ? 0.5 + Math.random() * 1.5 : 0;
      const flickerOffset = Math.random() * Math.PI * 2;
      
      windows.push({
        mesh: windowMesh,
        baseIntensity,
        flickerSpeed,
        flickerOffset
      });
      
      if (isFront) {
        windowMesh.position.set(x, y, depth / 2 + 0.01);
      } else if (!isSide) {
        windowMesh.position.set(x, y, -depth / 2 - 0.01);
        windowMesh.rotation.y = Math.PI;
      }
    }
  }
  
  return windows;
}

function createArchedWindowGeometry(width: number, height: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const archHeight = height * 0.25;
  const bodyHeight = height - archHeight;
  
  shape.moveTo(-width / 2, 0);
  shape.lineTo(-width / 2, bodyHeight);
  
  shape.quadraticCurveTo(-width / 2, height, 0, height);
  shape.quadraticCurveTo(width / 2, height, width / 2, bodyHeight);
  
  shape.lineTo(width / 2, 0);
  shape.lineTo(-width / 2, 0);
  
  return new THREE.ShapeGeometry(shape);
}

function createGableRoof(
  width: number,
  depth: number,
  slopeAngle: number = 30
): { mesh: THREE.Mesh; height: number } {
  const slopeRad = (slopeAngle * Math.PI) / 180;
  const roofHeight = (width / 2) * Math.tan(slopeRad);
  
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(0, roofHeight);
  shape.lineTo(width / 2, 0);
  shape.lineTo(-width / 2, 0);
  
  const extrudeSettings = {
    depth: depth,
    bevelEnabled: false
  };
  
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8B4513'),
    roughness: 0.9,
    metalness: 0.1
  });
  
  const roof = new THREE.Mesh(geometry, material);
  roof.rotation.x = 0;
  roof.position.z = -depth / 2;
  roof.castShadow = true;
  roof.receiveShadow = true;
  
  return { mesh: roof, height: roofHeight };
}

function createFlatRoof(
  width: number,
  depth: number,
  buildingHeight: number
): THREE.Group {
  const roofGroup = new THREE.Group();
  
  const parapetHeight = 1.5;
  const parapetThickness = 0.5;
  
  const parapetMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#555555'),
    roughness: 0.8
  });
  
  const frontParapet = new THREE.Mesh(
    new THREE.BoxGeometry(width + parapetThickness * 2, parapetHeight, parapetThickness),
    parapetMaterial
  );
  frontParapet.position.set(0, parapetHeight / 2, depth / 2);
  frontParapet.castShadow = true;
  roofGroup.add(frontParapet);
  
  const backParapet = frontParapet.clone();
  backParapet.position.z = -depth / 2;
  roofGroup.add(backParapet);
  
  const leftParapet = new THREE.Mesh(
    new THREE.BoxGeometry(parapetThickness, parapetHeight, depth),
    parapetMaterial
  );
  leftParapet.position.set(-width / 2, parapetHeight / 2, 0);
  leftParapet.castShadow = true;
  roofGroup.add(leftParapet);
  
  const rightParapet = leftParapet.clone();
  rightParapet.position.x = width / 2;
  roofGroup.add(rightParapet);
  
  const roofSurface = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.3, depth),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#4a4a4a'),
      roughness: 0.9
    })
  );
  roofSurface.position.y = 0.15;
  roofSurface.receiveShadow = true;
  roofGroup.add(roofSurface);
  
  if (Math.random() > 0.5) {
    const hvacWidth = 2 + Math.random() * 3;
    const hvacDepth = 2 + Math.random() * 3;
    const hvacHeight = 1 + Math.random() * 2;
    
    const hvac = new THREE.Mesh(
      new THREE.BoxGeometry(hvacWidth, hvacHeight, hvacDepth),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#888888'),
        roughness: 0.7,
        metalness: 0.3
      })
    );
    hvac.position.set(
      (Math.random() - 0.5) * (width - hvacWidth),
      parapetHeight + hvacHeight / 2,
      (Math.random() - 0.5) * (depth - hvacDepth)
    );
    hvac.castShadow = true;
    roofGroup.add(hvac);
    
    const fanRadius = hvacWidth * 0.2;
    const fan = new THREE.Mesh(
      new THREE.CylinderGeometry(fanRadius, fanRadius, 0.2, 16),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#666666'),
        metalness: 0.5
      })
    );
    fan.position.y = hvacHeight / 2 + 0.1;
    hvac.add(fan);
  }
  
  return roofGroup;
}

function createColumns(
  width: number,
  height: number,
  depth: number,
  styleIndex: number
): THREE.Mesh[] {
  const columns: THREE.Mesh[] = [];
  
  if (styleIndex < 0.5) return columns;
  
  const columnCount = Math.max(2, Math.floor(width / 4));
  const columnRadius = width * 0.025;
  const columnHeight = height * 0.85;
  
  const columnMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D2B48C'),
    roughness: 0.6,
    metalness: 0.1
  });
  
  for (let i = 0; i < columnCount; i++) {
    const xPos = -width / 2 + (i + 0.5) * (width / columnCount);
    
    const columnGeometry = new THREE.CylinderGeometry(
      columnRadius,
      columnRadius * 1.1,
      columnHeight,
      12
    );
    
    const column = new THREE.Mesh(columnGeometry, columnMaterial);
    column.position.set(xPos, columnHeight / 2, depth / 2 + columnRadius);
    column.castShadow = true;
    columns.push(column);
    
    const columnBack = column.clone();
    columnBack.position.z = -depth / 2 - columnRadius;
    columns.push(columnBack);
  }
  
  return columns;
}

function createBase(
  width: number,
  depth: number,
  styleIndex: number
): THREE.Mesh {
  const baseHeight = 0.8;
  const baseExpand = styleIndex > 0.5 ? 0.8 : 0.3;
  
  const baseGeometry = new THREE.BoxGeometry(
    width + baseExpand * 2,
    baseHeight,
    depth + baseExpand * 2
  );
  
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(styleIndex > 0.5 ? '#8B7355' : '#555555'),
    roughness: 0.9
  });
  
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = baseHeight / 2;
  base.receiveShadow = true;
  base.castShadow = true;
  
  return base;
}

export function createBuilding(params: BuildingParams): THREE.Group {
  const buildingGroup = new THREE.Group();
  
  const adjustedColor = adjustColor(params.color);
  
  const windowData: WindowData[] = [];
  
  const mainGeometry = new THREE.BoxGeometry(
    params.width,
    params.height,
    params.depth
  );
  
  const mainMaterial = new THREE.MeshStandardMaterial({
    color: adjustedColor,
    roughness: 0.7 + Math.random() * 0.2,
    metalness: 0.05 + Math.random() * 0.1
  });
  
  const mainMesh = new THREE.Mesh(mainGeometry, mainMaterial);
  mainMesh.position.y = params.height / 2;
  mainMesh.castShadow = true;
  mainMesh.receiveShadow = true;
  buildingGroup.add(mainMesh);
  
  const base = createBase(params.width, params.depth, params.styleIndex);
  buildingGroup.add(base);
  
  const frontWindows = createWindows(
    params.width, params.height, params.depth,
    params.height, params.styleIndex, true, false
  );
  frontWindows.forEach(w => {
    buildingGroup.add(w.mesh);
    windowData.push(w);
  });
  
  const backWindows = createWindows(
    params.width, params.height, params.depth,
    params.height, params.styleIndex, false, false
  );
  backWindows.forEach(w => {
    buildingGroup.add(w.mesh);
    windowData.push(w);
  });
  
  const leftWindows = createWindows(
    params.depth, params.height, params.width,
    params.height, params.styleIndex, true, true
  );
  leftWindows.forEach(w => {
    const tempX = w.mesh.position.x;
    w.mesh.rotation.y = -Math.PI / 2;
    w.mesh.position.set(-params.width / 2 - 0.01, w.mesh.position.y, -tempX);
    buildingGroup.add(w.mesh);
    windowData.push(w);
  });
  
  const rightWindows = createWindows(
    params.depth, params.height, params.width,
    params.height, params.styleIndex, false, true
  );
  rightWindows.forEach(w => {
    const tempX = w.mesh.position.x;
    w.mesh.rotation.y = Math.PI / 2;
    w.mesh.position.set(params.width / 2 + 0.01, w.mesh.position.y, tempX);
    buildingGroup.add(w.mesh);
    windowData.push(w);
  });
  
  if (params.styleIndex > 0.7) {
    const roofResult = createGableRoof(params.width, params.depth, 30);
    roofResult.mesh.position.y = params.height;
    buildingGroup.add(roofResult.mesh);
  } else {
    const roofGroup = createFlatRoof(params.width, params.depth, params.height);
    roofGroup.position.y = params.height;
    buildingGroup.add(roofGroup);
  }
  
  const columns = createColumns(params.width, params.height, params.depth, params.styleIndex);
  columns.forEach(col => buildingGroup.add(col));
  
  buildingGroup.position.copy(params.position);
  
  buildingGroup.userData = {
    buildingParams: params,
    windowData,
    windowUpdateTime: 0
  };
  
  return buildingGroup;
}

export function updateBuildingWindows(building: THREE.Group, time: number): void {
  const data = building.userData;
  if (!data || !data.windowData) return;
  
  const windowData: WindowData[] = data.windowData;
  
  for (const w of windowData) {
    if (w.flickerSpeed > 0 && w.baseIntensity > 0) {
      const flicker = Math.sin(time * w.flickerSpeed + w.flickerOffset) * 0.3 + 0.7;
      const intensity = w.baseIntensity * flicker;
      
      const material = w.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = intensity;
      material.opacity = 0.7 + intensity * 0.3;
    }
  }
  
  if (Math.random() < 0.001) {
    const randomWindow = windowData[Math.floor(Math.random() * windowData.length)];
    if (randomWindow) {
      const material = randomWindow.mesh.material as THREE.MeshStandardMaterial;
      const isCurrentlyLit = randomWindow.baseIntensity > 0;
      
      if (isCurrentlyLit && Math.random() < 0.3) {
        randomWindow.baseIntensity = 0;
        randomWindow.flickerSpeed = 0;
        material.color.set('#1a1a2e');
        material.emissive.set('#000000');
        material.emissiveIntensity = 0;
        material.opacity = 0.7;
      } else if (!isCurrentlyLit && Math.random() < 0.15) {
        randomWindow.baseIntensity = 0.5 + Math.random() * 0.5;
        randomWindow.flickerSpeed = 0.5 + Math.random() * 1.5;
        material.color.set('#FFD700');
        material.emissive.set('#FFD700');
        material.emissiveIntensity = randomWindow.baseIntensity;
      }
    }
  }
}
