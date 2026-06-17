import * as THREE from 'three';
import { BuildingData } from '../types';

const windowTextureCache = new Map<string, THREE.CanvasTexture>();

export function createWindowTexture(type: 'grid' | 'floor', seed: number): THREE.CanvasTexture {
  const cacheKey = `${type}_${seed}`;
  if (windowTextureCache.has(cacheKey)) {
    return windowTextureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 256, 256);

  if (type === 'grid') {
    const cols = 4 + Math.floor(seed % 3);
    const rows = 6 + Math.floor((seed * 1.5) % 3);
    const cellW = 256 / cols;
    const cellH = 256 / rows;
    const padding = 4;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const isLit = Math.sin(seed + i * 13 + j * 7) > 0.3;
        ctx.fillStyle = isLit 
          ? `rgba(255, 230, 150, ${0.6 + Math.random() * 0.4})`
          : '#2a2a3e';
        
        ctx.fillRect(
          i * cellW + padding,
          j * cellH + padding,
          cellW - padding * 2,
          cellH - padding * 2
        );

        ctx.strokeStyle = '#3a3a4e';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          i * cellW + padding,
          j * cellH + padding,
          cellW - padding * 2,
          cellH - padding * 2
        );
      }
    }
  } else {
    const numWindows = 3 + Math.floor(seed % 2);
    const winWidth = 50 + Math.floor(seed * 2) % 30;
    const winHeight = 200 + Math.floor(seed * 3) % 40;
    const spacing = (256 - winWidth * numWindows) / (numWindows + 1);

    for (let i = 0; i < numWindows; i++) {
      const isLit = Math.sin(seed + i * 17) > 0.2;
      const x = spacing + i * (winWidth + spacing);
      const y = (256 - winHeight) / 2;

      const gradient = ctx.createLinearGradient(x, y, x, y + winHeight);
      if (isLit) {
        gradient.addColorStop(0, 'rgba(255, 240, 180, 0.9)');
        gradient.addColorStop(1, 'rgba(255, 200, 120, 0.7)');
      } else {
        gradient.addColorStop(0, 'rgba(60, 80, 100, 0.8)');
        gradient.addColorStop(1, 'rgba(40, 50, 70, 0.9)');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, winWidth, winHeight);

      ctx.strokeStyle = '#4a4a5e';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, winWidth, winHeight);

      ctx.beginPath();
      ctx.moveTo(x + winWidth / 2, y);
      ctx.lineTo(x + winWidth / 2, y + winHeight);
      ctx.strokeStyle = '#3a3a4e';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  windowTextureCache.set(cacheKey, texture);

  return texture;
}

export function generateRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfW = width / 2;
  const halfD = depth / 2;
  const r = Math.min(radius, halfW * 0.5, halfD * 0.5);

  shape.moveTo(-halfW + r, -halfD);
  shape.lineTo(halfW - r, -halfD);
  shape.quadraticCurveTo(halfW, -halfD, halfW, -halfD + r);
  shape.lineTo(halfW, halfD - r);
  shape.quadraticCurveTo(halfW, halfD, halfW - r, halfD);
  shape.lineTo(-halfW + r, halfD);
  shape.quadraticCurveTo(-halfW, halfD, -halfW, halfD - r);
  shape.lineTo(-halfW, -halfD + r);
  shape.quadraticCurveTo(-halfW, -halfD, -halfW + r, -halfD);

  const extrudeSettings = {
    depth: height,
    bevelEnabled: true,
    bevelThickness: r * 0.5,
    bevelSize: r * 0.3,
    bevelSegments: 3,
    curveSegments: 8
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, height / 2, 0);

  return geometry;
}

export function createBuildingMaterial(
  color: string,
  windowTexture: THREE.CanvasTexture,
  buildingWidth: number,
  buildingHeight: number
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.6,
    metalness: 0.1,
    map: windowTexture
  });

  windowTexture.repeat.set(
    Math.max(1, Math.floor(buildingWidth / 4)),
    Math.max(1, Math.floor(buildingHeight / 8))
  );

  return material;
}

export function createEdgeLines(geometry: THREE.BufferGeometry): THREE.LineSegments {
  const edges = new THREE.EdgesGeometry(geometry);
  const material = new THREE.LineBasicMaterial({
    color: 0x4ea8ff,
    transparent: true,
    opacity: 0.3
  });
  return new THREE.LineSegments(edges, material);
}

export function generateBuildingSeed(buildingId: string): number {
  let hash = 0;
  for (let i = 0; i < buildingId.length; i++) {
    const char = buildingId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 1000;
}

export function getBuildingHeight(building: BuildingData): number {
  return building.floorHeight * building.floorCount;
}

export function clearTextureCache(): void {
  windowTextureCache.forEach((texture) => {
    texture.dispose();
  });
  windowTextureCache.clear();
}
