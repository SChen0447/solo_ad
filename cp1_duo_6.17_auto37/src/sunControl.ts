import * as THREE from 'three';

export interface SunController {
  sunMesh: THREE.Mesh;
  getDirection: () => THREE.Vector3;
  setSpherical: (theta: number, phi: number) => void;
  getSpherical: () => { theta: number; phi: number };
  dispose: () => void;
}

export function createSunController(
  scene: THREE.Scene,
  camera: THREE.Camera,
  domElement: HTMLElement,
  hemisphereRadius: number = 15
): SunController {
  const sunGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd700
  });
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  sunMesh.name = 'sun';
  scene.add(sunMesh);

  const glowGeometry = new THREE.SphereGeometry(0.8, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.3,
    side: THREE.BackSide
  });
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  sunMesh.add(glowMesh);

  const ringGeometry = new THREE.RingGeometry(hemisphereRadius - 0.05, hemisphereRadius + 0.05, 64, 1, 0, Math.PI);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide
  });
  const hemisphereRing = new THREE.Mesh(ringGeometry, ringMaterial);
  hemisphereRing.rotation.x = Math.PI / 2;
  scene.add(hemisphereRing);

  let currentTheta = Math.PI / 4;
  let currentPhi = Math.PI / 4;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let isDragging = false;
  let dragStartTheta = 0;
  let dragStartPhi = 0;
  let dragStartX = 0;
  let dragStartY = 0;

  function updateSunPosition(): void {
    const x = hemisphereRadius * Math.sin(currentPhi) * Math.cos(currentTheta);
    const y = hemisphereRadius * Math.cos(currentPhi);
    const z = hemisphereRadius * Math.sin(currentPhi) * Math.sin(currentTheta);
    sunMesh.position.set(x, y, z);
  }

  function getDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3().copy(sunMesh.position).normalize().negate();
    return dir;
  }

  function setSpherical(theta: number, phi: number): void {
    currentTheta = theta;
    currentPhi = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, phi));
    updateSunPosition();
  }

  function getSpherical(): { theta: number; phi: number } {
    return { theta: currentTheta, phi: currentPhi };
  }

  function onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    const rect = domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(sunMesh);

    if (intersects.length > 0) {
      isDragging = true;
      dragStartTheta = currentTheta;
      dragStartPhi = currentPhi;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      domElement.setPointerCapture(event.pointerId);
      domElement.style.cursor = 'grabbing';
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (!isDragging) {
      const rect = domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(sunMesh);
      domElement.style.cursor = intersects.length > 0 ? 'grab' : '';
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;

    const thetaDelta = -deltaX * 0.008;
    const phiDelta = -deltaY * 0.008;

    let newTheta = dragStartTheta + thetaDelta;
    let newPhi = dragStartPhi + phiDelta;

    newPhi = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, newPhi));

    currentTheta = newTheta;
    currentPhi = newPhi;
    updateSunPosition();
  }

  function onPointerUp(event: PointerEvent): void {
    if (isDragging) {
      isDragging = false;
      domElement.releasePointerCapture(event.pointerId);
      domElement.style.cursor = '';
    }
  }

  function dispose(): void {
    domElement.removeEventListener('pointerdown', onPointerDown);
    domElement.removeEventListener('pointermove', onPointerMove);
    domElement.removeEventListener('pointerup', onPointerUp);
    domElement.removeEventListener('pointercancel', onPointerUp);
    scene.remove(sunMesh);
    scene.remove(hemisphereRing);
    sunGeometry.dispose();
    sunMaterial.dispose();
    glowGeometry.dispose();
    glowMaterial.dispose();
    ringGeometry.dispose();
    ringMaterial.dispose();
  }

  domElement.addEventListener('pointerdown', onPointerDown);
  domElement.addEventListener('pointermove', onPointerMove);
  domElement.addEventListener('pointerup', onPointerUp);
  domElement.addEventListener('pointercancel', onPointerUp);

  updateSunPosition();

  return {
    sunMesh,
    getDirection,
    setSpherical,
    getSpherical,
    dispose
  };
}
