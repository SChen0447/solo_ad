import * as THREE from 'three';

function createBrickTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#b8a082';
  ctx.fillRect(0, 0, 512, 512);

  const brickWidth = 64;
  const brickHeight = 32;
  const mortarSize = 4;
  const mortarColor = '#8b7355';

  for (let row = 0; row < 16; row++) {
    const offset = (row % 2) * (brickWidth / 2);
    for (let col = -1; col < 10; col++) {
      const x = col * brickWidth + offset + mortarSize / 2;
      const y = row * brickHeight + mortarSize / 2;
      const w = brickWidth - mortarSize;
      const h = brickHeight - mortarSize;

      const noise = (Math.sin(col * 12.9898 + row * 78.233) * 43758.5453) % 1;
      const brightness = 0.85 + Math.abs(noise) * 0.3;
      const r = Math.floor(184 * brightness);
      const g = Math.floor(160 * brightness * 0.95);
      const b = Math.floor(130 * brightness * 0.9);

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(x, y + h - 3, w, 3);
      ctx.fillRect(x + w - 2, y, 2, h);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(x, y, w, 2);
      ctx.fillRect(x, y, 2, h);
    }
  }

  ctx.fillStyle = mortarColor;
  for (let row = 0; row <= 16; row++) {
    ctx.fillRect(0, row * brickHeight - mortarSize / 2, 512, mortarSize);
  }
  for (let col = 0; col <= 16; col++) {
    const offset = 0;
    ctx.fillRect(col * brickWidth + offset - mortarSize / 2, 0, mortarSize, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;

  return texture;
}

function createBrickRoughnessMap(): THREE.CanvasTexture {
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
    const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 0.5;
    const value = Math.floor(180 + noise * 50);
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

function createRoofTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#6b3410';
  ctx.fillRect(0, 0, 512, 512);

  const tileWidth = 64;
  const tileHeight = 48;
  const overlap = 12;

  for (let row = 0; row < 12; row++) {
    const offset = (row % 2) * (tileWidth / 2);
    const rowY = row * (tileHeight - overlap);
    for (let col = -1; col < 10; col++) {
      const x = col * tileWidth + offset;
      const y = rowY;

      const noise = (Math.sin(col * 23.1 + row * 45.7) * 1000) % 1;
      const brightness = 0.7 + Math.abs(noise) * 0.6;
      const baseR = 107;
      const baseG = 52;
      const baseB = 16;

      const grad = ctx.createLinearGradient(x, y, x, y + tileHeight);
      grad.addColorStop(0, `rgb(${Math.floor(baseR * brightness)}, ${Math.floor(baseG * brightness)}, ${Math.floor(baseB * brightness)})`);
      grad.addColorStop(0.5, `rgb(${Math.floor(baseR * brightness * 0.85)}, ${Math.floor(baseG * brightness * 0.85)}, ${Math.floor(baseB * brightness * 0.85)})`);
      grad.addColorStop(1, `rgb(${Math.floor(baseR * brightness * 0.6)}, ${Math.floor(baseG * brightness * 0.6)}, ${Math.floor(baseB * brightness * 0.6)})`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + tileWidth, y);
      ctx.lineTo(x + tileWidth, y + tileHeight - overlap);
      ctx.quadraticCurveTo(x + tileWidth / 2, y + tileHeight, x, y + tileHeight - overlap);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(x + 4, y + 2, tileWidth - 8, 4);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(x + 2, y + tileHeight - overlap - 2, tileWidth - 4, 3);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;

  return texture;
}

function createRoofRoughnessMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const tileWidth = 64;
  const tileHeight = 48;
  const overlap = 12;

  ctx.fillStyle = 'rgb(200, 200, 200)';
  ctx.fillRect(0, 0, 512, 512);

  for (let row = 0; row < 12; row++) {
    const offset = (row % 2) * (tileWidth / 2);
    const rowY = row * (tileHeight - overlap);
    for (let col = -1; col < 10; col++) {
      const x = col * tileWidth + offset;
      const y = rowY;

      ctx.fillStyle = 'rgb(150, 150, 150)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + tileWidth, y);
      ctx.lineTo(x + tileWidth, y + tileHeight - overlap);
      ctx.quadraticCurveTo(x + tileWidth / 2, y + tileHeight, x, y + tileHeight - overlap);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgb(100, 100, 100)';
      ctx.fillRect(x + 2, y + tileHeight - overlap - 4, tileWidth - 4, 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}

export interface BuildingOptions {
  envMap?: THREE.CubeTexture | null;
}

export function createBuilding(options: BuildingOptions = {}): THREE.Group {
  const { envMap = null } = options;
  const building = new THREE.Group();
  building.name = 'building';

  const brickTexture = createBrickTexture();
  const brickRoughness = createBrickRoughnessMap();
  brickTexture.repeat.set(4, 2);
  brickRoughness.repeat.set(4, 2);

  const wallMaterial = new THREE.MeshStandardMaterial({
    map: brickTexture,
    roughnessMap: brickRoughness,
    roughness: 0.85,
    metalness: 0.05,
    color: 0xffffff
  });

  const roofTileTexture = createRoofTileTexture();
  const roofRoughness = createRoofRoughnessMap();
  roofTileTexture.repeat.set(3, 4);
  roofRoughness.repeat.set(3, 4);

  const roofMaterial = new THREE.MeshStandardMaterial({
    map: roofTileTexture,
    roughnessMap: roofRoughness,
    roughness: 0.9,
    metalness: 0.02,
    color: 0xffffff
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xaaddff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.05,
    metalness: 0.0,
    transmission: 0.7,
    ior: 1.5,
    thickness: 0.15,
    specularIntensity: 1.2,
    envMapIntensity: 1.5,
    envMap: envMap,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });

  const windowFrameMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c2c2c,
    roughness: 0.4,
    metalness: 0.6
  });

  const baseWidth = 8;
  const baseDepth = 6;
  const wallHeight = 4;
  const wallThickness = 0.3;

  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(baseWidth, wallHeight, wallThickness),
    wallMaterial
  );
  frontWall.position.set(0, wallHeight / 2, -baseDepth / 2);
  frontWall.castShadow = true;
  frontWall.receiveShadow = true;
  building.add(frontWall);

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(baseWidth, wallHeight, wallThickness),
    wallMaterial
  );
  backWall.position.set(0, wallHeight / 2, baseDepth / 2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  building.add(backWall);

  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, wallHeight, baseDepth),
    wallMaterial
  );
  leftWall.position.set(-baseWidth / 2, wallHeight / 2, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  building.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, wallHeight, baseDepth),
    wallMaterial
  );
  rightWall.position.set(baseWidth / 2, wallHeight / 2, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  building.add(rightWall);

  const roofHeight = 2;
  const roofGeometry = new THREE.ConeGeometry(baseWidth * 0.75, roofHeight, 4);
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.set(0, wallHeight + roofHeight / 2, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  roof.receiveShadow = true;
  building.add(roof);

  const largeGlassWidth = 3;
  const largeGlassHeight = 2.5;
  const largeGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(largeGlassWidth, largeGlassHeight),
    glassMaterial
  );
  largeGlass.position.set(0, wallHeight * 0.45, -baseDepth / 2 + wallThickness / 2 + 0.01);
  building.add(largeGlass);

  const frameThickness = 0.15;
  const frameDepth = 0.08;

  const topFrame = new THREE.Mesh(
    new THREE.BoxGeometry(largeGlassWidth + frameThickness * 2, frameThickness, frameDepth),
    windowFrameMaterial
  );
  topFrame.position.set(0, largeGlassHeight / 2 + frameThickness / 2, -baseDepth / 2 + wallThickness / 2 + 0.02);
  building.add(topFrame);

  const bottomFrame = new THREE.Mesh(
    new THREE.BoxGeometry(largeGlassWidth + frameThickness * 2, frameThickness, frameDepth),
    windowFrameMaterial
  );
  bottomFrame.position.set(0, -largeGlassHeight / 2 - frameThickness / 2, -baseDepth / 2 + wallThickness / 2 + 0.02);
  building.add(bottomFrame);

  const leftFrame = new THREE.Mesh(
    new THREE.BoxGeometry(frameThickness, largeGlassHeight + frameThickness * 2, frameDepth),
    windowFrameMaterial
  );
  leftFrame.position.set(-largeGlassWidth / 2 - frameThickness / 2, 0, -baseDepth / 2 + wallThickness / 2 + 0.02);
  building.add(leftFrame);

  const rightFrame = new THREE.Mesh(
    new THREE.BoxGeometry(frameThickness, largeGlassHeight + frameThickness * 2, frameDepth),
    windowFrameMaterial
  );
  rightFrame.position.set(largeGlassWidth / 2 + frameThickness / 2, 0, -baseDepth / 2 + wallThickness / 2 + 0.02);
  building.add(rightFrame);

  const smallWindowSize = 1.2;
  const smallGlassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xaaddff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.05,
    metalness: 0.0,
    transmission: 0.7,
    ior: 1.5,
    thickness: 0.1,
    specularIntensity: 1.0,
    envMapIntensity: 1.5,
    envMap: envMap,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });

  const rightWindow1 = new THREE.Mesh(
    new THREE.PlaneGeometry(smallWindowSize, smallWindowSize * 0.8),
    smallGlassMaterial
  );
  rightWindow1.position.set(baseWidth / 2 + 0.01, wallHeight * 0.55, -baseDepth / 4);
  rightWindow1.rotation.y = Math.PI / 2;
  building.add(rightWindow1);

  const rightWindow2 = new THREE.Mesh(
    new THREE.PlaneGeometry(smallWindowSize, smallWindowSize * 0.8),
    smallGlassMaterial
  );
  rightWindow2.position.set(baseWidth / 2 + 0.01, wallHeight * 0.55, baseDepth / 4);
  rightWindow2.rotation.y = Math.PI / 2;
  building.add(rightWindow2);

  const leftWindow1 = new THREE.Mesh(
    new THREE.PlaneGeometry(smallWindowSize, smallWindowSize * 0.8),
    smallGlassMaterial
  );
  leftWindow1.position.set(-baseWidth / 2 - 0.01, wallHeight * 0.55, -baseDepth / 4);
  leftWindow1.rotation.y = -Math.PI / 2;
  building.add(leftWindow1);

  const leftWindow2 = new THREE.Mesh(
    new THREE.PlaneGeometry(smallWindowSize, smallWindowSize * 0.8),
    smallGlassMaterial
  );
  leftWindow2.position.set(-baseWidth / 2 - 0.01, wallHeight * 0.55, baseDepth / 4);
  leftWindow2.rotation.y = -Math.PI / 2;
  building.add(leftWindow2);

  const backWindow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.2),
    smallGlassMaterial
  );
  backWindow.position.set(1, wallHeight * 0.5, baseDepth / 2 + 0.01);
  backWindow.rotation.y = Math.PI;
  building.add(backWindow);

  const doorWidth = 1.2;
  const doorHeight = 2.2;
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    roughness: 0.85,
    metalness: 0.05
  });
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth, doorHeight, 0.1),
    doorMaterial
  );
  door.position.set(-baseWidth / 4, doorHeight / 2, -baseDepth / 2 + wallThickness / 2 + 0.05);
  building.add(door);

  const doorHandleMaterial = new THREE.MeshStandardMaterial({
    color: 0xc0c0c0,
    roughness: 0.3,
    metalness: 0.8
  });
  const doorHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.12, 16),
    doorHandleMaterial
  );
  doorHandle.rotation.x = Math.PI / 2;
  doorHandle.position.set(-baseWidth / 4 + doorWidth / 2 - 0.15, doorHeight / 2, -baseDepth / 2 + wallThickness / 2 + 0.11);
  building.add(doorHandle);

  return building;
}
