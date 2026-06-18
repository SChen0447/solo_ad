import * as THREE from 'three';

let particleTexture: THREE.Texture | null = null;
let starTexture: THREE.Texture | null = null;
let highlightTexture: THREE.Texture | null = null;

export function getParticleTexture(): THREE.Texture {
  if (!particleTexture) {
    particleTexture = createRadialGlowTexture({
      size: 256,
      coreColor: [255, 255, 255, 1.0],
      midColor: [180, 210, 255, 0.6],
      outerColor: [100, 150, 255, 0.0],
      coreRadius: 0.12,
      midRadius: 0.35
    });
    particleTexture.needsUpdate = true;
  }
  return particleTexture;
}

export function getStarTexture(): THREE.Texture {
  if (!starTexture) {
    starTexture = createRadialGlowTexture({
      size: 64,
      coreColor: [255, 255, 255, 1.0],
      midColor: [220, 230, 255, 0.5],
      outerColor: [200, 210, 255, 0.0],
      coreRadius: 0.2,
      midRadius: 0.5
    });
    starTexture.needsUpdate = true;
  }
  return starTexture;
}

export function getHighlightTexture(): THREE.Texture {
  if (!highlightTexture) {
    highlightTexture = createRadialGlowTexture({
      size: 256,
      coreColor: [255, 255, 255, 1.0],
      midColor: [255, 255, 255, 0.7],
      outerColor: [200, 220, 255, 0.0],
      coreRadius: 0.1,
      midRadius: 0.45
    });
    highlightTexture.needsUpdate = true;
  }
  return highlightTexture;
}

interface TextureOptions {
  size: number;
  coreColor: [number, number, number, number];
  midColor: [number, number, number, number];
  outerColor: [number, number, number, number];
  coreRadius: number;
  midRadius: number;
}

function createRadialGlowTexture(opts: TextureOptions): THREE.Texture {
  const { size, coreColor, midColor, outerColor, coreRadius, midRadius } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2;

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / maxR;
      const dy = (y - cy) / maxR;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      if (dist <= 1.0) {
        let r: number, g: number, b: number, a: number;

        if (dist <= coreRadius) {
          const t = dist / coreRadius;
          r = lerp(coreColor[0], midColor[0], t);
          g = lerp(coreColor[1], midColor[1], t);
          b = lerp(coreColor[2], midColor[2], t);
          a = lerp(coreColor[3], midColor[3], t);
        } else if (dist <= midRadius) {
          const t = (dist - coreRadius) / (midRadius - coreRadius);
          const easeT = t * t * (3 - 2 * t);
          r = lerp(midColor[0], outerColor[0], easeT);
          g = lerp(midColor[1], outerColor[1], easeT);
          b = lerp(midColor[2], outerColor[2], easeT);
          a = lerp(midColor[3], outerColor[3], easeT);
        } else {
          const t = (dist - midRadius) / (1 - midRadius);
          const easeT = t * t;
          r = lerp(midColor[0], outerColor[0], easeT);
          g = lerp(midColor[1], outerColor[1], easeT);
          b = lerp(midColor[2], outerColor[2], easeT);
          a = lerp(midColor[3], outerColor[3], easeT);
          a *= 1 - easeT;
        }

        data[idx] = Math.max(0, Math.min(255, Math.round(r)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[idx + 3] = Math.max(0, Math.min(255, Math.round(a * 255)));
      } else {
        data[idx + 3] = 0;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  return texture;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getNebulaBackgroundColors(): THREE.Color[] {
  return [
    new THREE.Color('#0a0a2e'),
    new THREE.Color('#1a1a4e'),
    new THREE.Color('#2a1a3e')
  ];
}
