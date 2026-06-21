import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Atom, Residue } from '@/types';
import { getCPKColor } from '@/utils/ChemistryUtils';

interface AtomMeshProps {
  atoms: Atom[];
  residues: Residue[];
  selectedAtomId: number | null;
  onAtomClick: (atom: Atom) => void;
  onAtomHover: (atom: Atom | null) => void;
  renderMode: 'ballstick' | 'cartoon';
  transitionProgress: number;
}

export function AtomMesh({
  atoms,
  residues,
  selectedAtomId,
  onAtomClick,
  onAtomHover,
  renderMode,
  transitionProgress,
}: AtomMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const highlightRef = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const highlightDummy = useMemo(() => new THREE.Object3D(), []);

  const { positions, colors, scales } = useMemo(() => {
    const atomCount = atoms.length;
    const positions: Array<[number, number, number]> = new Array(atomCount);
    const colors: string[] = new Array(atomCount);
    const scales: number[] = new Array(atomCount);

    const residueMap = new Map(residues.map(r => [r.id, r]));

    for (let i = 0; i < atomCount; i++) {
      const atom = atoms[i];
      const residue = residueMap.get(atom.residueId);

      let targetX = atom.x;
      let targetY = atom.y;
      let targetZ = atom.z;

      if (residue && residue.cartoonPosition) {
        const t = transitionProgress;
        targetX = atom.x + (residue.cartoonPosition[0] - atom.x) * t;
        targetY = atom.y + (residue.cartoonPosition[1] - atom.y) * t;
        targetZ = atom.z + (residue.cartoonPosition[2] - atom.z) * t;
      }

      positions[i] = [targetX, targetY, targetZ];
      colors[i] = getCPKColor(atom.element);
      scales[i] = renderMode === 'ballstick' ? atom.radius : atom.radius * (1 - transitionProgress * 0.5);
    }

    return { positions, colors, scales };
  }, [atoms, residues, renderMode, transitionProgress]);

  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const atomCount = atoms.length;

    for (let i = 0; i < atomCount; i++) {
      const [x, y, z] = positions[i];
      const scale = scales[i];

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(colors[i]));
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [positions, colors, scales, atoms.length, dummy]);

  useFrame((state) => {
    if (highlightRef.current && selectedAtomId !== null) {
      const atom = atoms.find(a => a.id === selectedAtomId);
      if (atom) {
        const residue = residues.find(r => r.id === atom.residueId);
        let x = atom.x;
        let y = atom.y;
        let z = atom.z;

        if (residue && residue.cartoonPosition) {
          const t = transitionProgress;
          x = atom.x + (residue.cartoonPosition[0] - atom.x) * t;
          y = atom.y + (residue.cartoonPosition[1] - atom.y) * t;
          z = atom.z + (residue.cartoonPosition[2] - atom.z) * t;
        }

        const pulse = 1 + 0.2 * Math.sin(state.clock.elapsedTime * 10);
        highlightDummy.position.set(x, y, z);
        highlightDummy.scale.setScalar(atom.radius * 1.2 * pulse);
        highlightDummy.updateMatrix();
        highlightRef.current.matrix.copy(highlightDummy.matrix);
        highlightRef.current.matrixAutoUpdate = false;
        highlightRef.current.visible = true;
      }
    } else if (highlightRef.current) {
      highlightRef.current.visible = false;
    }
  });

  const handleClick = (event: any) => {
    event.stopPropagation();
    const instanceId = event.instanceId;
    if (instanceId !== undefined && instanceId < atoms.length) {
      onAtomClick(atoms[instanceId]);
    }
  };

  const handlePointerOver = (event: any) => {
    event.stopPropagation();
    document.body.style.cursor = 'pointer';
    const instanceId = event.instanceId;
    if (instanceId !== undefined && instanceId < atoms.length) {
      onAtomHover(atoms[instanceId]);
    }
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
    onAtomHover(null);
  };

  if (atoms.length > 10000) {
    const geometry = new THREE.BufferGeometry();
    const positionsArray = new Float32Array(atoms.length * 3);
    const colorsArray = new Float32Array(atoms.length * 3);

    for (let i = 0; i < atoms.length; i++) {
      positionsArray[i * 3] = positions[i][0];
      positionsArray[i * 3 + 1] = positions[i][1];
      positionsArray[i * 3 + 2] = positions[i][2];

      const color = new THREE.Color(colors[i]);
      colorsArray[i * 3] = color.r;
      colorsArray[i * 3 + 1] = color.g;
      colorsArray[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

    return (
      <group>
        <points geometry={geometry}>
          <pointsMaterial size={0.3} vertexColors sizeAttenuation transparent opacity={0.8} />
        </points>
        {selectedAtomId !== null && (
          <mesh ref={highlightRef}>
            <ringGeometry args={[0.8, 1.0, 32]} />
            <meshBasicMaterial color="#ffff00" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, atoms.length]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial roughness={0.4} metalness={0.1} />
      </instancedMesh>
      {selectedAtomId !== null && (
        <mesh ref={highlightRef}>
          <ringGeometry args={[0.8, 1.0, 32]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
