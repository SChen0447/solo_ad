import * as THREE from 'three';

export interface LightIndicator {
  group: THREE.Group;
  update: (sunPosition: THREE.Vector3, targetPosition: THREE.Vector3) => void;
  setVisible: (visible: boolean) => void;
  dispose: () => void;
}

export function createLightIndicator(scene: THREE.Scene): LightIndicator {
  const group = new THREE.Group();
  group.name = 'lightIndicator';

  const dashMaterial = new THREE.LineDashedMaterial({
    color: 0xffd700,
    dashSize: 0.5,
    gapSize: 0.3,
    transparent: true,
    opacity: 0.6
  });

  const lineGeometry = new THREE.BufferGeometry();
  const linePoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1, 0)
  ];
  lineGeometry.setFromPoints(linePoints);
  lineGeometry.computeBoundingSphere();

  const lightRay = new THREE.Line(lineGeometry, dashMaterial);
  lightRay.computeLineDistances();
  group.add(lightRay);

  const coneGeometry = new THREE.ConeGeometry(0.4, 1, 12);
  const coneMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.4
  });
  const arrowCone = new THREE.Mesh(coneGeometry, coneMaterial);
  arrowCone.rotation.x = Math.PI;
  group.add(arrowCone);

  const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.2
  });
  const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  group.add(sunGlow);

  scene.add(group);

  function update(sunPosition: THREE.Vector3, targetPosition: THREE.Vector3): void {
    const direction = new THREE.Vector3().subVectors(targetPosition, sunPosition);
    const distance = direction.length();

    const points = [sunPosition.clone(), targetPosition.clone()];
    lineGeometry.setFromPoints(points);
    lineGeometry.attributes.position.needsUpdate = true;
    lightRay.computeLineDistances();

    const midPoint = new THREE.Vector3().addVectors(sunPosition, targetPosition).multiplyScalar(0.5);

    arrowCone.position.copy(targetPosition);
    arrowCone.position.add(direction.clone().normalize().multiplyScalar(0.5));

    const up = new THREE.Vector3(0, 1, 0);
    const dirNormalized = direction.clone().normalize();
    arrowCone.quaternion.setFromUnitVectors(up, dirNormalized.negate());

    sunGlow.position.copy(sunPosition);

    const time = performance.now() * 0.001;
    const pulse = 0.8 + Math.sin(time * 3) * 0.2;
    glowMaterial.opacity = 0.15 * pulse;
    dashMaterial.opacity = 0.5 + Math.sin(time * 2) * 0.1;
  }

  function setVisible(visible: boolean): void {
    group.visible = visible;
  }

  function dispose(): void {
    scene.remove(group);
    lineGeometry.dispose();
    dashMaterial.dispose();
    coneGeometry.dispose();
    coneMaterial.dispose();
    glowGeometry.dispose();
    glowMaterial.dispose();
  }

  return {
    group,
    update,
    setVisible,
    dispose
  };
}
