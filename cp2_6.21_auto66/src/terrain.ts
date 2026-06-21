import * as THREE from 'three';

interface TerrainResult {
  mesh: THREE.Mesh;
  causticsLight: THREE.PointLight;
  causticsMesh: THREE.Mesh;
  updateCaustics: (time: number, intensity: number) => void;
}

export function createTerrain(scene: THREE.Scene): TerrainResult {
  const gridSize = 40;
  const heightScale = 0.3;

  const geometry = new THREE.PlaneGeometry(gridSize, gridSize, gridSize - 1, gridSize - 1);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = (Math.random() - 0.5) * heightScale;
    positions.setY(i, y);
  }
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x3d5c5c,
    roughness: 0.8,
    metalness: 0.1,
    flatShading: true,
  });

  const terrain = new THREE.Mesh(geometry, material);
  terrain.receiveShadow = true;
  scene.add(terrain);

  const causticsGeometry = new THREE.PlaneGeometry(40, 40, 20, 20);
  causticsGeometry.rotateX(-Math.PI / 2);

  const causticsPositions = causticsGeometry.attributes.position;
  const causticsColors = new Float32Array(causticsPositions.count * 3);
  const causticsAlphas = new Float32Array(causticsPositions.count);

  for (let i = 0; i < causticsPositions.count; i++) {
    causticsAlphas[i] = 0;
    causticsColors[i * 3] = 1;
    causticsColors[i * 3 + 1] = 1;
    causticsColors[i * 3 + 2] = 0.8;
  }

  causticsGeometry.setAttribute('color', new THREE.BufferAttribute(causticsColors, 3));

  const causticsMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffaa,
    transparent: true,
    opacity: 0,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const causticsMesh = new THREE.Mesh(causticsGeometry, causticsMaterial);
  causticsMesh.position.y = 0.1;
  scene.add(causticsMesh);

  const causticsLight = new THREE.PointLight(0xffffaa, 0.5, 50);
  causticsLight.position.set(0, 20, 0);
  scene.add(causticsLight);

  const topColor = new THREE.Color(0x0077be);
  const bottomColor = new THREE.Color(0x003f5c);

  const updateCaustics = (time: number, intensity: number): void => {
    const positions = causticsGeometry.attributes.position;
    const colors = causticsGeometry.attributes.color as THREE.BufferAttribute;

    const lightSpeed = 0.5;
    const lightX = Math.sin(time * lightSpeed * 0.3) * 15;
    const lightZ = Math.cos(time * lightSpeed * 0.2) * 15;

    causticsLight.position.set(lightX, 15, lightZ);
    causticsLight.intensity = intensity * 2;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const wave1 = Math.sin(x * 2 + time * 0.8) * Math.cos(z * 2 + time * 0.6);
      const wave2 = Math.sin(x * 3 - time * 0.5) * Math.cos(z * 2.5 + time * 0.7);
      const wave3 = Math.sin((x + z) * 1.5 + time * 0.4);

      const combined = (wave1 + wave2 * 0.5 + wave3 * 0.3) / 1.8;

      const dx = x - lightX;
      const dz = z - lightZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const lightFactor = Math.max(0, 1 - dist / 25);

      const alpha = Math.max(0, Math.min(1, (combined + 0.5) * 0.8 + 0.4)) * intensity * lightFactor;
      causticsAlphas[i] = alpha;

      const brightness = 0.7 + alpha * 0.3;
      colors.setXYZ(i, brightness, brightness, brightness * 0.85);
    }

    causticsMaterial.opacity = intensity * 0.6;
    colors.needsUpdate = true;

    const fogDensity = (scene as any).fogDensity ?? 0.02;
    const fogColor = topColor.clone().lerp(bottomColor, fogDensity * 20);
    scene.background = fogColor;
    if (scene.fog) {
      (scene.fog as THREE.FogExp2).color.copy(fogColor);
    }
  };

  scene.background = topColor;
  scene.fog = new THREE.FogExp2(topColor, 0.02);

  return {
    mesh: terrain,
    causticsLight,
    causticsMesh,
    updateCaustics,
  };
}
