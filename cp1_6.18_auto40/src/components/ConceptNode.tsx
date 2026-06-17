import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useConceptStore } from '@/store/useConceptStore';
import type { ConceptNode as ConceptNodeType, Vector3 } from '@/types/conceptTypes';

interface Props {
  nodeId: string;
  opacity: number;
  isFocused: boolean;
}

const NODE_SIZE: Record<string, number> = {
  core: 0.9,
  attribute: 0.7,
  relation: 0.75,
};

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

const ConceptNode: React.FC<Props> = ({ nodeId, opacity, isFocused }) => {
  const node = useConceptStore((s) => s.nodes.find((n) => n.id === nodeId)) as ConceptNodeType;
  const setEditingNodeId = useConceptStore((s) => s.setEditingNodeId);
  const setFocusedNodeId = useConceptStore((s) => s.setFocusedNodeId);
  const setCameraMode = useConceptStore((s) => s.setCameraMode);
  const startConnection = useConceptStore((s) => s.startConnection);
  const updateTempConnectionEnd = useConceptStore((s) => s.updateTempConnectionEnd);
  const finishConnection = useConceptStore((s) => s.finishConnection);
  const connectingFromId = useConceptStore((s) => s.connectingFromId);
  const cancelConnection = useConceptStore((s) => s.cancelConnection);
  const updateNodePosition = useConceptStore((s) => s.updateNodePosition);

  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const particlesData = useRef<Particle[]>([]);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const dragOffset = useRef<Vector3>({ x: 0, y: 0, z: 0 });
  const spawnProgress = useRef(0);
  const birthTime = useRef(Date.now());

  const baseSize = NODE_SIZE[node.type] || 0.7;

  const displayColor = useMemo(() => new THREE.Color(node.color), [node.color]);

  const spawnParticlesBurst = useCallback((pos: THREE.Vector3, count: number) => {
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.03 + Math.random() * 0.05;
      particlesData.current.push({
        position: pos.clone(),
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed,
          Math.cos(phi) * speed
        ),
        life: 0,
        maxLife: 0.8 + Math.random() * 0.6,
        color: displayColor.clone(),
        size: 0.08 + Math.random() * 0.08,
      });
    }
  }, [displayColor]);

  useEffect(() => {
    if (particlesRef.current) {
      const pos = new THREE.Vector3(node.position.x, node.position.y, node.position.z);
      spawnParticlesBurst(pos, 30);
    }
  }, []);

  const nodeShape = useMemo(() => {
    switch (node.type) {
      case 'core':
        return <sphereGeometry args={[1, 48, 48]} />;
      case 'attribute':
        return <boxGeometry args={[1.6, 1.6, 1.6]} />;
      case 'relation':
        return (
          <coneGeometry args={[1, 1.7, 4]} />
        );
      default:
        return <sphereGeometry args={[1, 32, 32]} />;
    }
  }, [node.type]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const age = (Date.now() - birthTime.current) / 1000;
    spawnProgress.current = Math.min(age / 0.6, 1);
    const spawnT = 1 - Math.pow(1 - spawnProgress.current, 3);

    const targetScale = baseSize * spawnT * (hovered || isFocused ? 1.3 : 1);
    const currentScale = groupRef.current.scale.x;
    const newScale = currentScale + (targetScale - currentScale) * 0.2;
    groupRef.current.scale.set(newScale, newScale, newScale);

    groupRef.current.position.x = node.position.x;
    groupRef.current.position.y = node.position.y;
    groupRef.current.position.z = node.position.z;

    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = opacity;
      material.emissiveIntensity = hovered || isFocused ? 0.8 : 0.45;
      material.emissive.copy(displayColor);
      material.color.copy(displayColor);
      material.needsUpdate = true;
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity * (hovered || isFocused ? 0.35 : 0.2);
      mat.color.copy(displayColor);
      mat.needsUpdate = true;
    }

    if (particlesRef.current && particlesData.current.length > 0) {
      const geo = particlesRef.current.geometry as THREE.BufferGeometry;
      const positions = geo.attributes.position as THREE.BufferAttribute;
      const colors = geo.attributes.color as THREE.BufferAttribute;
      const sizes = geo.attributes.size as THREE.BufferAttribute;

      const kept: Particle[] = [];
      let writeIdx = 0;

      for (const p of particlesData.current) {
        p.life += delta;
        if (p.life >= p.maxLife) continue;

        p.position.add(p.velocity);
        p.velocity.multiplyScalar(0.94);

        const t = p.life / p.maxLife;
        const alpha = 1 - t;
        positions.setXYZ(writeIdx, p.position.x, p.position.y, p.position.z);
        colors.setXYZ(writeIdx, p.color.r * alpha, p.color.g * alpha, p.color.b * alpha);
        sizes.setX(writeIdx, p.size * alpha);
        kept.push(p);
        writeIdx++;
      }

      if (kept.length < particlesData.current.length) {
        geo.setDrawRange(0, Math.max(kept.length, 1));
      }

      positions.needsUpdate = true;
      colors.needsUpdate = true;
      sizes.needsUpdate = true;
      particlesData.current = kept;
    }

    if (dragging && connectingFromId === nodeId) {
      const endPos = new THREE.Vector3(
        node.position.x + dragOffset.current.x * 3,
        node.position.y + dragOffset.current.y * 3,
        node.position.z + dragOffset.current.z * 3
      );
      updateTempConnectionEnd({ x: endPos.x, y: endPos.y, z: endPos.z });
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button === 0) {
      if (e.shiftKey || connectingFromId) {
        if (connectingFromId && connectingFromId !== nodeId) {
          finishConnection(nodeId);
          e.stopPropagation();
          return;
        }
        e.stopPropagation();
        setDragging(true);
        startConnection(nodeId);
        const cam = e.camera;
        const pt = e.point.clone();
        const dir = pt.sub(new THREE.Vector3(node.position.x, node.position.y, node.position.z)).normalize();
        dragOffset.current = { x: dir.x, y: dir.y, z: dir.z };
      } else {
        e.stopPropagation();
        setIsDraggingNode(true);
        if (groupRef.current) {
          groupRef.current.updateMatrixWorld();
        }
      }
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (connectingFromId === nodeId && dragging) {
      const cam = e.camera;
      const pt = e.point.clone();
      const origin = new THREE.Vector3(node.position.x, node.position.y, node.position.z);
      const dir = pt.sub(origin).normalize();
      dragOffset.current = { x: dir.x, y: dir.y, z: dir.z };
    }
    if (isDraggingNode && !connectingFromId) {
      const cam = e.camera;
      const plane = new THREE.Plane();
      const normal = new THREE.Vector3();
      cam.getWorldDirection(normal);
      plane.setFromNormalAndCoplanarPoint(
        normal,
        new THREE.Vector3(node.position.x, node.position.y, node.position.z)
      );
      const intersection = new THREE.Vector3();
      const raycaster = (e as any).raycaster as THREE.Raycaster;
      if (raycaster) {
        raycaster.ray.intersectPlane(plane, intersection);
        if (intersection) {
          updateNodePosition(nodeId, { x: intersection.x, y: intersection.y, z: intersection.z });
        }
      }
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (connectingFromId === nodeId && dragging) {
      cancelConnection();
    }
    setDragging(false);
    setIsDraggingNode(false);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (connectingFromId && connectingFromId !== nodeId) {
      finishConnection(nodeId);
      return;
    }
    if (!isDraggingNode && !dragging) {
      if (e.detail === 2) {
        setFocusedNodeId(nodeId);
        setCameraMode('focus');
      } else {
        setEditingNodeId(nodeId);
      }
    }
  };

  const MAX_PARTICLES = 150;
  const emptyPositions = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);
  const emptyColors = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);
  const emptySizes = useMemo(() => new Float32Array(MAX_PARTICLES), []);

  return (
    <group
      ref={groupRef}
      position={[node.position.x, node.position.y, node.position.z]}
    >
      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
      >
        <mesh ref={meshRef} castShadow receiveShadow>
          {nodeShape}
          <meshStandardMaterial
            color={displayColor}
            emissive={displayColor}
            emissiveIntensity={0.45}
            roughness={0.25}
            metalness={0.15}
            transparent
            opacity={opacity}
          />
        </mesh>

        <mesh ref={glowRef} scale={[1.4, 1.4, 1.4]}>
          {nodeShape}
          <meshBasicMaterial
            color={displayColor}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <Billboard position={[0, baseSize * 1.6, 0]}>
          <Text
            fontSize={0.38}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {node.title}
            <meshBasicMaterial
              transparent
              opacity={Math.min(opacity, hovered ? 1 : 0.8)}
              color="#ffffff"
              toneMapped={false}
            />
          </Text>
        </Billboard>
      </group>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={MAX_PARTICLES}
            array={emptyPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={MAX_PARTICLES}
            array={emptyColors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={MAX_PARTICLES}
            array={emptySizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.2}
          vertexColors
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
};

export default ConceptNode;
