import { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { MorphParams } from '@/utils/plantGrowth';

interface Scene3DProps {
  morphParams: MorphParams;
  environment: { light: number; water: number; nutrient: number };
  speciesId: string;
}

function GridGround() {
  const ref = useRef<THREE.GridHelper>(null);
  return (
    <gridHelper
      ref={ref}
      args={[60, 30, '#5a5a5a', '#5a5a5a']}
      rotation={[0, 0, 0]}
      material-transparent={true}
      material-opacity={0.2}
    />
  );
}

function BackgroundGradient({ overallProgress }: { overallProgress: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const shaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uTopColor: { value: new THREE.Color('#87CEEB') },
        uBottomColor: { value: new THREE.Color('#2E4057') },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform float uProgress;
        varying vec2 vUv;
        void main() {
          vec3 col = mix(uBottomColor, uTopColor, vUv.y);
          float brightness = 0.85 + uProgress * 0.15;
          col *= brightness;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
  }, []);

  useFrame(() => {
    shaderMat.uniforms.uProgress.value = overallProgress;
  });

  return (
    <mesh ref={meshRef} material={shaderMat}>
      <sphereGeometry args={[45, 32, 32]} />
    </mesh>
  );
}

function FloatingParticles({ overallProgress }: { overallProgress: number }) {
  const count = 80;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particleData = useMemo(() => {
    return Array.from({ length: count }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 50,
        Math.random() * 25 + 2,
        (Math.random() - 0.5) * 50
      ),
      speed: 0.2 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      size: 0.05 + Math.random() * 0.1,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    particleData.forEach((p, i) => {
      dummy.position.set(
        p.pos.x + Math.sin(t * p.speed + p.phase) * 2,
        p.pos.y + Math.sin(t * p.speed * 0.5 + p.phase) * 1.5,
        p.pos.z + Math.cos(t * p.speed + p.phase) * 2
      );
      const s = p.size * (0.8 + overallProgress * 0.6);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
    </instancedMesh>
  );
}

function SunflowerFlower({ budSize, flowerColor, centerColor, petalCount }: {
  budSize: number;
  flowerColor: string;
  centerColor: string;
  petalCount: number;
}) {
  const petals = useMemo(() => {
    return Array.from({ length: petalCount }, (_, i) => {
      const angle = (i / petalCount) * Math.PI * 2;
      return { angle, key: i };
    });
  }, [petalCount]);

  if (budSize <= 0) return null;

  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[budSize * 0.6, 12, 12]} />
        <meshStandardMaterial color={centerColor} />
      </mesh>
      {petals.map(({ angle, key }) => (
        <mesh
          key={key}
          position={[
            Math.cos(angle) * budSize * 1.1,
            Math.sin(angle) * budSize * 1.1,
            0
          ]}
          rotation={[0, 0, angle]}
        >
          <sphereGeometry args={[budSize * 0.35, 6, 6]} />
          <meshStandardMaterial color={flowerColor} />
        </mesh>
      ))}
    </group>
  );
}

function CactusSpines({ spineLength, stemHeight }: { spineLength: number; stemHeight: number }) {
  const spineData = useMemo(() => {
    if (spineLength <= 0) return [];
    const spines: { pos: [number, number, number]; rot: [number, number, number] }[] = [];
    const rows = Math.max(1, Math.floor(stemHeight / 0.5));
    for (let r = 0; r < rows; r++) {
      const y = r * 0.5 + 0.3;
      for (let j = 0; j < 8; j++) {
        const angle = (j / 8) * Math.PI * 2;
        spines.push({
          pos: [
            Math.cos(angle) * (3 * 0.1 + 0.02),
            y,
            Math.sin(angle) * (3 * 0.1 + 0.02)
          ],
          rot: [0, angle, Math.PI * 0.3]
        });
      }
    }
    return spines;
  }, [spineLength, stemHeight]);

  if (spineLength <= 0) return null;

  return (
    <group>
      {spineData.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={s.rot}>
          <cylinderGeometry args={[0.01, 0.01, spineLength * 0.1, 3]} />
          <meshStandardMaterial color="#DEB887" />
        </mesh>
      ))}
    </group>
  );
}

function VineLeaves({ leafCount, leafScale, leafColor, leafPhase, vineCurve, stemHeight }: {
  leafCount: number;
  leafScale: number;
  leafColor: string;
  leafPhase: number[];
  vineCurve: number;
  stemHeight: number;
}) {
  const leaves = useMemo(() => {
    return Array.from({ length: leafCount }, (_, i) => {
      const t = (i + 1) / (leafCount + 1);
      const y = t * stemHeight;
      const side = i % 2 === 0 ? 1 : -1;
      const xOffset = Math.sin(t * Math.PI * 2 * vineCurve * 3) * vineCurve * 2;
      return { y, side, xOffset, key: i, phase: leafPhase[i % leafPhase.length] || 0 };
    });
  }, [leafCount, leafScale, vineCurve, stemHeight, leafPhase]);

  return (
    <group>
      {leaves.map(({ y, side, xOffset, key, phase }) => (
        <mesh
          key={key}
          position={[xOffset + side * 0.3, y, 0]}
          rotation={[0, 0, side * 0.5 + Math.sin(Date.now() * 0.002 + phase) * 0.1]}
        >
          <sphereGeometry args={[leafScale * 0.8, 6, 4]} />
          <meshStandardMaterial color={leafColor} />
        </mesh>
      ))}
    </group>
  );
}

function PlantModel({ morphParams, speciesId }: { morphParams: MorphParams; speciesId: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const { stemHeight, stemRadius, leafCount, leafScale, budSize, fruitSize,
    stemColor, leafColor, flowerColor, fruitColor, swayAngle, leafPhase } = morphParams;

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.z = swayAngle;
    }
  });

  const isCactus = speciesId === 'cactus';
  const isVine = speciesId === 'vine';

  const stemGeometry = useMemo(() => {
    if (isCactus) {
      return <cylinderGeometry args={[stemRadius * 3, stemRadius * 3.5, Math.max(0.01, stemHeight), 8]} />;
    }
    return <cylinderGeometry args={[stemRadius, stemRadius * 1.2, Math.max(0.01, stemHeight), 6]} />;
  }, [isCactus, stemRadius, stemHeight]);

  const regularLeaves = useMemo(() => {
    if (isCactus || isVine) return null;
    return Array.from({ length: leafCount }, (_, i) => {
      const t = (i + 1) / (leafCount + 1);
      const y = t * stemHeight;
      const side = i % 2 === 0 ? 1 : -1;
      const phase = leafPhase[i % leafPhase.length] || 0;
      return (
        <mesh
          key={i}
          position={[side * (stemRadius + leafScale * 0.5), y, 0]}
          rotation={[0.3 * side, 0, side * 0.4 + Math.sin(Date.now() * 0.002 + phase) * 0.08]}
        >
          <sphereGeometry args={[leafScale * 0.6, 5, 3]} />
          <meshStandardMaterial color={leafColor} />
        </mesh>
      );
    });
  }, [isCactus, isVine, leafCount, stemHeight, stemRadius, leafScale, leafColor, leafPhase]);

  const fruit = useMemo(() => {
    if (fruitSize <= 0) return null;
    const fruitPositions: [number, number, number][] = speciesId === 'cactus'
      ? [[0, stemHeight + 0.1, 0]]
      : isVine
        ? [[0.5, stemHeight * 0.7, 0], [-0.5, stemHeight * 0.5, 0]]
        : [[0, stemHeight * 0.9, 0.3], [0.3, stemHeight * 0.85, -0.2]];
    return fruitPositions.map((pos, i) => (
      <mesh key={i} position={pos}>
        <sphereGeometry args={[fruitSize, 8, 8]} />
        <meshStandardMaterial color={fruitColor} />
      </mesh>
    ));
  }, [fruitSize, fruitColor, stemHeight, speciesId]);

  return (
    <group ref={groupRef} position={[0, stemHeight / 2, 0]}>
      <mesh position={[0, 0, 0]}>
        {stemGeometry}
        <meshStandardMaterial color={stemColor} />
      </mesh>

      {!isCactus && !isVine && regularLeaves}

      {isVine && (
        <VineLeaves
          leafCount={leafCount}
          leafScale={leafScale}
          leafColor={leafColor}
          leafPhase={leafPhase}
          vineCurve={morphParams.leafPhase.length > 0 ? 0.6 : 0}
          stemHeight={stemHeight}
        />
      )}

      {isCactus && <CactusSpines spineLength={3 * 0.1} stemHeight={stemHeight} />}

      {budSize > 0 && !isCactus && (
        <SunflowerFlower
          budSize={budSize}
          flowerColor={flowerColor}
          centerColor="#8B4513"
          petalCount={18}
        />
      )}

      {budSize > 0 && isCactus && (
        <group position={[0, stemHeight / 2 + 0.1, 0]}>
          <mesh>
            <sphereGeometry args={[budSize, 8, 8]} />
            <meshStandardMaterial color={flowerColor} />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(angle) * budSize * 1.2, Math.sin(angle) * budSize * 0.5, 0]}
                rotation={[0, 0, angle]}
              >
                <sphereGeometry args={[budSize * 0.3, 4, 4]} />
                <meshStandardMaterial color="#FFD700" />
              </mesh>
            );
          })}
        </group>
      )}

      {budSize > 0 && isVine && (
        <group position={[0.3, stemHeight * 0.6, 0]}>
          <mesh>
            <sphereGeometry args={[budSize * 0.8, 6, 6]} />
            <meshStandardMaterial color={flowerColor} />
          </mesh>
        </group>
      )}

      {fruit}
    </group>
  );
}

function SceneContent({ morphParams, environment, speciesId }: Scene3DProps) {
  const lightIntensity = 0.5 + (environment.light / 100) * 1.0;
  const bgColorTop = useMemo(() => {
    const t = environment.light / 100;
    const r = Math.round(46 + t * (135 - 46));
    const g = Math.round(64 + t * (206 - 64));
    const b = Math.round(87 + t * (235 - 87));
    return `rgb(${r}, ${g}, ${b})`;
  }, [environment.light]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[-5, 8, 3]}
        intensity={lightIntensity}
        color="#ffffff"
      />
      <BackgroundGradient overallProgress={morphParams.stemHeight / 15} />
      <FloatingParticles overallProgress={morphParams.stemHeight / 15} />
      <GridGround />
      <PlantModel morphParams={morphParams} speciesId={speciesId} />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={0.5}
        maxDistance={50}
        enablePan
      />
    </>
  );
}

export default function Scene3D(props: Scene3DProps) {
  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.2;
  }, []);

  return (
    <Canvas
      camera={{ position: [5, 5, 8], fov: 50, near: 0.1, far: 100 }}
      onCreated={handleCreated}
      style={{ background: '#121212' }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
