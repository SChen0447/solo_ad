import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { TreeNodeData, ConnectionData } from '../hooks/useTreeData';

interface TreeSceneProps {
  nodes: TreeNodeData[];
  connections: ConnectionData[];
  nodeScale: number;
  lineOpacity: number;
  autoRotateSpeed: number;
  flyDuration: number;
  focusedNodeId: string | null;
  collapsedNodes: Set<string>;
  onNodeClick: (nodeId: string) => void;
  onCameraResetRef: React.MutableRefObject<(() => void) | null>;
}

interface NodeMeshProps {
  node: TreeNodeData;
  nodeScale: number;
  isFocused: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function NodeMesh({ node, nodeScale, isFocused, isCollapsed, onClick }: NodeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      const targetScale = isFocused ? 1.5 * nodeScale : hovered ? 1.2 * nodeScale : nodeScale;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      const targetOpacity = isFocused ? 0.7 : 1;
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.1);
      material.transparent = isFocused || material.opacity < 1;
    }
    if (haloRef.current && isCollapsed) {
      const time = state.clock.elapsedTime;
      const pulse = 0.5 + 0.5 * Math.sin(time * Math.PI);
      const haloMaterial = haloRef.current.material as THREE.MeshBasicMaterial;
      haloMaterial.opacity = pulse * 0.8;
      const haloScale = 1.2 + pulse * 0.1;
      haloRef.current.scale.set(haloScale, haloScale, haloScale);
    }
  });

  const hasChildren = node.children.length > 0;

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = hasChildren ? 'pointer' : 'default';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={isFocused ? 0.3 : hovered ? 0.15 : 0.05}
          metalness={0.3}
          roughness={0.4}
          transparent
          opacity={1}
        />
      </mesh>
      {isCollapsed && hasChildren && (
        <mesh ref={haloRef}>
          <ringGeometry args={[0.35, 0.45, 64]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {isFocused && <FocusParticleRing color={node.color} />}
      <Html
        position={[0, 0.5, 0]}
        center
        distanceFactor={10}
        zIndexRange={[10, 0]}
        style={{
          color: '#EEEEEE',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          whiteSpace: 'nowrap',
          textShadow: '0 0 4px rgba(0,0,0,0.8)',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: isFocused ? 1 : 0.8,
          transition: 'opacity 0.3s',
        }}
      >
        {node.name}
      </Html>
    </group>
  );
}

function FocusParticleRing({ color }: { color: string }) {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 200;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const baseColor = new THREE.Color(color);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.6 + Math.random() * 0.4;
      const yOffset = (Math.random() - 0.5) * 0.3;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = yOffset;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
      col[i * 3] = baseColor.r;
      col[i * 3 + 1] = baseColor.g;
      col[i * 3 + 2] = baseColor.b;
    }
    return [pos, col];
  }, [color]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * (Math.PI * 2);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

interface ConnectionLineProps {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  opacity: number;
}

function ConnectionLine({ from, to, color, opacity }: ConnectionLineProps) {
  const points = useMemo(() => [new THREE.Vector3(...from), new THREE.Vector3(...to)], [from, to]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      transparent
      opacity={opacity * 0.6}
    />
  );
}

function BackgroundParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 3000;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 10 + Math.random() * 40;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      vel[i * 3] = (Math.random() - 0.5) * 0.1;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }
    return { positions: pos, velocities: vel };
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const pos = posAttr.array as Float32Array;
      const time = state.clock.elapsedTime;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3] += velocities[i * 3] * Math.sin(time * 0.1 + i) * 0.01;
        pos[i * 3 + 1] += velocities[i * 3 + 1] * Math.cos(time * 0.1 + i) * 0.01;
        pos[i * 3 + 2] += velocities[i * 3 + 2] * Math.sin(time * 0.15 + i) * 0.01;
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#88CCFF"
        transparent
        opacity={0.2}
        sizeAttenuation
      />
    </points>
  );
}

interface CameraControllerProps {
  focusedNodePosition: [number, number, number] | null;
  flyDuration: number;
  autoRotateSpeed: number;
  controlsRef: React.MutableRefObject<any>;
  isFlyingRef: React.MutableRefObject<boolean>;
  onCameraResetRef: React.MutableRefObject<(() => void) | null>;
  onBlurStart: () => void;
}

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 10, 15);

function CameraController({
  focusedNodePosition,
  flyDuration,
  autoRotateSpeed,
  controlsRef,
  isFlyingRef,
  onCameraResetRef,
  onBlurStart,
}: CameraControllerProps) {
  const { camera } = useThree();
  const animationRef = useRef<{
    active: boolean;
    startTime: number;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    isReturning: boolean;
  }>({
    active: false,
    startTime: 0,
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    isReturning: false,
  });
  const lastInteractionRef = useRef<number>(0);
  const autoRotatePausedRef = useRef(false);

  useEffect(() => {
    if (focusedNodePosition) {
      onBlurStart();
      const startPos = camera.position.clone();
      const targetPos = new THREE.Vector3(
        focusedNodePosition[0] + 2,
        focusedNodePosition[1] + 0.5,
        focusedNodePosition[2] + 2
      );
      const startTarget = controlsRef.current?.target?.clone() || new THREE.Vector3();
      const endTarget = new THREE.Vector3(...focusedNodePosition);

      animationRef.current = {
        active: true,
        startTime: performance.now(),
        startPos,
        targetPos,
        startTarget,
        endTarget,
        isReturning: false,
      };
      isFlyingRef.current = true;
    }
  }, [focusedNodePosition, camera, controlsRef, isFlyingRef, onBlurStart]);

  onCameraResetRef.current = () => {
    const startPos = camera.position.clone();
    const targetPos = DEFAULT_CAMERA_POSITION.clone();
    const startTarget = controlsRef.current?.target?.clone() || new THREE.Vector3();
    const endTarget = new THREE.Vector3(0, 0, 0);

    animationRef.current = {
      active: true,
      startTime: performance.now(),
      startPos,
      targetPos,
      startTarget,
      endTarget,
      isReturning: true,
    };
    isFlyingRef.current = true;
  };

  useFrame(() => {
    const now = performance.now();
    const anim = animationRef.current;

    if (anim.active) {
      const elapsed = (now - anim.startTime) / 1000;
      const t = Math.min(elapsed / flyDuration, 1);
      const easedT = easeInOut(t);

      camera.position.lerpVectors(anim.startPos, anim.targetPos, easedT);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(anim.startTarget, anim.endTarget, easedT);
        controlsRef.current.update();
      }

      if (t >= 1) {
        anim.active = false;
        isFlyingRef.current = false;
      }
    } else if (controlsRef.current) {
      const timeSinceLastInteraction = now - lastInteractionRef.current;
      if (autoRotatePausedRef.current && timeSinceLastInteraction > 5000) {
        autoRotatePausedRef.current = false;
        controlsRef.current.autoRotate = true;
      }

      if (!autoRotatePausedRef.current) {
        controlsRef.current.autoRotateSpeed = autoRotateSpeed;
      }
    }
  });

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleStart = () => {
      autoRotatePausedRef.current = true;
      controls.autoRotate = false;
    };

    const handleEnd = () => {
      lastInteractionRef.current = performance.now();
    };

    controls.addEventListener('start', handleStart);
    controls.addEventListener('end', handleEnd);

    return () => {
      controls.removeEventListener('start', handleStart);
      controls.removeEventListener('end', handleEnd);
    };
  }, [controlsRef]);

  return null;
}

function SceneContent({
  nodes,
  connections,
  nodeScale,
  lineOpacity,
  autoRotateSpeed,
  flyDuration,
  focusedNodeId,
  collapsedNodes,
  onNodeClick,
  onCameraResetRef,
  onBlurStart,
}: TreeSceneProps & { onBlurStart: () => void }) {
  const controlsRef = useRef<any>(null);
  const isFlyingRef = useRef(false);

  const nodeMap = useMemo(() => {
    const map = new Map<string, TreeNodeData>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  const focusedNode = focusedNodeId ? nodeMap.get(focusedNodeId) || null : null;
  const focusedPosition = focusedNode ? focusedNode.position : null;

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -5, -10]} intensity={0.5} color="#8888FF" />

      <BackgroundParticles />

      {connections.map(conn => {
        const fromNode = nodeMap.get(conn.from);
        const toNode = nodeMap.get(conn.to);
        if (!fromNode || !toNode) return null;
        return (
          <ConnectionLine
            key={conn.id}
            from={fromNode.position}
            to={toNode.position}
            color={conn.color}
            opacity={lineOpacity}
          />
        );
      })}

      {nodes.map(node => (
        <NodeMesh
          key={node.id}
          node={node}
          nodeScale={nodeScale}
          isFocused={focusedNodeId === node.id}
          isCollapsed={collapsedNodes.has(node.id)}
          onClick={() => onNodeClick(node.id)}
        />
      ))}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={autoRotateSpeed}
        enablePan={false}
        minDistance={3}
        maxDistance={50}
      />

      <CameraController
        focusedNodePosition={focusedPosition}
        flyDuration={flyDuration}
        autoRotateSpeed={autoRotateSpeed}
        controlsRef={controlsRef}
        isFlyingRef={isFlyingRef}
        onCameraResetRef={onCameraResetRef}
        onBlurStart={onBlurStart}
      />
    </>
  );
}

export function TreeScene(props: TreeSceneProps) {
  const [blurActive, setBlurActive] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBlurStart = () => {
    setBlurActive(true);
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      setBlurActive(false);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 10, 15], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#000010' }}
        dpr={[1, 2]}
      >
        <SceneContent {...props} onBlurStart={handleBlurStart} />
      </Canvas>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          background: blurActive
            ? 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.8) 100%)'
            : 'transparent',
          transition: 'background 0.3s ease-out',
          zIndex: 1,
        }}
      />
    </div>
  );
}
