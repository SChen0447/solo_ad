import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Artifact } from '../types';

interface SceneViewerProps {
  artifact: Artifact | null;
  activeHotspotId: string | null;
  onHotspotClick: (hotspotId: string | null) => void;
}

interface ArtifactModelProps {
  artifact: Artifact;
  onHotspotClick: (hotspotId: string) => void;
  activeHotspotId: string | null;
}

interface HotspotMarkerProps {
  position: [number, number, number];
  isActive: boolean;
  onClick: () => void;
}

function HotspotMarker({ position, isActive, onClick }: HotspotMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * Math.PI * 2) * 0.02;
    if (meshRef.current) {
      meshRef.current.scale.setScalar(pulse);
    }
    if (glowRef.current) {
      const glowPulse = 1 + Math.sin(t * Math.PI * 2 + Math.PI / 2) * 0.15;
      glowRef.current.scale.setScalar(glowPulse);
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + Math.sin(t * Math.PI * 2) * 0.15;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={glowRef}
        scale={[1.8, 1.8, 1.8]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshBasicMaterial
          color="#ffd700"
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshStandardMaterial
          color="#ffd700"
          transparent
          opacity={0.75}
          emissive="#ffd700"
          emissiveIntensity={isActive ? 1.2 : 0.5}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      <pointLight
        color="#ffd700"
        intensity={isActive ? 2 : 0.8}
        distance={0.6}
        decay={2}
      />
    </group>
  );
}

function BronzeDingModel({
  onHotspotClick,
  activeHotspotId,
  hotspots
}: Omit<ArtifactModelProps, 'artifact'> & { hotspots: Artifact['hotspots'] }) {
  return (
    <group>
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.85, 0.95, 1.6, 32]} />
        <meshStandardMaterial
          color="#8b6914"
          roughness={0.6}
          metalness={0.9}
        />
      </mesh>
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.0, 1.1, 0.12, 32]} />
        <meshStandardMaterial
          color="#a67c00"
          roughness={0.5}
          metalness={0.9}
        />
      </mesh>
      <mesh position={[0.75, 1.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.55, 0.18]} />
        <meshStandardMaterial
          color="#8b6914"
          roughness={0.6}
          metalness={0.9}
        />
      </mesh>
      <mesh position={[-0.75, 1.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.22, 0.55, 0.18]} />
        <meshStandardMaterial
          color="#8b6914"
          roughness={0.6}
          metalness={0.9}
        />
      </mesh>
      <mesh position={[0.65, -0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.18, 0.5, 16]} />
        <meshStandardMaterial
          color="#a67c00"
          roughness={0.5}
          metalness={0.9}
        />
      </mesh>
      <mesh position={[-0.65, -0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.18, 0.5, 16]} />
        <meshStandardMaterial
          color="#a67c00"
          roughness={0.5}
          metalness={0.9}
        />
      </mesh>
      <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.18, 0.5, 16]} />
        <meshStandardMaterial
          color="#a67c00"
          roughness={0.5}
          metalness={0.9}
        />
      </mesh>
      {hotspots.map((h) => (
        <HotspotMarker
          key={h.id}
          position={h.position}
          isActive={activeHotspotId === h.id}
          onClick={() => onHotspotClick(h.id)}
        />
      ))}
    </group>
  );
}

function BluePorcelainModel({
  onHotspotClick,
  activeHotspotId,
  hotspots
}: Omit<ArtifactModelProps, 'artifact'> & { hotspots: Artifact['hotspots'] }) {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.38, 0.5, 32]} />
        <meshStandardMaterial
          color="#e8e4d9"
          roughness={0.25}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.58, 48, 48, 0, Math.PI * 2, 0.1, 0.9]} />
        <meshStandardMaterial
          color="#1e5fa8"
          roughness={0.2}
          metalness={0.08}
        />
      </mesh>
      <mesh position={[0, 1.68, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.42, 0.35, 32]} />
        <meshStandardMaterial
          color="#1e5fa8"
          roughness={0.2}
          metalness={0.08}
        />
      </mesh>
      <mesh position={[0, 1.95, 0]} castShadow receiveShadow>
        <torusGeometry args={[0.22, 0.04, 12, 32]} />
        <meshStandardMaterial
          color="#d4af37"
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>
      {hotspots.map((h) => (
        <HotspotMarker
          key={h.id}
          position={h.position}
          isActive={activeHotspotId === h.id}
          onClick={() => onHotspotClick(h.id)}
        />
      ))}
    </group>
  );
}

function JadeDiscModel({
  onHotspotClick,
  activeHotspotId,
  hotspots
}: Omit<ArtifactModelProps, 'artifact'> & { hotspots: Artifact['hotspots'] }) {
  return (
    <group rotation={[-Math.PI / 2.5, 0, 0]}>
      <mesh castShadow receiveShadow>
        <torusGeometry args={[0.85, 0.2, 48, 96]} />
        <meshStandardMaterial
          color="#d4e4c8"
          roughness={0.25}
          metalness={0.05}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh castShadow receiveShadow>
        <torusGeometry args={[0.85, 0.18, 48, 96]} />
        <meshStandardMaterial
          color="#c8b896"
          roughness={0.35}
          metalness={0.05}
          transparent
          opacity={0.3}
        />
      </mesh>
      {hotspots.map((h) => {
        const rotated: [number, number, number] = [
          h.position[0],
          h.position[2],
          -h.position[1]
        ];
        return (
          <HotspotMarker
            key={h.id}
            position={rotated}
            isActive={activeHotspotId === h.id}
            onClick={() => onHotspotClick(h.id)}
          />
        );
      })}
    </group>
  );
}

function SancaiHorseModel({
  onHotspotClick,
  activeHotspotId,
  hotspots
}: Omit<ArtifactModelProps, 'artifact'> & { hotspots: Artifact['hotspots'] }) {
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow rotation={[0, 0, 0.1]}>
        <capsuleGeometry args={[0.32, 0.65, 12, 24]} />
        <meshStandardMaterial
          color="#d4a017"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0.55, 1.3, 0.1]} castShadow receiveShadow rotation={[0, 0, -0.35]}>
        <capsuleGeometry args={[0.2, 0.4, 12, 24]} />
        <meshStandardMaterial
          color="#d4a017"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0.78, 1.45, 0.18]} castShadow receiveShadow>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial
          color="#d4a017"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0.55, 0.95, 0.1]} castShadow receiveShadow rotation={[0, 0, -0.35]}>
        <capsuleGeometry args={[0.08, 0.22, 8, 16]} />
        <meshStandardMaterial
          color="#3d3d3d"
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>
      <mesh position={[0.3, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.25, 0.28]} />
        <meshStandardMaterial
          color="#2d7d46"
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0.25, 0.1, 0.2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.6, 16]} />
        <meshStandardMaterial
          color="#d4a017"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0.25, 0.1, -0.2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.6, 16]} />
        <meshStandardMaterial
          color="#d4a017"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[-0.25, 0.1, 0.2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.6, 16]} />
        <meshStandardMaterial
          color="#e8e4d9"
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[-0.25, 0.1, -0.2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.6, 16]} />
        <meshStandardMaterial
          color="#e8e4d9"
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[-0.4, 0.85, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.06, 0.35, 8, 16]} />
        <meshStandardMaterial
          color="#d4a017"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>
      {hotspots.map((h) => (
        <HotspotMarker
          key={h.id}
          position={h.position}
          isActive={activeHotspotId === h.id}
          onClick={() => onHotspotClick(h.id)}
        />
      ))}
    </group>
  );
}

function ArtifactModel({ artifact, onHotspotClick, activeHotspotId }: ArtifactModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [springY, setSpringY] = useState(-5);
  const [springScale, setSpringScale] = useState(0.3);
  const velocityRef = useRef(0);
  const scaleVelocityRef = useRef(0);

  useEffect(() => {
    setSpringY(-5);
    setSpringScale(0.3);
    velocityRef.current = 0;
    scaleVelocityRef.current = 0;
  }, [artifact.id]);

  useFrame((_, delta) => {
    const targetY = 0;
    const targetScale = 1;
    const stiffness = 90;
    const damping = 10;

    const dy = targetY - springY;
    const forceY = stiffness * dy - damping * velocityRef.current;
    velocityRef.current += forceY * delta;
    setSpringY((prev) => prev + velocityRef.current * delta);

    const ds = targetScale - springScale;
    const forceS = stiffness * ds - damping * scaleVelocityRef.current;
    scaleVelocityRef.current += forceS * delta;
    setSpringScale((prev) => prev + scaleVelocityRef.current * delta);

    if (groupRef.current) {
      groupRef.current.position.y = springY;
      const s = Math.max(0.01, springScale);
      groupRef.current.scale.setScalar(s);
    }
  });

  const renderModel = () => {
    const props = {
      onHotspotClick,
      activeHotspotId,
      hotspots: artifact.hotspots
    };
    switch (artifact.modelType) {
      case 'bronze-ding':
        return <BronzeDingModel {...props} />;
      case 'blue-porcelain':
        return <BluePorcelainModel {...props} />;
      case 'jade-disc':
        return <JadeDiscModel {...props} />;
      case 'sancai-horse':
        return <SancaiHorseModel {...props} />;
      default:
        return null;
    }
  };

  return <group ref={groupRef}>{renderModel()}</group>;
}

function AutoRotateGroup({
  children,
  isUserInteracting
}: {
  children: React.ReactNode;
  isUserInteracting: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!isUserInteracting && groupRef.current) {
      const angularSpeedDeg = 0.2;
      const angularSpeedRad = (angularSpeedDeg * Math.PI) / 180;
      groupRef.current.rotation.y += angularSpeedRad * delta;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
      <circleGeometry args={[6, 64]} />
      <meshStandardMaterial
        color="#0a0a1a"
        roughness={0.9}
        metalness={0.1}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.35} color="#a0b4d4" />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.1}
        color="#fff5e6"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={30}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <directionalLight
        position={[-4, 3, -4]}
        intensity={0.4}
        color="#8899cc"
      />
      <pointLight
        position={[0, 4, 0]}
        intensity={0.6}
        color="#ffeecc"
        distance={15}
        decay={2}
      />
      <pointLight
        position={[-3, 2, 3]}
        intensity={0.3}
        color="#6688ff"
        distance={12}
        decay={2}
      />
    </>
  );
}

function GradientBackground() {
  const { scene } = useThree();

  const gradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#302b63');
    gradient.addColorStop(0.5, '#24243e');
    gradient.addColorStop(1, '#0f0c29');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => {
    scene.background = gradientTexture;
    return () => {
      scene.background = null;
    };
  }, [scene, gradientTexture]);

  return null;
}

export default function SceneViewer({
  artifact,
  activeHotspotId,
  onHotspotClick
}: SceneViewerProps) {
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  return (
    <div className="canvas-wrapper">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 1.5, 4.5], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onPointerMissed={() => onHotspotClick(null)}
      >
        <GradientBackground />
        <fog attach="fog" args={['#0f0c29', 8, 25]} />
        <SceneLighting />
        <GroundPlane />
        {artifact && (
          <AutoRotateGroup isUserInteracting={isUserInteracting}>
            <ArtifactModel
              key={artifact.id}
              artifact={artifact}
              activeHotspotId={activeHotspotId}
              onHotspotClick={onHotspotClick}
            />
          </AutoRotateGroup>
        )}
        <OrbitControls
          enablePan={false}
          minDistance={2.2}
          maxDistance={13.5}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          enableDamping
          dampingFactor={0.08}
          onStart={() => setIsUserInteracting(true)}
          onEnd={() => setIsUserInteracting(false)}
          target={[0, 0.5, 0]}
        />
      </Canvas>
    </div>
  );
}
