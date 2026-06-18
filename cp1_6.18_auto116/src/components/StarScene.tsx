import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { getStarList, getStarById } from '@/modules/starData';
import { useStore } from '@/store';
import StarLayerComponent from './StarLayer';

function StarField() {
  const count = 800;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    return pos;
  }, []);

  const sizes = useMemo(() => {
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      s[i] = Math.random() * 1.5 + 0.3;
    }
    return s;
  }, []);

  const ref = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const material = ref.current.material as THREE.PointsMaterial;
    const t = clock.elapsedTime;
    material.opacity = 0.4 + Math.sin(t * 0.5) * 0.15;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#aaccff"
        size={0.15}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function AxisHelper() {
  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, -8, 0, 0, 8, 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#334466" transparent opacity={0.2} />
      </line>
    </group>
  );
}

function StarLabel({ name, position }: { name: string; position: [number, number, number] }) {
  return (
    <group position={[position[0], position[1] - position[2] * 0.01 - 1.8, position[2]]}>
      <sprite position={[0, -0.3, 0]} scale={[2.5, 0.4, 1]}>
        <spriteMaterial transparent opacity={0} />
      </sprite>
      <mesh position={[0, -0.3, 0]}>
        <planeGeometry args={[2.5, 0.4]} />
        <meshBasicMaterial color="#0a0e27" transparent opacity={0} />
      </mesh>
    </group>
  );
}

function SceneContent() {
  const selectedStars = useStore((s) => s.selectedStars);
  const allStars = getStarList();

  const selectedStarData = useMemo(
    () => selectedStars.map((id) => getStarById(id)).filter(Boolean) as ReturnType<typeof getStarById>[],
    [selectedStars]
  );

  const starPositions = useMemo((): [number, number, number][] => {
    const count = selectedStarData.length;
    if (count === 0) return [];
    if (count === 1) return [[0, 0, 0]];
    const spacing = 5.5;
    return selectedStarData.map((_, i) => [
      (i - (count - 1) / 2) * spacing,
      0,
      0,
    ]);
  }, [selectedStarData]);

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 10, 10]} intensity={0.3} color="#4466aa" />

      {selectedStarData.map((star, si) => (
        <pointLight
          key={`light-${star.id}`}
          position={starPositions[si]}
          intensity={0.6}
          color={star.layers[0].emissiveColor}
          distance={12}
        />
      ))}

      {selectedStarData.map((star, si) => (
        <group key={star.id}>
          <StarLabel name={star.name} position={starPositions[si]} />
          {star.layers.map((layer, li) => (
            <StarLayerComponent
              key={`${star.id}-${layer.name}`}
              starData={star}
              layerIndex={li}
              layer={layer}
              starPosition={starPositions[si]}
            />
          ))}
        </group>
      ))}

      <StarField />
      <AxisHelper />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={30}
        enablePan
        panSpeed={0.5}
        rotateSpeed={0.6}
      />
    </>
  );
}

export default function StarScene() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 4, 12], fov: 50, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#050a1a']} />
        <fog attach="fog" args={['#050a1a', 30, 80]} />
        <SceneContent />
      </Canvas>
    </div>
  );
}
