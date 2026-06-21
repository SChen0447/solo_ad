import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getCityThreeColor } from '../utils/colorUtils';
import type { CityData, WeatherField, DetailCardInfo, MonthlyRecord } from '../types/DataTypes';

interface CurveRendererProps {
  cities: CityData[];
  weatherField: WeatherField;
  currentMonth: number;
  onNodeClick: (info: DetailCardInfo) => void;
  valueRange: [number, number];
}

const SCENE_WIDTH = 22;
const SCENE_HEIGHT = 12;
const X_OFFSET = -11;
const Y_OFFSET = -4;

function mapX(month: number): number {
  return X_OFFSET + ((month - 1) / 11) * SCENE_WIDTH;
}

function mapY(value: number, min: number, max: number): number {
  if (max === min) return Y_OFFSET;
  return Y_OFFSET + ((value - min) / (max - min)) * SCENE_HEIGHT;
}

const CityCurve: React.FC<{
  city: CityData;
  weatherField: WeatherField;
  currentMonth: number;
  onNodeClick: (info: DetailCardInfo) => void;
  valueRange: [number, number];
}> = ({ city, weatherField, currentMonth, onNodeClick, valueRange }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [min, max] = valueRange;

  const points = useMemo(() => {
    return city.records.map((r) => {
      const val = r[weatherField] as number;
      return new THREE.Vector3(mapX(r.month), mapY(val, min, max), 0);
    });
  }, [city, weatherField, min, max]);

  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }, [points]);

  const tubeGeometry = useMemo(() => {
    const tubeSegments = 120;
    const radius = 0.08;
    const radialSegments = 8;
    return new THREE.TubeGeometry(curve, tubeSegments, radius, radialSegments, false);
  }, [curve]);

  const color = useMemo(() => {
    const c = getCityThreeColor(city.index);
    return new THREE.Color(c.r, c.g, c.b);
  }, [city.index]);

  const nodePositions = useMemo(() => {
    return city.records.map((r) => {
      const val = r[weatherField] as number;
      return [mapX(r.month), mapY(val, min, max), 0] as [number, number, number];
    });
  }, [city, weatherField, min, max]);

  return (
    <group ref={groupRef}>
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      {city.records.map((record, i) => {
        const isActive = currentMonth === record.month;
        const prevValue = i > 0 ? (city.records[i - 1][weatherField] as number) : (record[weatherField] as number);
        const change = (record[weatherField] as number) - prevValue;
        const changePercent = prevValue !== 0 ? (change / Math.abs(prevValue)) * 100 : 0;

        return (
          <CityNode
            key={`${city.id}-${i}`}
            position={nodePositions[i]}
            color={color}
            city={city}
            record={record}
            isActive={isActive}
            weatherField={weatherField}
            change={change}
            changePercent={changePercent}
            onClick={onNodeClick}
          />
        );
      })}
    </group>
  );
};

const CityNode: React.FC<{
  position: [number, number, number];
  color: THREE.Color;
  city: CityData;
  record: MonthlyRecord;
  isActive: boolean;
  weatherField: WeatherField;
  change: number;
  changePercent: number;
  onClick: (info: DetailCardInfo) => void;
}> = ({ position, color, city, record, isActive, weatherField, change, changePercent, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const baseScale = 0.18;
  const targetScale = isActive ? baseScale * 1.8 : baseScale;
  const targetOpacity = isActive ? 1 : 0.6;

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1
      );
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.1);
    }
  });

  const handleClick = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    onClick({
      cityId: city.id,
      cityName: city.name,
      month: record.month,
      value: record[weatherField] as number,
      change,
      changePercent,
      event: record.event || undefined,
      position,
    });
  };

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={handleClick}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={isActive ? '#ffffff' : color}
          emissive={isActive ? '#ffffff' : color}
          emissiveIntensity={isActive ? 0.8 : 0.3}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh ref={glowRef} scale={[2.5, 2.5, 2.5]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
    </group>
  );
};

const CurveRenderer: React.FC<CurveRendererProps> = ({
  cities,
  weatherField,
  currentMonth,
  onNodeClick,
  valueRange,
}) => {
  return (
    <group>
      {cities.map((city) => (
        <CityCurve
          key={city.id}
          city={city}
          weatherField={weatherField}
          currentMonth={currentMonth}
          onNodeClick={onNodeClick}
          valueRange={valueRange}
        />
      ))}
    </group>
  );
};

export default CurveRenderer;
