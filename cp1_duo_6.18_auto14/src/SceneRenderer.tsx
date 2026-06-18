/// <reference types="@react-three/fiber" />
import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { DistributionData, SurfaceData, BarData } from './DistributionEngine';

interface SurfaceMeshProps {
  data: SurfaceData;
  color: string;
  transparent?: boolean;
  opacity?: number;
}

const SurfaceMesh: React.FC<SurfaceMeshProps> = ({ data, color, transparent = false, opacity = 1 }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const { points, gridSizeX, gridSizeZ, xMin, xMax, zMin, zMax, maxDensity } = data;
    const geo = new THREE.PlaneGeometry(
      xMax - xMin,
      zMax - zMin,
      gridSizeX - 1,
      gridSizeZ - 1
    );

    const positions = geo.attributes.position.array as Float32Array;
    const colors = new Float32Array(positions.length);

    const baseColor = new THREE.Color(color);

    for (let i = 0; i < points.length; i++) {
      const yVal = points[i].y;
      const idx = i * 3;
      positions[idx + 2] = yVal;

      const t = maxDensity > 0 ? Math.min(yVal / maxDensity, 1) : 0;
      const lightenedColor = baseColor.clone().lerp(new THREE.Color(0xffffff), t * 0.6);
      colors[idx] = lightenedColor.r;
      colors[idx + 1] = lightenedColor.g;
      colors[idx + 2] = lightenedColor.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.rotateX(-Math.PI / 2);
    geo.translate((xMax + xMin) / 2, 0, (zMax + zMin) / 2);

    return geo;
  }, [data, color]);

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        transparent={transparent}
        opacity={opacity}
        metalness={0.15}
        roughness={0.45}
      />
    </mesh>
  );
};

interface BarChartProps {
  data: BarData;
  colorBottom: string;
  colorTop: string;
  transparent?: boolean;
  opacity?: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, colorBottom, colorTop, transparent = false, opacity = 1 }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const { barCount, barWidth, barDepth, maxY } = useMemo(() => {
    return {
      barCount: Math.max(data.bars.length, 1),
      barWidth: data.barWidth,
      barDepth: data.barDepth,
      maxY: data.maxDensity || 1
    };
  }, [data]);

  useEffect(() => {
    if (!meshRef.current) return;

    const bottomColor = new THREE.Color(colorBottom);
    const topColor = new THREE.Color(colorTop);

    for (let i = 0; i < data.bars.length; i++) {
      const bar = data.bars[i];
      const height = bar.y;

      dummy.position.set(bar.x, height / 2, bar.z);
      dummy.scale.set(barWidth, Math.max(height, 0.001), barDepth);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);

      const t = maxY > 0 ? Math.min(height / maxY, 1) : 0;
      const color = bottomColor.clone().lerp(topColor, t);
      meshRef.current.setColorAt(i, color);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [data, barWidth, barDepth, colorBottom, colorTop, maxY, dummy]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, barCount]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        vertexColors
        transparent={transparent}
        opacity={opacity}
        metalness={0.25}
        roughness={0.4}
      />
    </instancedMesh>
  );
};

const BarGlowLights: React.FC<{ data: BarData; color: string }> = ({ data, color }) => {
  return (
    <>
      {data.bars.slice(0, 30).map((bar, i) => (
        <pointLight
          key={i}
          position={[bar.x, bar.y + 0.05, bar.z]}
          color={color}
          intensity={0.4}
          distance={1.2}
          decay={2}
        />
      ))}
    </>
  );
};

interface AxisLabelProps {
  position: [number, number, number];
  label: string;
  color?: string;
}

const AxisLabel: React.FC<AxisLabelProps> = ({ position, label, color = '#e6edf3' }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (groupRef.current && camera) {
      groupRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Html
        center
        distanceFactor={8}
        style={{
          color,
          fontSize: '10px',
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          padding: '3px 6px',
          backgroundColor: 'rgba(13, 17, 23, 0.85)',
          backdropFilter: 'blur(4px)',
          borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.1)',
          lineHeight: 1.2
        }}
      >
        {label}
      </Html>
    </group>
  );
};

interface AxesLabelsProps {
  gridSize: number;
}

const AxesLabels: React.FC<AxesLabelsProps> = ({ gridSize }) => {
  const halfSize = gridSize / 2;
  const labels = useMemo(() => [
    { pos: [halfSize + 0.5, 0, 0], label: '+X', color: '#ff6b6b' },
    { pos: [-halfSize - 0.5, 0, 0], label: '-X', color: '#ff6b6b' },
    { pos: [0, 1.2, halfSize + 0.5], label: '+Z', color: '#4ecdc4' },
    { pos: [0, 1.2, -halfSize - 0.5], label: '-Z', color: '#4ecdc4' },
    { pos: [-halfSize - 0.3, 1.5, -halfSize - 0.3], label: 'Y (密度)', color: '#ffe66d' },
    { pos: [-halfSize, 0.2, -halfSize], label: '-4', color: '#8b949e' },
    { pos: [-halfSize, 0.2, 0], label: '-2', color: '#8b949e' },
    { pos: [0, 0.2, -halfSize], label: '-4', color: '#8b949e' },
    { pos: [halfSize, 0.2, -halfSize], label: '0', color: '#8b949e' },
    { pos: [halfSize, 0.2, 0], label: '2', color: '#8b949e' },
    { pos: [0, 0.2, halfSize], label: '0', color: '#8b949e' },
    { pos: [halfSize, 0.2, halfSize], label: '4', color: '#8b949e' }
  ], [halfSize]);

  return (
    <>
      {labels.map((item, i) => (
        <AxisLabel
          key={i}
          position={item.pos as [number, number, number]}
          label={item.label}
          color={item.color}
        />
      ))}
    </>
  );
};

interface SceneContentProps {
  primaryData: DistributionData;
  secondaryData?: DistributionData;
  comparisonMode: boolean;
  primaryColor?: string;
  secondaryColor?: string;
}

const SceneContent: React.FC<SceneContentProps> = ({
  primaryData,
  secondaryData,
  comparisonMode,
  primaryColor = '#2196f3',
  secondaryColor = '#FF8C00'
}) => {
  const gridSize = 10;
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      const t = state.clock.elapsedTime;
      lightRef.current.position.x = Math.sin(t * 0.3) * 6;
      lightRef.current.position.z = Math.cos(t * 0.3) * 6;
    }
  });

  const renderDistribution = (data: DistributionData, color: string, isSecondary: boolean) => {
    const opacity = isSecondary ? 0.5 : 0.75;
    const transparent = true;

    if (data.type === 'surface') {
      return (
        <SurfaceMesh
          key={isSecondary ? 'secondary-surface' : 'primary-surface'}
          data={data}
          color={color}
          transparent={transparent}
          opacity={opacity}
        />
      );
    } else {
      const bottomColor = isSecondary ? '#7a4400' : '#004d99';
      const topColor = isSecondary ? '#FF8C00' : '#00e5ff';
      return (
        <group key={isSecondary ? 'secondary-bars' : 'primary-bars'}>
          <BarChart
            data={data}
            colorBottom={bottomColor}
            colorTop={topColor}
            transparent={transparent}
            opacity={opacity}
          />
          {!isSecondary && <BarGlowLights data={data} color={topColor} />}
        </group>
      );
    }
  };

  return (
    <>
      <ambientLight intensity={0.35} color="#ffffff" />

      <directionalLight
        ref={lightRef}
        position={[5, 7, 5]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
      />

      <directionalLight
        position={[-5, 4, -5]}
        intensity={0.4}
        color="#a0c4ff"
      />

      <pointLight position={[0, 6, 0]} intensity={0.6} color="#ffffff" distance={15} decay={1.5} />

      <pointLight position={[-4, 3, 4]} intensity={0.25} color="#58a6ff" distance={12} />

      <Grid
        position={[0, 0, 0]}
        args={[gridSize, gridSize]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#ffffff22"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#ffffff44"
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[gridSize, gridSize]} />
        <meshStandardMaterial
          color="#0d1117"
          transparent
          opacity={0.6}
          roughness={1}
        />
      </mesh>

      <group position={[0, 0.01, 0]}>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={6}
              array={new Float32Array([
                -gridSize / 2, 0, 0, gridSize / 2, 0, 0,
                0, 0, -gridSize / 2, 0, 0, gridSize / 2,
                0, 0, 0, 0, 2.5, 0
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff88" />
        </lineSegments>
      </group>

      <AxesLabels gridSize={gridSize} />

      {renderDistribution(primaryData, primaryColor, false)}

      {comparisonMode && secondaryData && (
        renderDistribution(secondaryData, secondaryColor, true)
      )}

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={18}
        autoRotate={false}
        target={[0, 0.4, 0]}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={0.1}
        enablePan={true}
        panSpeed={0.8}
        zoomSpeed={0.9}
        rotateSpeed={0.8}
      />
    </>
  );
};

interface SceneRendererProps {
  primaryData: DistributionData;
  secondaryData?: DistributionData;
  comparisonMode: boolean;
}

const SceneRenderer: React.FC<SceneRendererProps> = ({
  primaryData,
  secondaryData,
  comparisonMode
}) => {
  return (
    <Canvas
      camera={{ position: [6, 5, 6], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      shadows
      style={{ background: 'linear-gradient(to bottom, #0d1117, #161b22)' }}
    >
      <fog attach="fog" args={['#0d1117', 6, 28]} />
      <SceneContent
        primaryData={primaryData}
        secondaryData={secondaryData}
        comparisonMode={comparisonMode}
      />
    </Canvas>
  );
};

export default SceneRenderer;
