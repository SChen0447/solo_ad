import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import { BuildingData, OcclusionResult } from '../types';
import {
  createWindowTexture,
  generateRoundedBoxGeometry,
  createBuildingMaterial,
  createEdgeLines,
  generateBuildingSeed,
  getBuildingHeight
} from '../utils/buildingUtils';
import { useSceneStore } from '../store/useSceneStore';

interface BuildingProps {
  data: BuildingData;
  index: number;
  isSelected: boolean;
  occlusionResult?: OcclusionResult;
  onClick: () => void;
}

export function Building({ data, index, isSelected, occlusionResult, onClick }: BuildingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  const highlightRef = useRef<THREE.Mesh>(null);

  const buildingHeight = getBuildingHeight(data);
  const seed = generateBuildingSeed(data.id);
  const occlusionRate = occlusionResult?.occlusionRate ?? 0;

  const [springs, api] = useSpring(() => ({
    scaleY: 0,
    config: { tension: 280, friction: 20 }
  }));

  useEffect(() => {
    const timer = setTimeout(() => {
      api.start({ scaleY: 1 });
    }, index * 50);

    return () => clearTimeout(timer);
  }, [api, index, data.floorCount]);

  useFrame((state) => {
    if (isSelected && highlightRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * (Math.PI * 2 / 1.5)) * 0.3 + 0.7;
      (highlightRef.current.material as THREE.MeshBasicMaterial).opacity = pulse * 0.5;
    }

    if (edgesRef.current) {
      const edgeMat = edgesRef.current.material as THREE.LineBasicMaterial;
      if (isSelected) {
        edgeMat.opacity = 0.8 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
        edgeMat.color.setHex(0x4ea8ff);
      } else {
        edgeMat.opacity = 0.3;
        edgeMat.color.setHex(0x4ea8ff);
      }
    }
  });

  const { geometry, material, edges } = useMemo(() => {
    const windowTexture = createWindowTexture(data.windowType, seed);
    const geometry = generateRoundedBoxGeometry(
      data.width,
      buildingHeight,
      data.depth,
      data.cornerRadius
    );
    const material = createBuildingMaterial(
      data.facadeColor,
      windowTexture,
      data.width,
      buildingHeight
    );
    const edges = createEdgeLines(geometry);

    return { geometry, material, edges };
  }, [data, buildingHeight, seed]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      edges.geometry.dispose();
      (edges.material as THREE.Material).dispose();
    };
  }, [geometry, material, edges]);

  const baseOpacity = occlusionRate > 0 ? 1 - occlusionRate * 0.6 : 1;

  return (
    <group position={[data.x, 0, data.z]} rotation={[0, data.rotation, 0]}>
      <animated.mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        scale-y={springs.scaleY}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <meshStandardMaterial
          attach="material"
          color={data.facadeColor}
          roughness={0.6}
          metalness={0.1}
          map={material.map}
          transparent
          opacity={baseOpacity}
        />
      </animated.mesh>

      <primitive object={edges} ref={edgesRef} />

      {isSelected && (
        <mesh ref={highlightRef} scale={[1.02, 1.02, 1.02]}>
          <boxGeometry args={[data.width + 0.2, buildingHeight + 0.2, data.depth + 0.2]} />
          <meshBasicMaterial
            color="#4ea8ff"
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {occlusionRate > 0 && (
        <group position={[0, buildingHeight + 2, 0]}>
          <mesh>
            <planeGeometry args={[3, 1.2]} />
            <meshBasicMaterial color="#1a1a2e" transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[2.8, 1]} />
            <meshBasicMaterial
              color={occlusionRate > 0.5 ? '#ff6b6b' : '#00ff88'}
              transparent
              opacity={0.9}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
