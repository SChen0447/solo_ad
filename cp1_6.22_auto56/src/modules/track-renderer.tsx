import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { TrackData } from './track-generator';
import { useFrame } from '@react-three/fiber';

export type RenderMode = 'wireframe' | 'material';

interface TrackRendererProps {
  trackData: TrackData;
  renderMode: RenderMode;
}

function Guardrail({
  points,
  color,
  renderMode
}: {
  points: THREE.Vector3[];
  color: string;
  renderMode: RenderMode;
}) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const height = 1.2;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      positions.push(p.x, p.y + 0.1, p.z);
      positions.push(p.x, p.y + height, p.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [points]);

  if (renderMode === 'wireframe') {
    return null;
  }

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} linewidth={2} />
    </lineSegments>
  );
}

function CurbStrip({
  leftEdge,
  rightEdge,
  renderMode
}: {
  leftEdge: THREE.Vector3[];
  rightEdge: THREE.Vector3[];
  renderMode: RenderMode;
}) {
  const { leftGeom, rightGeom } = useMemo(() => {
    const buildStrip = (points: THREE.Vector3[]) => {
      const positions: number[] = [];
      const indices: number[] = [];
      const colors: number[] = [];
      const width = 0.6;
      const height = 0.08;

      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const dir = new THREE.Vector3().subVectors(p1, p0).normalize();
        const perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

        const base = positions.length / 3;
        const isYellow = i % 4 < 2;
        const color = isYellow ? [1, 0.9, 0] : [0.1, 0.1, 0.1];

        for (const offset of [0, width]) {
          const op0 = p0.clone().addScaledVector(perp, offset);
          const op1 = p1.clone().addScaledVector(perp, offset);
          positions.push(op0.x, op0.y + height, op0.z);
          positions.push(op1.x, op1.y + height, op1.z);
          positions.push(op0.x, op0.y, op0.z);
          positions.push(op1.x, op1.y, op1.z);
          for (let k = 0; k < 4; k++) {
            colors.push(color[0], color[1], color[2]);
          }
        }

        indices.push(base, base + 1, base + 4);
        indices.push(base + 1, base + 5, base + 4);
        indices.push(base + 2, base + 6, base + 3);
        indices.push(base + 3, base + 6, base + 7);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    };

    return { leftGeom: buildStrip(leftEdge), rightGeom: buildStrip(rightEdge) };
  }, [leftEdge, rightEdge]);

  if (renderMode === 'wireframe') {
    return null;
  }

  return (
    <>
      <mesh geometry={leftGeom}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={rightGeom}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function StartLine({
  position,
  rotation,
  renderMode
}: {
  position: THREE.Vector3;
  rotation: number;
  renderMode: RenderMode;
}) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_state, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * (20 * Math.PI / 180);
    }
  });

  if (renderMode === 'wireframe') {
    return null;
  }

  return (
    <group position={[position.x, position.y + 0.05, position.z]} rotation={[0, rotation, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 0.5]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh ref={ringRef} position={[0, 1.5, 0]}>
        <torusGeometry args={[2, 0.08, 16, 64]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <torusGeometry args={[2.3, 0.03, 16, 64]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.4} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color="#00ff88" intensity={3} distance={30} />
    </group>
  );
}

export function TrackRenderer({ trackData, renderMode }: TrackRendererProps) {
  const wireframeEdges = useMemo(() => {
    const edges = new THREE.EdgesGeometry(trackData.geometry);
    return edges;
  }, [trackData.geometry]);

  const edgeLinePositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < trackData.leftEdge.length; i++) {
      const lp = trackData.leftEdge[i];
      const rp = trackData.rightEdge[i];
      positions.push(lp.x, lp.y + 0.1, lp.z);
      positions.push(rp.x, rp.y + 0.1, rp.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [trackData.leftEdge, trackData.rightEdge]);

  return (
    <group>
      {renderMode === 'wireframe' ? (
        <>
          <lineSegments geometry={wireframeEdges}>
            <lineBasicMaterial color="#ffffff" transparent opacity={0.85} />
          </lineSegments>
          <lineSegments geometry={edgeLinePositions}>
            <lineBasicMaterial color="#ffffff" transparent opacity={1} linewidth={3} />
          </lineSegments>
        </>
      ) : (
        <mesh geometry={trackData.geometry} receiveShadow>
          <meshStandardMaterial color="#2d3748" side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      )}

      <Guardrail points={trackData.leftEdge} color="#ff4444" renderMode={renderMode} />
      <Guardrail points={trackData.rightEdge} color="#ffffff" renderMode={renderMode} />
      <CurbStrip leftEdge={trackData.leftEdge} rightEdge={trackData.rightEdge} renderMode={renderMode} />
      <StartLine
        position={trackData.startPosition}
        rotation={trackData.startRotation}
        renderMode={renderMode}
      />
    </group>
  );
}
