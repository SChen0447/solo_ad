import * as THREE from 'three';

function createSkyFace(colorTop: string, colorBottom: string, isVertical: boolean = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, colorTop);
  gradient.addColorStop(1, colorBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 300;
    const w = 60 + Math.random() * 100;
    const h = 20 + Math.random() * 30;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

export function createSkyboxEnvironment(): THREE.CubeTexture {
  const topColor = '#87ceeb';
  const bottomColor = '#e0f6ff';
  const sideTop = '#98d8f0';
  const sideBottom = '#c8e8f5';

  const images = [
    createSkyFace(sideTop, sideBottom),
    createSkyFace(sideTop, sideBottom),
    createSkyFace(topColor, bottomColor),
    createSkyFace('#4a90b8', '#7ab8d8'),
    createSkyFace(sideTop, sideBottom),
    createSkyFace(sideTop, sideBottom)
  ];

  const cubeTexture = new THREE.CubeTexture(images);
  cubeTexture.needsUpdate = true;
  cubeTexture.mapping = THREE.CubeReflectionMapping;

  return cubeTexture;
}

export function createGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#2d5a27';
  ctx.fillRect(0, 0, 512, 512);

  const imageData = ctx.getImageData(0, 0, 512, 512);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.sin(i * 0.0001) * Math.cos(i * 0.00013) * 0.5 + 0.5;
    const variation = (noise - 0.5) * 30;

    data[i] = Math.max(0, Math.min(255, data[i] + variation));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + variation * 0.8));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + variation * 0.5));
  }

  ctx.putImageData(imageData, 0, 0);

  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = 3 + Math.random() * 6;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;

    const brightness = 0.7 + Math.random() * 0.6;
    ctx.strokeStyle = `rgba(${Math.floor(60 * brightness + 20)}, ${Math.floor(120 * brightness + 40)}, ${Math.floor(40 * brightness + 10)}, 0.6)`;
    ctx.lineWidth = 0.5 + Math.random() * 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;

  return texture;
}

export function createGrassRoughnessMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const imageData = ctx.createImageData(512, 512);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % 512;
    const y = Math.floor((i / 4) / 512);
    const noise = Math.sin(x * 0.05) * Math.cos(y * 0.07) * 0.5 + Math.sin(x * 0.12 + y * 0.08) * 0.3 + 0.5;
    const value = Math.floor(180 + noise * 60);
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}
