import * as THREE from 'three';

function createSkyFace(colorTop: string, colorBottom: string): HTMLCanvasElement {
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

function wrapTexture(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const wrapped = document.createElement('canvas');
  wrapped.width = size;
  wrapped.height = size;
  const wctx = wrapped.getContext('2d');
  if (!wctx) return canvas;

  wctx.drawImage(canvas, 0, 0);
  wctx.drawImage(canvas, -size, 0);
  wctx.drawImage(canvas, 0, -size);
  wctx.drawImage(canvas, -size, -size);

  return wrapped;
}

export function createBrickTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#7a6a58';
  ctx.fillRect(0, 0, size, size);

  const stretcherWidth = 160;
  const headerWidth = 80;
  const brickHeight = 60;
  const mortarSize = 10;
  const courseHeight = brickHeight + mortarSize;

  let course = 0;
  for (let y = -courseHeight; y < size + courseHeight; y += courseHeight) {
    const isEvenCourse = course % 2 === 0;
    let x = isEvenCourse ? 0 : -stretcherWidth / 2;

    while (x < size + stretcherWidth) {
      if (isEvenCourse) {
        drawBrick(ctx, x + mortarSize / 2, y + mortarSize / 2, stretcherWidth - mortarSize, brickHeight - mortarSize);
        x += stretcherWidth;
      } else {
        if (course % 4 === 1) {
          drawBrick(ctx, x + mortarSize / 2, y + mortarSize / 2, headerWidth - mortarSize, brickHeight - mortarSize);
          x += headerWidth;
          drawBrick(ctx, x + mortarSize / 2, y + mortarSize / 2, stretcherWidth - mortarSize, brickHeight - mortarSize);
          x += stretcherWidth;
        } else {
          drawBrick(ctx, x + mortarSize / 2, y + mortarSize / 2, stretcherWidth - mortarSize, brickHeight - mortarSize);
          x += stretcherWidth;
          drawBrick(ctx, x + mortarSize / 2, y + mortarSize / 2, headerWidth - mortarSize, brickHeight - mortarSize);
          x += headerWidth;
        }
      }
    }
    course++;
  }

  ctx.fillStyle = 'rgba(100, 85, 65, 0.35)';
  for (let y = 0; y < size; y += courseHeight) {
    ctx.fillRect(0, y, size, mortarSize);
  }

  const finalCanvas = wrapTexture(canvas);
  const texture = new THREE.CanvasTexture(finalCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;

  return texture;
}

function drawBrick(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const seed = x * 13.37 + y * 7.13;
  const noise = Math.sin(seed) * 43758.5453 % 1;
  const baseBrightness = 0.82 + Math.abs(noise) * 0.35;

  const baseR = Math.floor(196 * baseBrightness);
  const baseG = Math.floor(162 * baseBrightness * 0.95);
  const baseB = Math.floor(128 * baseBrightness * 0.88);

  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, `rgb(${baseR}, ${baseG}, ${baseB})`);
  grad.addColorStop(0.4, `rgb(${Math.floor(baseR * 1.05)}, ${Math.floor(baseG * 1.05)}, ${Math.floor(baseB * 1.05)})`);
  grad.addColorStop(1, `rgb(${Math.floor(baseR * 0.88)}, ${Math.floor(baseG * 0.88)}, ${Math.floor(baseB * 0.88)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  for (let i = 0; i < 30; i++) {
    const dx = x + Math.random() * w;
    const dy = y + Math.random() * h;
    const dr = 1 + Math.random() * 2.5;
    const tone = Math.random() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.arc(dx, dy, dr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillRect(x + w - 2, y, 2, h);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y, 2, h);

  ctx.strokeStyle = 'rgba(90, 75, 60, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export function createBrickRoughnessMap(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  const stretcherWidth = 160;
  const headerWidth = 80;
  const brickHeight = 60;
  const mortarSize = 10;
  const courseHeight = brickHeight + mortarSize;

  for (let py = 0; py < size; py++) {
    const courseIdx = Math.floor(py / courseHeight);
    const inMortarY = py % courseHeight >= brickHeight;
    const yInBrick = py % courseHeight;

    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;
      const isEvenCourse = courseIdx % 2 === 0;

      let inMortarX = false;
      let xOffset = isEvenCourse ? 0 : stretcherWidth / 2;
      let effectiveX = (px + xOffset) % (stretcherWidth + headerWidth + mortarSize * 2);

      if (!isEvenCourse) {
        if (courseIdx % 4 === 1) {
          if (effectiveX < headerWidth - mortarSize) {
          } else if (effectiveX >= headerWidth - mortarSize && effectiveX < headerWidth) {
            inMortarX = true;
          } else {
            effectiveX = effectiveX - headerWidth;
            if (effectiveX >= stretcherWidth - mortarSize) inMortarX = true;
          }
        } else {
          if (effectiveX < stretcherWidth - mortarSize) {
          } else if (effectiveX >= stretcherWidth - mortarSize && effectiveX < stretcherWidth) {
            inMortarX = true;
          } else {
            effectiveX = effectiveX - stretcherWidth;
            if (effectiveX >= headerWidth - mortarSize) inMortarX = true;
          }
        }
      } else {
        effectiveX = px % stretcherWidth;
        if (effectiveX >= stretcherWidth - mortarSize) inMortarX = true;
      }

      const inMortar = inMortarX || inMortarY;
      let val: number;

      if (inMortar) {
        val = 220;
      } else {
        const noise = Math.sin(px * 0.05) * Math.cos(py * 0.07) * 0.5 + Math.sin(px * 0.13 + py * 0.09) * 0.3 + 0.5;
        val = Math.floor(170 + noise * 40);
      }

      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const finalCanvas = wrapTexture(canvas);
  const texture = new THREE.CanvasTexture(finalCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}

export function createBrickNormalMap(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const stretcherWidth = 160;
  const headerWidth = 80;
  const brickHeight = 60;
  const mortarSize = 10;
  const courseHeight = brickHeight + mortarSize;

  const heightMap = new Float32Array(size * size);
  const mortarDepth = 0.5;
  const bevelSize = 3;

  for (let py = 0; py < size; py++) {
    const courseIdx = Math.floor(py / courseHeight);
    const yInCourse = py % courseHeight;
    const isEvenCourse = courseIdx % 2 === 0;

    for (let px = 0; px < size; px++) {
      let xOffset = isEvenCourse ? 0 : stretcherWidth / 2;
      let effectiveX = (px + xOffset);
      let period = stretcherWidth;

      if (!isEvenCourse) {
        period = stretcherWidth + headerWidth + mortarSize;
        effectiveX = (px + xOffset) % period;
      }

      let distToMortarX = Infinity;
      let distToMortarY = Infinity;

      const yToTopMortar = yInCourse;
      const yToBottomMortar = courseHeight - yInCourse - mortarSize;
      const yToBevelTop = Math.min(yToTopMortar, brickHeight - yInCourse);
      const yToBevelBot = Math.min(yToBottomMortar, yInCourse);
      distToMortarY = Math.min(yToTopMortar, yToBottomMortar, brickHeight - yInCourse, yInCourse);

      if (isEvenCourse) {
        const xInBrick = effectiveX % stretcherWidth;
        distToMortarX = Math.min(xInBrick, stretcherWidth - mortarSize - xInBrick);
      } else {
        if (courseIdx % 4 === 1) {
          if (effectiveX < headerWidth) {
            distToMortarX = Math.min(effectiveX, headerWidth - mortarSize - effectiveX);
          } else {
            const xIn = effectiveX - headerWidth;
            distToMortarX = Math.min(xIn, stretcherWidth - mortarSize - xIn);
          }
        } else {
          if (effectiveX < stretcherWidth) {
            distToMortarX = Math.min(effectiveX, stretcherWidth - mortarSize - effectiveX);
          } else {
            const xIn = effectiveX - stretcherWidth;
            distToMortarX = Math.min(xIn, headerWidth - mortarSize - xIn);
          }
        }
      }

      const inBrickBody = yInCourse < brickHeight - mortarSize / 2 && distToMortarX > 0;
      let height = inBrickBody ? 1.0 : mortarDepth;

      if (inBrickBody) {
        const bevel = Math.min(distToMortarX, yInCourse, brickHeight - mortarSize - yInCourse, stretcherWidth - mortarSize - distToMortarX);
        if (bevel < bevelSize) {
          height = mortarDepth + (1.0 - mortarDepth) * (bevel / bevelSize);
        }

        const noise = Math.sin(px * 0.08) * Math.cos(py * 0.1) * 0.05;
        height += noise;
      }

      heightMap[py * size + px] = height;
    }
  }

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  const strength = 2.0;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;

      const hl = heightMap[py * size + ((px - 1 + size) % size)];
      const hr = heightMap[py * size + ((px + 1) % size)];
      const hu = heightMap[((py - 1 + size) % size) * size + px];
      const hd = heightMap[((py + 1) % size) * size + px];

      let dx = (hl - hr) * strength;
      let dy = (hu - hd) * strength;
      const dz = 1.0;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      dx /= len;
      dy /= len;
      const dzNorm = dz / len;

      data[idx] = Math.floor((dx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((dy * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((dzNorm * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const finalCanvas = wrapTexture(canvas);
  const texture = new THREE.CanvasTexture(finalCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}

export function createBrickDisplacementMap(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const stretcherWidth = 160;
  const headerWidth = 80;
  const brickHeight = 60;
  const mortarSize = 10;
  const courseHeight = brickHeight + mortarSize;

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let py = 0; py < size; py++) {
    const courseIdx = Math.floor(py / courseHeight);
    const yInCourse = py % courseHeight;
    const isEvenCourse = courseIdx % 2 === 0;
    const inMortarY = yInCourse >= brickHeight - mortarSize / 2;

    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;

      let xOffset = isEvenCourse ? 0 : stretcherWidth / 2;
      let inMortarX = false;

      if (isEvenCourse) {
        const xIn = (px + xOffset) % stretcherWidth;
        inMortarX = xIn >= stretcherWidth - mortarSize;
      } else {
        const period = stretcherWidth + headerWidth;
        const xIn = (px + xOffset) % period;
        if (courseIdx % 4 === 1) {
          if (xIn >= headerWidth - mortarSize && xIn < headerWidth) inMortarX = true;
          if (xIn >= headerWidth + stretcherWidth - mortarSize) inMortarX = true;
        } else {
          if (xIn >= stretcherWidth - mortarSize && xIn < stretcherWidth) inMortarX = true;
          if (xIn >= stretcherWidth + headerWidth - mortarSize) inMortarX = true;
        }
      }

      const val = (inMortarX || inMortarY) ? 60 : 255;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const finalCanvas = wrapTexture(canvas);
  const texture = new THREE.CanvasTexture(finalCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}

export function createRoofTileTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#5a2c0d';
  ctx.fillRect(0, 0, size, size);

  const tileWidth = 128;
  const tileHeight = 96;
  const overlap = 24;
  const stepY = tileHeight - overlap;

  for (let row = -1; row < size / stepY + 2; row++) {
    const offset = (row % 2) * (tileWidth / 2);
    const y = row * stepY;

    for (let col = -2; col < size / tileWidth + 2; col++) {
      const x = col * tileWidth + offset;
      drawRoofTile(ctx, x, y, tileWidth, tileHeight, overlap, col, row);
    }
  }

  const finalCanvas = wrapTexture(canvas);
  const texture = new THREE.CanvasTexture(finalCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;

  return texture;
}

function drawRoofTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  overlap: number,
  col: number,
  row: number
): void {
  const seed = col * 17.3 + row * 91.7;
  const noise = Math.sin(seed) * 10000 % 1;
  const brightness = 0.75 + Math.abs(noise) * 0.5;

  const baseR = Math.floor(107 * brightness);
  const baseG = Math.floor(52 * brightness * 0.95);
  const baseB = Math.floor(16 * brightness * 0.9);

  const topY = y;
  const bottomY = y + h;
  const headY = y + h - overlap;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x + w, topY);
  ctx.lineTo(x + w, headY);
  ctx.quadraticCurveTo(x + w * 0.75, headY + overlap * 0.9, x + w / 2, bottomY);
  ctx.quadraticCurveTo(x + w * 0.25, headY + overlap * 0.9, x, headY);
  ctx.closePath();
  ctx.clip();

  const grad = ctx.createLinearGradient(x, topY, x, bottomY);
  grad.addColorStop(0, `rgb(${Math.floor(baseR * 1.15)}, ${Math.floor(baseG * 1.15)}, ${Math.floor(baseB * 1.15)})`);
  grad.addColorStop(0.35, `rgb(${baseR}, ${baseG}, ${baseB})`);
  grad.addColorStop(0.7, `rgb(${Math.floor(baseR * 0.8)}, ${Math.floor(baseG * 0.8)}, ${Math.floor(baseB * 0.8)})`);
  grad.addColorStop(1, `rgb(${Math.floor(baseR * 0.55)}, ${Math.floor(baseG * 0.55)}, ${Math.floor(baseB * 0.55)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(x, topY, w, h);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const waveX = x + (i + 0.5) * (w / 8);
    const waveY = topY + Math.sin(i * 0.8 + col) * 3 + 10;
    ctx.beginPath();
    ctx.moveTo(waveX, topY + 4);
    ctx.quadraticCurveTo(waveX + 4, waveY, waveX, headY - 4);
    ctx.stroke();
  }

  for (let i = 0; i < 50; i++) {
    const px = x + Math.random() * w;
    const py = topY + Math.random() * (bottomY - topY);
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.arc(px, py, 0.8 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x + w, topY);
  ctx.lineTo(x + w, headY);
  ctx.quadraticCurveTo(x + w * 0.75, headY + overlap * 0.9, x + w / 2, bottomY);
  ctx.quadraticCurveTo(x + w * 0.25, headY + overlap * 0.9, x, headY);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(30, 15, 5, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(x + 3, topY + 2, w - 6, 3);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.moveTo(x, headY - 2);
  ctx.lineTo(x + w, headY - 2);
  ctx.lineTo(x + w - 4, headY + 3);
  ctx.quadraticCurveTo(x + w / 2, headY + overlap * 0.6, x + 4, headY + 3);
  ctx.closePath();
  ctx.fill();
}

export function createRoofRoughnessMap(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = 'rgb(100, 100, 100)';
  ctx.fillRect(0, 0, size, size);

  const tileWidth = 128;
  const tileHeight = 96;
  const overlap = 24;
  const stepY = tileHeight - overlap;

  for (let row = -1; row < size / stepY + 2; row++) {
    const offset = (row % 2) * (tileWidth / 2);
    const y = row * stepY;

    for (let col = -2; col < size / tileWidth + 2; col++) {
      const x = col * tileWidth + offset;
      const headY = y + tileHeight - overlap;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + tileWidth, y);
      ctx.lineTo(x + tileWidth, headY);
      ctx.quadraticCurveTo(x + tileWidth * 0.75, headY + overlap * 0.9, x + tileWidth / 2, y + tileHeight);
      ctx.quadraticCurveTo(x + tileWidth * 0.25, headY + overlap * 0.9, x, headY);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = 'rgb(160, 160, 160)';
      ctx.fillRect(x, y, tileWidth, tileHeight);
      ctx.restore();

      ctx.fillStyle = 'rgb(70, 70, 70)';
      ctx.fillRect(x, headY - 1, tileWidth, 4);
    }
  }

  const finalCanvas = wrapTexture(canvas);
  const texture = new THREE.CanvasTexture(finalCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}

export function createRoofNormalMap(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const tileWidth = 128;
  const tileHeight = 96;
  const overlap = 24;
  const stepY = tileHeight - overlap;
  const headH = tileHeight - overlap;

  const heightMap = new Float32Array(size * size);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let maxHeight = 0;

      for (let row = -1; row < size / stepY + 2; row++) {
        const offset = (row % 2) * (tileWidth / 2);
        const baseY = row * stepY;
        const headY = baseY + headH;

        for (let col = -2; col < size / tileWidth + 2; col++) {
          const baseX = col * tileWidth + offset;

          if (px < baseX || px > baseX + tileWidth) continue;
          if (py < baseY || py > baseY + tileHeight) continue;

          let h = 0;

          if (py <= headY) {
            h = 0.7 + 0.3 * Math.sin(((px - baseX) / tileWidth) * Math.PI * 4);
          } else {
            const t = (py - headY) / overlap;
            const cx = baseX + tileWidth / 2;
            const dx = (px - cx) / (tileWidth / 2);
            const arcH = Math.sqrt(Math.max(0, 1 - dx * dx));
            h = 0.7 * arcH * (1 - t);
          }

          if (h > maxHeight) maxHeight = h;
        }
      }

      const edgeNoise = Math.sin(px * 0.06) * Math.cos(py * 0.08) * 0.04;
      heightMap[py * size + px] = Math.max(0, Math.min(1, maxHeight + edgeNoise));
    }
  }

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  const strength = 3.0;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;

      const hl = heightMap[py * size + ((px - 1 + size) % size)];
      const hr = heightMap[py * size + ((px + 1) % size)];
      const hu = heightMap[((py - 1 + size) % size) * size + px];
      const hd = heightMap[((py + 1) % size) * size + px];

      let dx = (hl - hr) * strength;
      let dy = (hu - hd) * strength;
      const dz = 1.0;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      dx /= len;
      dy /= len;
      const dzNorm = dz / len;

      data[idx] = Math.floor((dx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((dy * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((dzNorm * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const finalCanvas = wrapTexture(canvas);
  const texture = new THREE.CanvasTexture(finalCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}

export function createRoofDisplacementMap(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const tileWidth = 128;
  const tileHeight = 96;
  const overlap = 24;
  const stepY = tileHeight - overlap;
  const headH = tileHeight - overlap;

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;
      let maxHeight = 30;

      for (let row = -1; row < size / stepY + 2; row++) {
        const offset = (row % 2) * (tileWidth / 2);
        const baseY = row * stepY;
        const headY = baseY + headH;

        for (let col = -2; col < size / tileWidth + 2; col++) {
          const baseX = col * tileWidth + offset;

          if (px < baseX || px > baseX + tileWidth) continue;
          if (py < baseY || py > baseY + tileHeight) continue;

          let h = 30;

          if (py <= headY) {
            h = 180 + 60 * Math.sin(((px - baseX) / tileWidth) * Math.PI * 4);
          } else {
            const t = (py - headY) / overlap;
            const cx = baseX + tileWidth / 2;
            const dx = (px - cx) / (tileWidth / 2);
            const arcH = Math.sqrt(Math.max(0, 1 - dx * dx));
            h = 30 + 200 * arcH * (1 - t);
          }

          if (h > maxHeight) maxHeight = h;
        }
      }

      const val = Math.floor(maxHeight);
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const finalCanvas = wrapTexture(canvas);
  const texture = new THREE.CanvasTexture(finalCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}

export function createGrassTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#2d5a27';
  ctx.fillRect(0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % size;
    const y = Math.floor((i / 4) / size);
    const n1 = Math.sin(x * 0.01) * Math.cos(y * 0.013) * 0.5 + 0.5;
    const n2 = Math.sin(x * 0.03 + y * 0.02) * 0.3;
    const variation = (n1 - 0.5) * 40 + n2 * 20;

    data[i] = Math.max(0, Math.min(255, data[i] + variation));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + variation * 1.1 + 10));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + variation * 0.5));
  }

  ctx.putImageData(imageData, 0, 0);

  for (let cluster = 0; cluster < 80; cluster++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const clusterR = 20 + Math.random() * 40;
    const density = 4 + Math.floor(Math.random() * 5);

    for (let b = 0; b < density; b++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * clusterR;
      const bx = cx + Math.cos(angle) * dist;
      const by = cy + Math.sin(angle) * dist;
      drawGrassBlade(ctx, bx, by);
    }
  }

  for (let i = 0; i < 2500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    drawGrassBlade(ctx, x, y);
  }

  const finalCanvas = wrapTexture(canvas);
  const texture = new THREE.CanvasTexture(finalCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;

  return texture;
}

function drawGrassBlade(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const len = 4 + Math.random() * 10;
  const thickness = 0.6 + Math.random() * 1.2;
  const baseAngle = -Math.PI / 2;
  const bend = (Math.random() - 0.5) * 0.9;
  const bendAngle = baseAngle + bend;

  const tipX = x + Math.cos(bendAngle) * len;
  const tipY = y + Math.sin(bendAngle) * len;

  const brightness = 0.55 + Math.random() * 0.65;
  const r = Math.floor(40 * brightness + 20);
  const g = Math.floor(110 * brightness + 50);
  const bVar = Math.floor(30 * brightness);

  const grad = ctx.createLinearGradient(x, y, tipX, tipY);
  grad.addColorStop(0, `rgba(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${bVar}, 0.85)`);
  grad.addColorStop(1, `rgba(${r}, ${g}, ${bVar + 10}, 0.95)`);

  ctx.strokeStyle = grad;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(
    x + Math.cos(baseAngle + bend * 0.5) * len * 0.6,
    y + Math.sin(baseAngle + bend * 0.5) * len * 0.6,
    tipX,
    tipY
  );
  ctx.stroke();
}

export function createGrassRoughnessMap(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % size;
    const y = Math.floor((i / 4) / size);
    const noise = Math.sin(x * 0.03) * Math.cos(y * 0.04) * 0.5 + Math.sin(x * 0.08 + y * 0.06) * 0.3 + 0.5;
    const value = Math.floor(200 + noise * 45);
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);

  const finalCanvas = wrapTexture(canvas);
  const texture = new THREE.CanvasTexture(finalCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}

export function createGrassNormalMap(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const heightMap = new Float32Array(size * size);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const n1 = Math.sin(px * 0.01) * Math.cos(py * 0.013);
      const n2 = Math.sin(px * 0.04 + py * 0.03) * 0.5;
      const n3 = Math.sin(px * 0.1 - py * 0.08) * 0.25;
      heightMap[py * size + px] = 0.5 + (n1 + n2 + n3) * 0.3;
    }
  }

  for (let cluster = 0; cluster < 80; cluster++) {
    const cx = Math.floor(Math.random() * size);
    const cy = Math.floor(Math.random() * size);
    const clusterR = 20 + Math.floor(Math.random() * 40);

    for (let b = 0; b < 8; b++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * clusterR;
      const bx = Math.floor(cx + Math.cos(angle) * dist);
      const by = Math.floor(cy + Math.sin(angle) * dist);
      const len = 4 + Math.floor(Math.random() * 10);
      const bend = (Math.random() - 0.5) * 0.9;
      const baseAngle = -Math.PI / 2;

      for (let t = 0; t < len; t++) {
        const progress = t / len;
        const curAngle = baseAngle + bend * progress;
        const gx = Math.floor(bx + Math.cos(curAngle) * t);
        const gy = Math.floor(by + Math.sin(curAngle) * t);

        if (gx >= 0 && gx < size && gy >= 0 && gy < size) {
          const h = 0.7 + 0.3 * (1 - progress);
          if (h > heightMap[gy * size + gx]) {
            heightMap[gy * size + gx] = h;
          }
        }
      }
    }
  }

  for (let i = 0; i < 2500; i++) {
    const bx = Math.floor(Math.random() * size);
    const by = Math.floor(Math.random() * size);
    const len = 4 + Math.floor(Math.random() * 10);
    const bend = (Math.random() - 0.5) * 0.9;
    const baseAngle = -Math.PI / 2;

    for (let t = 0; t < len; t++) {
      const progress = t / len;
      const curAngle = baseAngle + bend * progress;
      const gx = Math.floor(bx + Math.cos(curAngle) * t);
      const gy = Math.floor(by + Math.sin(curAngle) * t);

      if (gx >= 0 && gx < size && gy >= 0 && gy < size) {
        const h = 0.7 + 0.3 * (1 - progress);
        if (h > heightMap[gy * size + gx]) {
          heightMap[gy * size + gx] = h;
        }
      }
    }
  }

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  const strength = 2.5;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;

      const hl = heightMap[py * size + ((px - 1 + size) % size)];
      const hr = heightMap[py * size + ((px + 1) % size)];
      const hu = heightMap[((py - 1 + size) % size) * size + px];
      const hd = heightMap[((py + 1) % size) * size + px];

      let dx = (hl - hr) * strength;
      let dy = (hu - hd) * strength;
      const dz = 1.0;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      dx /= len;
      dy /= len;
      const dzNorm = dz / len;

      data[idx] = Math.floor((dx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((dy * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((dzNorm * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const finalCanvas = wrapTexture(canvas);
  const texture = new THREE.CanvasTexture(finalCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}

export function createGrassHeightMap(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;
      const n1 = Math.sin(px * 0.01) * Math.cos(py * 0.013);
      const n2 = Math.sin(px * 0.04 + py * 0.03) * 0.5;
      const val = Math.floor(128 + (n1 + n2) * 40);
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const finalCanvas = wrapTexture(canvas);
  const texture = new THREE.CanvasTexture(finalCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}
