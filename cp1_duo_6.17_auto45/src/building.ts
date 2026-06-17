import * as THREE from 'three';

export function createBuilding(): THREE.Group {
  const building = new THREE.Group();
  building.name = 'building';

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xe0e0e0,
    roughness: 0.7,
    metalness: 0.1
  });

  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.8,
    metalness: 0.05
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x87ceeb,
    transparent: true,
    opacity: 0.4,
    roughness: 0.1,
    metalness: 0.0,
    transmission: 0.6,
    ior: 1.5,
    thickness: 0.1,
    specularIntensity: 1.0,
    envMapIntensity: 1.0
  });

  const windowFrameMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.5,
    metalness: 0.3
  });

  const baseWidth = 8;
  const baseDepth = 6;
  const wallHeight = 4;
  const wallThickness = 0.3;

  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(baseWidth, wallHeight, wallThickness),
    wallMaterial
  );
  frontWall.position.set(0, wallHeight / 2, -baseDepth / 2);
  frontWall.castShadow = true;
  frontWall.receiveShadow = true;
  building.add(frontWall);

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(baseWidth, wallHeight, wallThickness),
    wallMaterial
  );
  backWall.position.set(0, wallHeight / 2, baseDepth / 2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  building.add(backWall);

  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, wallHeight, baseDepth),
    wallMaterial
  );
  leftWall.position.set(-baseWidth / 2, wallHeight / 2, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  building.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, wallHeight, baseDepth),
    wallMaterial
  );
  rightWall.position.set(baseWidth / 2, wallHeight / 2, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  building.add(rightWall);

  const roofHeight = 2;
  const roofGeometry = new THREE.ConeGeometry(baseWidth * 0.75, roofHeight, 4);
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.set(0, wallHeight + roofHeight / 2, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  roof.receiveShadow = true;
  building.add(roof);

  const largeGlassWidth = 3;
  const largeGlassHeight = 2.5;
  const largeGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(largeGlassWidth, largeGlassHeight),
    glassMaterial
  );
  largeGlass.position.set(0, wallHeight * 0.45, -baseDepth / 2 + wallThickness / 2 + 0.01);
  building.add(largeGlass);

  const frameThickness = 0.15;
  const frameDepth = 0.08;

  const topFrame = new THREE.Mesh(
    new THREE.BoxGeometry(largeGlassWidth + frameThickness * 2, frameThickness, frameDepth),
    windowFrameMaterial
  );
  topFrame.position.set(0, largeGlassHeight / 2 + frameThickness / 2, -baseDepth / 2 + wallThickness / 2 + 0.02);
  building.add(topFrame);

  const bottomFrame = new THREE.Mesh(
    new THREE.BoxGeometry(largeGlassWidth + frameThickness * 2, frameThickness, frameDepth),
    windowFrameMaterial
  );
  bottomFrame.position.set(0, -largeGlassHeight / 2 - frameThickness / 2, -baseDepth / 2 + wallThickness / 2 + 0.02);
  building.add(bottomFrame);

  const leftFrame = new THREE.Mesh(
    new THREE.BoxGeometry(frameThickness, largeGlassHeight + frameThickness * 2, frameDepth),
    windowFrameMaterial
  );
  leftFrame.position.set(-largeGlassWidth / 2 - frameThickness / 2, 0, -baseDepth / 2 + wallThickness / 2 + 0.02);
  building.add(leftFrame);

  const rightFrame = new THREE.Mesh(
    new THREE.BoxGeometry(frameThickness, largeGlassHeight + frameThickness * 2, frameDepth),
    windowFrameMaterial
  );
  rightFrame.position.set(largeGlassWidth / 2 + frameThickness / 2, 0, -baseDepth / 2 + wallThickness / 2 + 0.02);
  building.add(rightFrame);

  const smallWindowSize = 1.2;
  const smallGlassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x87ceeb,
    transparent: true,
    opacity: 0.4,
    roughness: 0.1,
    metalness: 0.0,
    transmission: 0.6,
    ior: 1.5,
    thickness: 0.05,
    specularIntensity: 0.8,
    envMapIntensity: 0.8
  });

  const rightWindow1 = new THREE.Mesh(
    new THREE.PlaneGeometry(smallWindowSize, smallWindowSize * 0.8),
    smallGlassMaterial
  );
  rightWindow1.position.set(baseWidth / 2 + 0.01, wallHeight * 0.55, -baseDepth / 4);
  rightWindow1.rotation.y = Math.PI / 2;
  building.add(rightWindow1);

  const rightWindow2 = new THREE.Mesh(
    new THREE.PlaneGeometry(smallWindowSize, smallWindowSize * 0.8),
    smallGlassMaterial
  );
  rightWindow2.position.set(baseWidth / 2 + 0.01, wallHeight * 0.55, baseDepth / 4);
  rightWindow2.rotation.y = Math.PI / 2;
  building.add(rightWindow2);

  const leftWindow1 = new THREE.Mesh(
    new THREE.PlaneGeometry(smallWindowSize, smallWindowSize * 0.8),
    smallGlassMaterial
  );
  leftWindow1.position.set(-baseWidth / 2 - 0.01, wallHeight * 0.55, -baseDepth / 4);
  leftWindow1.rotation.y = -Math.PI / 2;
  building.add(leftWindow1);

  const leftWindow2 = new THREE.Mesh(
    new THREE.PlaneGeometry(smallWindowSize, smallWindowSize * 0.8),
    smallGlassMaterial
  );
  leftWindow2.position.set(-baseWidth / 2 - 0.01, wallHeight * 0.55, baseDepth / 4);
  leftWindow2.rotation.y = -Math.PI / 2;
  building.add(leftWindow2);

  const backWindow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.2),
    smallGlassMaterial
  );
  backWindow.position.set(1, wallHeight * 0.5, baseDepth / 2 + 0.01);
  backWindow.rotation.y = Math.PI;
  building.add(backWindow);

  const doorWidth = 1.2;
  const doorHeight = 2.2;
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    roughness: 0.9,
    metalness: 0.0
  });
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth, doorHeight, 0.1),
    doorMaterial
  );
  door.position.set(-baseWidth / 4, doorHeight / 2, -baseDepth / 2 + wallThickness / 2 + 0.05);
  building.add(door);

  return building;
}
