import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const AXIS_LENGTH = 2.5;

function createArrowMaterial(color: string): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
  });
}

function AxisLine({
  direction,
  color,
}: {
  direction: [number, number, number];
  color: string;
}) {
  const lineRef = useRef<THREE.Line>(null);
  const coneRef = useRef<THREE.Mesh>(null);

  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(
      direction[0] * AXIS_LENGTH,
      direction[1] * AXIS_LENGTH,
      direction[2] * AXIS_LENGTH
    ),
  ]);

  const coneGeometry = new THREE.ConeGeometry(0.08, 0.2, 8);
  const coneMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
  });

  const conePosition = new THREE.Vector3(
    direction[0] * AXIS_LENGTH,
    direction[1] * AXIS_LENGTH,
    direction[2] * AXIS_LENGTH
  );
  const coneQuaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(...direction).normalize()
  );

  return (
    <group>
      <primitive ref={lineRef} object={new THREE.Line(lineGeometry, createArrowMaterial(color))} />
      <mesh
        ref={coneRef}
        position={conePosition}
        quaternion={coneQuaternion}
        geometry={coneGeometry}
        material={coneMaterial}
      />
    </group>
  );
}

export default function Compass() {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;
    const cameraDir = new THREE.Vector3();
    camera.getWorldPosition(cameraDir);
    const cameraDistance = cameraDir.length();
    const offset = new THREE.Vector3(-cameraDistance * 0.45, -cameraDistance * 0.4, 0);
    cameraDir.normalize().multiplyScalar(cameraDistance * 0.8);
    groupRef.current.position.copy(cameraDir).add(offset);
    groupRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={groupRef}>
      <AxisLine direction={[1, 0, 0]} color="#ff4444" />
      <AxisLine direction={[0, 1, 0]} color="#44ff44" />
      <AxisLine direction={[0, 0, 1]} color="#4488ff" />
    </group>
  );
}
