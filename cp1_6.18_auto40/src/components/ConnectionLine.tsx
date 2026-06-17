import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useConceptStore } from '@/store/useConceptStore';

interface Props {
  connectionId: string;
  fromId: string;
  toId: string;
  opacity: number;
}

const CURVE_SEGMENTS = 80;
const FLOW_DOT_COUNT = 6;
const MAX_FLOW_PARTICLES = 60;

const ConnectionLine: React.FC<Props> = ({ connectionId, fromId, toId, opacity }) => {
  const nodes = useConceptStore((s) => s.nodes);
  const connectingFromId = useConceptStore((s) => s.connectingFromId);
  const tempConnectionEnd = useConceptStore((s) => s.tempConnectionEnd);
  const { scene } = useThree();

  const groupRef = useRef<THREE.Group>(null);
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const flowPhase = useRef(Math.random() * Math.PI * 2);

  const isTemp = connectingFromId && (connectingFromId === fromId || connectingFromId === toId);

  const fromNode = nodes.find((n) => n.id === fromId);
  const toNode = nodes.find((n) => n.id === toId);
  const fromColor = fromNode?.color || '#ffffff';
  const toColor = toNode?.color || '#ffffff';

  const colA = useMemo(() => new THREE.Color(fromColor), [fromColor]);
  const colB = useMemo(() => new THREE.Color(toColor), [toColor]);

  const lineObj = useMemo(() => {
    const positions = new Float32Array((CURVE_SEGMENTS + 1) * 3);
    const colors = new Float32Array((CURVE_SEGMENTS + 1) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    return { line, geo, mat };
  }, []);

  const flowObj = useMemo(() => {
    const positions = new Float32Array(MAX_FLOW_PARTICLES * 3);
    const colors = new Float32Array(MAX_FLOW_PARTICLES * 3);
    const sizes = new Float32Array(MAX_FLOW_PARTICLES);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      toneMapped: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return { pts, geo, mat };
  }, []);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.add(lineObj.line);
      groupRef.current.add(flowObj.pts);
    }
    return () => {
      lineObj.mat.dispose();
      lineObj.geo.dispose();
      flowObj.mat.dispose();
      flowObj.geo.dispose();
    };
  }, [lineObj, flowObj]);

  // 这里放 buildCurve 等剩余代码...

  const emptyPositions = useMemo(() => new Float32Array((CURVE_SEGMENTS + 1) * 3), []);
  const emptyColors = useMemo(() => new Float32Array((CURVE_SEGMENTS + 1) * 3), []);
  const emptyFlowPositions = useMemo(() => new Float32Array(MAX_FLOW_PARTICLES * 3), []);
  const emptyFlowColors = useMemo(() => new Float32Array(MAX_FLOW_PARTICLES * 3), []);
  const emptyFlowSizes = useMemo(() => new Float32Array(MAX_FLOW_PARTICLES), []);

  const buildCurve = useMemo(() => {
    return () => {
      if (!fromNode) return null;
      let toPos;
      if (isTemp && tempConnectionEnd && connectingFromId === fromId) {
        toPos = new THREE.Vector3(tempConnectionEnd.x, tempConnectionEnd.y, tempConnectionEnd.z);
      } else if (toNode) {
        toPos = new THREE.Vector3(toNode.position.x, toNode.position.y, toNode.position.z);
      } else {
        return null;
      }

      const fromPos = new THREE.Vector3(fromNode.position.x, fromNode.position.y, fromNode.position.z);
      const mid = fromPos.clone().add(toPos).multiplyScalar(0.5);
      const dist = fromPos.distanceTo(toPos);
      const offsetDir = new THREE.Vector3(
        (Math.sin(fromNode.position.x + (toNode?.position.x || 0)) * 0.5 + 0.3),
        (Math.cos(fromNode.position.y + (toNode?.position.y || 0)) * 0.5 + 0.4),
        (Math.sin(fromNode.position.z * 2 + (toNode?.position.z || 0)) * 0.5 + 0.3)
      ).normalize();
      const lift = dist * 0.22;
      mid.add(offsetDir.multiplyScalar(lift));

      const cp1 = fromPos.clone().lerp(mid, 0.4).add(offsetDir.clone().multiplyScalar(lift * 0.4));
      const cp2 = toPos.clone().lerp(mid, 0.4).add(offsetDir.clone().multiplyScalar(lift * 0.4));

      return new THREE.CatmullRomCurve3([fromPos, cp1, mid, cp2, toPos], false, 'catmullrom', 0.4);
    };
  }, [fromNode, toNode, isTemp, tempConnectionEnd, connectingFromId, fromId]);

  useEffect(() => {
    const curve = buildCurve();
    curveRef.current = curve;
  }, [buildCurve, nodes.length, fromNode?.position, toNode?.position, tempConnectionEnd]);

  useFrame((state, delta) => {
    if (!lineRef.current) return;
    const curve = curveRef.current || buildCurve();
    if (!curve) return;
    curveRef.current = curve;

    const lineGeo = lineRef.current.geometry as THREE.BufferGeometry;
    const posAttr = lineGeo.attributes.position as THREE.BufferAttribute;
    const colAttr = lineGeo.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i <= CURVE_SEGMENTS; i++) {
      const t = i / CURVE_SEGMENTS;
      const p = curve.getPoint(t);
      posAttr.setXYZ(i, p.x, p.y, p.z);

      const col = colA.clone().lerp(colB, t);
      const pulse = 0.75 + 0.25 * Math.sin(state.clock.elapsedTime * 2 + t * Math.PI * 3);
      colAttr.setXYZ(i, col.r * pulse, col.g * pulse, col.b * pulse);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    const mat = lineRef.current.material as THREE.LineBasicMaterial;
    mat.opacity = isTemp ? opacity * 0.6 : opacity;
    mat.needsUpdate = true;

    if (flowRef.current) {
      const flowGeo = flowRef.current.geometry as THREE.BufferGeometry;
      const fPos = flowGeo.attributes.position as THREE.BufferAttribute;
      const fCol = flowGeo.attributes.color as THREE.BufferAttribute;
      const fSize = flowGeo.attributes.size as THREE.BufferAttribute;

      flowPhase.current += delta * 0.8;
      const writeCount = isTemp ? 20 : FLOW_DOT_COUNT * 6;

      for (let i = 0; i < writeCount; i++) {
        const baseT = (i / FLOW_DOT_COUNT + flowPhase.current * 0.05) % 1;
        const dotIdx = Math.floor(i / 6);
        const subIdx = i % 6;
        const subT = (baseT + subIdx * 0.002) % 1;

        const p = curve.getPoint(subT);
        const col = colA.clone().lerp(colB, subT);

        const glow = subIdx === 0 ? 1 : Math.max(0, 1 - subIdx * 0.15);
        const fade = Math.sin(Math.PI * baseT);

        fPos.setXYZ(i, p.x, p.y, p.z);
        fCol.setXYZ(i, col.r * glow * fade, col.g * glow * fade, col.b * glow * fade);
        fSize.setX(i, (subIdx === 0 ? 0.18 : 0.1) * fade);
      }

      for (let i = writeCount; i < MAX_FLOW_PARTICLES; i++) {
        fPos.setXYZ(i, 0, -1000, 0);
        fCol.setXYZ(i, 0, 0, 0);
        fSize.setX(i, 0);
      }

      fPos.needsUpdate = true;
      fCol.needsUpdate = true;
      fSize.needsUpdate = true;

      const fMat = flowRef.current.material as THREE.PointsMaterial;
      fMat.opacity = isTemp ? opacity * 0.8 : opacity;
      fMat.needsUpdate = true;
    }
  });

  if (!fromNode) return null;

  return (
    <group>
      <line ref={lineRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={CURVE_SEGMENTS + 1}
            array={emptyPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={CURVE_SEGMENTS + 1}
            array={emptyColors}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={opacity}
          linewidth={2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </line>

      <points ref={flowRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={MAX_FLOW_PARTICLES}
            array={emptyFlowPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={MAX_FLOW_PARTICLES}
            array={emptyFlowColors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={MAX_FLOW_PARTICLES}
            array={emptyFlowSizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.2}
          vertexColors
          transparent
          opacity={opacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          toneMapped={false}
        />
      </points>
    </group>
  );
};

export default ConnectionLine;
