import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useSeismicStore } from './store';
import {
  EARTH_LAYERS,
  SCALE_FACTOR,
  hypocenterToPosition,
  getWaveColor,
  speedToColor,
} from './physics';
import type { Vector3, ViewMode, DisplayMode } from './types';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function EarthLayer({
  innerRadius,
  outerRadius,
  color,
  clipPlane,
  wireframe = false,
  emissive = false,
}: {
  innerRadius: number;
  outerRadius: number;
  color: string;
  clipPlane: THREE.Plane;
  wireframe?: boolean;
  emissive?: boolean;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(outerRadius * SCALE_FACTOR, 64, 64);
    return geo;
  }, [outerRadius]);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: wireframe ? 0.15 : 0.6,
      side: THREE.BackSide,
      wireframe,
      clippingPlanes: [clipPlane],
      clipShadows: true,
      metalness: 0.3,
      roughness: 0.7,
      emissive: emissive ? color : '#000000',
      emissiveIntensity: emissive ? 0.3 : 0,
    });
    return mat;
  }, [color, wireframe, clipPlane, emissive]);

  return <mesh geometry={geometry} material={material} />;
}

function LayerBoundary({
  radius,
  color,
  clipPlane,
}: {
  radius: number;
  color: string;
  clipPlane: THREE.Plane;
}) {
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(radius * SCALE_FACTOR, 64, 64);
  }, [radius]);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      wireframe: true,
      clippingPlanes: [clipPlane],
    });
  }, [color, clipPlane]);

  return <mesh geometry={geometry} material={material} />;
}

function HypocenterMarker() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { hypocenter, isSimulating } = useSeismicStore();

  const position = useMemo(
    () => hypocenterToPosition(hypocenter),
    [hypocenter]
  );

  useFrame(({ clock }) => {
    if (meshRef.current && isSimulating) {
      const t = clock.getElapsedTime();
      const pulse = 0.5 + Math.sin(t * 4) * 0.5;
      const scale = 0.5 + pulse * 1.5;
      meshRef.current.scale.setScalar(scale);
      (meshRef.current.material as THREE.MeshStandardMaterial).opacity = 0.5 + pulse * 0.5;
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });

  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial
        color="#e44b2b"
        transparent
        opacity={0.9}
        emissive="#e44b2b"
        emissiveIntensity={1}
      />
    </mesh>
  );
}

function WavefrontMesh({
  center,
  radius,
  type,
  opacity,
  clipPlane,
}: {
  center: Vector3;
  radius: number;
  type: 'P' | 'S';
  opacity: number;
  clipPlane: THREE.Plane;
}) {
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(1, 48, 48);
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: getWaveColor(type),
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      wireframe: true,
      clippingPlanes: [clipPlane],
    });
  }, [type, opacity, clipPlane]);

  return (
    <mesh
      position={[center.x, center.y, center.z]}
      scale={radius}
      geometry={geometry}
      material={material}
    />
  );
}

function RayPathLine({
  points,
  type,
  clipPlane,
}: {
  points: { position: Vector3; waveSpeed: number }[];
  type: 'P' | 'S';
  clipPlane: THREE.Plane;
}) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);
    const minSpeed = 3;
    const maxSpeed = 12;

    points.forEach((p, i) => {
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      const color = new THREE.Color(speedToColor(p.waveSpeed, minSpeed, maxSpeed));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [points]);

  const line = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      linewidth: 1,
      clippingPlanes: [clipPlane],
    });
    return new THREE.Line(geometry, mat);
  }, [geometry, clipPlane]);

  return <primitive object={line} />;
}

function ReceiverDot({
  position,
  isFlashing,
  clipPlane,
}: {
  position: Vector3;
  isFlashing: boolean;
  clipPlane: THREE.Plane;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [flashIntensity, setFlashIntensity] = useState(0);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      if (isFlashing) {
        const t = (clock.getElapsedTime() % 0.3) / 0.3;
        const intensity = Math.sin(t * Math.PI) * 0.8 + 0.2;
        setFlashIntensity(intensity);
        meshRef.current.scale.setScalar(1 + intensity * 1.5);
      } else {
        meshRef.current.scale.setScalar(1);
        setFlashIntensity(0);
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial
        color={isFlashing ? '#ffffff' : '#cccccc'}
        transparent
        opacity={0.9}
        emissive={isFlashing ? '#ffffff' : '#666666'}
        emissiveIntensity={flashIntensity}
        clippingPlanes={[clipPlane]}
      />
    </mesh>
  );
}

function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const viewMode = useSeismicStore((state) => state.viewMode);
  const animRef = useRef<{
    active: boolean;
    startTime: number;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
  } | null>(null);

  useEffect(() => {
    const positions: Record<ViewMode, { pos: [number, number, number]; target: [number, number, number] }> = {
      top: { pos: [0, 180, 0.01], target: [0, 0, 0] },
      side: { pos: [180, 0, 0.01], target: [0, 0, 0] },
      cross: { pos: [30, 0, 30], target: [0, 0, 0] },
      global: { pos: [100, 80, 120], target: [0, 0, 0] },
    };

    const target = positions[viewMode];
    animRef.current = {
      active: true,
      startTime: performance.now(),
      startPos: camera.position.clone(),
      endPos: new THREE.Vector3(...target.pos),
      startTarget: controlsRef.current?.target?.clone() || new THREE.Vector3(0, 0, 0),
      endTarget: new THREE.Vector3(...target.target),
    };
  }, [viewMode, camera]);

  useFrame(() => {
    if (animRef.current?.active && controlsRef.current) {
      const elapsed = (performance.now() - animRef.current.startTime) / 1000;
      const t = Math.min(1, elapsed / 1);
      const eased = easeInOutCubic(t);

      camera.position.lerpVectors(
        animRef.current.startPos,
        animRef.current.endPos,
        eased
      );
      controlsRef.current.target.lerpVectors(
        animRef.current.startTarget,
        animRef.current.endTarget,
        eased
      );
      controlsRef.current.update();

      if (t >= 1) {
        animRef.current.active = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={20}
      maxDistance={300}
    />
  );
}

function SceneContent({ clipPlane }: { clipPlane: THREE.Plane }) {
  const wavefronts = useSeismicStore((state) => state.wavefronts);
  const rays = useSeismicStore((state) => state.rays);
  const receivers = useSeismicStore((state) => state.receivers);
  const displayMode = useSeismicStore((state) => state.displayMode);
  const stats = useSeismicStore((state) => state.stats);

  const showWavefront = displayMode === 'wavefront' || displayMode === 'both';
  const showRays = displayMode === 'rays' || displayMode === 'both';

  return (
    <>
      <Stars radius={500} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />

      <ambientLight intensity={0.3} />
      <pointLight position={[100, 100, 100]} intensity={1} />
      <pointLight position={[-100, -100, -100]} intensity={0.5} color="#4a6fa5" />

      {EARTH_LAYERS.map((layer, index) => (
        <EarthLayer
          key={layer.name}
          innerRadius={layer.innerRadius}
          outerRadius={layer.outerRadius}
          color={layer.color}
          clipPlane={clipPlane}
          emissive={layer.name === '外核'}
        />
      ))}

      {EARTH_LAYERS.map((layer, index) => (
        <LayerBoundary
          key={`boundary-${layer.name}`}
          radius={layer.outerRadius}
          color="#ffffff"
          clipPlane={clipPlane}
        />
      ))}

      <HypocenterMarker />

      {showWavefront &&
        wavefronts.map((wf) => (
          <WavefrontMesh
            key={wf.id}
            center={wf.center}
            radius={wf.radius}
            type={wf.type}
            opacity={wf.opacity}
            clipPlane={clipPlane}
          />
        ))}

      {showRays &&
        rays
          .filter((r) => r.arrived || r.points.length > 5)
          .map((ray) => (
            <RayPathLine
              key={ray.id}
              points={ray.points}
              type={ray.type}
              clipPlane={clipPlane}
            />
          ))}

      {receivers.map((receiver) => (
        <ReceiverDot
          key={receiver.index}
          position={receiver.position}
          isFlashing={
            receiver.pWaveArrived || receiver.sWaveArrived
              ? stats.simulationTime - receiver.flashTime < 2
              : false
          }
          clipPlane={clipPlane}
        />
      ))}

      <CameraController />
    </>
  );
}

export function SeismicScene() {
  const { camera, gl } = useThree();
  const [clipPlane, setClipPlane] = useState(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0));

  useFrame(() => {
    const dir = new THREE.Vector3()
      .copy(camera.position)
      .normalize();
    clipPlane.normal.copy(dir);
  });

  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);

  return <SceneContent clipPlane={clipPlane} />;
}

export function SceneCanvas() {
  return (
    <Canvas
      camera={{ position: [100, 80, 120], fov: 50, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: false, localClippingEnabled: true }}
      style={{ background: '#0b0f1a' }}
    >
      <color attach="background" args={['#0b0f1a']} />
      <fog attach="fog" args={['#0b0f1a', 150, 400]} />
      <SeismicScene />
    </Canvas>
  );
}
