import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ElementType } from '../types';

interface ElementProps {
  position: [number, number, number];
  height: number;
  color?: string;
  isSelected?: boolean;
  isPreview?: boolean;
  isValid?: boolean;
  animateHeight?: number;
}

const TERRAIN_COLOR = '#4a7c59';
const BUILDING_COLOR = '#a0a0a0';
const TREE_CROWN_COLOR = '#2d5a27';
const TREE_TRUNK_COLOR = '#5c4033';
const PREVIEW_VALID_COLOR = '#00ff00';
const PREVIEW_INVALID_COLOR = '#ff0000';
const SELECTED_EDGE_COLOR = '#4a9eff';

export const TerrainTile: React.FC<ElementProps> = ({
  position,
  height,
  color = TERRAIN_COLOR,
  isSelected = false,
  isPreview = false,
  isValid = true,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);

  const material = useMemo(() => {
    if (isPreview) {
      return new THREE.MeshStandardMaterial({
        color: isValid ? PREVIEW_VALID_COLOR : PREVIEW_INVALID_COLOR,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
    }
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.1,
    });
  }, [isPreview, isValid, color]);

  const displayColor = isSelected ? SELECTED_EDGE_COLOR : '#ffffff';
  const displayOpacity = isSelected ? 1 : 0.3;

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        position={[0, height / 2, 0]}
        castShadow={!isPreview}
        receiveShadow={!isPreview}
        material={material}
      >
        <boxGeometry args={[0.5, height, 0.5]} />
      </mesh>
      {isSelected && (
        <lineSegments ref={edgesRef}>
          <edgesGeometry args={[new THREE.BoxGeometry(0.5, height, 0.5)]} />
          <lineBasicMaterial color={displayColor} transparent opacity={displayOpacity} />
        </lineSegments>
      )}
    </group>
  );
};

export const BuildingBlock: React.FC<ElementProps> = ({
  position,
  height,
  color = BUILDING_COLOR,
  isSelected = false,
  isPreview = false,
  isValid = true,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);

  const material = useMemo(() => {
    if (isPreview) {
      return new THREE.MeshStandardMaterial({
        color: isValid ? PREVIEW_VALID_COLOR : PREVIEW_INVALID_COLOR,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
    }
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.3,
    });
  }, [isPreview, isValid, color]);

  const stripeLines = useMemo(() => {
    if (isPreview) return null;
    const lines: JSX.Element[] = [];
    const stripeSpacing = 0.1;
    const numStripes = Math.floor(height / stripeSpacing);

    for (let i = 0; i <= numStripes; i++) {
      const y = -height / 2 + i * stripeSpacing;
      const points = [
        new THREE.Vector3(-0.25, y, -0.25),
        new THREE.Vector3(0.25, y, -0.25),
        new THREE.Vector3(0.25, y, 0.25),
        new THREE.Vector3(-0.25, y, 0.25),
        new THREE.Vector3(-0.25, y, -0.25),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      lines.push(
        <line key={i}>
          <primitive object={geometry} attach="geometry" />
          <lineBasicMaterial color="#666666" transparent opacity={0.6} />
        </line>
      );
    }
    return lines;
  }, [height, isPreview]);

  const displayColor = isSelected ? SELECTED_EDGE_COLOR : '#ffffff';
  const displayOpacity = isSelected ? 1 : 0.3;

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        position={[0, height / 2, 0]}
        castShadow={!isPreview}
        receiveShadow={!isPreview}
        material={material}
      >
        <boxGeometry args={[0.5, height, 0.5]} />
      </mesh>
      {stripeLines}
      {isSelected && (
        <lineSegments ref={edgesRef} position={[0, height / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(0.5, height, 0.5)]} />
          <lineBasicMaterial color={displayColor} transparent opacity={displayOpacity} />
        </lineSegments>
      )}
    </group>
  );
};

export const Tree: React.FC<ElementProps> = ({
  position,
  height,
  isSelected = false,
  isPreview = false,
  isValid = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  const trunkHeight = height * 0.35;
  const trunkRadius = 0.06;
  const crownHeight = height * 0.65;
  const crownRadius = 0.22;

  const trunkMaterial = useMemo(() => {
    if (isPreview) {
      return new THREE.MeshStandardMaterial({
        color: isValid ? PREVIEW_VALID_COLOR : PREVIEW_INVALID_COLOR,
        transparent: true,
        opacity: 0.4,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: TREE_TRUNK_COLOR,
      roughness: 0.9,
      metalness: 0,
    });
  }, [isPreview, isValid]);

  const crownMaterial = useMemo(() => {
    if (isPreview) {
      return new THREE.MeshStandardMaterial({
        color: isValid ? PREVIEW_VALID_COLOR : PREVIEW_INVALID_COLOR,
        transparent: true,
        opacity: 0.4,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: TREE_CROWN_COLOR,
      roughness: 0.8,
      metalness: 0,
    });
  }, [isPreview, isValid]);

  const displayColor = isSelected ? SELECTED_EDGE_COLOR : '#ffffff';
  const displayOpacity = isSelected ? 1 : 0.3;

  return (
    <group ref={groupRef} position={position}>
      <mesh
        position={[0, trunkHeight / 2, 0]}
        castShadow={!isPreview}
        receiveShadow={!isPreview}
        material={trunkMaterial}
      >
        <cylinderGeometry args={[trunkRadius, trunkRadius * 1.2, trunkHeight, 8]} />
      </mesh>
      <mesh
        position={[0, trunkHeight + crownHeight / 2, 0]}
        castShadow={!isPreview}
        receiveShadow={!isPreview}
        material={crownMaterial}
      >
        <coneGeometry args={[crownRadius, crownHeight, 8]} />
      </mesh>
      {isSelected && (
        <>
          <lineSegments position={[0, trunkHeight / 2, 0]}>
            <edgesGeometry args={[new THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.2, trunkHeight, 8)]} />
            <lineBasicMaterial color={displayColor} transparent opacity={displayOpacity} />
          </lineSegments>
          <lineSegments position={[0, trunkHeight + crownHeight / 2, 0]}>
            <edgesGeometry args={[new THREE.ConeGeometry(crownRadius, crownHeight, 8)]} />
            <lineBasicMaterial color={displayColor} transparent opacity={displayOpacity} />
          </lineSegments>
        </>
      )}
    </group>
  );
};

interface ElementRendererProps {
  type: ElementType;
  props: ElementProps;
}

export const ElementRenderer: React.FC<ElementRendererProps> = ({ type, props }) => {
  switch (type) {
    case 'terrain':
      return <TerrainTile {...props} />;
    case 'building':
      return <BuildingBlock {...props} />;
    case 'tree':
      return <Tree {...props} />;
    default:
      return null;
  }
};

interface AnimatedElementProps extends ElementProps {
  type: ElementType;
  targetHeight: number;
}

export const AnimatedElement: React.FC<AnimatedElementProps> = ({
  type,
  targetHeight,
  ...props
}) => {
  const currentHeight = useRef(targetHeight);
  const displayHeight = useRef(targetHeight);

  useFrame((_, delta) => {
    if (Math.abs(currentHeight.current - targetHeight) > 0.001) {
      currentHeight.current += (targetHeight - currentHeight.current) * Math.min(delta * 5, 1);
      displayHeight.current = currentHeight.current;
    } else {
      currentHeight.current = targetHeight;
      displayHeight.current = targetHeight;
    }
  });

  return <ElementRenderer type={type} props={{ ...props, height: displayHeight.current }} />;
};

export const GridHelper: React.FC = () => {
  return (
    <gridHelper
      args={[10, 20, '#d0d0d0', '#d0d0d0']}
      position={[0, 0.001, 0]}
    />
  );
};

export const AxesHelper: React.FC = () => {
  return (
    <group position={[0, 0.01, 0]}>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0.3, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ff0000" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, 0.3, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00ff00" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, 0, 0.3])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#0000ff" />
      </line>
    </group>
  );
};

export const GroundPlane: React.FC = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#3a3a3a" transparent opacity={0.9} />
    </mesh>
  );
};

interface LineOfSightVisualizationProps {
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
  occluderPoints: Array<{ x: number; y: number; z: number }>;
}

export const LineOfSightVisualization: React.FC<LineOfSightVisualizationProps> = ({
  startPoint,
  endPoint,
  occluderPoints,
}) => {
  const blinkRef = useRef(0);

  useFrame((_, delta) => {
    blinkRef.current += delta;
  });

  const dashSize = 0.1;
  const gapSize = 0.1;

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              startPoint.x, startPoint.y, startPoint.z,
              endPoint.x, endPoint.y, endPoint.z,
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineDashedMaterial
          color="#ff4444"
          transparent
          opacity={0.6}
          linewidth={2}
          dashSize={dashSize}
          gapSize={gapSize}
        />
      </line>
      {occluderPoints.map((point, index) => {
        const visible = Math.sin(blinkRef.current * Math.PI * 2) > 0;
        return (
          <mesh
            key={index}
            position={[point.x, point.y, point.z]}
            visible={visible}
          >
            <sphereGeometry args={[0.075, 16, 16]} />
            <meshBasicMaterial color="#ffff00" transparent opacity={0.9} />
          </mesh>
        );
      })}
    </group>
  );
};
