import * as THREE from 'three';

export interface ShadowAnalyzer {
  groundGrid: THREE.Mesh;
  wallGrid: THREE.Mesh | null;
  update: (lightDirection: THREE.Vector3, building: THREE.Object3D) => void;
  dispose: () => void;
}

export function createShadowAnalyzer(scene: THREE.Scene): ShadowAnalyzer {
  const gridSize = 15;
  const gridDivisions = 15;
  const cellSize = gridSize / gridDivisions;

  const geometry = new THREE.PlaneGeometry(gridSize, gridSize, gridDivisions, gridDivisions);
  geometry.rotateX(-Math.PI / 2);

  const colors: number[] = [];
  const vertexCount = geometry.attributes.position.count;
  for (let i = 0; i < vertexCount; i++) {
    colors.push(0, 1, 0, 0.3);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });

  const groundGrid = new THREE.Mesh(geometry, material);
  groundGrid.position.y = 0.01;
  groundGrid.name = 'shadowGrid';
  scene.add(groundGrid);

  const raycaster = new THREE.Raycaster();
  const tempColor = new THREE.Color();

  function lerpColor(t: number): THREE.Color {
    const clampedT = Math.max(0, Math.min(1, t));
    if (clampedT < 0.5) {
      const localT = clampedT / 0.5;
      return tempColor.setRGB(localT, 1, 0);
    } else {
      const localT = (clampedT - 0.5) / 0.5;
      return tempColor.setRGB(1, 1 - localT, 0);
    }
  }

  function calculateGroundShadowFactor(
    x: number,
    z: number,
    lightDir: THREE.Vector3,
    building: THREE.Object3D
  ): number {
    const origin = new THREE.Vector3(x, 0.02, z);
    const direction = lightDir.clone().normalize().negate();

    raycaster.set(origin, direction);
    raycaster.far = 30;

    const intersects = raycaster.intersectObject(building, true);
    return intersects.length > 0 ? 1.0 : 0.0;
  }

  function update(lightDirection: THREE.Vector3, building: THREE.Object3D): void {
    const positions = geometry.attributes.position;
    const colorAttr = geometry.attributes.color;

    const halfSize = gridSize / 2;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const shadowFactor = calculateGroundShadowFactor(x, z, lightDirection, building);
      const color = lerpColor(shadowFactor);

      colorAttr.setXYZW(i, color.r, color.g, color.b, 0.3);
    }

    colorAttr.needsUpdate = true;
  }

  function dispose(): void {
    scene.remove(groundGrid);
    geometry.dispose();
    material.dispose();
  }

  return {
    groundGrid,
    wallGrid: null,
    update,
    dispose
  };
}
