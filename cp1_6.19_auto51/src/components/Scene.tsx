import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, FXAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';

function GradientBackground() {
  const meshRef = useRef<THREE.Mesh>(null);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          topColor: { value: new THREE.Color('#16213e') },
          bottomColor: { value: new THREE.Color('#1a1a2e') },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          varying vec2 vUv;
          void main() {
            vec3 color = mix(bottomColor, topColor, vUv.y);
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    []
  );

  useFrame(({ camera }) => {
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position);
    }
  });

  return (
    <mesh ref={meshRef} material={shaderMaterial}>
      <sphereGeometry args={[500, 32, 32]} />
    </mesh>
  );
}

function GridFloor() {
  return (
    <group position={[0, -0.5, 0]}>
      <gridHelper
        args={[20, 20, '#2a2a4e', '#2a2a4e']}
        material-transparent
        material-opacity={0.4}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial color="#1a1a2e" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.5} color="#FF6B35" distance={10} />
      <pointLight position={[-5, 3, -5]} intensity={0.3} color="#64B5F6" distance={10} />
    </>
  );
}

export function ThreeScene() {
  return (
    <Canvas
      camera={{ position: [0, 2, 5], fov: 60, near: 0.1, far: 1000 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 2]}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(to bottom, #1a1a2e, #16213e)',
      }}
    >
      <GradientBackground />
      <SceneLighting />
      <GridFloor />
      <ParticleSystem />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2 + 0.1}
        enablePan={false}
      />
      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={0.5} />
      <EffectComposer multisampling={8}>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={1.5}
          radius={0.5}
          mipmapBlur
        />
        <FXAA />
      </EffectComposer>
    </Canvas>
  );
}
