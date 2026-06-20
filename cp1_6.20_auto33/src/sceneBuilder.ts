import * as THREE from 'three';

export interface GalleryScene {
  scene: THREE.Scene;
  exhibits: {
    statue: THREE.Group;
    painting: THREE.Mesh;
    vase: THREE.Group;
  };
  floor: THREE.Mesh;
}

export function buildScene(): GalleryScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a12);

  const roomSize = 20;
  const roomHeight = 8;

  const floorTexture = createCheckerboardTexture();
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(10, 10);

  const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
  const floorMaterial = new THREE.MeshLambertMaterial({
    map: floorTexture,
    side: THREE.DoubleSide
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMaterial = new THREE.MeshLambertMaterial({
    color: 0x2a2a3a,
    side: THREE.DoubleSide
  });

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomHeight),
    wallMaterial
  );
  backWall.position.set(0, roomHeight / 2, -roomSize / 2);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const frontWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomHeight),
    wallMaterial
  );
  frontWall.position.set(0, roomHeight / 2, roomSize / 2);
  frontWall.receiveShadow = true;
  scene.add(frontWall);

  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomHeight),
    wallMaterial
  );
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-roomSize / 2, roomHeight / 2, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomHeight),
    wallMaterial
  );
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(roomSize / 2, roomHeight / 2, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshLambertMaterial({ color: 0x1a1a28, side: THREE.DoubleSide })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = roomHeight;
  scene.add(ceiling);

  const statue = createStatue();
  statue.position.set(-4, 0, -2);
  scene.add(statue);

  const painting = createPainting();
  painting.position.set(0, 3, -roomSize / 2 + 0.05);
  scene.add(painting);

  const vase = createVase();
  vase.position.set(4, 0, -2);
  scene.add(vase);

  return {
    scene,
    exhibits: { statue, painting, vase },
    floor
  };
}

function createCheckerboardTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const tileSize = 32;
  for (let y = 0; y < size; y += tileSize) {
    for (let x = 0; x < size; x += tileSize) {
      const isLight = ((x / tileSize) + (y / tileSize)) % 2 === 0;
      ctx.fillStyle = isLight ? '#4a4a5a' : '#2a2a3a';
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createStatue(): THREE.Group {
  const group = new THREE.Group();

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4c5a9,
    roughness: 0.5,
    metalness: 0.1
  });

  const baseGeometry = new THREE.CylinderGeometry(1.2, 1.5, 0.5, 32);
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = 0.25;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8dcc8,
    roughness: 0.4,
    metalness: 0.05
  });

  const bodyGeometry = new THREE.CylinderGeometry(0.6, 0.9, 2.5, 32);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 1.75;
  body.castShadow = true;
  group.add(body);

  const headGeometry = new THREE.SphereGeometry(0.55, 32, 32);
  const head = new THREE.Mesh(headGeometry, bodyMaterial);
  head.position.y = 3.5;
  head.castShadow = true;
  group.add(head);

  const pedestalGeometry = new THREE.CylinderGeometry(1.5, 1.8, 0.3, 32);
  const pedestal = new THREE.Mesh(pedestalGeometry, baseMaterial);
  pedestal.position.y = 0.15;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  return group;
}

function createPainting(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 512, 384);
  gradient.addColorStop(0, '#ff6b6b');
  gradient.addColorStop(0.3, '#feca57');
  gradient.addColorStop(0.6, '#48dbfb');
  gradient.addColorStop(1, '#a29bfe');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 384);

  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 384;
    const r = 30 + Math.random() * 60;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.8)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#2c2c3c';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, 496, 368);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const geometry = new THREE.PlaneGeometry(4, 3);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.6,
    metalness: 0.1
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

function createVase(): THREE.Group {
  const group = new THREE.Group();

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 0.5,
    metalness: 0.1
  });

  const baseGeometry = new THREE.CylinderGeometry(0.8, 1, 0.3, 32);
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = 0.15;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const vaseMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a90a4,
    roughness: 0.2,
    metalness: 0.3
  });

  const points: THREE.Vector2[] = [];
  points.push(new THREE.Vector2(0.1, 0));
  points.push(new THREE.Vector2(0.3, 0.2));
  points.push(new THREE.Vector2(0.6, 0.8));
  points.push(new THREE.Vector2(0.8, 1.5));
  points.push(new THREE.Vector2(0.7, 2.2));
  points.push(new THREE.Vector2(0.5, 2.6));
  points.push(new THREE.Vector2(0.35, 2.8));
  points.push(new THREE.Vector2(0.3, 3));
  points.push(new THREE.Vector2(0.35, 3.1));

  const vaseGeometry = new THREE.LatheGeometry(points, 32);
  const vaseMesh = new THREE.Mesh(vaseGeometry, vaseMaterial);
  vaseMesh.position.y = 0.3;
  vaseMesh.castShadow = true;
  group.add(vaseMesh);

  const innerGeometry = new THREE.LatheGeometry(points.map(p => new THREE.Vector2(p.x * 0.9, p.y)), 32);
  const innerMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a4a5a,
    roughness: 0.8,
    side: THREE.BackSide
  });
  const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
  innerMesh.position.y = 0.3;
  group.add(innerMesh);

  return group;
}

export function getExhibitMaterials(exhibits: GalleryScene['exhibits']): THREE.MeshStandardMaterial[] {
  const materials: THREE.MeshStandardMaterial[] = [];
  
  exhibits.statue.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      materials.push(child.material);
    }
  });
  
  if (exhibits.painting.material instanceof THREE.MeshStandardMaterial) {
    materials.push(exhibits.painting.material);
  }
  
  exhibits.vase.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      materials.push(child.material);
    }
  });
  
  return materials;
}
