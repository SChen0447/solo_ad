import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getCityThreeColor, getCityColor } from '../utils/colorUtils';
import type { CityData, WeatherField, DetailCardInfo, MonthlyRecord } from '../types/DataTypes';

interface BarRendererProps {
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

function mapX(month: number, cityCount: number, cityIndex: number): number {
  const monthWidth = SCENE_WIDTH / 12;
  const barGroupX = X_OFFSET + (month - 0.5) * monthWidth;
  const totalBarWidth = monthWidth * 0.75;
  const barWidth = totalBarWidth / cityCount;
  const offset = (cityIndex - (cityCount - 1) / 2) * barWidth;
  return barGroupX + offset;
}

function mapY(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return ((value - min) / (max - min)) * SCENE_HEIGHT;
}

const CityBar: React.FC<{
  city: CityData;
  cityIndex: number;
  cityCount: number;
  weatherField: WeatherField;
  currentMonth: number;
  onNodeClick: (info: DetailCardInfo) => void;
  valueRange: [number, number];
}> = ({ city, cityIndex, cityCount, weatherField, currentMonth, onNodeClick, valueRange }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [min, max] = valueRange;
  const hexColor = getCityColor(city.index);

  const barWidth = useMemo(() => {
    const monthWidth = SCENE_WIDTH / 12;
    return (monthWidth * 0.75) / cityCount * 0.8;
  }, [cityCount]);

  return (
    <group ref={groupRef}>
      {city.records.map((record, i) => {
        const val = record[weatherField] as number;
        const barHeight = Math.max(0.05, mapY(val, min, max));
        const x = mapX(record.month, cityCount, cityIndex);
        const isActive = currentMonth === record.month;
        const targetOpacity = isActive ? 1.0 : 0.25;
        const prevValue = i > 0 ? (city.records[i - 1][weatherField] as number) : val;
        const change = val - prevValue;
        const changePercent = prevValue !== 0 ? (change / Math.abs(prevValue)) * 100 : 0;

        return (
          <SingleBar
            key={`${city.id}-${i}`}
            position={[x, Y_OFFSET + barHeight / 2, 0]}
            width={barWidth}
            height={barHeight}
            hexColor={hexColor}
            cityIndex={city.index}
            isActive={isActive}
            targetOpacity={targetOpacity}
            city={city}
            record={record}
            weatherField={weatherField}
            change={change}
            changePercent={changePercent}
            onNodeClick={onNodeClick}
            valueRange={valueRange}
          />
        );
      })}
    </group>
  );
};

const SingleBar: React.FC<{
  position: [number, number, number];
  width: number;
  height: number;
  hexColor: string;
  cityIndex: number;
  isActive: boolean;
  targetOpacity: number;
  city: CityData;
  record: MonthlyRecord;
  weatherField: WeatherField;
  change: number;
  changePercent: number;
  onNodeClick: (info: DetailCardInfo) => void;
  valueRange: [number, number];
}> = ({
  position,
  width,
  height,
  hexColor,
  cityIndex,
  isActive,
  targetOpacity,
  city,
  record,
  weatherField,
  change,
  changePercent,
  onNodeClick,
  valueRange,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const currentOpacity = useRef(targetOpacity);

  useFrame(() => {
    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, 0.1);
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = currentOpacity.current;
    }
  });

  const gradientMaterial = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 256, 0, 0);
    gradient.addColorStop(0, hexColor + '40');
    gradient.addColorStop(1, hexColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 256);
    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: targetOpacity,
      side: THREE.DoubleSide,
    });
  }, [hexColor]);

  const handleClick = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    const [min] = valueRange;
    onNodeClick({
      cityId: city.id,
      cityName: city.name,
      month: record.month,
      value: record[weatherField] as number,
      change,
      changePercent,
      event: record.event || undefined,
      position: [position[0], position[1] + height / 2 + 0.3, position[2] + 0.5],
    });
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      material={gradientMaterial}
      onClick={handleClick}
    >
      <boxGeometry args={[width, height, 0.4]} />
    </mesh>
  );
};

const BarRenderer: React.FC<BarRendererProps> = ({
  cities,
  weatherField,
  currentMonth,
  onNodeClick,
  valueRange,
}) => {
  return (
    <group>
      {cities.map((city, idx) => (
        <CityBar
          key={city.id}
          city={city}
          cityIndex={idx}
          cityCount={cities.length}
          weatherField={weatherField}
          currentMonth={currentMonth}
          onNodeClick={onNodeClick}
          valueRange={valueRange}
        />
      ))}
    </group>
  );
};

export default BarRenderer;
