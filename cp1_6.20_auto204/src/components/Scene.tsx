import { useRef, useState, useMemo, useImperativeHandle, forwardRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { bones, BoneData } from '@/utils/boneData';

interface BoneProps {
  bone: BoneData;
  isHovered: boolean;
  isSelected: boolean;
  isFlashing: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  quality: 'high' | 'low';
}

function BoneMesh({ bone, isHovered, isSelected, isFlashing, onHover, onClick, quality }: BoneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const segments = quality === 'high' ? 32 : 16;
    switch (bone.shape) {
      case 'cylinder':
        return new THREE.CylinderGeometry(0.5, 0.5, 1, segments);
      case 'sphere':
        return new THREE.SphereGeometry(0.5, segments, segments);
      case 'cone':
        return new THREE.ConeGeometry(0.5, 1, segments);
      case 'box':
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }, [bone.shape, quality]);

  const baseColor = '#D2C8B0';
  const hoverColor = '#FFB347';
  const selectedColor = '#FFA07A';
  const flashColor = '#FFFFFF';

  const currentColor = isFlashing ? flashColor : isSelected ? selectedColor : isHovered ? hoverColor : baseColor;

  useFrame((state) => {
    if (glowRef.current && isHovered) {
      const pulse = 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = pulse * 0.3;
    }
  });

  return (
    <group position={bone.position} rotation={bone.rotation} scale={bone.scale}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(bone.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
          document.body.style.cursor = 'default';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(bone.id);
        }}
      >
        <meshStandardMaterial
          color={currentColor}
          roughness={0.6}
          metalness={0.1}
          transparent
          opacity={0.95}
        />
      </mesh>
      {isHovered && (
        <mesh ref={glowRef} geometry={geometry} scale={1.05}>
          <meshBasicMaterial color="#FFB347" transparent opacity={0.3} side={THREE.BackSide} />
        </mesh>
      )}
      {isHovered && (
        <Html position={[0, bone.scale[1] / 2 + 0.3, 0]} center distanceFactor={10}>
          <div
            style={{
              background: 'rgba(20, 20, 30, 0.85)',
              color: '#F0E6D3',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontFamily: "'Times New Roman', Georgia, serif",
              pointerEvents: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            {bone.name}
          </div>
        </Html>
      )}
    </group>
  );
}

interface SceneContentProps {
  selectedBone: string | null;
  hoveredBone: string | null;
  onBoneHover: (id: string | null) => void;
  onBoneClick: (id: string) => void;
  targetPosition: [number, number, number] | null;
  flashingBone: string | null;
  isCompareMode: boolean;
  compareSide?: 'left' | 'right';
  quality: 'high' | 'low';
  onCameraReady?: (camera: THREE.PerspectiveCamera) => void;
}

function SceneContent({
  selectedBone,
  hoveredBone,
  onBoneHover,
  onBoneClick,
  targetPosition,
  flashingBone,
  isCompareMode,
  compareSide = 'right',
  quality,
  onCameraReady,
}: SceneContentProps) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (onCameraReady) {
      onCameraReady(camera as THREE.PerspectiveCamera);
    }
  }, [camera, onCameraReady]);

  useFrame((state, delta) => {
    if (targetPosition && controlsRef.current) {
      const target = new THREE.Vector3(...targetPosition);
      controlsRef.current.target.lerp(target, delta * 2);
    }
  });

  const bonesToRender = useMemo(() => {
    if (isCompareMode && compareSide === 'left') {
      return bones.map((bone) => ({
        ...bone,
        position: [bone.position[0] - 3, bone.position[1], bone.position[2]] as [number, number, number],
      }));
    }
    if (isCompareMode && compareSide === 'right') {
      return bones.map((bone) => ({
        ...bone,
        position: [bone.position[0] + 3, bone.position[1], bone.position[2]] as [number, number, number],
      }));
    }
    return bones;
  }, [isCompareMode, compareSide]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#FFE4C4" />

      <Grid
        position={[0, -2, 0]}
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="rgba(255, 255, 255, 0.1)"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="rgba(255, 255, 255, 0.15)"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      {bonesToRender.map((bone) => {
        const displayId = isCompareMode ? `${compareSide}-${bone.id}` : bone.id;
        const actualHovered = isCompareMode && compareSide === 'left' ? false : hoveredBone === bone.id;
        const actualSelected = isCompareMode && compareSide === 'left' ? selectedBone === bone.id : selectedBone === bone.id;
        const actualFlashing = isCompareMode && compareSide === 'left' ? flashingBone === bone.id : flashingBone === bone.id;

        if (isCompareMode && compareSide === 'left') {
          return (
            <group key={displayId}>
              <mesh
                position={bone.position}
                rotation={bone.rotation}
                scale={bone.scale}
              >
                {bone.shape === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1, quality === 'high' ? 32 : 16]} />}
                {bone.shape === 'sphere' && <sphereGeometry args={[0.5, quality === 'high' ? 32 : 16, quality === 'high' ? 32 : 16]} />}
                {bone.shape === 'cone' && <coneGeometry args={[0.5, 1, quality === 'high' ? 32 : 16]} />}
                {bone.shape === 'box' && <boxGeometry args={[1, 1, 1]} />}
                <meshBasicMaterial
                  color={selectedBone === bone.id ? '#FFB347' : '#8899AA'}
                  wireframe
                  transparent
                  opacity={selectedBone === bone.id ? 0.9 : 0.4}
                />
              </mesh>
              <mesh
                position={bone.position}
                rotation={bone.rotation}
                scale={bone.scale}
              >
                {bone.shape === 'cylinder' && <cylinderGeometry args={[0.52, 0.52, 1.02, quality === 'high' ? 32 : 16]} />}
                {bone.shape === 'sphere' && <sphereGeometry args={[0.52, quality === 'high' ? 32 : 16, quality === 'high' ? 32 : 16]} />}
                {bone.shape === 'cone' && <coneGeometry args={[0.52, 1.02, quality === 'high' ? 32 : 16]} />}
                {bone.shape === 'box' && <boxGeometry args={[1.02, 1.02, 1.02]} />}
                <meshBasicMaterial
                  color={selectedBone === bone.id ? '#FFB347' : '#AABBCC'}
                  transparent
                  opacity={selectedBone === bone.id ? 0.2 : 0.1}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          );
        }

        return (
          <BoneMesh
            key={displayId}
            bone={bone}
            isHovered={actualHovered}
            isSelected={actualSelected}
            isFlashing={actualFlashing}
            onHover={onBoneHover}
            onClick={onBoneClick}
            quality={quality}
          />
        );
      })}

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={30}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

export interface SceneHandle {
  getCamera: () => THREE.PerspectiveCamera | null;
}

interface SceneProps {
  selectedBone: string | null;
  hoveredBone: string | null;
  onBoneHover: (id: string | null) => void;
  onBoneClick: (id: string) => void;
  targetPosition: [number, number, number] | null;
  flashingBone: string | null;
  isCompareMode: boolean;
  quality: 'high' | 'low';
}

const Scene = forwardRef<SceneHandle, SceneProps>(function Scene(
  { selectedBone, hoveredBone, onBoneHover, onBoneClick, targetPosition, flashingBone, isCompareMode, quality },
  ref
) {
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);

  useImperativeHandle(ref, () => ({
    getCamera: () => camera,
  }));

  const handleCameraReady = useCallback((cam: THREE.PerspectiveCamera) => {
    setCamera(cam);
  }, []);

  return (
    <Canvas
      camera={{
        position: [0, 3, 12],
        fov: 50,
        near: 0.1,
        far: 1000,
      }}
      gl={{ antialias: true, alpha: true }}
      style={{
        background: 'linear-gradient(180deg, #0B0B2B 0%, #4A3728 100%)',
      }}
      onCreated={({ camera: cam }) => {
        cam.position.set(0, 3, 12);
        cam.lookAt(0, 1, 0);
        setCamera(cam as THREE.PerspectiveCamera);
      }}
    >
      <SceneContent
        selectedBone={selectedBone}
        hoveredBone={hoveredBone}
        onBoneHover={onBoneHover}
        onBoneClick={onBoneClick}
        targetPosition={targetPosition}
        flashingBone={flashingBone}
        isCompareMode={isCompareMode}
        quality={quality}
        onCameraReady={handleCameraReady}
      />
    </Canvas>
  );
});

export default Scene;
