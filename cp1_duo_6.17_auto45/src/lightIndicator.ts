import * as THREE from 'three';

export interface LightIndicatorOptions {
  occluder?: THREE.Object3D;
}

export interface LightIndicator {
  group: THREE.Group;
  update: (sunPosition: THREE.Vector3, targetPosition: THREE.Vector3) => void;
  setVisible: (visible: boolean) => void;
  setOccluder: (occluder: THREE.Object3D) => void;
  dispose: () => void;
}

export function createLightIndicator(scene: THREE.Scene, options: LightIndicatorOptions = {}): LightIndicator {
  const { occluder = null } = options;
  let currentOccluder = occluder;

  const group = new THREE.Group();
  group.name = 'lightIndicator';

  const raycaster = new THREE.Raycaster();

  const dashMaterial = new THREE.LineDashedMaterial({
    color: 0xffd700,
    dashSize: 0.5,
    gapSize: 0.3,
    transparent: true,
    opacity: 0.6,
    depthWrite: false
  });

  const lineGeometry = new THREE.BufferGeometry();
  const initialPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)];
  lineGeometry.setFromPoints(initialPoints);
  const lightRay = new THREE.Line(lineGeometry, dashMaterial);
  lightRay.computeLineDistances();
  lightRay.renderOrder = 999;
  group.add(lightRay);

  const blockedMaterial = new THREE.LineDashedMaterial({
    color: 0x888888,
    dashSize: 0.3,
    gapSize: 0.3,
    transparent: true,
    opacity: 0.25,
    depthWrite: false
  });

  const blockedLineGeometry = new THREE.BufferGeometry();
  blockedLineGeometry.setFromPoints(initialPoints);
  const blockedRay = new THREE.Line(blockedLineGeometry, blockedMaterial);
  blockedRay.computeLineDistances();
  blockedRay.renderOrder = 998;
  group.add(blockedRay);

  const coneGeometry = new THREE.ConeGeometry(0.4, 1, 12);
  const coneMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.4,
    depthWrite: false
  });
  const arrowCone = new THREE.Mesh(coneGeometry, coneMaterial);
  arrowCone.renderOrder = 1000;
  group.add(arrowCone);

  const hitSphereGeometry = new THREE.SphereGeometry(0.25, 16, 16);
  const hitSphereMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.5
  });
  const hitSphere = new THREE.Mesh(hitSphereGeometry, hitSphereMaterial);
  hitSphere.visible = false;
  group.add(hitSphere);

  const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.2,
    depthWrite: false
  });
  const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  sunGlow.renderOrder = 1000;
  group.add(sunGlow);

  scene.add(group);

  function raycastIntersection(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 | null {
    if (!currentOccluder) return null;

    const direction = new THREE.Vector3().subVectors(to, from);
    const distance = direction.length();
    direction.normalize();

    raycaster.set(from, direction);
    raycaster.far = distance;

    const intersects = raycaster.intersectObject(currentOccluder, true);
    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }
    return null;
  }

  function update(sunPosition: THREE.Vector3, targetPosition: THREE.Vector3): void {
    const direction = new THREE.Vector3().subVectors(targetPosition, sunPosition);

    const hitPoint = raycastIntersection(sunPosition, targetPosition);

    let visibleEndPoint: THREE.Vector3;
    if (hitPoint) {
      const pullBack = direction.clone().normalize().multiplyScalar(0.15);
      visibleEndPoint = hitPoint.clone().sub(pullBack);

      const blockedPoints = [visibleEndPoint.clone(), targetPosition.clone()];
      blockedLineGeometry.setFromPoints(blockedPoints);
      blockedLineGeometry.attributes.position.needsUpdate = true;
      blockedRay.computeLineDistances();
      blockedRay.visible = true;

      hitSphere.position.copy(hitPoint);
      hitSphere.visible = true;
    } else {
      visibleEndPoint = targetPosition.clone();
      blockedRay.visible = false;
      hitSphere.visible = false;
    }

    const visiblePoints = [sunPosition.clone(), visibleEndPoint];
    lineGeometry.setFromPoints(visiblePoints);
    lineGeometry.attributes.position.needsUpdate = true;
    lightRay.computeLineDistances();

    const toArrow = new THREE.Vector3().subVectors(visibleEndPoint, sunPosition).normalize();
    arrowCone.position.copy(visibleEndPoint);
    arrowCone.position.add(toArrow.clone().multiplyScalar(0.5));

    const up = new THREE.Vector3(0, 1, 0);
    arrowCone.quaternion.setFromUnitVectors(up, toArrow.clone().negate());

    sunGlow.position.copy(sunPosition);

    const time = performance.now() * 0.001;
    const pulse = 0.8 + Math.sin(time * 3) * 0.2;
    glowMaterial.opacity = 0.15 * pulse;
    dashMaterial.opacity = 0.55 + Math.sin(time * 2) * 0.1;

    if (hitPoint) {
      hitSphereMaterial.opacity = 0.4 + Math.sin(time * 4) * 0.2;
    }
  }

  function setVisible(visible: boolean): void {
    group.visible = visible;
  }

  function setOccluder(occluder: THREE.Object3D): void {
    currentOccluder = occluder;
  }

  function dispose(): void {
    scene.remove(group);
    lineGeometry.dispose();
    dashMaterial.dispose();
    blockedLineGeometry.dispose();
    blockedMaterial.dispose();
    coneGeometry.dispose();
    coneMaterial.dispose();
    glowGeometry.dispose();
    glowMaterial.dispose();
    hitSphereGeometry.dispose();
    hitSphereMaterial.dispose();
  }

  return {
    group,
    update,
    setVisible,
    setOccluder,
    dispose
  };
}
