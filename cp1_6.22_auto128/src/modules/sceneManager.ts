import * as THREE from 'three';
import type { ComponentConfig, GeometryConfig, MaterialConfig, LightConfig } from '@/types';

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function snapToGrid(value: number, gridSize = 0.5): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPosition3D(
  pos: [number, number, number],
  gridSize = 0.5,
): [number, number, number] {
  return [snapToGrid(pos[0], gridSize), pos[1], snapToGrid(pos[2], gridSize)];
}

export function createGeometry(config: GeometryConfig): THREE.BufferGeometry {
  switch (config.type) {
    case 'box':
      return new THREE.BoxGeometry(config.params[0], config.params[1], config.params[2]);
    case 'cylinder':
      return new THREE.CylinderGeometry(
        config.params[0],
        config.params[1],
        config.params[2],
        config.params[3] ?? 16,
      );
    case 'cone':
      return new THREE.ConeGeometry(config.params[0], config.params[1], config.params[2] ?? 16);
    case 'sphere':
      return new THREE.SphereGeometry(config.params[0], config.params[1] ?? 16, config.params[2] ?? 16);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

export function createMaterial(config: MaterialConfig): THREE.MeshStandardMaterial {
  const isTransparent = (config.opacity ?? 1) < 1;
  return new THREE.MeshStandardMaterial({
    color: config.color,
    metalness: config.metalness ?? 0,
    roughness: config.roughness ?? 0.7,
    transparent: isTransparent,
    opacity: config.opacity ?? 1,
  });
}

export function createPreviewMesh(component: ComponentConfig): THREE.Mesh {
  const geo = createGeometry(component.geometry);
  const mat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, component.gridSize[1] / 2, 0);
  return mesh;
}

export function createWireframeBBox(component: ComponentConfig): THREE.LineSegments {
  const size = component.gridSize;
  const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(size[0], size[1], size[2]));
  const mat = new THREE.LineBasicMaterial({ color: '#facc15', linewidth: 2 });
  const lines = new THREE.LineSegments(geo, mat);
  lines.position.y = size[1] / 2;
  return lines;
}

export function create2DOutline(component: ComponentConfig): THREE.BufferGeometry {
  const size = component.gridSize;
  const shape = component.shape2D ?? 'rect';

  if (shape === 'circle') {
    const radius = Math.max(size[0], size[2]) / 2;
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      points.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(p.x, 0.01, p.y)),
    );
  }

  const halfW = size[0] / 2;
  const halfD = size[2] / 2;
  const pts = [
    new THREE.Vector3(-halfW, 0.01, -halfD),
    new THREE.Vector3(halfW, 0.01, -halfD),
    new THREE.Vector3(halfW, 0.01, halfD),
    new THREE.Vector3(-halfW, 0.01, halfD),
    new THREE.Vector3(-halfW, 0.01, -halfD),
  ];
  return new THREE.BufferGeometry().setFromPoints(pts);
}

export function applyLightConfig(
  sunLight: THREE.DirectionalLight,
  ambientLight: THREE.HemisphereLight,
  config: LightConfig,
): void {
  sunLight.position.set(...config.sunPosition);
  sunLight.color.set(config.sunColor);
  sunLight.intensity = config.sunIntensity;
  sunLight.castShadow = config.sunIntensity > 0.3;
  if (sunLight.shadow) {
    sunLight.shadow.mapSize.set(config.shadowMapSize, config.shadowMapSize);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.bias = -0.0005;
  }

  const skyColor = new THREE.Color(config.ambientColor);
  const groundColor = new THREE.Color('#0f172a');
  ambientLight.color.copy(skyColor);
  ambientLight.groundColor.copy(groundColor);
  ambientLight.intensity = config.ambientIntensity;
}

export interface PopInAnimation {
  target: THREE.Object3D;
  start: number;
  duration: number;
  onComplete?: () => void;
}

const activeAnimations: PopInAnimation[] = [];

export function startPopInAnimation(target: THREE.Object3D, onComplete?: () => void): void {
  activeAnimations.push({
    target,
    start: performance.now(),
    duration: 300,
    onComplete,
  });
  target.scale.set(1, 1, 1);
}

export interface FadeOutAnimation {
  target: THREE.Object3D;
  start: number;
  duration: number;
  material: THREE.Material | THREE.Material[];
  onComplete?: () => void;
}

const fadeOutAnimations: FadeOutAnimation[] = [];

export function startFadeOutAnimation(target: THREE.Object3D, onComplete?: () => void): void {
  const mats: THREE.Material[] = [];
  target.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      const mat = Array.isArray(m.material) ? m.material : [m.material];
      mat.forEach((mm) => {
        (mm as THREE.MeshStandardMaterial).transparent = true;
        mats.push(mm);
      });
    }
  });

  fadeOutAnimations.push({
    target,
    start: performance.now(),
    duration: 300,
    material: mats,
    onComplete,
  });
}

export function tickAnimations(): void {
  const now = performance.now();

  for (let i = activeAnimations.length - 1; i >= 0; i--) {
    const anim = activeAnimations[i];
    const elapsed = now - anim.start;
    const t = Math.min(1, elapsed / anim.duration);
    const eased = easeOutCubic(t);

    let scale = 1;
    if (eased < 0.5) {
      scale = 1 + eased * 0.2;
    } else {
      scale = 1.1 - (eased - 0.5) * 0.2;
    }
    anim.target.scale.set(scale, scale, scale);

    if (t >= 1) {
      anim.target.scale.set(1, 1, 1);
      activeAnimations.splice(i, 1);
      anim.onComplete?.();
    }
  }

  for (let i = fadeOutAnimations.length - 1; i >= 0; i--) {
    const anim = fadeOutAnimations[i];
    const elapsed = now - anim.start;
    const t = Math.min(1, elapsed / anim.duration);

    const mats = Array.isArray(anim.material) ? anim.material : [anim.material];
    mats.forEach((m) => {
      (m as THREE.MeshStandardMaterial).opacity = 1 - t;
    });

    const s = 1 - t * 0.7;
    anim.target.scale.set(s, s, s);

    if (t >= 1) {
      fadeOutAnimations.splice(i, 1);
      anim.onComplete?.();
    }
  }
}
