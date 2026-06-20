import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ProcessedQuake } from '@/types';
import { latLonToVector3, EARTH_RADIUS, PULSE_PERIOD } from '@/utils/constants';

interface QuakeMarkerProps {
  quake: ProcessedQuake;
  index: number;
  visible: boolean;
  onClick: (quake: ProcessedQuake, event: any) => void;
}

function QuakeMarker({ quake, index, visible, onClick }: QuakeMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const delayRef = useRef((index % 10) * 0.2);

  const position = useMemo(
    () => latLonToVector3(quake.latitude, quake.longitude, EARTH_RADIUS + quake.radius * 0.5),
    [quake.latitude, quake.longitude, quake.radius]
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime() + delayRef.current;
    const pulsePhase = (t % PULSE_PERIOD) / PULSE_PERIOD;
    const pulseScale = 1.0 + pulsePhase * 0.8;
    const pulseOpacity = 0.6 * (1 - pulsePhase);

    if (pulseRef.current) {
      pulseRef.current.scale.setScalar(pulseScale);
      const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = visible ? pulseOpacity : 0;
    }

    if (sphereRef.current) {
      const mat = sphereRef.current.material as THREE.MeshStandardMaterial;
      const targetOpacity = visible ? 0.85 : 0;
      mat.opacity += (targetOpacity - mat.opacity) * 0.1;
    }
  });

  useEffect(() => {
    if (sphereRef.current) {
      const mat = sphereRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = visible ? 0.85 : 0;
    }
  }, [visible]);

  return (
    <group ref={groupRef} position={position as unknown as [number, number, number]}>
      <mesh
        ref={sphereRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(quake, e);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[quake.radius, 16, 16]} />
        <meshStandardMaterial
          color={quake.color}
          transparent
          opacity={0.85}
          emissive={quake.color}
          emissiveIntensity={0.4}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      <mesh ref={pulseRef}>
        <ringGeometry args={[quake.radius * 1.1, quake.radius * 1.3, 32]} />
        <meshBasicMaterial
          color={quake.color}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

interface QuakeRendererProps {
  quakes: ProcessedQuake[];
  currentTime: number;
  onQuakeClick: (quake: ProcessedQuake, event: any) => void;
  maxVisible?: number;
}

export function QuakeRenderer({
  quakes,
  currentTime,
  onQuakeClick,
  maxVisible = 500,
}: QuakeRendererProps) {
  const sortedQuakes = useMemo(() => {
    return [...quakes]
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, maxVisible);
  }, [quakes, maxVisible]);

  return (
    <group>
      {sortedQuakes.map((quake, index) => (
        <QuakeMarker
          key={quake.id}
          quake={quake}
          index={index}
          visible={quake.time <= currentTime}
          onClick={onQuakeClick}
        />
      ))}
    </group>
  );
}

export default QuakeRenderer;
