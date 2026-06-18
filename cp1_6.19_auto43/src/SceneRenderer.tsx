import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSeismicStore } from './store';
import { SeismicSimulator } from './SeismicSimulator';
import {
  GRID_SIZE,
  CELL_SIZE,
  HALF_GRID,
  DT,
  SIM_DURATION,
  WAVEFRONT_COLOR_CENTER,
  WAVEFRONT_COLOR_EDGE,
  WAVEFRONT_OPACITY_CENTER,
  WAVEFRONT_OPACITY_EDGE,
  FAULT_PLANE_SIZE,
  FAULT_TILT_ANGLE,
  FAULT_CENTER,
  FAULT_COLOR_ACTIVATED,
  OBSERVATION_POINTS,
  CAMERA_INITIAL_POSITION,
  CAMERA_LOOK_AT,
  DAMPING_FACTOR,
  COLOR_MAP_STEPS,
  ISOVALUE_THRESHOLD,
} from './config';

function lerpColor(c1: string, c2: string, t: number): THREE.Color {
  const a = new THREE.Color(c1);
  const b = new THREE.Color(c2);
  return a.lerp(b, t);
}

const VoxelGrid: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = GRID_SIZE * GRID_SIZE * GRID_SIZE;

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useMemo(
    () => new Float32Array(count * 3),
    []
  );

  const basePositions = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        for (let k = 0; k < GRID_SIZE; k++) {
          pos.push(
            new THREE.Vector3(
              (i - HALF_GRID) * CELL_SIZE,
              (j - HALF_GRID) * CELL_SIZE,
              (k - HALF_GRID) * CELL_SIZE
            )
          );
        }
      }
    }
    return pos;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const snapshot = useSeismicStore.getState().snapshot;
    const field = snapshot?.displacementField;
    const maxDisp = snapshot?.maxDisplacement || 1;

    for (let i = 0; i < count; i++) {
      const pos = basePositions[i];
      const val = field ? Math.abs(field[i]) / maxDisp : 0;
      const scale = val > 0.01 ? 0.3 + val * 0.7 : 0.15;

      dummy.position.copy(pos);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      const t = Math.min(val, 1);
      if (t < 0.5) {
        const c = lerpColor('#1a1a3e', WAVEFRONT_COLOR_CENTER, t * 2);
        colorArray[i * 3] = c.r;
        colorArray[i * 3 + 1] = c.g;
        colorArray[i * 3 + 2] = c.b;
      } else {
        const c = lerpColor(
          WAVEFRONT_COLOR_CENTER,
          WAVEFRONT_COLOR_EDGE,
          (t - 0.5) * 2
        );
        colorArray[i * 3] = c.r;
        colorArray[i * 3 + 1] = c.g;
        colorArray[i * 3 + 2] = c.b;
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    } else {
      const colorAttr = new THREE.InstancedBufferAttribute(colorArray, 3);
      meshRef.current.instanceColor = colorAttr;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[CELL_SIZE * 0.9, CELL_SIZE * 0.9, CELL_SIZE * 0.9]} />
      <meshStandardMaterial
        transparent
        opacity={0.4}
        roughness={0.6}
        metalness={0.2}
      />
    </instancedMesh>
  );
};

const WavefrontMesh: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.5, 32, 32);
    return geo;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const snapshot = useSeismicStore.getState().snapshot;
    if (!snapshot || snapshot.time <= 0) {
      meshRef.current.visible = false;
      return;
    }

    meshRef.current.visible = true;
    const radius = snapshot.time * 3.0;
    meshRef.current.scale.setScalar(radius);

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    const maxR = 30;
    const t = Math.min(radius / maxR, 1);
    const color = lerpColor(WAVEFRONT_COLOR_CENTER, WAVEFRONT_COLOR_EDGE, t);
    mat.color.copy(color);
    mat.opacity = WAVEFRONT_OPACITY_CENTER + (WAVEFRONT_OPACITY_EDGE - WAVEFRONT_OPACITY_CENTER) * t;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        depthWrite={false}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
};

const FaultPlane: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const showFault = useSeismicStore((s) => s.showFault);

  const { geometry, texture } = useMemo(() => {
    const size = FAULT_PLANE_SIZE;
    const geo = new THREE.PlaneGeometry(size, size, 20, 20);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, '#444466');
    gradient.addColorStop(1, '#6666aa');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(100, 100, 150, 0.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      const y = 25 * i + Math.random() * 20;
      ctx.moveTo(0, y);
      for (let x = 0; x < 512; x += 30) {
        ctx.lineTo(x, y + (Math.random() - 0.5) * 15);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    return { geometry: geo, texture: tex };
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.visible = showFault;
    if (!showFault) return;

    const snapshot = useSeismicStore.getState().snapshot;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (snapshot?.faultActivated) {
      mat.color.set(FAULT_COLOR_ACTIVATED);
      mat.emissive.set(FAULT_COLOR_ACTIVATED);
      mat.emissiveIntensity = 0.5;
    } else {
      mat.color.set('#ffffff');
      mat.emissive.set('#000000');
      mat.emissiveIntensity = 0;
    }
  });

  const tiltRad = (FAULT_TILT_ANGLE * Math.PI) / 180;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[FAULT_CENTER.x, FAULT_CENTER.y, FAULT_CENTER.z]}
      rotation={[tiltRad, 0, 0]}
    >
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
};

const SourceMarker: React.FC = () => {
  const sourceX = useSeismicStore((s) => s.sourceX);
  const sourceY = useSeismicStore((s) => s.sourceY);
  const sourceZ = useSeismicStore((s) => s.sourceZ);

  return (
    <mesh position={[sourceX, sourceY, sourceZ]}>
      <sphereGeometry args={[0.8, 16, 16]} />
      <meshStandardMaterial color="#ff4444" emissive="#ff2222" emissiveIntensity={0.8} />
    </mesh>
  );
};

const ObservationMarkers: React.FC = () => {
  return (
    <group>
      {OBSERVATION_POINTS.map((pt) => (
        <mesh key={pt.id} position={[pt.x, pt.y, pt.z]}>
          <octahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00cc66"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
};

const GridHelper: React.FC = () => {
  return (
    <group>
      <gridHelper
        args={[GRID_SIZE * CELL_SIZE, GRID_SIZE, '#222244', '#1a1a33']}
        position={[0, -HALF_GRID * CELL_SIZE, 0]}
      />
      <axesHelper args={[5]} />
    </group>
  );
};

const SimulationLoop: React.FC = () => {
  const simulatorRef = useRef<SeismicSimulator | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsTimeRef = useRef<number>(0);

  const initSimulator = useCallback(() => {
    const sim = new SeismicSimulator();
    const state = useSeismicStore.getState();
    sim.setSource(state.sourceX, state.sourceY, state.sourceZ);
    sim.setMagnitude(state.magnitude);
    simulatorRef.current = sim;
  }, []);

  useEffect(() => {
    initSimulator();
  }, [initSimulator]);

  useFrame((_, delta) => {
    const state = useSeismicStore.getState();
    if (!state.isRunning || state.isPaused) return;
    if (!simulatorRef.current) return;

    if (state.currentTime >= SIM_DURATION) return;

    const sim = simulatorRef.current;
    sim.setSource(state.sourceX, state.sourceY, state.sourceZ);
    sim.setMagnitude(state.magnitude);

    const speed = state.playbackSpeed;
    const stepsPerFrame = Math.max(1, Math.round(speed));
    const effectiveDt = DT * speed;

    for (let s = 0; s < stepsPerFrame; s++) {
      const snapshot = sim.step(effectiveDt);
      state.updateSnapshot(snapshot);
    }

    frameCountRef.current++;
    const now = performance.now();
    if (now - fpsTimeRef.current > 1000) {
      state.setFps(frameCountRef.current);
      frameCountRef.current = 0;
      fpsTimeRef.current = now;
    }
  });

  return null;
};

const CameraController: React.FC = () => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(
      CAMERA_INITIAL_POSITION.x,
      CAMERA_INITIAL_POSITION.y,
      CAMERA_INITIAL_POSITION.z
    );
    camera.lookAt(CAMERA_LOOK_AT.x, CAMERA_LOOK_AT.y, CAMERA_LOOK_AT.z);
  }, [camera]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR' && controlsRef.current) {
        camera.position.set(
          CAMERA_INITIAL_POSITION.x,
          CAMERA_INITIAL_POSITION.y,
          CAMERA_INITIAL_POSITION.z
        );
        camera.lookAt(
          CAMERA_LOOK_AT.x,
          CAMERA_LOOK_AT.y,
          CAMERA_LOOK_AT.z
        );
        controlsRef.current.target.set(
          CAMERA_LOOK_AT.x,
          CAMERA_LOOK_AT.y,
          CAMERA_LOOK_AT.z
        );
        controlsRef.current.update();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={DAMPING_FACTOR}
      rotateSpeed={0.5}
      minDistance={10}
      maxDistance={80}
      target={[CAMERA_LOOK_AT.x, CAMERA_LOOK_AT.y, CAMERA_LOOK_AT.z]}
    />
  );
};

const SceneRenderer: React.FC = () => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[20, 30, 20]} intensity={0.8} />
      <pointLight position={[0, 15, 0]} intensity={0.4} color="#6688ff" />

      <VoxelGrid />
      <WavefrontMesh />
      <FaultPlane />
      <SourceMarker />
      <ObservationMarkers />
      <GridHelper />
      <SimulationLoop />
      <CameraController />
    </>
  );
};

export default SceneRenderer;
