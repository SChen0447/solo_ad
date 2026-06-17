import * as THREE from 'three';

export interface ShadowAnalyzer {
  gridMesh: THREE.Mesh;
  update: (lightDirection: THREE.Vector3, building: THREE.Object3D) => void;
  getAverageShadowFactor: () => number;
  dispose: () => void;
}

export function createShadowAnalyzer(
  scene: THREE.Scene,
  gridSize: number = 15,
  gridDivisions: number = 15
): ShadowAnalyzer {
  const geometry = new THREE.PlaneGeometry(gridSize, gridSize, gridDivisions, gridDivisions);
  geometry.rotateX(-Math.PI / 2);

  const colors = new Float32Array(geometry.attributes.position.count * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });

  const gridMesh = new THREE.Mesh(geometry, material);
  gridMesh.position.y = 0.02;
  gridMesh.receiveShadow = false;
  scene.add(gridMesh);

  const raycaster = new THREE.Raycaster();
  const rayOrigin = new THREE.Vector3();
  const rayDirection = new THREE.Vector3();

  let averageShadowFactor = 0;

  function lerpColor(
    r1: number, g1: number, b1: number,
    r2: number, g2: number, b2: number,
    t: number
  ): [number, number, number] {
    return [
      r1 + (r2 - r1) * t,
      g1 + (g2 - g1) * t,
      b1 + (b2 - b1) * t
    ];
  }

  function getGradientColor(shadowFactor: number): [number, number, number] {
    const t = Math.max(0, Math.min(1, shadowFactor));
    if (t < 0.5) {
      return lerpColor(0, 1, 0, 1, 1, 0, t * 2);
    } else {
      return lerpColor(1, 1, 0, 1, 0, 0, (t - 0.5) * 2);
    }
  }

  function update(lightDirection: THREE.Vector3, building: THREE.Object3D): void {
    const positions = geometry.attributes.position;
    const colorAttr = geometry.attributes.color as THREE.BufferAttribute;
    const count = positions.count;

    rayDirection.copy(lightDirection).normalize().negate();

    const buildingMeshes: THREE.Mesh[] = [];
    building.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.Material;
        if (mat && !(mat as THREE.MeshPhysicalMaterial).transparent) {
          buildingMeshes.push(mesh);
        }
      }
    });

    let totalShadow = 0;

    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      rayOrigin.set(x, 20, z);

      raycaster.set(rayOrigin, rayDirection);
      raycaster.far = 25;

      const intersects = raycaster.intersectObjects(buildingMeshes, false);

      let shadowFactor = 0;
      if (intersects.length > 0) {
        shadowFactor = 1;
      }

      const [r, g, b] = getGradientColor(shadowFactor);
      colorAttr.setXYZ(i, r, g, b);

      totalShadow += shadowFactor;
    }

    averageShadowFactor = totalShadow / count;
    colorAttr.needsUpdate = true;
  }

  function getAverageShadowFactor(): number {
    return averageShadowFactor;
  }

  function dispose(): void {
    scene.remove(gridMesh);
    geometry.dispose();
    material.dispose();
  }

  for (let i = 0; i < geometry.attributes.position.count; i++) {
    (geometry.attributes.color as THREE.BufferAttribute).setXYZ(i, 0, 1, 0);
  }
  (geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;

  return {
    gridMesh,
    update,
    getAverageShadowFactor,
    dispose
  };
}
