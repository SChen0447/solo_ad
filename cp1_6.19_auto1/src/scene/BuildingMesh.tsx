import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BuildingData } from '../types';

interface BuildingMeshProps {
  building: BuildingData;
  isSelected: boolean;
  onClick: (id: string) => void;
}

function BoxBuilding({ building, isSelected, onClick }: BuildingMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const edgeRef = useRef<THREE.LineSegments>(null);

  useFrame((state) => {
    if (edgeRef.current && isSelected) {
      const pulse = 0.5 + 0.3 * Math.sin(state.clock.elapsedTime * 2);
      const material = edgeRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.6 + pulse * 0.4;
    }
  });

  const edgesGeometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(
      building.dimensions.width,
      building.dimensions.height,
      building.dimensions.depth
    );
    const edges = new THREE.EdgesGeometry(geo);
    return edges;
  }, [building.dimensions]);

  return (
    <group
      ref={groupRef}
      position={[
        building.position[0],
        building.dimensions.height / 2,
        building.position[2],
      ]}
      onClick={(e) => {
        e.stopPropagation();
        onClick(building.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry
          args={[
            building.dimensions.width,
            building.dimensions.height,
            building.dimensions.depth,
          ]}
        />
        <meshStandardMaterial color={building.color} roughness={0.7} metalness={0.1} />
      </mesh>
      {isSelected && (
        <lineSegments ref={edgeRef} geometry={edgesGeometry}>
          <lineBasicMaterial
            color="#4fc3f7"
            transparent
            opacity={0.8}
            linewidth={2}
          />
        </lineSegments>
      )}
    </group>
  );
}

function LShapeBuilding({ building, isSelected, onClick }: BuildingMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { width, depth, height } = building.dimensions;
  const wingWidth = width * 0.4;
  const wingDepth = depth * 0.6;

  const mergedEdges = useMemo(() => {
    const box1 = new THREE.BoxGeometry(width, height, wingDepth);
    const box2 = new THREE.BoxGeometry(wingWidth, height, depth);
    box2.translate(-(width - wingWidth) / 2, 0, (depth - wingDepth) / 2);
    
    const edges1 = new THREE.EdgesGeometry(box1);
    const edges2 = new THREE.EdgesGeometry(box2);
    
    const merged = new THREE.BufferGeometry();
    const positions: number[] = [];
    
    const pos1 = edges1.attributes.position;
    for (let i = 0; i < pos1.count; i++) {
      positions.push(pos1.getX(i), pos1.getY(i), pos1.getZ(i));
    }
    
    const pos2 = edges2.attributes.position;
    for (let i = 0; i < pos2.count; i++) {
      positions.push(pos2.getX(i), pos2.getY(i), pos2.getZ(i));
    }
    
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return merged;
  }, [width, depth, height, wingWidth, wingDepth]);

  useFrame((state) => {
    if (groupRef.current && isSelected) {
      const pulse = 0.5 + 0.3 * Math.sin(state.clock.elapsedTime * 2);
      groupRef.current.children.forEach((child, idx) => {
        if (idx > 1) {
          const line = child as THREE.LineSegments;
          const material = line.material as THREE.LineBasicMaterial;
          material.opacity = 0.6 + pulse * 0.4;
        }
      });
    }
  });

  return (
    <group
      ref={groupRef}
      position={[
        building.position[0],
        building.dimensions.height / 2,
        building.position[2],
      ]}
      onClick={(e) => {
        e.stopPropagation();
        onClick(building.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <mesh castShadow receiveShadow position={[0, 0, -(depth - wingDepth) / 2]}>
        <boxGeometry args={[width, height, wingDepth]} />
        <meshStandardMaterial color={building.color} roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh castShadow receiveShadow position={[-(width - wingWidth) / 2, 0, (depth - wingDepth) / 2]}>
        <boxGeometry args={[wingWidth, height, depth]} />
        <meshStandardMaterial color={building.color} roughness={0.7} metalness={0.1} />
      </mesh>
      {isSelected && (
        <lineSegments geometry={mergedEdges}>
          <lineBasicMaterial
            color="#4fc3f7"
            transparent
            opacity={0.8}
          />
        </lineSegments>
      )}
    </group>
  );
}

function ArchBuilding({ building, isSelected, onClick }: BuildingMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { width, depth, height } = building.dimensions;
  const archRadius = height * 0.4;
  const archHeight = height - archRadius;

  useFrame((state) => {
    if (groupRef.current && isSelected) {
      const pulse = 0.5 + 0.3 * Math.sin(state.clock.elapsedTime * 2);
      groupRef.current.children.forEach((child, idx) => {
        if (idx >= 3) {
          const line = child as THREE.LineSegments;
          const material = line.material as THREE.LineBasicMaterial;
          material.opacity = 0.6 + pulse * 0.4;
        }
      });
    }
  });

  return (
    <group
      ref={groupRef}
      position={[
        building.position[0],
        0,
        building.position[2],
      ]}
      onClick={(e) => {
        e.stopPropagation();
        onClick(building.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <mesh castShadow receiveShadow position={[-(width - depth) / 2, archHeight / 2, 0]}>
        <boxGeometry args={[depth, archHeight, depth]} />
        <meshStandardMaterial color={building.color} roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh castShadow receiveShadow position={[(width - depth) / 2, archHeight / 2, 0]}>
        <boxGeometry args={[depth, archHeight, depth]} />
        <meshStandardMaterial color={building.color} roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, archHeight + archRadius / 2, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[archRadius, archRadius, depth, 32, 1, true, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color={building.color} roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function BuildingMesh({ building, isSelected, onClick }: BuildingMeshProps) {
  switch (building.shape) {
    case 'lShape':
      return <LShapeBuilding building={building} isSelected={isSelected} onClick={onClick} />;
    case 'arch':
      return <ArchBuilding building={building} isSelected={isSelected} onClick={onClick} />;
    case 'box':
    default:
      return <BoxBuilding building={building} isSelected={isSelected} onClick={onClick} />;
  }
}
