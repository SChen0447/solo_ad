import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Stars } from '@react-three/drei';
import * as THREE from 'three';
import BuildingModel from './BuildingModel';
import type { BuildingStyle, HighlightMode, BuildingData } from '../data/historicalBuildings';

interface BuildingState {
  id: BuildingStyle;
  visible: boolean;
  opacity: number;
  scale: number;
}

interface SceneViewProps {
  buildings: BuildingData[];
  buildingStates: Record<BuildingStyle, BuildingState>;
  highlightMode: HighlightMode;
  compareMode: boolean;
  comparePair: BuildingStyle[];
  dividerPosition: number;
  targetRotation: number;
}

function ReflectiveFloor() {
  const gridRef = useRef<THREE.LineSegments>(null);

  useFrame((state) => {
    if (gridRef.current) {
      const mats = Array.isArray(gridRef.current.material)
        ? gridRef.current.material
        : [gridRef.current.material];
      mats.forEach((m) => {
        const mat = m as THREE.LineBasicMaterial;
        if (mat.opacity !== undefined) {
          mat.opacity = 0.35 + Math.sin(state.clock.getElapsedTime() * 0.5) * 0.05;
        }
      });
    }
  });

  const polarPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let r = 1; r <= 6; r++) {
      const radius = r * 0.9;
      const segs = 80;
      for (let i = 0; i <= segs; i++) {
        const a1 = (i / segs) * Math.PI * 2;
        const a2 = ((i + 1) / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a1) * radius, 0.005, Math.sin(a1) * radius));
        pts.push(new THREE.Vector3(Math.cos(a2) * radius, 0.005, Math.sin(a2) * radius));
      }
    }
    for (let a = 0; a < 16; a++) {
      const angle = (a / 16) * Math.PI * 2;
      pts.push(new THREE.Vector3(0, 0.005, 0));
      pts.push(new THREE.Vector3(Math.cos(angle) * 5.4, 0.005, Math.sin(angle) * 5.4));
    }
    return pts;
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(polarPoints);
    return g;
  }, [polarPoints]);

  return (
    <group>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[7.5, 96]} />
        <meshPhysicalMaterial
          color="#1a1a3a"
          transparent
          opacity={0.75}
          roughness={0.15}
          metalness={0.45}
          clearcoat={0.6}
          clearcoatRoughness={0.2}
        />
      </mesh>

      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7.2, 7.5, 96]} />
        <meshBasicMaterial
          color="#64b5f6"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      <lineSegments ref={gridRef} geometry={geo}>
        <lineBasicMaterial
          color="#818cf8"
          transparent
          opacity={0.38}
        />
      </lineSegments>
    </group>
  );
}

function SceneContent({
  buildings,
  buildingStates,
  highlightMode,
  compareMode,
  comparePair,
  dividerPosition,
  targetRotation,
}: Omit<SceneViewProps, 'comparePair'> & { comparePair: BuildingStyle[] }) {
  return (
    <>
      <ambientLight intensity={0.45} color="#c7d2fe" />

      <directionalLight
        position={[5, 8, 5]}
        intensity={1.1}
        color="#fef3c7"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      <directionalLight
        position={[-6, 4, -4]}
        intensity={0.45}
        color="#a5b4fc"
      />

      <pointLight position={[0, 6, 0]} intensity={0.5} color="#f0abfc" distance={14} />
      <pointLight position={[-4, 3, 4]} intensity={0.35} color="#93c5fd" distance={12} />

      <Stars radius={80} depth={40} count={1800} factor={3.5} fade speed={0.4} />

      <ReflectiveFloor />

      {compareMode ? (
        comparePair.slice(0, 2).map((id, index) => {
          const b = buildings.find((x) => x.id === id);
          const state = buildingStates[id];
          if (!b || !state) return null;
          const side = index === 0 ? 'left' : 'right';
          const offset = index === 0 ? -2.5 : 2.5;
          return (
            <BuildingModel
              key={`cmp-${id}`}
              style={b.id}
              primaryColor={b.primaryColor}
              visible={true}
              opacity={state.opacity}
              scale={state.scale}
              position={[offset, 0, 0]}
              highlightMode={highlightMode}
              isComparing={true}
              compareSide={side as 'left' | 'right'}
              targetRotation={targetRotation}
            />
          );
        })
      ) : (
        buildings.map((b) => {
          const state = buildingStates[b.id];
          if (!state) return null;
          return (
            <BuildingModel
              key={b.id}
              style={b.id}
              primaryColor={b.primaryColor}
              visible={state.visible}
              opacity={state.opacity}
              scale={state.scale}
              position={[0, 0, 0]}
              highlightMode={highlightMode}
              targetRotation={0}
            />
          );
        })
      )}

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.55}
        scale={16}
        blur={2.2}
        far={6.5}
        color="#000000"
      />

      <Environment preset="night" />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={4.5}
        maxDistance={18}
        minPolarAngle={Math.PI * 0.08}
        maxPolarAngle={Math.PI * 0.48}
        target={[0, 2, 0]}
      />
    </>
  );
}

export default function SceneView(props: SceneViewProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [7, 5.5, 9], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    >
      <fog attach="fog" args={['#161440', 12, 32]} />
      <color attach="background" args={['#0a0a2e']} />
      <SceneContent {...props} comparePair={props.comparePair} />
    </Canvas>
  );
}
