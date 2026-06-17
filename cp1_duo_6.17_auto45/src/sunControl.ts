import * as THREE from 'three';

export interface SunController {
  sunMesh: THREE.Mesh;
  getSunDirection: () => THREE.Vector3;
  setSunAngles: (altitude: number, azimuth: number, animate?: boolean) => void;
  update: (delta: number) => void;
  dispose: () => void;
  onDirectionChange: (callback: (direction: THREE.Vector3) => void) => void;
}

export function createSunController(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  initialAltitude: number = Math.PI / 4,
  initialAzimuth: number = Math.PI / 4
): SunController {
  const hemisphereRadius = 15;
  let currentAltitude = initialAltitude;
  let currentAzimuth = initialAzimuth;
  let targetAltitude = initialAltitude;
  let targetAzimuth = initialAzimuth;
  let isAnimating = false;
  let animationProgress = 0;
  let animationDuration = 0.5;
  let startAltitude = initialAltitude;
  let startAzimuth = initialAzimuth;
  let directionChangeCallback: ((direction: THREE.Vector3) => void) | null = null;

  const sunGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd700
  });

  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  sunMesh.name = 'sunSphere';
  scene.add(sunMesh);

  const glowGeometry = new THREE.SphereGeometry(0.8, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.3
  });
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  sunMesh.add(glowMesh);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let isDragging = false;

  function updateSunPosition(): void {
    const x = hemisphereRadius * Math.cos(currentAltitude) * Math.sin(currentAzimuth);
    const y = hemisphereRadius * Math.sin(currentAltitude);
    const z = hemisphereRadius * Math.cos(currentAltitude) * Math.cos(currentAzimuth);
    sunMesh.position.set(x, y, z);

    const direction = getSunDirection();
    if (directionChangeCallback) {
      directionChangeCallback(direction);
    }
  }

  function getSunDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3();
    direction.subVectors(new THREE.Vector3(0, 0, 0), sunMesh.position).normalize();
    return direction;
  }

  function onMouseDown(event: MouseEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(sunMesh);

    if (intersects.length > 0) {
      isDragging = true;
      document.body.style.cursor = 'grabbing';
    }
  }

  function onMouseMove(event: MouseEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();

    if (isDragging) {
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const azimuth = (mouse.x + 1) * Math.PI;
      const altitude = (mouse.y + 1) * Math.PI / 2;

      currentAzimuth = Math.max(0, Math.min(Math.PI, azimuth));
      currentAltitude = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, altitude));

      updateSunPosition();
    } else {
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(sunMesh);
      document.body.style.cursor = intersects.length > 0 ? 'grab' : 'default';
    }
  }

  function onMouseUp(): void {
    if (isDragging) {
      isDragging = false;
      targetAltitude = currentAltitude;
      targetAzimuth = currentAzimuth;
      document.body.style.cursor = 'default';
    }
  }

  function setSunAngles(altitude: number, azimuth: number, animate: boolean = true): void {
    const clampedAltitude = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, altitude));
    const clampedAzimuth = Math.max(0, Math.min(Math.PI, azimuth));

    if (animate) {
      startAltitude = currentAltitude;
      startAzimuth = currentAzimuth;
      targetAltitude = clampedAltitude;
      targetAzimuth = clampedAzimuth;
      isAnimating = true;
      animationProgress = 0;
    } else {
      currentAltitude = clampedAltitude;
      currentAzimuth = clampedAzimuth;
      targetAltitude = clampedAltitude;
      targetAzimuth = clampedAzimuth;
      updateSunPosition();
    }
  }

  function update(delta: number): void {
    if (isAnimating) {
      animationProgress += delta / animationDuration;
      if (animationProgress >= 1) {
        animationProgress = 1;
        isAnimating = false;
      }

      const t = easeInOutCubic(animationProgress);
      currentAltitude = startAltitude + (targetAltitude - startAltitude) * t;
      currentAzimuth = startAzimuth + (targetAzimuth - startAzimuth) * t;
      updateSunPosition();
    }

    const time = performance.now() * 0.001;
    glowMaterial.opacity = 0.3 + Math.sin(time * 2) * 0.1;
  }

  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function onDirectionChange(callback: (direction: THREE.Vector3) => void): void {
    directionChangeCallback = callback;
  }

  function dispose(): void {
    renderer.domElement.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);

    scene.remove(sunMesh);
    sunGeometry.dispose();
    sunMaterial.dispose();
    glowGeometry.dispose();
    glowMaterial.dispose();
  }

  renderer.domElement.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  updateSunPosition();

  return {
    sunMesh,
    getSunDirection,
    setSunAngles,
    update,
    dispose,
    onDirectionChange
  };
}

export const sunPathByMonth: { altitude: number; azimuth: number }[] = [
  { altitude: 0.35, azimuth: Math.PI / 2 },
  { altitude: 0.42, azimuth: Math.PI / 2.1 },
  { altitude: 0.52, azimuth: Math.PI / 2.3 },
  { altitude: 0.65, azimuth: Math.PI / 2.5 },
  { altitude: 0.75, azimuth: Math.PI / 2.8 },
  { altitude: 0.8, azimuth: Math.PI / 3 },
  { altitude: 0.78, azimuth: Math.PI / 3 },
  { altitude: 0.7, azimuth: Math.PI / 2.7 },
  { altitude: 0.58, azimuth: Math.PI / 2.4 },
  { altitude: 0.45, azimuth: Math.PI / 2.2 },
  { altitude: 0.37, azimuth: Math.PI / 2.05 },
  { altitude: 0.32, azimuth: Math.PI / 2 }
];
