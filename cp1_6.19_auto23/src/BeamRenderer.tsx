import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMazeStore } from './store';
import { BEAM_HEIGHT, BEAM_DIAMETER, type BeamNode } from './MazeGenerator';

const COLOR_POOL_RANGES: Record<
  'red-orange' | 'blue-purple' | 'green-cyan',
  { min: number; max: number }
> = {
  'red-orange': { min: 0, max: 45 },
  'blue-purple': { min: 220, max: 290 },
  'green-cyan': { min: 120, max: 200 },
};

function getBaseHue(beam: BeamNode, hueShift: number): number {
  const range = COLOR_POOL_RANGES[beam.colorPool];
  const t = beam.colorOffset / 60;
  let hue = range.min + t * (range.max - range.min) + hueShift;
  hue = hue % 360;
  if (hue < 0) hue += 360;
  return hue;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface SingleBeamProps {
  beam: BeamNode;
  playerPos: { x: number; z: number };
  globalHueShift: number;
  brightnessPhase: number;
  isTransitioning: boolean;
  transitionPhase: 'fadeOut' | 'fadeIn' | 'idle';
  transitionProgress: number;
  time: number;
}

function SingleBeam({
  beam,
  playerPos,
  globalHueShift,
  brightnessPhase,
  isTransitioning,
  transitionPhase,
  transitionProgress,
  time,
}: SingleBeamProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

  const currentColor = useRef(new THREE.Color());
  const targetColor = useRef(new THREE.Color());

  const distanceToPlayer = useMemo(
    () => Math.hypot(beam.x - playerPos.x, beam.z - playerPos.z),
    [beam.x, beam.z, playerPos.x, playerPos.z]
  );

  useFrame((_, delta) => {
    if (!materialRef.current) return;

    const baseBrightness = 0.6 + 0.4 * Math.sin((brightnessPhase / 3) * Math.PI * 2);
    let brightness = baseBrightness;

    const nearPlayer = distanceToPlayer < 3;
    if (nearPlayer) {
      const pulse = 1 + 0.1 * Math.sin(time * 4);
      brightness = Math.min(1.2 * baseBrightness * pulse, 1.2);
    }

    const hue = getBaseHue(beam, globalHueShift);
    targetColor.current.setHSL(hue / 360, 0.85, Math.min(brightness, 1));

    currentColor.current.lerp(targetColor.current, Math.min(1, delta * 8));
    materialRef.current.color.copy(currentColor.current);

    let opacity = 0.85;
    if (isTransitioning) {
      if (transitionPhase === 'fadeOut') {
        opacity = 0.85 * (1 - transitionProgress);
      } else if (transitionPhase === 'fadeIn') {
        opacity = 0.85 * transitionProgress;
      }
    }

    if (nearPlayer) {
      opacity = lerp(opacity, 1.0, 0.3);
    }

    materialRef.current.opacity = lerp(
      materialRef.current.opacity,
      opacity,
      Math.min(1, delta * 6)
    );
  });

  return (
    <mesh
      ref={meshRef}
      position={[beam.x, BEAM_HEIGHT / 2, beam.z]}
      castShadow
    >
      <cylinderGeometry
        args={[BEAM_DIAMETER / 2, BEAM_DIAMETER / 2, BEAM_HEIGHT, 12]}
      />
      <meshPhysicalMaterial
        ref={materialRef}
        transparent
        roughness={0.3}
        metalness={0.1}
        transmission={0.1}
        thickness={0.5}
        emissive={currentColor.current}
        emissiveIntensity={0.2}
        opacity={0.85}
      />
    </mesh>
  );
}

export function BeamRenderer() {
  const beams = useMazeStore((state) => state.beams);
  const playerPos = useMazeStore((state) => state.player.position);
  const globalHueShift = useMazeStore((state) => state.animation.globalHueShift);
  const brightnessPhase = useMazeStore((state) => state.animation.brightnessPhase);
  const isTransitioning = useMazeStore((state) => state.animation.isTransitioning);
  const transitionPhase = useMazeStore((state) => state.animation.transitionPhase);
  const transitionProgress = useMazeStore((state) => state.animation.transitionProgress);
  const time = useMazeStore((state) => state.time);

  return (
    <group>
      {beams.map((beam, index) => (
        <SingleBeam
          key={`${beam.x}-${beam.z}-${index}`}
          beam={beam}
          playerPos={playerPos}
          globalHueShift={globalHueShift}
          brightnessPhase={brightnessPhase}
          isTransitioning={isTransitioning}
          transitionPhase={transitionPhase}
          transitionProgress={transitionProgress}
          time={time}
        />
      ))}
    </group>
  );
}
