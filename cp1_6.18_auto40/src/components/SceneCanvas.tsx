import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import ConceptNodeComponent from './ConceptNode';
import ConnectionLine from './ConnectionLine';
import { useConceptStore } from '@/store/useConceptStore';
import { Vector3 } from '@/types/conceptTypes';

const STAR_COUNT = 2500;

function StarField() {
  const starsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  const colors = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const shade = 0.6 + Math.random() * 0.4;
      arr[i * 3] = shade;
      arr[i * 3 + 1] = shade * 0.85;
      arr[i * 3 + 2] = shade + Math.random() * 0.1;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
      starsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.008) * 0.05;
      const geo = starsRef.current.geometry as THREE.BufferGeometry;
      const colAttr = geo.attributes.color as THREE.BufferAttribute;
      for (let i = 0; i < STAR_COUNT; i++) {
        const flick = 0.7 + 0.3 * Math.sin(state.clock.elapsedTime * 2 + i * 0.5);
        const base = colors[i * 3];
        colAttr.setXYZ(i, base * flick, colors[i * 3 + 1] * flick, colors[i * 3 + 2] * flick);
      }
      colAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={STAR_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={STAR_COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function FocusController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const nodes = useConceptStore((s) => s.nodes);
  const focusedNodeId = useConceptStore((s) => s.focusedNodeId);
  const cameraMode = useConceptStore((s) => s.cameraMode);
  const setCameraMode = useConceptStore((s) => s.setCameraMode);

  const animRef = useRef<{
    active: boolean;
    progress: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
  }>({
    active: false,
    progress: 0,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
  });

  useEffect(() => {
    if (focusedNodeId && cameraMode === 'focus') {
      const node = nodes.find((n) => n.id === focusedNodeId);
      if (node && controlsRef.current) {
        const targetPos = new THREE.Vector3(
          node.position.x + 6,
          node.position.y + 3,
          node.position.z + 6
        );
        animRef.current = {
          active: true,
          progress: 0,
          fromPos: camera.position.clone(),
          toPos: targetPos,
          fromTarget: controlsRef.current.target.clone(),
          toTarget: new THREE.Vector3(node.position.x, node.position.y, node.position.z),
        };
      }
    } else if (cameraMode === 'free' && animRef.current.active === false) {
      if (controlsRef.current) {
        const currentTarget = controlsRef.current.target.clone();
        const dist = camera.position.distanceTo(currentTarget);
        const dir = camera.position.clone().sub(currentTarget).normalize().multiplyScalar(dist);
        animRef.current = {
          active: true,
          progress: 0,
          fromPos: camera.position.clone(),
          toPos: currentTarget.clone().add(dir),
          fromTarget: currentTarget,
          toTarget: new THREE.Vector3(0, 0, 0),
        };
      }
    }
  }, [focusedNodeId, cameraMode]);

  useFrame((_, delta) => {
    if (animRef.current.active) {
      const anim = animRef.current;
      anim.progress = Math.min(anim.progress + delta / 1.0, 1);
      const t = 1 - Math.pow(1 - anim.progress, 3);
      camera.position.lerpVectors(anim.fromPos, anim.toPos, t);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(anim.fromTarget, anim.toTarget, t);
        controlsRef.current.update();
      }
      if (anim.progress >= 1) {
        animRef.current.active = false;
      }
    }

    if (cameraMode === 'focus' && focusedNodeId && !animRef.current.active) {
      const node = nodes.find((n) => n.id === focusedNodeId);
      if (node && controlsRef.current) {
        controlsRef.current.autoRotate = true;
        controlsRef.current.autoRotateSpeed = 0.8;
      }
    } else if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={2}
      maxDistance={80}
      enablePan={true}
      panSpeed={0.8}
      rotateSpeed={0.6}
      zoomSpeed={0.9}
    />
  );
}

function ForceSimulator() {
  const nodes = useConceptStore((s) => s.nodes);
  const connections = useConceptStore((s) => s.connections);
  const forceEnabled = useConceptStore((s) => s.forceSimulationEnabled);
  const setAllNodePositions = useConceptStore((s) => s.setAllNodePositions);

  const frameCount = useRef(0);

  useFrame(() => {
    if (!forceEnabled) return;
    frameCount.current++;
    if (frameCount.current % 2 !== 0) return;

    const nodeMap = new Map<string, typeof nodes[0]>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    const forces: Record<string, Vector3> = {};
    nodes.forEach((n) => (forces[n.id] = { x: 0, y: 0, z: 0 }));

    const CENTER_PULL = 0.0008;
    const SAME_COLOR_ATTRACTION = 0.0015;
    const DIFF_COLOR_REPULSION = 0.002;
    const CONNECTION_SPRING = 0.0012;
    const CONNECTION_DISTANCE = 6;
    const MIN_DIST = 2.5;
    const MAX_FORCE = 0.05;
    const FRICTION = 0.92;

    nodes.forEach((ni, i) => {
      if (ni.isFixed) return;

      forces[ni.id].x -= ni.position.x * CENTER_PULL;
      forces[ni.id].y -= ni.position.y * CENTER_PULL;
      forces[ni.id].z -= ni.position.z * CENTER_PULL;

      for (let j = i + 1; j < nodes.length; j++) {
        const nj = nodes[j];
        const dx = nj.position.x - ni.position.x;
        const dy = nj.position.y - ni.position.y;
        const dz = nj.position.z - ni.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq) || 0.01;

        if (dist < MIN_DIST) {
          const repulse = (MIN_DIST - dist) * 0.01;
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;
          forces[ni.id].x -= nx * repulse;
          forces[ni.id].y -= ny * repulse;
          forces[ni.id].z -= nz * repulse;
          if (!nj.isFixed) {
            forces[nj.id].x += nx * repulse;
            forces[nj.id].y += ny * repulse;
            forces[nj.id].z += nz * repulse;
          }
          continue;
        }

        const sameColor = ni.color === nj.color;
        const strength = sameColor ? SAME_COLOR_ATTRACTION : -DIFF_COLOR_REPULSION;
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const mag = Math.min(strength / (distSq * 0.1 + 1), MAX_FORCE);

        forces[ni.id].x += nx * mag;
        forces[ni.id].y += ny * mag;
        forces[ni.id].z += nz * mag;
        if (!nj.isFixed) {
          forces[nj.id].x -= nx * mag;
          forces[nj.id].y -= ny * mag;
          forces[nj.id].z -= nz * mag;
        }
      }
    });

    connections.forEach((conn) => {
      const from = nodeMap.get(conn.fromId);
      const to = nodeMap.get(conn.toId);
      if (!from || !to) return;
      const dx = to.position.x - from.position.x;
      const dy = to.position.y - from.position.y;
      const dz = to.position.z - from.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
      const diff = dist - CONNECTION_DISTANCE;
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;
      const mag = diff * CONNECTION_SPRING;

      if (!from.isFixed) {
        forces[from.id].x += nx * mag;
        forces[from.id].y += ny * mag;
        forces[from.id].z += nz * mag;
      }
      if (!to.isFixed) {
        forces[to.id].x -= nx * mag;
        forces[to.id].y -= ny * mag;
        forces[to.id].z -= nz * mag;
      }
    });

    const newPositions: Record<string, Vector3> = {};
    nodes.forEach((n) => {
      if (n.isFixed) return;

      const fx = Math.max(-MAX_FORCE, Math.min(MAX_FORCE, forces[n.id].x));
      const fy = Math.max(-MAX_FORCE, Math.min(MAX_FORCE, forces[n.id].y));
      const fz = Math.max(-MAX_FORCE, Math.min(MAX_FORCE, forces[n.id].z));

      let vx = (n.velocity.x + fx) * FRICTION;
      let vy = (n.velocity.y + fy) * FRICTION;
      let vz = (n.velocity.z + fz) * FRICTION;

      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const maxSpeed = 0.12;
      if (speed > maxSpeed) {
        vx = (vx / speed) * maxSpeed;
        vy = (vy / speed) * maxSpeed;
        vz = (vz / speed) * maxSpeed;
      }

      newPositions[n.id] = {
        x: n.position.x + vx,
        y: n.position.y + vy,
        z: n.position.z + vz,
      };
      n.velocity.x = vx;
      n.velocity.y = vy;
      n.velocity.z = vz;
    });

    if (Object.keys(newPositions).length > 0) {
      setAllNodePositions(newPositions);
    }
  });

  return null;
}

function SceneClickHandler() {
  const { camera, raycaster, pointer } = useThree();
  const openRadialMenu = useConceptStore((s) => s.openRadialMenu);
  const closeRadialMenu = useConceptStore((s) => s.closeRadialMenu);
  const showRadialMenu = useConceptStore((s) => s.showRadialMenu);
  const connectingFromId = useConceptStore((s) => s.connectingFromId);
  const cancelConnection = useConceptStore((s) => s.cancelConnection);

  const handlePointerMissed = useCallback(
    (e: any) => {
      if (e.button === 2) {
        e.stopPropagation();
        raycaster.setFromCamera(pointer, camera);
        const dir = raycaster.ray.direction.clone().normalize();
        const origin = raycaster.ray.origin.clone();
        const spawnDist = 10;
        const worldPos = origin.add(dir.multiplyScalar(spawnDist));
        openRadialMenu({ x: worldPos.x, y: worldPos.y, z: worldPos.z });
      } else if (e.button === 0) {
        if (showRadialMenu) closeRadialMenu();
        if (connectingFromId) cancelConnection();
      }
    },
    [raycaster, pointer, camera, openRadialMenu, showRadialMenu, closeRadialMenu, connectingFromId, cancelConnection]
  );

  return <mesh onPointerMissed={handlePointerMissed} visible={false} />;
}

function SceneContent() {
  const nodes = useConceptStore((s) => s.nodes);
  const connections = useConceptStore((s) => s.connections);
  const focusedNodeId = useConceptStore((s) => s.focusedNodeId);
  const cameraMode = useConceptStore((s) => s.cameraMode);

  const nodeOpacity = (nodeId: string) => {
    if (cameraMode !== 'focus' || !focusedNodeId) return 1;
    if (nodeId === focusedNodeId) return 1;
    const connected = connections.some(
      (c) =>
        (c.fromId === focusedNodeId && c.toId === nodeId) ||
        (c.toId === focusedNodeId && c.fromId === nodeId)
    );
    return connected ? 0.5 : 0.2;
  };

  const connectionOpacity = (connId: string) => {
    if (cameraMode !== 'focus' || !focusedNodeId) return 1;
    const conn = connections.find((c) => c.id === connId);
    if (!conn) return 0.2;
    return conn.fromId === focusedNodeId || conn.toId === focusedNodeId ? 1 : 0.15;
  };

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[15, 15, 15]} intensity={0.8} color="#b8c5ff" />
      <pointLight position={[-15, -10, 10]} intensity={0.5} color="#e8b4ff" />
      <pointLight position={[0, -15, -10]} intensity={0.4} color="#94d8ff" />

      <StarField />
      <ForceSimulator />
      <FocusController />
      <SceneClickHandler />

      {connections.map((conn) => (
        <ConnectionLine
          key={conn.id}
          connectionId={conn.id}
          fromId={conn.fromId}
          toId={conn.toId}
          opacity={connectionOpacity(conn.id)}
        />
      ))}

      {nodes.map((node) => (
        <ConceptNodeComponent
          key={node.id}
          nodeId={node.id}
          opacity={nodeOpacity(node.id)}
          isFocused={focusedNodeId === node.id}
        />
      ))}
    </>
  );
}

const SceneCanvas: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [10, 8, 12], fov: 60, near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
      onContextMenu={(e) => e.preventDefault()}
      frameloop="always"
    >
      <fog attach="fog" args={['#0a0a28', 30, 120]} />
      <SceneContent />
    </Canvas>
  );
};

export default SceneCanvas;
