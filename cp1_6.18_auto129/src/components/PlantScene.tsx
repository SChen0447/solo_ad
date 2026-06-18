import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { usePlantStore, PlantData, PulseEffect } from '../store/usePlantStore';
import { generatePlantGeometry, StemSegment, LeafData, FlowerData } from '../logic/plantGrowth';
import { calculateWindOffsets, getWindReleaseTime } from '../physics/windSimulator';

interface PlantMeshProps {
  plant: PlantData;
}

function StemMesh({ segment, bendOffset }: { segment: StemSegment; bendOffset: [number, number, number] }) {
  return (
    <mesh position={[segment.position[0] + bendOffset[0], segment.position[1], segment.position[2] + bendOffset[2]]}>
      <cylinderGeometry args={[segment.radius, segment.radius * 1.1, segment.height, 8]} />
      <meshStandardMaterial color="#6d8b3e" roughness={0.7} />
    </mesh>
  );
}

interface LeafMeshProps {
  leaf: LeafData;
  bendOffset: [number, number, number];
  bendRotation: [number, number];
  flutter: number;
  twist: number;
  waterBoost: number;
  pulseScale: number;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}

function LeafMesh({ leaf, bendOffset, bendRotation, flutter, twist, waterBoost, pulseScale, onClick }: LeafMeshProps) {
  const greenBase = 139 + waterBoost * 30;
  const greenColor = `rgb(${Math.floor(90 + waterBoost * 20)}, ${Math.min(255, greenBase)}, ${Math.floor(74 + waterBoost * 10)})`;
  const metalness = waterBoost * 0.15;
  const scale = pulseScale;
  return (
    <group
      position={[leaf.position[0] + bendOffset[0], leaf.position[1], leaf.position[2] + bendOffset[2]]}
      rotation={[leaf.rotation[0] + bendRotation[0] + flutter, leaf.rotation[1] + twist, leaf.rotation[2] + bendRotation[1]]}
      scale={[scale, scale, scale]}
      onClick={onClick}
    >
      <mesh position={[leaf.length * 0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <sphereGeometry args={[leaf.width * 0.5, 1, 1, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={greenColor}
          side={THREE.DoubleSide}
          roughness={0.6 - waterBoost * 0.1}
          metalness={metalness}
          emissive={greenColor}
          emissiveIntensity={waterBoost * 0.05}
        />
      </mesh>
      <mesh position={[leaf.length * 0.35, 0, -0.001]} rotation={[0, 0, Math.PI / 2]}>
        <sphereGeometry args={[leaf.width * 0.48, 1, 1, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial
          color={greenColor}
          side={THREE.DoubleSide}
          roughness={0.6 - waterBoost * 0.1}
          metalness={metalness}
        />
      </mesh>
    </group>
  );
}

interface FlowerMeshProps {
  flower: FlowerData;
  bendOffset: [number, number, number];
  bendRotation: [number, number];
  pulseScale: number;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}

function FlowerMesh({ flower, bendOffset, bendRotation, pulseScale, onClick }: FlowerMeshProps) {
  const petals = useMemo(() => {
    const arr = [];
    for (let i = 0; i < flower.petalCount; i++) {
      const angle = (i / flower.petalCount) * Math.PI * 2;
      arr.push({ angle, index: i });
    }
    return arr;
  }, [flower.petalCount]);

  const s = flower.scale * pulseScale;
  return (
    <group
      position={[flower.position[0] + bendOffset[0], flower.position[1], flower.position[2] + bendOffset[2]]}
      rotation={[bendRotation[0], flower.rotation[1], bendRotation[1]]}
      scale={[s, s, s]}
      onClick={onClick}
    >
      {petals.map(({ angle, index }) => (
        <mesh key={index} position={[Math.cos(angle) * flower.petalSize * 0.3, Math.sin(angle) * flower.petalSize * 0.3, 0]} rotation={[0, 0, angle]}>
          <sphereGeometry args={[flower.petalSize * 0.35, 8, 8]} />
          <meshStandardMaterial color="#ff85a2" roughness={0.5} />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[flower.petalSize * 0.35, 12, 12]} />
        <meshStandardMaterial color="#ffeb3b" roughness={0.4} emissive="#ffeb3b" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

function PulseLabel({ pulse }: { pulse: PulseEffect }) {
  const elapsed = (performance.now() - pulse.createdAt) / 1000;
  const opacity = Math.max(0, 1 - elapsed);
  const typeText = pulse.partType === 'leaf' ? '叶片' : pulse.partType === 'flower' ? '花朵' : '茎';
  return (
    <Html position={[0, 0.3, 0]} center style={{ pointerEvents: 'none' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '6px 10px',
          borderRadius: 8,
          fontSize: 12,
          color: '#4a4a4a',
          whiteSpace: 'nowrap',
          opacity,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          transform: `translateY(${-elapsed * 20}px)`,
        }}
      >
        <div style={{ fontWeight: 600, color: '#8bc34a' }}>{typeText}</div>
        <div>光照: {pulse.params.light.toFixed(0)}%</div>
        <div>水分: {pulse.params.water.toFixed(0)}%</div>
      </div>
    </Html>
  );
}

function PlantMesh({ plant }: PlantMeshProps) {
  const geometry = useMemo(
    () => generatePlantGeometry({ light: plant.light, water: plant.water, wind: plant.wind }, plant.growthProgress),
    [plant.light, plant.water, plant.wind, plant.growthProgress]
  );

  const releaseTimeRef = useRef<number | null>(null);
  const prevDraggingRef = useRef(false);
  const store = usePlantStore;
  const seed = useMemo(() => Math.random() * 10, [plant.id]);

  const pulseEffectsForPlant = usePlantStore((s) =>
    s.pulseEffects.filter((p) => p.plantId === plant.id)
  );

  const pulseScaleFor = (partId: string) => {
    const pulse = pulseEffectsForPlant.find((p) => p.partId === partId);
    if (!pulse) return 1;
    const t = (performance.now() - pulse.createdAt) / 200;
    if (t >= 1) return 1;
    return 1 + Math.sin(t * Math.PI) * 0.15;
  };

  const waterCount = usePlantStore.getState().getWaterCountNear([plant.position[0], plant.position[2]], 2);
  const waterBoost = Math.min(1, waterCount / 4);

  const handleLeafClick = (leaf: LeafData, e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    usePlantStore.getState().addPulseEffect(leaf.id, plant.id, 'leaf', { light: plant.light, water: plant.water });
  };

  const handleFlowerClick = (flower: FlowerData, e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    usePlantStore.getState().addPulseEffect(flower.id, plant.id, 'flower', { light: plant.light, water: plant.water });
  };

  const handleStemClick = (stem: StemSegment, e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    usePlantStore.getState().addPulseEffect(stem.id, plant.id, 'stem', { light: plant.light, water: plant.water });
  };

  useFrame(({ clock }) => {
    const time = performance.now();
    const windDragging = usePlantStore.getState().windDragging;
    const currentWind = usePlantStore.getState().currentWind;

    if (prevDraggingRef.current && !windDragging) {
      releaseTimeRef.current = time;
    }
    if (windDragging) {
      releaseTimeRef.current = null;
    }
    prevDraggingRef.current = windDragging;
  });

  const windDragging = usePlantStore((s) => s.windDragging);
  const currentWind = usePlantStore((s) => s.currentWind);

  const stemOffsets = geometry.stems.map((_, i) => {
    const normalizedHeight = geometry.stems.length <= 1 ? 1 : (i + 1) / geometry.stems.length;
    const releaseTime = releaseTimeRef.current;
    return calculateWindOffsets(
      { windLevel: currentWind, time: performance.now(), isDragging: windDragging, releaseTime },
      normalizedHeight,
      seed + i * 0.3
    );
  });

  const cumulativeOffset = useMemo(() => {
    let offX = 0, offZ = 0;
    return stemOffsets.map((o, i) => {
      const segHeight = geometry.stems[i]?.height || 0;
      const x = offX + o.bendAngleX * segHeight;
      const z = offZ + o.bendAngleZ * segHeight;
      offX = x;
      offZ = z;
      return { x, z };
    });
  }, [stemOffsets, geometry.stems]);

  return (
    <group position={plant.position}>
      {geometry.stems.map((stem, i) => {
        const off = cumulativeOffset[i] || { x: 0, z: 0 };
        const rot = stemOffsets[i];
        return (
          <group key={stem.id} rotation={[rot?.bendAngleZ || 0, 0, -(rot?.bendAngleX || 0)]}>
            <group onClick={(e) => handleStemClick(stem, e)}>
              <StemMesh segment={stem} bendOffset={[0, 0, 0]} />
            </group>
          </group>
        );
      })}

      {geometry.leaves.map((leaf) => {
        const normalizedHeight = geometry.totalHeight > 0 ? leaf.position[1] / geometry.totalHeight : 0.5;
        const releaseTime = releaseTimeRef.current;
        const leafWind = calculateWindOffsets(
          { windLevel: currentWind, time: performance.now(), isDragging: windDragging, releaseTime },
          normalizedHeight,
          seed + leaf.stemIndex * 0.7
        );
        const idx = Math.min(leaf.stemIndex, cumulativeOffset.length - 1);
        const baseOff = cumulativeOffset[idx] || { x: 0, z: 0 };
        return (
          <LeafMesh
            key={leaf.id}
            leaf={leaf}
            bendOffset={[baseOff.x + leafWind.swayOffsetX, 0, baseOff.z + leafWind.swayOffsetZ]}
            bendRotation={[leafWind.bendAngleZ, -leafWind.bendAngleX]}
            flutter={leafWind.leafFlutter}
            twist={leafWind.leafTwist}
            waterBoost={waterBoost}
            pulseScale={pulseScaleFor(leaf.id)}
            onClick={(e) => handleLeafClick(leaf, e)}
          />
        );
      })}

      {geometry.flower.scale > 0 && (() => {
        const releaseTime = releaseTimeRef.current;
        const flowerWind = calculateWindOffsets(
          { windLevel: currentWind, time: performance.now(), isDragging: windDragging, releaseTime },
          1,
          seed + 5
        );
        const idx = cumulativeOffset.length - 1;
        const baseOff = cumulativeOffset[idx] || { x: 0, z: 0 };
        return (
          <FlowerMesh
            flower={geometry.flower}
            bendOffset={[baseOff.x + flowerWind.swayOffsetX, 0, baseOff.z + flowerWind.swayOffsetZ]}
            bendRotation={[flowerWind.bendAngleZ, -flowerWind.bendAngleX]}
            pulseScale={pulseScaleFor(geometry.flower.id)}
            onClick={(e) => handleFlowerClick(geometry.flower, e)}
          />
        );
      })()}

      {pulseEffectsForPlant.map((p) => (
        <PulseLabel key={p.id} pulse={p} />
      ))}
    </group>
  );
}

function PuddleMesh({ puddle }: { puddle: { position: [number, number, number]; createdAt: number } }) {
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const start = puddle.createdAt;
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / 300);
      const eased = 1 - Math.pow(1 - t, 3);
      setScale(eased * (0.2 + Math.random() * 0.15));
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }, [puddle.createdAt]);
  return (
    <mesh position={[puddle.position[0], 0.01, puddle.position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[scale, 24]} />
      <meshStandardMaterial color="#81d4fa" transparent opacity={0.55} roughness={0.1} metalness={0.3} />
    </mesh>
  );
}

function Ground() {
  const addPuddle = usePlantStore((s) => s.addPuddle);
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pt = e.point;
    addPuddle([pt.x, 0, pt.z]);
  };
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow onClick={handleClick}>
      <planeGeometry args={[30, 30, 1, 1]} />
      <meshStandardMaterial color="#a5d6a7" roughness={0.9} />
    </mesh>
  );
}

function SkyDome() {
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[50, 32, 32]} />
      <shaderMaterial
        side={THREE.BackSide}
        uniforms={{}}
        vertexShader={`
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition).y;
            vec3 top = vec3(0.70, 0.87, 0.98);
            vec3 bottom = vec3(1.00, 0.87, 0.70);
            vec3 color = mix(bottom, top, max(0.0, h));
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function SceneUpdater() {
  const updateGrowth = usePlantStore((s) => s.updateGrowth);
  const removeOldPuddles = usePlantStore((s) => s.removeOldPuddles);
  const removeOldPulseEffects = usePlantStore((s) => s.removeOldPulseEffects);
  useFrame(() => {
    const now = performance.now();
    updateGrowth(now);
    removeOldPuddles(now);
    removeOldPulseEffects(now);
  });
  return null;
}

export default function PlantScene() {
  const plants = usePlantStore((s) => s.plants);
  const puddles = usePlantStore((s) => s.puddles);
  const currentLight = usePlantStore((s) => s.currentLight);
  const lightIntensity = 0.5 + (currentLight / 100) * 1.2;

  return (
    <Canvas shadows camera={{ position: [4, 3, 5], fov: 50 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <SkyDome />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={lightIntensity}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 4, -2]} intensity={0.25} color="#ffe0b2" />
      <SceneUpdater />
      <Ground />
      {puddles.map((p) => (
        <PuddleMesh key={p.id} puddle={p} />
      ))}
      {plants.map((plant) => (
        <PlantMesh key={plant.id} plant={plant} />
      ))}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={15}
        target={[0, 1, 0]}
      />
    </Canvas>
  );
}
