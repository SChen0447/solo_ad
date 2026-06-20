import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Gene, Position } from './types';
import { GENE_CATEGORY_COLORS } from './types';

interface Chromosome3DSceneProps {
  skeletonPoints: Position[];
  genes: Gene[];
  onGeneClick: (geneId: string) => void;
}

interface GeneMarkerProps {
  gene: Gene;
  onClick: (geneId: string) => void;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  const result = new THREE.Color().lerpColors(c1, c2, t);
  return `#${result.getHexString()}`;
}

function ChromosomeTube({ skeletonPoints }: { skeletonPoints: Position[] }) {
  const tubeSegments = useMemo(() => {
    const segments: { start: Position; end: Position; color: string }[] = [];
    for (let i = 0; i < skeletonPoints.length - 1; i++) {
      const t = i / (skeletonPoints.length - 2);
      segments.push({
        start: skeletonPoints[i],
        end: skeletonPoints[i + 1],
        color: lerpColor('#4a90d9', '#6b5b95', t),
      });
    }
    return segments;
  }, [skeletonPoints]);

  const instances = useMemo(() => {
    return tubeSegments.map((seg, i) => {
      const start = new THREE.Vector3(seg.start.x, seg.start.y, seg.start.z);
      const end = new THREE.Vector3(seg.end.x, seg.end.y, seg.end.z);
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize()
      );
      return { position: mid, quaternion, length, color: seg.color, key: i };
    });
  }, [tubeSegments]);

  return (
    <group>
      {instances.map((inst) => (
        <mesh key={inst.key} position={inst.position.toArray()} quaternion={inst.quaternion}>
          <cylinderGeometry args={[0.3, 0.3, inst.length, 12]} />
          <meshStandardMaterial
            color={inst.color}
            roughness={0.5}
            metalness={0.3}
            emissive={inst.color}
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function ChromosomeParticles({ skeletonPoints }: { skeletonPoints: Position[] }) {
  const particlesRef = useRef<THREE.Points>(null);

  const { positions } = useMemo(() => {
    const pos = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const idx = Math.floor(Math.random() * (skeletonPoints.length - 1));
      const t = Math.random();
      const p0 = skeletonPoints[idx];
      const p1 = skeletonPoints[idx + 1];
      const x = p0.x + (p1.x - p0.x) * t + (Math.random() - 0.5) * 0.5;
      const y = p0.y + (p1.y - p0.y) * t + (Math.random() - 0.5) * 0.5;
      const z = p0.z + (p1.z - p0.z) * t + (Math.random() - 0.5) * 0.5;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    return { positions: pos };
  }, [skeletonPoints]);

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={500}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#e0a96d"
        size={0.05}
        transparent
        opacity={0.3}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function GeneMarker({ gene, onClick }: GeneMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const baseScale = 1;
  const targetScale = hovered ? 0.25 / 0.15 : 1;

  useFrame(() => {
    if (meshRef.current) {
      const currentScale = meshRef.current.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.15;
      meshRef.current.scale.setScalar(newScale);
    }
  });

  const color = GENE_CATEGORY_COLORS[gene.category];

  return (
    <mesh
      ref={meshRef}
      position={[gene.position.x, gene.position.y, gene.position.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick(gene.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      scale={baseScale}
    >
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={hovered ? 0.8 : 0.2}
        roughness={0.3}
        metalness={0.5}
      />
    </mesh>
  );
}

function Stars() {
  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(200 * 3);
    const sz = new Float32Array(200);
    for (let i = 0; i < 200; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
      sz[i] = 0.03 + Math.random() * 0.07;
    }
    return { positions: pos, sizes: sz };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={200} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={200} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.05}
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function SceneBackground() {
  const { scene } = useThree();

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 300);
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(1, '#0a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    scene.background = texture;
    return () => {
      texture.dispose();
    };
  }, [scene]);

  return null;
}

interface AutoRotateProps {
  controlsRef: React.RefObject<any>;
}

function AutoRotate({ controlsRef }: AutoRotateProps) {
  const autoRotateSpeed = 0.003;
  const resumeDelay = 3000;
  const resumeTimerRef = useRef<number | null>(null);
  const isInteractingRef = useRef(false);

  useFrame(({ camera }) => {
    if (!isInteractingRef.current && controlsRef.current) {
      const controls = controlsRef.current;
      if (!controls?.autoRotate) {
        const radius = Math.sqrt(
          camera.position.x ** 2 + camera.position.z ** 2
        );
        const angle = Math.atan2(camera.position.z, camera.position.x) + autoRotateSpeed;
        camera.position.x = Math.cos(angle) * radius;
        camera.position.z = Math.sin(angle) * radius;
        camera.lookAt(0, 0, 0);
      }
    }
  });

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleStart = () => {
      isInteractingRef.current = true;
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    };

    const handleEnd = () => {
      resumeTimerRef.current = window.setTimeout(() => {
        isInteractingRef.current = false;
      }, resumeDelay);
    };

    controls.addEventListener('start', handleStart);
    controls.addEventListener('end', handleEnd);

    return () => {
      controls.removeEventListener('start', handleStart);
      controls.removeEventListener('end', handleEnd);
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
    };
  }, [controlsRef]);

  return null;
}

function SceneContent({
  skeletonPoints,
  genes,
  onGeneClick,
  controlsRef,
}: {
  skeletonPoints: Position[];
  genes: Gene[];
  onGeneClick: (geneId: string) => void;
  controlsRef: React.RefObject<any>;
}) {
  return (
    <>
      <SceneBackground />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-5, -3, -5]} intensity={0.4} color="#6b5b95" />
      <pointLight position={[0, 3, 0]} intensity={0.6} color="#4a90d9" />

      <ChromosomeTube skeletonPoints={skeletonPoints} />
      <ChromosomeParticles skeletonPoints={skeletonPoints} />

      {genes.map((gene) => (
        <GeneMarker key={gene.id} gene={gene} onClick={onGeneClick} />
      ))}

      <Stars />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={3}
        maxDistance={20}
        enableDamping
        dampingFactor={0.08}
      />

      <AutoRotate controlsRef={controlsRef} />
    </>
  );
}

export function Chromosome3DScene({
  skeletonPoints,
  genes,
  onGeneClick,
}: Chromosome3DSceneProps) {
  const controlsRef = useRef<any>(null);

  if (skeletonPoints.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8080a0',
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 3, 8], fov: 50, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent
        skeletonPoints={skeletonPoints}
        genes={genes}
        onGeneClick={onGeneClick}
        controlsRef={controlsRef}
      />
    </Canvas>
  );
}
