import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';
import { RuneType, MagicItem } from '@/types';

interface CastingSceneProps {
  selectedRunes: RuneType[];
  onDropRune: (rune: RuneType) => void;
  isCasting: boolean;
  craftedItem: MagicItem | null;
}

function HexagonPlatform() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const radius = 2;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    const extrudeSettings = { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color="#2D2D44" metalness={0.5} roughness={0.5} />
    </mesh>
  );
}

function RuneSlot({ position, rune, index }: { position: [number, number, number]; rune?: RuneType; index: number }) {
  const colorMap: Record<RuneType, string> = {
    fire: '#FF4500',
    water: '#1E90FF',
    wind: '#00FA9A',
    earth: '#8B4513',
    light: '#FFD700',
    dark: '#4B0082',
  };

  if (!rune) {
    return (
      <mesh position={position}>
        <torusGeometry args={[0.3, 0.05, 8, 16]} />
        <meshStandardMaterial color="#3D3D5C" transparent opacity={0.5} />
      </mesh>
    );
  }

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.3}>
      <mesh position={position}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color={colorMap[rune]}
          emissive={colorMap[rune]}
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      <pointLight position={position} color={colorMap[rune]} intensity={0.5} distance={2} />
    </Float>
  );
}

function ItemModel({ item, isNew }: { item: MagicItem; isNew: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const [opacity, setOpacity] = useState(isNew ? 0 : 1);
  const [scale, setScale] = useState(isNew ? 0.5 : 1);

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => {
        setOpacity(1);
        setScale(1);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isNew, item.id]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01;
      groupRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
    }
  });

  const renderShape = () => {
    const color = item.color;
    const material = (
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.2}
        metalness={0.6}
        roughness={0.3}
        transparent
        opacity={opacity}
      />
    );

    switch (item.shape.type) {
      case 'staff':
        return (
          <group>
            <mesh position={[0, 0.8, 0]}>
              <sphereGeometry args={[0.35, 16, 16]} />
              {material}
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
              <torusGeometry args={[0.3, 0.06, 8, 24]} />
              {material}
            </mesh>
            <mesh position={[0, -0.6, 0]}>
              <cylinderGeometry args={[0.08, 0.1, 0.8, 8]} />
              {material}
            </mesh>
            {item.level > 1 && (
              <mesh position={[0, 0.8, 0]}>
                <torusGeometry args={[0.45, 0.03, 8, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.8} />
              </mesh>
            )}
          </group>
        );
      case 'sword':
        return (
          <group>
            <mesh position={[0, 0.6, 0]}>
              <coneGeometry args={[0.15, 0.8, 4]} />
              {material}
            </mesh>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.12, 0.5, 0.12]} />
              {material}
            </mesh>
            <mesh position={[0, -0.4, 0]} rotation={[0, Math.PI / 4, 0]}>
              <boxGeometry args={[0.5, 0.08, 0.08]} />
              {material}
            </mesh>
            {item.level > 1 && (
              <mesh position={[0, 0.6, 0]}>
                <torusGeometry args={[0.25, 0.02, 8, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.8} />
              </mesh>
            )}
          </group>
        );
      case 'shield':
        return (
          <group>
            <mesh rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.5, 0.5, 0.1, 16]} />
              {material}
            </mesh>
            <mesh position={[0, 0.06, 0]}>
              <torusGeometry args={[0.35, 0.05, 8, 24]} />
              {material}
            </mesh>
            <mesh position={[0, 0.08, 0]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              {material}
            </mesh>
            {item.level > 1 && (
              <mesh>
                <torusGeometry args={[0.55, 0.03, 8, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.8} />
              </mesh>
            )}
          </group>
        );
      case 'potion':
        return (
          <group>
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.25, 0.2, 0.6, 12]} />
              {material}
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <sphereGeometry args={[0.25, 12, 12]} />
              {material}
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.1, 0.12, 0.15, 8]} />
              {material}
            </mesh>
            {item.level > 1 && (
              <mesh position={[0, 0, 0]}>
                <torusGeometry args={[0.35, 0.025, 8, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.8} />
              </mesh>
            )}
          </group>
        );
      case 'ring':
        return (
          <group>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.3, 0.08, 12, 32]} />
              {material}
            </mesh>
            <mesh position={[0, 0.3, 0]}>
              <sphereGeometry args={[0.12, 12, 12]} />
              {material}
            </mesh>
            {item.level > 1 && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.42, 0.03, 8, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.8} />
              </mesh>
            )}
          </group>
        );
      case 'amulet':
        return (
          <group>
            <mesh>
              <octahedronGeometry args={[0.3, 0]} />
              {material}
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.35, 0.04, 8, 24]} />
              {material}
            </mesh>
            {item.level > 1 && (
              <mesh>
                <octahedronGeometry args={[0.4, 0]} />
                <meshBasicMaterial color={color} transparent opacity={0.3} wireframe />
              </mesh>
            )}
          </group>
        );
      case 'crystal':
        return (
          <group>
            <mesh>
              <octahedronGeometry args={[0.35, 0]} />
              {material}
            </mesh>
            <mesh position={[0, 0.3, 0]}>
              <icosahedronGeometry args={[0.15, 0]} />
              {material}
            </mesh>
            {item.level > 1 && (
              <mesh>
                <icosahedronGeometry args={[0.5, 0]} />
                <meshBasicMaterial color={color} transparent opacity={0.2} wireframe />
              </mesh>
            )}
          </group>
        );
      case 'book':
        return (
          <group>
            <mesh>
              <boxGeometry args={[0.5, 0.1, 0.35]} />
              {material}
            </mesh>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.35, 8]} />
              {material}
            </mesh>
            {item.level > 1 && (
              <mesh position={[0, 0.15, 0]}>
                <torusGeometry args={[0.3, 0.025, 8, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.8} />
              </mesh>
            )}
          </group>
        );
      default:
        return (
          <mesh>
            <sphereGeometry args={[0.4, 16, 16]} />
            {material}
          </mesh>
        );
    }
  };

  return (
    <group
      ref={groupRef}
      scale={[scale, scale, scale]}
      position={[0, 1, 0]}
    >
      {renderShape()}
      <pointLight color={item.color} intensity={0.5} distance={3} />
    </group>
  );
}

function ParticleEffect({ active, color }: { active: boolean; color: string }) {
  const particlesRef = useRef<THREE.Points>(null);
  const [particles, setParticles] = useState<{ position: THREE.Vector3; velocity: THREE.Vector3; life: number }[]>([]);

  useEffect(() => {
    if (active) {
      const newParticles = [];
      for (let i = 0; i < 50; i++) {
        const velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.15,
          Math.random() * 0.15,
          (Math.random() - 0.5) * 0.15
        );
        newParticles.push({
          position: new THREE.Vector3(0, 1, 0),
          velocity,
          life: 1.5,
        });
      }
      setParticles(newParticles);
    }
  }, [active]);

  useFrame((state, delta) => {
    if (particles.length > 0 && particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const colors = particlesRef.current.geometry.attributes.color.array as Float32Array;
      
      let allDead = true;
      particles.forEach((particle, i) => {
        if (particle.life > 0) {
          allDead = false;
          particle.position.add(particle.velocity);
          particle.velocity.y -= 0.002;
          particle.life -= delta;
          
          positions[i * 3] = particle.position.x;
          positions[i * 3 + 1] = particle.position.y;
          positions[i * 3 + 2] = particle.position.z;
          
          const alpha = Math.max(0, particle.life / 1.5);
          const colorObj = new THREE.Color(color);
          colors[i * 3] = colorObj.r;
          colors[i * 3 + 1] = colorObj.g;
          colors[i * 3 + 2] = colorObj.b;
        }
      });
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      particlesRef.current.geometry.attributes.color.needsUpdate = true;
      
      if (allDead) {
        setParticles([]);
      }
    }
  });

  if (particles.length === 0) return null;

  const positions = new Float32Array(particles.length * 3);
  const colors = new Float32Array(particles.length * 3);

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particles.length}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

function CastingArea({
  selectedRunes,
  craftedItem,
  isCasting,
}: {
  selectedRunes: RuneType[];
  craftedItem: MagicItem | null;
  isCasting: boolean;
}) {
  const slotPositions: [number, number, number][] = [
    [-1.2, 0.3, 0],
    [0, 0.3, 1.2],
    [1.2, 0.3, 0],
  ];

  const mixedColor = craftedItem?.color || '#FFD700';

  return (
    <group>
      <HexagonPlatform />
      
      {slotPositions.map((pos, index) => (
        <RuneSlot
          key={index}
          position={pos}
          rune={selectedRunes[index]}
          index={index}
        />
      ))}

      {craftedItem && (
        <ItemModel item={craftedItem} isNew={isCasting} />
      )}

      <ParticleEffect active={isCasting} color={mixedColor} />

      {isCasting && (
        <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 2, 6]} />
          <meshBasicMaterial color={mixedColor} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export const CastingScene: React.FC<CastingSceneProps> = ({
  selectedRunes,
  onDropRune,
  isCasting,
  craftedItem,
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const runeType = e.dataTransfer.getData('runeType') as RuneType;
    if (runeType) {
      onDropRune(runeType);
    }
  };

  return (
    <div
      className="casting-scene-container"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Canvas
        camera={{ position: [0, 2, 5], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'linear-gradient(to bottom, #0F0F1A, #1A1A2E)' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <pointLight position={[-3, 2, -3]} intensity={0.5} color="#6666FF" />
        <pointLight position={[3, 2, 3]} intensity={0.5} color="#FF6666" />
        
        <CastingArea
          selectedRunes={selectedRunes}
          craftedItem={craftedItem}
          isCasting={isCasting}
        />

        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={10}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
        />

        <fog attach="fog" args={['#1A1A2E', 5, 15]} />
      </Canvas>
    </div>
  );
};
