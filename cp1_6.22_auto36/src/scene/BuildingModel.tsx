import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BuildingStyle, HighlightMode } from '../data/historicalBuildings';

interface BuildingModelProps {
  style: BuildingStyle;
  primaryColor: string;
  visible: boolean;
  opacity: number;
  scale: number;
  position?: [number, number, number];
  highlightMode: HighlightMode;
  isComparing?: boolean;
  compareSide?: 'left' | 'right';
  targetRotation?: number;
}

const STRUCTURE_COLOR = '#ffffff';
const DECORATION_EMISSIVE_INTENSITY = 1.5;

function hexToRgb(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

function GreekTemple({
  opacity,
  color,
  highlightMode,
}: {
  opacity: number;
  color: THREE.Color;
  highlightMode: HighlightMode;
}) {
  const baseColor = color;
  const structOpacity = highlightMode === 'structure' ? 1.0 : opacity;
  const decorOpacity = highlightMode === 'decoration' ? 1.0 : Math.max(opacity * 0.85, 0.2);
  const otherOpacity = highlightMode === 'none' ? opacity : Math.max(opacity * 0.25, 0.08);

  const decorRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (highlightMode === 'decoration' && decorRef.current) {
      const t = state.clock.getElapsedTime();
      const pulse = (Math.sin(t * 2.5) + 1) / 2;
      decorRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            mat.emissiveIntensity = 0.3 + pulse * DECORATION_EMISSIVE_INTENSITY;
          }
        }
      });
    }
  });

  const columns: JSX.Element[] = [];
  const colPositions = [
    [-2.0, -0.6], [-1.0, -0.6], [0, -0.6], [1.0, -0.6], [2.0, -0.6],
    [-2.0, 0.6], [-1.0, 0.6], [0, 0.6], [1.0, 0.6], [2.0, 0.6],
    [-2.0, 0], [2.0, 0],
  ];
  for (let i = 0; i < colPositions.length; i++) {
    const [x, z] = colPositions[i];
    columns.push(
      <mesh key={`col-${i}`} position={[x, 1.1, z]} castShadow>
        <cylinderGeometry args={[0.14, 0.16, 2.0, 16]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor}
          transparent
          opacity={structOpacity}
          roughness={0.7}
          metalness={0.1}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.15 : 0}
        />
      </mesh>
    );
    columns.push(
      <mesh key={`cap-${i}`} position={[x, 2.18, z]}>
        <cylinderGeometry args={[0.2, 0.17, 0.1, 16]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor.clone().multiplyScalar(1.1)}
          transparent
          opacity={structOpacity}
          roughness={0.6}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.2 : 0}
        />
      </mesh>
    );
  }

  return (
    <group>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[5.2, 0.16, 2.2]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor.clone().multiplyScalar(0.85)}
          transparent
          opacity={structOpacity}
          roughness={0.8}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.1 : 0}
        />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[5.0, 0.12, 2.0]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor.clone().multiplyScalar(0.92)}
          transparent
          opacity={structOpacity}
          roughness={0.8}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.1 : 0}
        />
      </mesh>

      {columns}

      <mesh position={[0, 2.45, 0]}>
        <boxGeometry args={[5.1, 0.35, 2.0]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor.clone().multiplyScalar(1.05)}
          transparent
          opacity={structOpacity}
          roughness={0.65}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.15 : 0}
        />
      </mesh>

      <group ref={decorRef}>
        <mesh position={[0, 3.1, 0]} rotation={[0, 0, 0]}>
          <coneGeometry args={[2.7, 0.9, 4]} />
          <meshStandardMaterial
            color={highlightMode === 'decoration' ? '#ffd89b' : baseColor.clone().multiplyScalar(1.12)}
            transparent
            opacity={decorOpacity}
            roughness={0.5}
            emissive={highlightMode === 'decoration' ? '#ff9e3d' : '#000'}
            emissiveIntensity={highlightMode === 'decoration' ? 0.6 : 0}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 2.82, 0.96]}>
          <torusGeometry args={[0.15, 0.03, 8, 16, Math.PI]} />
          <meshStandardMaterial
            color={highlightMode === 'decoration' ? '#ffe4b3' : '#ffd28a'}
            transparent
            opacity={decorOpacity}
            emissive={highlightMode === 'decoration' ? '#ffa64d' : '#000'}
            emissiveIntensity={highlightMode === 'decoration' ? 0.7 : 0}
          />
        </mesh>
      </group>

      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[4.4, 1.8, 0.8]} />
        <meshStandardMaterial
          color={baseColor.clone().multiplyScalar(0.7)}
          transparent
          opacity={otherOpacity}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function GothicChurch({
  opacity,
  color,
  highlightMode,
}: {
  opacity: number;
  color: THREE.Color;
  highlightMode: HighlightMode;
}) {
  const baseColor = color;
  const structOpacity = highlightMode === 'structure' ? 1.0 : opacity;
  const decorOpacity = highlightMode === 'decoration' ? 1.0 : Math.max(opacity * 0.9, 0.2);
  const otherOpacity = highlightMode === 'none' ? opacity : Math.max(opacity * 0.22, 0.08);

  const decorRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (highlightMode === 'decoration' && decorRef.current) {
      const t = state.clock.getElapsedTime();
      const pulse = (Math.sin(t * 2.2) + 1) / 2;
      decorRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            mat.emissiveIntensity = 0.4 + pulse * DECORATION_EMISSIVE_INTENSITY;
          }
        }
      });
    }
  });

  const flyingButtresses: JSX.Element[] = [];
  for (let i = -1; i <= 1; i++) {
    flyingButtresses.push(
      <mesh key={`fb-l-${i}`} position={[-1.55, 1.6 + i * 1.1, i * 0.9 + 0.2]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.35, 0.08, 1.6]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor.clone().multiplyScalar(0.85)}
          transparent
          opacity={structOpacity}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.2 : 0}
        />
      </mesh>,
      <mesh key={`fb-r-${i}`} position={[1.55, 1.6 + i * 1.1, i * 0.9 + 0.2]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.35, 0.08, 1.6]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor.clone().multiplyScalar(0.85)}
          transparent
          opacity={structOpacity}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.2 : 0}
        />
      </mesh>
    );
  }

  const piers: JSX.Element[] = [];
  for (let i = 0; i < 3; i++) {
    const z = -1.2 + i * 1.2;
    piers.push(
      <mesh key={`pier-l-${i}`} position={[-0.9, 1.8, z]}>
        <cylinderGeometry args={[0.11, 0.14, 3.4, 12]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor}
          transparent
          opacity={structOpacity}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.25 : 0}
        />
      </mesh>,
      <mesh key={`pier-r-${i}`} position={[0.9, 1.8, z]}>
        <cylinderGeometry args={[0.11, 0.14, 3.4, 12]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor}
          transparent
          opacity={structOpacity}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.25 : 0}
        />
      </mesh>
    );
  }

  return (
    <group>
      <mesh position={[0, 0.12, 0.2]} receiveShadow>
        <boxGeometry args={[3.4, 0.24, 4.4]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor.clone().multiplyScalar(0.75)}
          transparent
          opacity={structOpacity}
          roughness={0.85}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.1 : 0}
        />
      </mesh>

      <mesh position={[0, 1.8, 0.2]}>
        <boxGeometry args={[2.4, 3.2, 3.6]} />
        <meshStandardMaterial
          color={baseColor.clone().multiplyScalar(0.65)}
          transparent
          opacity={otherOpacity}
          roughness={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>

      {piers}

      {flyingButtresses}

      <mesh position={[0, 3.5, 0.2]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 0.1, 6, 1, false, 0, Math.PI]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor.clone().multiplyScalar(0.9)}
          transparent
          opacity={structOpacity}
          side={THREE.DoubleSide}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.2 : 0}
        />
      </mesh>

      <mesh position={[0, 0.9, -1.7]}>
        <boxGeometry args={[2.0, 2.8, 0.2]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor.clone().multiplyScalar(0.72)}
          transparent
          opacity={structOpacity}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.15 : 0}
        />
      </mesh>

      <mesh position={[0, 1.9, -1.62]}>
        <coneGeometry args={[0.8, 1.3, 4]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor.clone().multiplyScalar(0.82)}
          transparent
          opacity={structOpacity}
          side={THREE.DoubleSide}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.15 : 0}
        />
      </mesh>

      <group ref={decorRef}>
        <mesh position={[0, 3.35, -1.56]}>
          <torusGeometry args={[0.28, 0.04, 12, 32]} />
          <meshStandardMaterial
            color={highlightMode === 'decoration' ? '#7dd3fc' : '#c4b5fd'}
            transparent
            opacity={decorOpacity}
            emissive={highlightMode === 'decoration' ? '#3b82f6' : '#000'}
            emissiveIntensity={highlightMode === 'decoration' ? 0.8 : 0}
          />
        </mesh>
        {[-2, -1, 0, 1, 2].map((i) => (
          <mesh key={`spire-${i}`} position={[i * 0.55, 5.1, i % 2 === 0 ? 0.6 : 1.4]}>
            <coneGeometry args={[0.07, 1.1, 6]} />
            <meshStandardMaterial
              color={highlightMode === 'decoration' ? '#fef08a' : '#e0e7ff'}
              transparent
              opacity={decorOpacity}
              emissive={highlightMode === 'decoration' ? '#a855f7' : '#000'}
              emissiveIntensity={highlightMode === 'decoration' ? 0.9 : 0}
            />
          </mesh>
        ))}
        <mesh position={[0, 6.2, 0.2]}>
          <coneGeometry args={[0.22, 2.0, 6]} />
          <meshStandardMaterial
            color={highlightMode === 'decoration' ? '#fde68a' : '#c7d2fe'}
            transparent
            opacity={decorOpacity}
            emissive={highlightMode === 'decoration' ? '#8b5cf6' : '#000'}
            emissiveIntensity={highlightMode === 'decoration' ? 1.0 : 0}
          />
        </mesh>
        {[-1, 0, 1].map((i) => (
          <mesh key={`win-${i}`} position={[i * 0.8, 1.8, 2.0]}>
            <boxGeometry args={[0.35, 1.4, 0.04]} />
            <meshStandardMaterial
              color={highlightMode === 'decoration' ? '#86efac' : '#a5b4fc'}
              transparent
              opacity={decorOpacity * 0.85}
              emissive={highlightMode === 'decoration' ? '#10b981' : '#000'}
              emissiveIntensity={highlightMode === 'decoration' ? 0.7 : 0}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function BaroquePalace({
  opacity,
  color,
  highlightMode,
}: {
  opacity: number;
  color: THREE.Color;
  highlightMode: HighlightMode;
}) {
  const baseColor = color;
  const structOpacity = highlightMode === 'structure' ? 1.0 : opacity;
  const decorOpacity = highlightMode === 'decoration' ? 1.0 : Math.max(opacity * 0.9, 0.25);
  const otherOpacity = highlightMode === 'none' ? opacity : Math.max(opacity * 0.25, 0.08);

  const decorRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (highlightMode === 'decoration' && decorRef.current) {
      const t = state.clock.getElapsedTime();
      const pulse = (Math.sin(t * 2) + 1) / 2;
      decorRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            mat.emissiveIntensity = 0.35 + pulse * DECORATION_EMISSIVE_INTENSITY;
          }
        }
      });
    }
  });

  const windows: JSX.Element[] = [];
  for (let r = 0; r < 2; r++) {
    for (let c = -2; c <= 2; c++) {
      windows.push(
        <mesh key={`w-f-${r}-${c}`} position={[c * 0.9, 0.9 + r * 1.2, 1.31]}>
          <boxGeometry args={[0.4, 0.65, 0.05]} />
          <meshStandardMaterial
            color={highlightMode === 'decoration' ? '#fbbf24' : '#f59e0b'}
            transparent
            opacity={decorOpacity * 0.8}
            emissive={highlightMode === 'decoration' ? '#f59e0b' : '#000'}
            emissiveIntensity={highlightMode === 'decoration' ? 0.5 : 0}
          />
        </mesh>
      );
    }
  }

  return (
    <group>
      <mesh position={[0, 0.18, 0]} receiveShadow>
        <boxGeometry args={[5.6, 0.36, 3.2]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor.clone().multiplyScalar(0.72)}
          transparent
          opacity={structOpacity}
          roughness={0.78}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.12 : 0}
        />
      </mesh>

      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[5.0, 2.8, 2.6]} />
        <meshStandardMaterial
          color={baseColor.clone().multiplyScalar(0.62)}
          transparent
          opacity={otherOpacity}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[5.3, 0.3, 2.9]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor.clone().multiplyScalar(0.9)}
          transparent
          opacity={structOpacity}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.18 : 0}
        />
      </mesh>

      <mesh position={[0, 3.15, 0]}>
        <boxGeometry args={[5.3, 0.3, 2.9]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor.clone().multiplyScalar(0.95)}
          transparent
          opacity={structOpacity}
          emissive={highlightMode === 'structure' ? baseColor : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.18 : 0}
        />
      </mesh>

      <group ref={decorRef}>
        <mesh position={[0, 4.2, -0.1]}>
          <sphereGeometry args={[1.0, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={highlightMode === 'decoration' ? '#fcd34d' : baseColor.clone().multiplyScalar(1.1)}
            transparent
            opacity={decorOpacity}
            side={THREE.DoubleSide}
            roughness={0.45}
            emissive={highlightMode === 'decoration' ? '#f97316' : '#000'}
            emissiveIntensity={highlightMode === 'decoration' ? 0.7 : 0}
          />
        </mesh>

        <mesh position={[0, 4.18, -0.1]}>
          <torusGeometry args={[1.0, 0.05, 12, 40]} />
          <meshStandardMaterial
            color={highlightMode === 'decoration' ? '#fde68a' : '#fbbf24'}
            transparent
            opacity={decorOpacity}
            emissive={highlightMode === 'decoration' ? '#ef4444' : '#000'}
            emissiveIntensity={highlightMode === 'decoration' ? 0.85 : 0}
          />
        </mesh>

        {windows}

        <mesh position={[0, 2.2, 1.31]}>
          <boxGeometry args={[1.0, 1.6, 0.08]} />
          <meshStandardMaterial
            color={highlightMode === 'decoration' ? '#92400e' : '#78350f'}
            transparent
            opacity={decorOpacity * 0.85}
            emissive={highlightMode === 'decoration' ? '#dc2626' : '#000'}
            emissiveIntensity={highlightMode === 'decoration' ? 0.55 : 0}
          />
        </mesh>

        {[-2.2, 2.2].map((x, idx) => (
          <group key={`wing-${idx}`}>
            <mesh position={[x, 1.3, 0.6]}>
              <cylinderGeometry args={[0.08, 0.1, 0.8, 10]} />
              <meshStandardMaterial
                color={highlightMode === 'decoration' ? '#fef3c7' : '#fbbf24'}
                transparent
                opacity={decorOpacity}
                emissive={highlightMode === 'decoration' ? '#f59e0b' : '#000'}
                emissiveIntensity={highlightMode === 'decoration' ? 0.65 : 0}
              />
            </mesh>
            <mesh position={[x, 1.75, 0.6]}>
              <sphereGeometry args={[0.09, 16, 12]} />
              <meshStandardMaterial
                color={highlightMode === 'decoration' ? '#fef08a' : '#fde68a'}
                transparent
                opacity={decorOpacity}
                emissive={highlightMode === 'decoration' ? '#f97316' : '#000'}
                emissiveIntensity={highlightMode === 'decoration' ? 0.8 : 0}
              />
            </mesh>
          </group>
        ))}

        <mesh position={[0, 3.4, 1.32]}>
          <torusGeometry args={[0.22, 0.035, 10, 24, Math.PI]} />
          <meshStandardMaterial
            color={highlightMode === 'decoration' ? '#fca5a5' : '#f87171'}
            transparent
            opacity={decorOpacity}
            emissive={highlightMode === 'decoration' ? '#dc2626' : '#000'}
            emissiveIntensity={highlightMode === 'decoration' ? 0.75 : 0}
          />
        </mesh>
      </group>

      {[-1.9, 1.9].map((x, idx) => (
        <mesh key={`pav-${idx}`} position={[x, 1.9, 0]}>
          <cylinderGeometry args={[0.12, 0.14, 2.8, 14]} />
          <meshStandardMaterial
            color={highlightMode === 'structure' ? STRUCTURE_COLOR : baseColor.clone().multiplyScalar(0.95)}
            transparent
            opacity={structOpacity}
            emissive={highlightMode === 'structure' ? baseColor : '#000'}
            emissiveIntensity={highlightMode === 'structure' ? 0.2 : 0}
          />
        </mesh>
      ))}
    </group>
  );
}

function ModernBuilding({
  opacity,
  color,
  highlightMode,
}: {
  opacity: number;
  color: THREE.Color;
  highlightMode: HighlightMode;
}) {
  const baseColor = color;
  const structOpacity = highlightMode === 'structure' ? 1.0 : opacity;
  const decorOpacity = highlightMode === 'decoration' ? 1.0 : Math.max(opacity * 0.9, 0.3);
  const otherOpacity = highlightMode === 'none' ? opacity : Math.max(opacity * 0.22, 0.08);

  const decorRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (highlightMode === 'decoration' && decorRef.current) {
      const t = state.clock.getElapsedTime();
      const pulse = (Math.sin(t * 1.8) + 1) / 2;
      decorRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            mat.emissiveIntensity = 0.3 + pulse * DECORATION_EMISSIVE_INTENSITY;
          }
        }
      });
    }
  });

  const floors: JSX.Element[] = [];
  for (let i = 0; i < 8; i++) {
    const y = 0.5 + i * 0.58;
    floors.push(
      <mesh key={`floor-slab-${i}`} position={[0, y + 0.26, 0]}>
        <boxGeometry args={[2.3, 0.04, 1.3]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : '#94a3b8'}
          transparent
          opacity={structOpacity}
          roughness={0.45}
          metalness={0.6}
          emissive={highlightMode === 'structure' ? '#64748b' : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.2 : 0}
        />
      </mesh>
    );
  }

  const mullions: JSX.Element[] = [];
  for (let i = -2; i <= 2; i++) {
    mullions.push(
      <mesh key={`vm-${i}-f`} position={[i * 0.42, 2.5, 0.66]}>
        <boxGeometry args={[0.025, 4.8, 0.025]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : '#475569'}
          transparent
          opacity={structOpacity}
          metalness={0.75}
          roughness={0.3}
          emissive={highlightMode === 'structure' ? '#64748b' : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.2 : 0}
        />
      </mesh>,
      <mesh key={`vm-${i}-b`} position={[i * 0.42, 2.5, -0.66]}>
        <boxGeometry args={[0.025, 4.8, 0.025]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : '#475569'}
          transparent
          opacity={structOpacity}
          metalness={0.75}
          roughness={0.3}
          emissive={highlightMode === 'structure' ? '#64748b' : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.2 : 0}
        />
      </mesh>
    );
  }

  return (
    <group>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[3.0, 0.24, 2.0]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : '#64748b'}
          transparent
          opacity={structOpacity}
          roughness={0.55}
          metalness={0.4}
          emissive={highlightMode === 'structure' ? '#475569' : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.1 : 0}
        />
      </mesh>

      {[-1.0, 1.0].map((x, idx) => (
        <mesh key={`col-core-${idx}`} position={[x, 2.5, 0]}>
          <boxGeometry args={[0.16, 4.8, 0.8]} />
          <meshStandardMaterial
            color={highlightMode === 'structure' ? STRUCTURE_COLOR : '#64748b'}
            transparent
            opacity={structOpacity}
            roughness={0.55}
            metalness={0.35}
            emissive={highlightMode === 'structure' ? '#334155' : '#000'}
            emissiveIntensity={highlightMode === 'structure' ? 0.22 : 0}
          />
        </mesh>
      ))}

      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[0.6, 4.8, 0.4]} />
        <meshStandardMaterial
          color={highlightMode === 'structure' ? STRUCTURE_COLOR : '#475569'}
          transparent
          opacity={structOpacity}
          emissive={highlightMode === 'structure' ? '#334155' : '#000'}
          emissiveIntensity={highlightMode === 'structure' ? 0.18 : 0}
        />
      </mesh>

      {floors}
      {mullions}

      {[0.65, -0.65].map((z, zi) => (
        <mesh key={`glass-${zi}`} position={[0, 2.5, z]}>
          <boxGeometry args={[2.15, 4.7, 0.025]} />
          <meshPhysicalMaterial
            color={highlightMode === 'decoration' ? '#67e8f9' : baseColor}
            transparent
            opacity={otherOpacity * 0.85}
            roughness={0.05}
            metalness={0.15}
            transmission={highlightMode === 'none' ? 0.7 : 0.1}
            thickness={0.05}
            emissive={highlightMode === 'decoration' ? '#06b6d4' : '#000'}
            emissiveIntensity={highlightMode === 'decoration' ? 0.3 : 0}
          />
        </mesh>
      ))}

      {[0.65, -0.65].map((z, zi) => (
        <mesh key={`sideglass-${zi}`} position={[z > 0 ? 1.08 : -1.08, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[1.25, 4.7, 0.025]} />
          <meshPhysicalMaterial
            color={highlightMode === 'decoration' ? '#67e8f9' : baseColor}
            transparent
            opacity={otherOpacity * 0.85}
            roughness={0.05}
            metalness={0.15}
            transmission={highlightMode === 'none' ? 0.7 : 0.1}
            thickness={0.05}
            emissive={highlightMode === 'decoration' ? '#06b6d4' : '#000'}
            emissiveIntensity={highlightMode === 'decoration' ? 0.3 : 0}
          />
        </mesh>
      ))}

      <group ref={decorRef}>
        {[0, 1, 2, 3, 4, 5, 6].map((f) => (
          <group key={`lights-${f}`}>
            {[-1, 0, 1].map((r) => (
              <mesh
                key={`light-f${f}-r${r}`}
                position={[r * 0.6, 0.65 + f * 0.58, 0.68]}
              >
                <boxGeometry args={[0.25, 0.18, 0.008]} />
                <meshStandardMaterial
                  color={highlightMode === 'decoration' ? '#fef9c3' : '#fde68a'}
                  transparent
                  opacity={decorOpacity}
                  emissive={highlightMode === 'decoration' ? '#fbbf24' : '#000'}
                  emissiveIntensity={highlightMode === 'decoration' ? 0.95 : 0.1}
                />
              </mesh>
            ))}
          </group>
        ))}

        <mesh position={[0, 5.15, 0]}>
          <boxGeometry args={[2.4, 0.1, 1.4]} />
          <meshStandardMaterial
            color={highlightMode === 'decoration' ? '#e2e8f0' : '#94a3b8'}
            transparent
            opacity={decorOpacity}
            metalness={0.7}
            roughness={0.25}
            emissive={highlightMode === 'decoration' ? '#38bdf8' : '#000'}
            emissiveIntensity={highlightMode === 'decoration' ? 0.5 : 0}
          />
        </mesh>

        <mesh position={[0.85, 5.35, -0.4]}>
          <cylinderGeometry args={[0.015, 0.015, 0.5, 8]} />
          <meshStandardMaterial
            color={highlightMode === 'decoration' ? '#fca5a5' : '#cbd5e1'}
            transparent
            opacity={decorOpacity}
            emissive={highlightMode === 'decoration' ? '#ef4444' : '#000'}
            emissiveIntensity={highlightMode === 'decoration' ? 1.1 : 0}
          />
        </mesh>
      </group>
    </group>
  );
}

export default function BuildingModel({
  style,
  primaryColor,
  visible,
  opacity,
  scale,
  position = [0, 0, 0],
  highlightMode,
  isComparing = false,
  compareSide,
  targetRotation = 0,
}: BuildingModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const outlineRef = useRef<THREE.Group>(null);
  const color = useMemo(() => hexToRgb(primaryColor), [primaryColor]);

  const currentOpacity = visible ? opacity : Math.max(0.03, opacity * 0.15);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.visible = visible || opacity > 0.08;
    }
  }, [visible, opacity]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      let tgtY = 0;
      if (isComparing && compareSide) {
        tgtY = compareSide === 'left' ? targetRotation : -targetRotation;
      }
      const cur = groupRef.current.rotation.y;
      groupRef.current.rotation.y += (tgtY - cur) * Math.min(delta * 1.2, 1);
    }
  });

  const renderBuilding = () => {
    switch (style) {
      case 'greek':
        return <GreekTemple opacity={currentOpacity} color={color} highlightMode={highlightMode} />;
      case 'gothic':
        return <GothicChurch opacity={currentOpacity} color={color} highlightMode={highlightMode} />;
      case 'baroque':
        return <BaroquePalace opacity={currentOpacity} color={color} highlightMode={highlightMode} />;
      case 'modern':
        return <ModernBuilding opacity={currentOpacity} color={color} highlightMode={highlightMode} />;
    }
  };

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {renderBuilding()}

      <group ref={outlineRef}>
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.6, 2.75, 64]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={visible ? 0.15 : 0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
