/// <reference types="@react-three/fiber" />
import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
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
        metalness={0.1}
        roughness={0.6}
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
      barCount: data.bars.length,
      barWidth: data.barWidth,
      barDepth: data.barDepth,
      maxY: data.maxDensity
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
        metalness={0.2}
        roughness={0.5}
      />
    </instancedMesh>
  );
};

const BarGlowLights: React.FC<{ data: BarData; color: string }> = ({ data, color }) => {
  return (
    <>
      {data.bars.slice(0, 50).map((bar, i) => (
        <pointLight
          key={i}
          position={[bar.x, bar.y + 0.05, bar.z]}
          color={color}
          intensity={0.3}
          distance={1}
        />
      ))}
    </>
  );
};

interface GridFloorProps {
  size: number;
  divisions: number;
}

const GridFloor: React.FC<GridFloorProps> = ({ size, divisions }) => {
  return (
    <gridHelper
      args={[size, divisions, 0xffffff33, 0xffffff11]}
      position={[0, 0, 0]}
    />
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
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#ffffff" />

      <GridFloor size={gridSize} divisions={10} />

      {renderDistribution(primaryData, primaryColor, false)}

      {comparisonMode && secondaryData && (
        renderDistribution(secondaryData, secondaryColor, true)
      )}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={20}
        autoRotate={false}
        target={[0, 0.3, 0]}
        maxPolarAngle={Math.PI / 2.2}
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
      style={{ background: 'linear-gradient(to bottom, #0d1117, #161b22)' }}
    >
      <fog attach="fog" args={['#0d1117', 8, 25]} />
      <SceneContent
        primaryData={primaryData}
        secondaryData={secondaryData}
        comparisonMode={comparisonMode}
      />
    </Canvas>
  );
};

export default SceneRenderer;
