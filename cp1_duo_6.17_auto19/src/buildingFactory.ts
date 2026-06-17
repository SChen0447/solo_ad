import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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

function createArchedWindowGeometry(width: number, height: number, styleIndex: number): THREE.BufferGeometry {
  if (styleIndex <= 0.8) {
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
  
  const shape = new THREE.Shape();
  const archHeight = height * 0.3;
  const bodyHeight = height - archHeight;
  const segments = 8;
  
  shape.moveTo(-width / 2, 0);
  shape.lineTo(-width / 2, bodyHeight);
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = Math.PI * t;
    const x = -width / 2 + (width / 2) * (1 + Math.cos(Math.PI - angle));
    const y = bodyHeight + archHeight * Math.sin(angle);
    shape.lineTo(x, y);
  }
  
  shape.lineTo(width / 2, 0);
  shape.lineTo(-width / 2, 0);
  
  return new THREE.ShapeGeometry(shape);
}

function createWindowFrame(
  width: number,
  height: number,
  styleIndex: number,
  frameColor: THREE.Color
): THREE.Mesh | null {
  if (styleIndex <= 0.8) return null;
  
  const frameThickness = 0.15;
  const archHeight = height * 0.3;
  const bodyHeight = height - archHeight;
  const geometries: THREE.BufferGeometry[] = [];
  
  const leftFrame = new THREE.BoxGeometry(frameThickness, height, frameThickness);
  leftFrame.translate(-width / 2 - frameThickness / 2, height / 2, 0);
  geometries.push(leftFrame);
  
  const rightFrame = new THREE.BoxGeometry(frameThickness, height, frameThickness);
  rightFrame.translate(width / 2 + frameThickness / 2, height / 2, 0);
  geometries.push(rightFrame);
  
  const bottomFrame = new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameThickness);
  bottomFrame.translate(0, -frameThickness / 2, 0);
  geometries.push(bottomFrame);
  
  const archSegments = 12;
  for (let i = 0; i < archSegments; i++) {
    const t1 = i / archSegments;
    const t2 = (i + 1) / archSegments;
    const a1 = Math.PI * t1;
    const a2 = Math.PI * t2;
    
    const x1 = -width / 2 + (width / 2) * (1 + Math.cos(Math.PI - a1));
    const y1 = bodyHeight + archHeight * Math.sin(a1);
    const x2 = -width / 2 + (width / 2) * (1 + Math.cos(Math.PI - a2));
    const y2 = bodyHeight + archHeight * Math.sin(a2);
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    const archSeg = new THREE.BoxGeometry(segLen + 0.02, frameThickness, frameThickness);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    archSeg.translate(midX, midY, 0);
    archSeg.rotateZ(angle);
    geometries.push(archSeg);
  }
  
  const merged = mergeGeometries(geometries, false);
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: frameColor,
    roughness: 0.6,
    metalness: 0.2
  });
  
  const frame = new THREE.Mesh(merged, frameMaterial);
  frame.castShadow = true;
  
  return frame;
}

function createWindows(
  width: number,
  _height: number,
  depth: number,
  buildingHeight: number,
  styleIndex: number,
  isFront: boolean,
  isSide: boolean,
  frameColor: THREE.Color
): { windows: WindowData[]; frames: THREE.Mesh[] } {
  const windows: WindowData[] = [];
  const frames: THREE.Mesh[] = [];
  
  const windowWidth = styleIndex > 0.6 ? 1.1 : 1.5;
  const windowHeight = styleIndex > 0.6 ? 1.9 : 2.0;
  const floorHeight = buildingHeight / Math.max(1, Math.floor(buildingHeight / 3));
  
  const faceWidth = isSide ? depth : width;
  const actualCols = Math.floor((faceWidth - 2) / (windowWidth + 1.5));
  const rows = Math.floor((buildingHeight - 2) / (floorHeight * 0.8));
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < actualCols; col++) {
      if (Math.random() > 0.85) continue;
      
      const offsetX = (Math.random() - 0.5) * 0.3;
      const offsetY = (Math.random() - 0.5) * 0.2;
      
      const x = -faceWidth / 2 + 1.5 + col * (windowWidth + 1.5) + windowWidth / 2 + offsetX;
      const y = 2 + row * floorHeight * 0.8 + floorHeight * 0.3 + offsetY;
      
      if (y + windowHeight / 2 > buildingHeight - 1) continue;
      
      const isLit = Math.random() > 0.35;
      
      let wWidth = windowWidth;
      let wHeight = windowHeight;
      if (styleIndex > 0.7 && Math.random() > 0.5) {
        wWidth *= 1.2;
        wHeight *= 1.15;
      }
      
      const geometry = styleIndex > 0.5
        ? createArchedWindowGeometry(wWidth, wHeight, styleIndex)
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
      
      if (styleIndex > 0.8) {
        const frame = createWindowFrame(wWidth, wHeight, styleIndex, frameColor);
        if (frame) {
          if (isFront) {
            frame.position.set(x, y, depth / 2 + 0.02);
          } else if (!isSide) {
            frame.position.set(x, y, -depth / 2 - 0.02);
            frame.rotation.y = Math.PI;
          }
          frames.push(frame);
        }
      }
    }
  }
  
  return { windows, frames };
}

function createPilasterDecorations(
  width: number,
  height: number,
  depth: number,
  styleIndex: number,
  buildingColor: THREE.Color
): THREE.Mesh {
  const decorations: THREE.BufferGeometry[] = [];
  
  const hsl = { h: 0, s: 0, l: 0 };
  buildingColor.getHSL(hsl);
  const trimColor = new THREE.Color().setHSL(
    hsl.h,
    hsl.s,
    Math.min(0.95, hsl.l + 0.1)
  );
  
  const pilasterWidth = Math.min(0.8, Math.max(0.4, width * 0.04));
  const pilasterDepth = 0.3;
  const pilasterHeight = height * 0.92;
  const startY = height * 0.04;
  
  const cornerPositions: Array<[number, number, number, number]> = [
    [-width / 2, 0, depth / 2, 0],
    [width / 2, 0, depth / 2, 0],
    [-width / 2, 0, -depth / 2, 0],
    [width / 2, 0, -depth / 2, 0],
    [0, 0, depth / 2, Math.PI / 2],
    [0, 0, -depth / 2, Math.PI / 2],
  ];
  
  for (const [px, _py, pz, rotY] of cornerPositions) {
    const isSidePos = rotY !== 0;
    const w = isSidePos ? pilasterDepth : pilasterWidth;
    const d = isSidePos ? pilasterWidth : pilasterDepth;
    
    const geo = new THREE.BoxGeometry(w, pilasterHeight, d);
    geo.translate(px, startY + pilasterHeight / 2, pz);
    decorations.push(geo);
    
    const capHeight = 0.3;
    const capWidth = w * 1.5;
    const capDepth = d * 1.5;
    const capGeo = new THREE.BoxGeometry(capWidth, capHeight, capDepth);
    capGeo.translate(px, startY + pilasterHeight + capHeight / 2, pz);
    decorations.push(capGeo);
    
    const baseGeo = new THREE.BoxGeometry(capWidth, capHeight, capDepth);
    baseGeo.translate(px, startY - capHeight / 2, pz);
    decorations.push(baseGeo);
  }
  
  if (styleIndex > 0.75) {
    const midCount = Math.max(1, Math.floor(width / 15) - 1);
    for (let i = 0; i < midCount; i++) {
      const t = (i + 1) / (midCount + 1);
      const mx = -width / 2 + width * t;
      
      const geo = new THREE.BoxGeometry(pilasterWidth * 0.8, pilasterHeight * 0.85, pilasterDepth);
      geo.translate(mx, startY + pilasterHeight * 0.425, depth / 2);
      decorations.push(geo);
      
      const geoBack = geo.clone();
      geoBack.translate(0, 0, -depth);
      decorations.push(geoBack);
    }
    
    const midSideCount = Math.max(0, Math.floor(depth / 15) - 1);
    for (let i = 0; i < midSideCount; i++) {
      const t = (i + 1) / (midSideCount + 1);
      const mz = -depth / 2 + depth * t;
      
      const geo = new THREE.BoxGeometry(pilasterDepth, pilasterHeight * 0.85, pilasterWidth * 0.8);
      geo.translate(width / 2, startY + pilasterHeight * 0.425, mz);
      decorations.push(geo);
      
      const geoBack = geo.clone();
      geoBack.translate(-width, 0, 0);
      decorations.push(geoBack);
    }
  }
  
  const merged = mergeGeometries(decorations, false);
  const material = new THREE.MeshStandardMaterial({
    color: trimColor,
    roughness: 0.65,
    metalness: 0.1
  });
  
  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  return mesh;
}

function createFacadeBanding(
  width: number,
  height: number,
  depth: number,
  styleIndex: number,
  buildingColor: THREE.Color
): THREE.Mesh | null {
  if (styleIndex <= 0.55) return null;
  
  const hsl = { h: 0, s: 0, l: 0 };
  buildingColor.getHSL(hsl);
  const bandColor = new THREE.Color().setHSL(
    hsl.h,
    Math.max(0, hsl.s - 0.1),
    Math.min(0.9, hsl.l + 0.08)
  );
  
  const floorHeight = height / Math.max(1, Math.floor(height / 3));
  const bandHeight = 0.2;
  const bandDepth = 0.15;
  const geometries: THREE.BufferGeometry[] = [];
  
  const numBands = Math.floor(height / floorHeight);
  for (let i = 1; i <= numBands; i++) {
    const y = i * floorHeight;
    if (y > height - 1) break;
    
    const frontBand = new THREE.BoxGeometry(width + bandDepth * 2, bandHeight, bandDepth);
    frontBand.translate(0, y, depth / 2 + bandDepth / 2);
    geometries.push(frontBand);
    
    const backBand = frontBand.clone();
    backBand.translate(0, 0, -depth - bandDepth);
    geometries.push(backBand);
    
    const leftBand = new THREE.BoxGeometry(bandDepth, bandHeight, depth);
    leftBand.translate(-width / 2 - bandDepth / 2, y, 0);
    geometries.push(leftBand);
    
    const rightBand = leftBand.clone();
    rightBand.translate(width + bandDepth, 0, 0);
    geometries.push(rightBand);
  }
  
  const merged = mergeGeometries(geometries, false);
  const material = new THREE.MeshStandardMaterial({
    color: bandColor,
    roughness: 0.7,
    metalness: 0.05
  });
  
  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  return mesh;
}

function createGableRoof(
  width: number,
  depth: number,
  styleIndex: number,
  slopeAngle: number = 30
): { group: THREE.Group; height: number } {
  const roofGroup = new THREE.Group();
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
  
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8B4513'),
    roughness: 0.9,
    metalness: 0.05
  });
  
  const roof = new THREE.Mesh(geometry, roofMaterial);
  roof.position.z = -depth / 2;
  roof.castShadow = true;
  roof.receiveShadow = true;
  roofGroup.add(roof);
  
  if (styleIndex > 0.7) {
    const hsl = { h: 0.05, s: 0.4, l: 0 };
    new THREE.Color('#8B4513').getHSL(hsl);
    const corniceColor = new THREE.Color().setHSL(
      hsl.h,
      hsl.s,
      Math.min(0.85, hsl.l + 0.25)
    );
    
    const corniceHeight = 0.4;
    const corniceDepth = 0.5;
    const corniceWidth = width + 1.0;
    
    const corniceGeos: THREE.BufferGeometry[] = [];
    
    const frontCornice = new THREE.BoxGeometry(corniceWidth, corniceHeight, corniceDepth);
    frontCornice.translate(0, -corniceHeight / 2, depth / 2 + corniceDepth / 2);
    corniceGeos.push(frontCornice);
    
    const backCornice = frontCornice.clone();
    backCornice.translate(0, 0, -depth - corniceDepth);
    corniceGeos.push(backCornice);
    
    const overhang = 0.8;
    const leftGeo = new THREE.BoxGeometry(
      overhang,
      corniceHeight,
      depth + corniceDepth * 2 + overhang * 0.5
    );
    leftGeo.translate(
      -width / 2 - overhang / 2,
      -corniceHeight / 2,
      0
    );
    corniceGeos.push(leftGeo);
    
    const rightGeo = leftGeo.clone();
    rightGeo.translate(width + overhang, 0, 0);
    corniceGeos.push(rightGeo);
    
    const mergedCornice = mergeGeometries(corniceGeos, false);
    const corniceMaterial = new THREE.MeshStandardMaterial({
      color: corniceColor,
      roughness: 0.7,
      metalness: 0.15
    });
    const cornice = new THREE.Mesh(mergedCornice, corniceMaterial);
    cornice.castShadow = true;
    cornice.receiveShadow = true;
    roofGroup.add(cornice);
    
    const blockSize = 0.35;
    const blockHeight = 0.5;
    const blockSpacing = 0.6;
    const blockGeos: THREE.BufferGeometry[] = [];
    
    const frontBlocks = Math.floor((corniceWidth - blockSize) / blockSpacing);
    for (let i = 0; i < frontBlocks; i++) {
      if (Math.random() < 0.85) {
        const bx = -corniceWidth / 2 + blockSpacing / 2 + i * blockSpacing + blockSize / 2;
        const block = new THREE.BoxGeometry(blockSize, blockHeight, blockSize);
        block.translate(bx, corniceHeight / 2 + blockHeight / 2 - corniceHeight / 2, depth / 2 + corniceDepth / 2);
        blockGeos.push(block);
      }
    }
    
    const backBlocks = frontBlocks;
    for (let i = 0; i < backBlocks; i++) {
      if (Math.random() < 0.85) {
        const bx = -corniceWidth / 2 + blockSpacing / 2 + i * blockSpacing + blockSize / 2;
        const block = new THREE.BoxGeometry(blockSize, blockHeight, blockSize);
        block.translate(bx, corniceHeight / 2 + blockHeight / 2 - corniceHeight / 2, -depth / 2 - corniceDepth / 2);
        blockGeos.push(block);
      }
    }
    
    if (blockGeos.length > 0) {
      const mergedBlocks = mergeGeometries(blockGeos, false);
      const blockMaterial = new THREE.MeshStandardMaterial({
        color: corniceColor.clone().offsetHSL(0, 0, -0.05),
        roughness: 0.75,
        metalness: 0.1
      });
      const blocks = new THREE.Mesh(mergedBlocks, blockMaterial);
      blocks.castShadow = true;
      roofGroup.add(blocks);
    }
    
    if (styleIndex > 0.85 && roofHeight > 3) {
      const ridgeLength = depth;
      const ridgeWidth = 0.4;
      const ridgeHeight = 0.3;
      const ridgeGeo = new THREE.BoxGeometry(ridgeWidth, ridgeHeight, ridgeLength);
      ridgeGeo.translate(0, roofHeight + ridgeHeight / 2, 0);
      const ridgeMat = new THREE.MeshStandardMaterial({
        color: corniceColor,
        roughness: 0.7,
        metalness: 0.15
      });
      const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridge.castShadow = true;
      roofGroup.add(ridge);
      
      const finialGeo = new THREE.SphereGeometry(0.25, 8, 8);
      const finialMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#B8860B'),
        metalness: 0.6,
        roughness: 0.4
      });
      const finial1 = new THREE.Mesh(finialGeo, finialMat);
      finial1.position.set(0, roofHeight + ridgeHeight + 0.25, -depth / 2 - 0.2);
      finial1.castShadow = true;
      roofGroup.add(finial1);
      
      const finial2 = finial1.clone();
      finial2.position.z = depth / 2 + 0.2;
      roofGroup.add(finial2);
    }
  }
  
  return { group: roofGroup, height: roofHeight };
}

function createFlatRoof(
  width: number,
  depth: number,
  _buildingHeight: number,
  styleIndex: number
): THREE.Group {
  const roofGroup = new THREE.Group();
  
  const parapetHeight = 1.5;
  const parapetThickness = 0.5;
  
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color('#555555').getHSL(hsl);
  const parapetColor = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  
  const parapetMaterial = new THREE.MeshStandardMaterial({
    color: parapetColor,
    roughness: 0.8,
    metalness: 0.05
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
  
  if (styleIndex > 0.5) {
    const corniceHeight = 0.3;
    const corniceOverhang = 0.6;
    const corniceGeos: THREE.BufferGeometry[] = [];
    
    const fCornice = new THREE.BoxGeometry(
      width + parapetThickness * 2 + corniceOverhang * 2,
      corniceHeight,
      corniceOverhang
    );
    fCornice.translate(0, -corniceHeight / 2, depth / 2 + corniceOverhang / 2 + parapetThickness / 2);
    corniceGeos.push(fCornice);
    
    const bCornice = fCornice.clone();
    bCornice.translate(0, 0, -depth - corniceOverhang - parapetThickness);
    corniceGeos.push(bCornice);
    
    const lCornice = new THREE.BoxGeometry(
      corniceOverhang,
      corniceHeight,
      depth + corniceOverhang * 2
    );
    lCornice.translate(
      -width / 2 - corniceOverhang / 2 - parapetThickness / 2,
      -corniceHeight / 2,
      0
    );
    corniceGeos.push(lCornice);
    
    const rCornice = lCornice.clone();
    rCornice.translate(width + corniceOverhang + parapetThickness, 0, 0);
    corniceGeos.push(rCornice);
    
    const mergedCornice = mergeGeometries(corniceGeos, false);
    const corniceMaterial = new THREE.MeshStandardMaterial({
      color: parapetColor.clone().offsetHSL(0, 0, 0.05),
      roughness: 0.7,
      metalness: 0.1
    });
    const cornice = new THREE.Mesh(mergedCornice, corniceMaterial);
    cornice.castShadow = true;
    cornice.receiveShadow = true;
    roofGroup.add(cornice);
  }
  
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
  styleIndex: number,
  buildingColor: THREE.Color
): THREE.Mesh {
  const baseHeight = styleIndex > 0.6 ? 1.0 : 0.8;
  const baseExpand = styleIndex > 0.6 ? 1.0 : 0.3;
  
  const baseGeometry = new THREE.BoxGeometry(
    width + baseExpand * 2,
    baseHeight,
    depth + baseExpand * 2
  );
  
  const hsl = { h: 0, s: 0, l: 0 };
  buildingColor.getHSL(hsl);
  const baseColor = new THREE.Color().setHSL(
    hsl.h,
    hsl.s,
    Math.max(0.1, hsl.l - 0.15)
  );
  
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.9,
    metalness: 0.05
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
  
  const hsl = { h: 0, s: 0, l: 0 };
  adjustedColor.getHSL(hsl);
  const frameColor = new THREE.Color().setHSL(
    hsl.h,
    hsl.s,
    Math.max(0.1, hsl.l - 0.25)
  );
  
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
  
  const base = createBase(params.width, params.depth, params.styleIndex, adjustedColor);
  buildingGroup.add(base);
  
  if (params.styleIndex > 0.55) {
    const banding = createFacadeBanding(
      params.width, params.height, params.depth,
      params.styleIndex, adjustedColor
    );
    if (banding) buildingGroup.add(banding);
  }
  
  const frontResult = createWindows(
    params.width, params.height, params.depth,
    params.height, params.styleIndex, true, false, frameColor
  );
  frontResult.windows.forEach(w => {
    buildingGroup.add(w.mesh);
    windowData.push(w);
  });
  frontResult.frames.forEach(f => buildingGroup.add(f));
  
  const backResult = createWindows(
    params.width, params.height, params.depth,
    params.height, params.styleIndex, false, false, frameColor
  );
  backResult.windows.forEach(w => {
    buildingGroup.add(w.mesh);
    windowData.push(w);
  });
  backResult.frames.forEach(f => buildingGroup.add(f));
  
  const leftResult = createWindows(
    params.depth, params.height, params.width,
    params.height, params.styleIndex, true, true, frameColor
  );
  leftResult.windows.forEach(w => {
    const tempX = w.mesh.position.x;
    w.mesh.rotation.y = -Math.PI / 2;
    w.mesh.position.set(-params.width / 2 - 0.01, w.mesh.position.y, -tempX);
    buildingGroup.add(w.mesh);
    windowData.push(w);
  });
  leftResult.frames.forEach(f => {
    const tempX = f.position.x;
    f.rotation.y = -Math.PI / 2;
    f.position.set(-params.width / 2 - 0.02, f.position.y, -tempX);
    buildingGroup.add(f);
  });
  
  const rightResult = createWindows(
    params.depth, params.height, params.width,
    params.height, params.styleIndex, false, true, frameColor
  );
  rightResult.windows.forEach(w => {
    const tempX = w.mesh.position.x;
    w.mesh.rotation.y = Math.PI / 2;
    w.mesh.position.set(params.width / 2 + 0.01, w.mesh.position.y, tempX);
    buildingGroup.add(w.mesh);
    windowData.push(w);
  });
  rightResult.frames.forEach(f => {
    const tempX = f.position.x;
    f.rotation.y = Math.PI / 2;
    f.position.set(params.width / 2 + 0.02, f.position.y, tempX);
    buildingGroup.add(f);
  });
  
  if (params.styleIndex > 0.6) {
    const pilasters = createPilasterDecorations(
      params.width, params.height, params.depth,
      params.styleIndex, adjustedColor
    );
    buildingGroup.add(pilasters);
  }
  
  if (params.styleIndex > 0.7) {
    const roofResult = createGableRoof(
      params.width, params.depth, params.styleIndex, 30
    );
    roofResult.group.position.y = params.height;
    buildingGroup.add(roofResult.group);
  } else {
    const roofGroup = createFlatRoof(
      params.width, params.depth, params.height, params.styleIndex
    );
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
