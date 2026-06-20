import * as THREE from 'three';

export interface SceneConfig {
  starCount: number;
  haloParticleCount: number;
  shadowMapSize: number;
}

export interface SceneModule {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  stars: THREE.Points;
  haloParticles: THREE.Points;
  platform: THREE.Mesh;
  ambientLight: THREE.AmbientLight;
  directionalLight: THREE.DirectionalLight;
  update: (delta: number) => void;
  setPerformanceLevel: (level: 'high' | 'low') => void;
  getConfig: () => SceneConfig;
}

const defaultConfig: SceneConfig = {
  starCount: 2000,
  haloParticleCount: 500,
  shadowMapSize: 2048,
};

export function createScene(container: HTMLElement): SceneModule {
  const config = { ...defaultConfig };

  const scene = new THREE.Scene();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 2;
  canvas.height = 512;

  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0a0a2e');
  gradient.addColorStop(1, '#2b1b3d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  scene.background = texture;

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 8, 35);
  camera.lookAt(0, 2, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = config.shadowMapSize;
  directionalLight.shadow.mapSize.height = config.shadowMapSize;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.left = -30;
  directionalLight.shadow.camera.right = 30;
  directionalLight.shadow.camera.top = 30;
  directionalLight.shadow.camera.bottom = -30;
  directionalLight.shadow.bias = -0.0001;
  scene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0x6666ff, 0.3);
  fillLight.position.set(-10, 5, -10);
  scene.add(fillLight);

  const pointLight = new THREE.PointLight(0x4facfe, 0.8, 50);
  pointLight.position.set(0, 5, 0);
  scene.add(pointLight);

  const platformGeometry = new THREE.CylinderGeometry(15, 16, 2, 64, 1, false);
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3a5a,
    roughness: 0.8,
    metalness: 0.2,
  });
  const platform = new THREE.Mesh(platformGeometry, platformMaterial);
  platform.position.y = -1;
  platform.receiveShadow = true;
  scene.add(platform);

  const platformEdgeGeometry = new THREE.TorusGeometry(15, 0.15, 16, 100);
  const platformEdgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a5a8a,
    roughness: 0.5,
    metalness: 0.5,
    emissive: 0x2a2a5a,
    emissiveIntensity: 0.3,
  });
  const platformEdge = new THREE.Mesh(platformEdgeGeometry, platformEdgeMaterial);
  platformEdge.rotation.x = Math.PI / 2;
  platformEdge.position.y = 0;
  scene.add(platformEdge);

  const stars = createStars(config.starCount);
  scene.add(stars);

  const haloParticles = createHaloParticles(config.haloParticleCount);
  scene.add(haloParticles);

  let time = 0;

  function update(delta: number): void {
    time += delta;

    const starPositions = stars.geometry.attributes.position as THREE.BufferAttribute;
    const positions = starPositions.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += Math.sin(time * 0.1 + positions[i + 1]) * 0.002;
      positions[i + 2] += Math.cos(time * 0.1 + positions[i + 1]) * 0.002;
    }
    starPositions.needsUpdate = true;

    const haloPositions = haloParticles.geometry.attributes.position as THREE.BufferAttribute;
    const haloPos = haloPositions.array as Float32Array;
    for (let i = 0; i < haloPos.length; i += 3) {
      const index = i / 3;
      const angle = (index / config.haloParticleCount) * Math.PI * 2 + time * 0.2;
      const radius = 15 + Math.sin(time * 0.5 + index * 0.1) * 0.5;
      haloPos[i] = Math.cos(angle) * radius;
      haloPos[i + 2] = Math.sin(angle) * radius;
      haloPos[i + 1] = Math.sin(time + index * 0.2) * 0.5 + 0.5;
    }
    haloPositions.needsUpdate = true;

    haloParticles.material.opacity = 0.3 + Math.sin(time * 0.8) * 0.15;
  }

  function setPerformanceLevel(level: 'high' | 'low'): void {
    if (level === 'low') {
      config.starCount = Math.floor(defaultConfig.starCount / 2);
      config.haloParticleCount = Math.floor(defaultConfig.haloParticleCount / 2);
      config.shadowMapSize = 512;
    } else {
      config.starCount = defaultConfig.starCount;
      config.haloParticleCount = defaultConfig.haloParticleCount;
      config.shadowMapSize = 2048;
    }

    updateStarGeometry(stars, config.starCount);
    updateHaloGeometry(haloParticles, config.haloParticleCount);

    directionalLight.shadow.mapSize.width = config.shadowMapSize;
    directionalLight.shadow.mapSize.height = config.shadowMapSize;
    directionalLight.shadow.map.dispose();
    directionalLight.shadow.map = null;
  }

  function getConfig(): SceneConfig {
    return { ...config };
  }

  function handleResize(): void {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  window.addEventListener('resize', handleResize);

  return {
    scene,
    camera,
    renderer,
    stars,
    haloParticles,
    platform,
    ambientLight,
    directionalLight,
    update,
    setPerformanceLevel,
    getConfig,
  };
}

function createStars(count: number): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const radius = 80 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.cos(phi) + 20;
    positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const brightness = 0.5 + Math.random() * 0.5;
    colors[i3] = 0.8 + Math.random() * 0.2;
    colors[i3 + 1] = 0.8 + Math.random() * 0.2;
    colors[i3 + 2] = brightness;

    sizes[i] = Math.random() * 2 + 0.5;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);

  const material = new THREE.PointsMaterial({
    size: 0.5,
    map: texture,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

function createHaloParticles(count: number): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const angle = (i / count) * Math.PI * 2;
    const radius = 15 + (Math.random() - 0.5) * 0.5;

    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = (Math.random() - 0.5) * 1;
    positions[i3 + 2] = Math.sin(angle) * radius;

    colors[i3] = 0.3;
    colors[i3 + 1] = 0.6;
    colors[i3 + 2] = 1.0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(100, 200, 255, 1)');
  grad.addColorStop(1, 'rgba(100, 200, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);

  const texture = new THREE.CanvasTexture(canvas);

  const material = new THREE.PointsMaterial({
    size: 0.6,
    map: texture,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

function updateStarGeometry(stars: THREE.Points, count: number): void {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const radius = 80 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.cos(phi) + 20;
    positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    colors[i3] = 0.8 + Math.random() * 0.2;
    colors[i3 + 1] = 0.8 + Math.random() * 0.2;
    colors[i3 + 2] = 0.5 + Math.random() * 0.5;

    sizes[i] = Math.random() * 2 + 0.5;
  }

  stars.geometry.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  stars.geometry = geometry;
}

function updateHaloGeometry(halo: THREE.Points, count: number): void {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const angle = (i / count) * Math.PI * 2;
    const radius = 15 + (Math.random() - 0.5) * 0.5;

    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = (Math.random() - 0.5) * 1;
    positions[i3 + 2] = Math.sin(angle) * radius;

    colors[i3] = 0.3;
    colors[i3 + 1] = 0.6;
    colors[i3 + 2] = 1.0;
  }

  halo.geometry.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  halo.geometry = geometry;
}
