import * as THREE from 'three';

export function createBuilding(): THREE.Group {
  const buildingGroup = new THREE.Group();
  buildingGroup.name = 'building';

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
    color: 0x88ccff,
    transparent: true,
    opacity: 0.4,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.6,
    thickness: 0.5,
    ior: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    reflectivity: 0.9
  });

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.5,
    metalness: 0.8
  });

  const wallWidth = 8;
  const wallHeight = 4;
  const wallDepth = 6;
  const wallThickness = 0.3;

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallWidth, wallHeight, wallThickness),
    wallMaterial
  );
  backWall.position.set(0, wallHeight / 2, -wallDepth / 2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  buildingGroup.add(backWall);

  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallWidth, wallHeight, wallThickness),
    wallMaterial
  );
  frontWall.position.set(0, wallHeight / 2, wallDepth / 2);
  frontWall.castShadow = true;
  frontWall.receiveShadow = true;
  buildingGroup.add(frontWall);

  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, wallHeight, wallDepth),
    wallMaterial
  );
  leftWall.position.set(-wallWidth / 2, wallHeight / 2, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  buildingGroup.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, wallHeight, wallDepth),
    wallMaterial
  );
  rightWall.position.set(wallWidth / 2, wallHeight / 2, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  buildingGroup.add(rightWall);

  const roofOverhang = 0.5;
  const roofWidth = wallWidth + roofOverhang * 2;
  const roofDepth = wallDepth + roofOverhang * 2;
  const roofHeight = 2;

  const vertices: THREE.Vector3[] = [];
  const faces: number[] = [];

  vertices.push(new THREE.Vector3(-roofWidth / 2, 0, -roofDepth / 2));
  vertices.push(new THREE.Vector3(roofWidth / 2, 0, -roofDepth / 2));
  vertices.push(new THREE.Vector3(roofWidth / 2, 0, roofDepth / 2));
  vertices.push(new THREE.Vector3(-roofWidth / 2, 0, roofDepth / 2));

  vertices.push(new THREE.Vector3(0, roofHeight, -roofDepth / 2));
  vertices.push(new THREE.Vector3(0, roofHeight, roofDepth / 2));

  faces.push(0, 1, 4);
  faces.push(1, 2, 5);
  faces.push(2, 3, 5);
  faces.push(3, 0, 4);
  faces.push(1, 2, 5, 1, 5, 4);
  faces.push(0, 3, 2, 0, 2, 1);

  const roofGeometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  for (let i = 0; i < faces.length; i += 3) {
    const v0 = vertices[faces[i]];
    const v1 = vertices[faces[i + 1]];
    const v2 = vertices[faces[i + 2]];
    positions.push(v0.x, v0.y, v0.z);
    positions.push(v1.x, v1.y, v1.z);
    positions.push(v2.x, v2.y, v2.z);
  }
  roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  roofGeometry.computeVertexNormals();

  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.set(0, wallHeight, 0);
  roof.castShadow = true;
  roof.receiveShadow = true;
  buildingGroup.add(roof);

  const windowWidth = 3;
  const windowHeight = 2.2;
  const windowY = 1.8;

  const glassFront = new THREE.Mesh(
    new THREE.PlaneGeometry(windowWidth, windowHeight),
    glassMaterial
  );
  glassFront.position.set(0, windowY, wallDepth / 2 + 0.01);
  glassFront.castShadow = false;
  glassFront.receiveShadow = false;
  buildingGroup.add(glassFront);

  const frameThickness = 0.15;
  const frameDepth = 0.12;

  const frameTop = new THREE.Mesh(
    new THREE.BoxGeometry(windowWidth + frameThickness * 2, frameThickness, frameDepth),
    frameMaterial
  );
  frameTop.position.set(0, windowY + windowHeight / 2 + frameThickness / 2, wallDepth / 2);
  frameTop.castShadow = true;
  buildingGroup.add(frameTop);

  const frameBottom = new THREE.Mesh(
    new THREE.BoxGeometry(windowWidth + frameThickness * 2, frameThickness, frameDepth),
    frameMaterial
  );
  frameBottom.position.set(0, windowY - windowHeight / 2 - frameThickness / 2, wallDepth / 2);
  frameBottom.castShadow = true;
  buildingGroup.add(frameBottom);

  const frameLeft = new THREE.Mesh(
    new THREE.BoxGeometry(frameThickness, windowHeight + frameThickness * 2, frameDepth),
    frameMaterial
  );
  frameLeft.position.set(-windowWidth / 2 - frameThickness / 2, windowY, wallDepth / 2);
  frameLeft.castShadow = true;
  buildingGroup.add(frameLeft);

  const frameRight = new THREE.Mesh(
    new THREE.BoxGeometry(frameThickness, windowHeight + frameThickness * 2, frameDepth),
    frameMaterial
  );
  frameRight.position.set(windowWidth / 2 + frameThickness / 2, windowY, wallDepth / 2);
  frameRight.castShadow = true;
  buildingGroup.add(frameRight);

  const windowLeftW = 1.2;
  const windowLeftH = 1.4;
  const glassLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(windowLeftW, windowLeftH),
    glassMaterial
  );
  glassLeft.position.set(-wallWidth / 2 - 0.01, 2.2, -1);
  glassLeft.rotation.y = Math.PI / 2;
  buildingGroup.add(glassLeft);

  const frameLeftTop = new THREE.Mesh(
    new THREE.BoxGeometry(frameDepth, frameThickness, windowLeftW + frameThickness * 2),
    frameMaterial
  );
  frameLeftTop.position.set(-wallWidth / 2, 2.2 + windowLeftH / 2 + frameThickness / 2, -1);
  frameLeftTop.castShadow = true;
  buildingGroup.add(frameLeftTop);

  const frameLeftBottom = new THREE.Mesh(
    new THREE.BoxGeometry(frameDepth, frameThickness, windowLeftW + frameThickness * 2),
    frameMaterial
  );
  frameLeftBottom.position.set(-wallWidth / 2, 2.2 - windowLeftH / 2 - frameThickness / 2, -1);
  frameLeftBottom.castShadow = true;
  buildingGroup.add(frameLeftBottom);

  const doorWidth = 1.2;
  const doorHeight = 2.2;
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a3d2b,
    roughness: 0.9,
    metalness: 0.1
  });

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth, doorHeight, 0.1),
    doorMaterial
  );
  door.position.set(2, doorHeight / 2, wallDepth / 2 + wallThickness / 2 - 0.05);
  door.castShadow = true;
  buildingGroup.add(door);

  const handleMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.3,
    metalness: 0.9
  });
  const doorHandle = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 16, 16),
    handleMaterial
  );
  doorHandle.position.set(2 + doorWidth / 2 - 0.15, doorHeight / 2, wallDepth / 2 + wallThickness / 2 + 0.02);
  buildingGroup.add(doorHandle);

  return buildingGroup;
}
