import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '../control/store';
import { MeasurementPoint, CrackSegment, LayerConfig } from '../geology/types';

const TERRAIN_SIZE = 200;
const GRID_SEGMENTS = 100;

function createLayerGeometry(
  baseVertices: Float32Array,
  gridWidth: number,
  gridHeight: number,
  layer: LayerConfig,
  deformedVertices: Float32Array | null
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertexCount = gridWidth * gridHeight;
  const positions = new Float32Array(vertexCount * 3);
  const indices: number[] = [];

  for (let i = 0; i < vertexCount; i++) {
    const srcIdx = i * 3;
    const src = deformedVertices || baseVertices;
    positions[i * 3] = src[srcIdx];
    positions[i * 3 + 1] = src[srcIdx + 1] + layer.baseHeight;
    positions[i * 3 + 2] = src[srcIdx + 2];
  }

  for (let iy = 0; iy < gridHeight - 1; iy++) {
    for (let ix = 0; ix < gridWidth - 1; ix++) {
      const a = iy * gridWidth + ix;
      const b = iy * gridWidth + ix + 1;
      const c = (iy + 1) * gridWidth + ix;
      const d = (iy + 1) * gridWidth + ix + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createTopLayerGeometry(
  baseVertices: Float32Array,
  gridWidth: number,
  gridHeight: number,
  deformedVertices: Float32Array | null,
  layerThicknesses: number[]
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertexCount = gridWidth * gridHeight;
  const positions = new Float32Array(vertexCount * 6 * 3);
  const normals = new Float32Array(vertexCount * 6 * 3);
  let posIdx = 0;
  let normIdx = 0;

  const src = deformedVertices || baseVertices;

  const step = TERRAIN_SIZE / GRID_SEGMENTS;

  for (let iy = 0; iy < gridHeight - 1; iy++) {
    for (let ix = 0; ix < gridWidth - 1; ix++) {
      const i00 = iy * gridWidth + ix;
      const i10 = iy * gridWidth + ix + 1;
      const i01 = (iy + 1) * gridWidth + ix;
      const i11 = (iy + 1) * gridWidth + ix + 1;

      const topY00 = src[i00 * 3 + 1];
      const topY10 = src[i10 * 3 + 1];
      const topY01 = src[i01 * 3 + 1];
      const topY11 = src[i11 * 3 + 1];

      const botY00 = topY00 - layerThicknesses[0];
      const botY10 = topY10 - layerThicknesses[0];
      const botY01 = topY01 - layerThicknesses[0];
      const botY11 = topY11 - layerThicknesses[0];

      const x00 = src[i00 * 3], z00 = src[i00 * 3 + 2];
      const x10 = src[i10 * 3], z10 = src[i10 * 3 + 2];
      const x01 = src[i01 * 3], z01 = src[i01 * 3 + 2];
      const x11 = src[i11 * 3], z11 = src[i11 * 3 + 2];

      const addSideQuad = (
        ax: number, ay1: number, ay2: number, az: number,
        bx: number, by1: number, by2: number, bz: number
      ) => {
        positions[posIdx++] = ax; positions[posIdx++] = ay1; positions[posIdx++] = az;
        positions[posIdx++] = bx; positions[posIdx++] = by1; positions[posIdx++] = bz;
        positions[posIdx++] = ax; positions[posIdx++] = ay2; positions[posIdx++] = az;

        positions[posIdx++] = bx; positions[posIdx++] = by1; positions[posIdx++] = bz;
        positions[posIdx++] = bx; positions[posIdx++] = by2; positions[posIdx++] = bz;
        positions[posIdx++] = ax; positions[posIdx++] = ay2; positions[posIdx++] = az;

        const ex = bx - ax;
        const ez = bz - az;
        const len = Math.sqrt(ex * ex + ez * ez) || 1;
        const nx = -ez / len;
        const nz = ex / len;

        for (let t = 0; t < 6; t++) {
          normals[normIdx++] = nx; normals[normIdx++] = 0; normals[normIdx++] = nz;
        }
      };

      if (ix === 0) {
        addSideQuad(x00, topY00, botY00, z00, x01, topY01, botY01, z01);
      }
      if (ix === gridWidth - 2) {
        addSideQuad(x10, topY10, botY10, z10, x11, topY11, botY11, z11);
      }
      if (iy === 0) {
        addSideQuad(x00, topY00, botY00, z00, x10, topY10, botY10, z10);
      }
      if (iy === gridHeight - 2) {
        addSideQuad(x01, topY01, botY01, z01, x11, topY11, botY11, z11);
      }
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, posIdx), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals.slice(0, normIdx), 3));
  geometry.computeVertexNormals();
  return geometry;
}

interface TerrainLayerMeshProps {
  layer: LayerConfig;
  layerIndex: number;
  baseVertices: Float32Array;
  gridWidth: number;
  gridHeight: number;
  deformedVertices: Float32Array | null;
  allLayers: LayerConfig[];
}

const TerrainLayerMesh: React.FC<TerrainLayerMeshProps> = React.memo(({
  layer,
  layerIndex,
  baseVertices,
  gridWidth,
  gridHeight,
  deformedVertices,
  allLayers,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const sideRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    return createLayerGeometry(baseVertices, gridWidth, gridHeight, layer, deformedVertices);
  }, [baseVertices, gridWidth, gridHeight, layer, deformedVertices]);

  const sideGeometry = useMemo(() => {
    if (layerIndex !== 0) return null;
    return createTopLayerGeometry(baseVertices, gridWidth, gridHeight, deformedVertices, allLayers.map(l => l.thickness));
  }, [baseVertices, gridWidth, gridHeight, deformedVertices, layerIndex, allLayers]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: layer.color,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
  }, [layer.color]);

  const sideMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: allLayers[0]?.color || '#d4a373',
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
  }, [allLayers]);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = geometry;
    }
  }, [geometry]);

  useEffect(() => {
    if (sideRef.current && sideGeometry) {
      sideRef.current.geometry.dispose();
      sideRef.current.geometry = sideGeometry;
    }
  }, [sideGeometry]);

  return (
    <>
      <mesh ref={meshRef} geometry={geometry} material={material} receiveShadow castShadow />
      {sideGeometry && <mesh ref={sideRef} geometry={sideGeometry} material={sideMaterial} receiveShadow castShadow />}
    </>
  );
});

TerrainLayerMesh.displayName = 'TerrainLayerMesh';

interface MeasurementPointMarkerProps {
  point: MeasurementPoint;
}

const MeasurementPointMarker: React.FC<MeasurementPointMarkerProps> = ({ point }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const barRef = useRef<THREE.Mesh>(null);

  const barHeight = point.displacement * 2;
  const color = useMemo(() => {
    const t = Math.min(point.displacement / 15, 1);
    const r = Math.round(t * 255);
    const g = Math.round((1 - t) * 255);
    return new THREE.Color(`rgb(${r}, ${g}, 0)`);
  }, [point.displacement]);

  const sphereColor = useMemo(() => {
    if (point.isUserAdded) return new THREE.Color('#ffaa00');
    return new THREE.Color('#00ff88');
  }, [point.isUserAdded]);

  const [showBubble, setShowBubble] = React.useState(false);

  return (
    <group position={point.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          setShowBubble(!showBubble);
        }}
      >
        <sphereGeometry args={[point.isUserAdded ? 0.3 : 0.5, 16, 16]} />
        <meshStandardMaterial
          color={sphereColor}
          emissive={sphereColor}
          emissiveIntensity={0.3}
        />
      </mesh>

      {barHeight > 0.1 && (
        <mesh ref={barRef} position={[0, barHeight / 2 + 0.5, 0]}>
          <boxGeometry args={[0.3, barHeight, 0.3]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} transparent opacity={0.85} />
        </mesh>
      )}

      {showBubble && (
        <Html position={[0, barHeight + 2, 0]} center distanceFactor={50}>
          <div style={{
            background: 'rgba(28,28,42,0.92)',
            border: '1px solid #4fc3f7',
            borderRadius: '6px',
            padding: '6px 10px',
            color: '#c0c0c0',
            fontSize: '11px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            <div>位移: {point.displacement.toFixed(2)} u</div>
            <div>应力: {point.stress.toFixed(2)} MPa</div>
            <div>能量: {point.energy.toFixed(2)} J</div>
          </div>
        </Html>
      )}
    </group>
  );
};

interface CrackLinesProps {
  cracks: CrackSegment[];
}

const CrackLines: React.FC<CrackLinesProps> = React.memo(({ cracks }) => {
  if (cracks.length === 0) return null;

  return (
    <group>
      {cracks.slice(0, 500).map((crack, i) => (
        <Line
          key={i}
          points={[crack.start, crack.end]}
          color="#ff3333"
          lineWidth={2}
          transparent
          opacity={0.8}
        />
      ))}
    </group>
  );
});

CrackLines.displayName = 'CrackLines';

interface SceneContentProps {
  onSurfaceClick: (point: [number, number, number]) => void;
  canAddPoints: boolean;
}

const SceneContent: React.FC<SceneContentProps> = ({ onSurfaceClick, canAddPoints }) => {
  const time = useSimulationStore(s => s.time);
  const measurementPoints = useSimulationStore(s => s.measurementPoints);
  const userMeasurementPoints = useSimulationStore(s => s.userMeasurementPoints);
  const cracks = useSimulationStore(s => s.cracks);
  const simulator = useSimulationStore(s => s.simulator);
  const tick = useSimulationStore(s => s.tick);
  const isPlaying = useSimulationStore(s => s.isPlaying);
  const playbackSpeed = useSimulationStore(s => s.playbackSpeed);

  const baseVertices = simulator.getBaseVertices();
  const { width, height } = simulator.getGridDimensions();
  const layers = simulator.layers;

  const deformedVertices = useMemo(() => {
    return simulator.computeDeformedVertices(time);
  }, [simulator, time]);

  useFrame((_, delta) => {
    if (isPlaying) {
      tick(delta);
    }
  });

  const handleSurfaceClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (!canAddPoints) return;
    e.stopPropagation();
    const point = e.point;
    const surfacePoint = simulator.findSurfacePoint(point.x, point.z);
    onSurfaceClick(surfacePoint);
  }, [canAddPoints, onSurfaceClick, simulator]);

  const allPoints = [...measurementPoints, ...userMeasurementPoints];

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[80, 120, 60]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-40, 60, -30]} intensity={0.3} />

      <group onPointerDown={canAddPoints ? handleSurfaceClick : undefined}>
        {layers.map((layer, idx) => (
          <TerrainLayerMesh
            key={idx}
            layer={layer}
            layerIndex={idx}
            baseVertices={baseVertices}
            gridWidth={width}
            gridHeight={height}
            deformedVertices={deformedVertices}
            allLayers={layers}
          />
        ))}
      </group>

      <CrackLines cracks={cracks} />

      {allPoints.map(point => (
        <MeasurementPointMarker key={point.id} point={point} />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.3}
        minDistance={30}
        maxDistance={200}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
      />

      <gridHelper args={[TERRAIN_SIZE, 20, '#2a2a3a', '#1a1a2a']} position={[0, -40, 0]} />
    </>
  );
};

interface FaultPlaneHelperProps {
  strike: number;
  dipAngle: number;
}

const FaultPlaneHelper: React.FC<FaultPlaneHelperProps> = ({ strike, dipAngle }) => {
  const strikeRad = (strike * Math.PI) / 180;
  const dipRad = (dipAngle * Math.PI) / 180;

  const linePoints = useMemo(() => {
    const fx = Math.cos(strikeRad);
    const fz = Math.sin(strikeRad);
    const length = 120;
    const p1: [number, number, number] = [-fx * length, 0, -fz * length];
    const p2: [number, number, number] = [fx * length, 0, fz * length];
    return [p1, p2];
  }, [strikeRad]);

  return (
    <Line points={linePoints} color="#ff6666" lineWidth={1.5} dashed dashSize={3} gapSize={2} transparent opacity={0.5} />
  );
};

interface SceneRendererProps {
  onSurfaceClick: (point: [number, number, number]) => void;
  canAddPoints: boolean;
}

const SceneRenderer: React.FC<SceneRendererProps> = ({ onSurfaceClick, canAddPoints }) => {
  const faultParams = useSimulationStore(s => s.faultParams);

  return (
    <Canvas
      camera={{ position: [100, 80, 100], fov: 50, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%', background: '#0a0a14' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0a0a14');
      }}
    >
      <fog attach="fog" args={['#0a0a14', 150, 350]} />
      <SceneContent onSurfaceClick={onSurfaceClick} canAddPoints={canAddPoints} />
      <FaultPlaneHelper strike={faultParams.strike} dipAngle={faultParams.dipAngle} />
    </Canvas>
  );
};

export default SceneRenderer;
