import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from './store/useStore';
import { createParticleTexture } from './nebula/NebulaSystem';
import { CameraController } from './controls/CameraController';
import { ControlPanel } from './ui/ControlPanel';

const NebulaParticles: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const particleData = useStore((s) => s.particleData);
  const parameters = useStore((s) => s.parameters);
  const activeParticleCount = useStore((s) => s.activeParticleCount);
  const setActiveParticleCount = useStore((s) => s.setActiveParticleCount);
  const adaptiveEnabled = useStore((s) => s.adaptiveEnabled);
  const generated = useStore((s) => s.generated);

  const emergenceStart = useRef(0);
  const prevGenerated = useRef(false);

  const texture = useMemo(() => {
    const canvas = createParticleTexture();
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 3));
    return geo;
  }, []);

  useEffect(() => {
    if (!particleData) return;

    if (generated && !prevGenerated.current) {
      emergenceStart.current = performance.now() / 1000;
    }
    prevGenerated.current = generated;

    const count = particleData.count;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    positions.set(particleData.positions);
    colors.set(particleData.colors);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }, [particleData, generated, geometry]);

  useFrame((_, delta) => {
    if (!pointsRef.current || !particleData) return;

    const points = pointsRef.current;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = geometry.attributes.color as THREE.BufferAttribute;

    const count = Math.min(activeParticleCount, particleData.count);
    const time = performance.now() / 1000;

    const emergenceElapsed = time - emergenceStart.current;
    const emergenceFactor = Math.min(emergenceElapsed / 0.5, 1.0);

    const rotationSpeedRad = (parameters.rotationSpeed * Math.PI) / 180;
    points.rotation.y += rotationSpeedRad * delta;

    const basePositions = particleData.positions;
    const baseColors = particleData.colors;
    const orbitRadii = particleData.orbitRadii;
    const orbitSpeeds = particleData.orbitSpeeds;
    const orbitPhases = particleData.orbitPhases;
    const opacityOffsets = particleData.opacityOffsets;

    for (let i = 0; i < count; i++) {
      const bx = basePositions[i * 3];
      const by = basePositions[i * 3 + 1];
      const bz = basePositions[i * 3 + 2];

      const orbitAngle = time * orbitSpeeds[i] + orbitPhases[i];
      const orbitR = orbitRadii[i];
      const ox = Math.cos(orbitAngle) * orbitR;
      const oz = Math.sin(orbitAngle) * orbitR;

      const scale = generated ? emergenceFactor : 1.0;

      posAttr.setXYZ(i, (bx + ox) * scale, by * scale, (bz + oz) * scale);

      const br = baseColors[i * 3];
      const bg = baseColors[i * 3 + 1];
      const bb = baseColors[i * 3 + 2];

      const opacityPhase = time * 1.5 + opacityOffsets[i];
      const opacity = 0.75 + 0.25 * Math.sin(opacityPhase);

      colorAttr.setXYZ(i, br * opacity, bg * opacity, bb * opacity);
    }

    for (let i = count; i < particleData.count; i++) {
      posAttr.setXYZ(i, 0, 0, 0);
      colorAttr.setXYZ(i, 0, 0, 0);
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;

    geometry.setDrawRange(0, count);

    if (materialRef.current) {
      materialRef.current.size = parameters.particleSize * 0.15;
    }
  });

  if (!particleData) return null;

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        map={texture}
        size={parameters.particleSize * 0.15}
        vertexColors
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

const PerformanceMonitor: React.FC = () => {
  const setFps = useStore((s) => s.setFps);
  const fps = useStore((s) => s.fps);
  const adaptiveEnabled = useStore((s) => s.adaptiveEnabled);
  const activeParticleCount = useStore((s) => s.activeParticleCount);
  const setActiveParticleCount = useStore((s) => s.setActiveParticleCount);
  const particleData = useStore((s) => s.particleData);

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    const elapsed = now - lastTime.current;
    if (elapsed >= 1000) {
      const currentFps = Math.round((frameCount.current * 1000) / elapsed);
      setFps(currentFps);
      frameCount.current = 0;
      lastTime.current = now;

      if (adaptiveEnabled && particleData && currentFps < 24) {
        const reduced = Math.max(500, Math.floor(activeParticleCount * 0.9));
        setActiveParticleCount(reduced);
      }
    }
  });

  return null;
};

const AutoCruiseController: React.FC = () => {
  const autoCruise = useStore((s) => s.autoCruise);
  const setAutoCruise = useStore((s) => s.setAutoCruise);
  const { camera } = useThree();
  const controllerRef = useRef<CameraController | null>(null);
  const orbitRef = useRef<any>(null);

  useEffect(() => {
    controllerRef.current = new CameraController(camera as THREE.PerspectiveCamera);
  }, [camera]);

  useFrame((_, delta) => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;

    if (autoCruise) {
      if (!ctrl.cruising) {
        ctrl.setCurrentState(camera.position.clone(), new THREE.Vector3(0, 0, 0));
        ctrl.startCruise();
      }
      ctrl.update(delta);
    } else if (ctrl.cruising) {
      ctrl.stopCruise();
    }
  });

  return (
    <OrbitControls
      ref={orbitRef}
      enabled={!autoCruise}
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={30}
      target={[0, 0, 0]}
    />
  );
};

const Scene: React.FC = () => {
  return (
    <>
      <ambientLight intensity={0.1} />
      <NebulaParticles />
      <AutoCruiseController />
      <PerformanceMonitor />
    </>
  );
};

const App: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#000' }}>
      <div style={{ flex: 1, height: '100%' }}>
        <Canvas
          camera={{ position: [0, 3, 10], fov: 60, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: '#000' }}
        >
          <Scene />
        </Canvas>
      </div>
      <ControlPanel />
    </div>
  );
};

export default App;
