import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSimulationStore } from '../store/store';

export function Buildings() {
  const buildings = useSimulationStore((state) => state.buildings);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useMemo(() => {
    if (!meshRef.current) return;

    buildings.forEach((building, i) => {
      dummy.position.set(
        building.position.x,
        building.position.y,
        building.position.z
      );
      dummy.scale.set(building.width, building.height, building.depth);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [buildings, dummy]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, buildings.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#5a6575" roughness={0.8} metalness={0.2} />
    </instancedMesh>
  );
}
