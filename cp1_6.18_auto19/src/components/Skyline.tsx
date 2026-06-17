import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkylinePoint, BuildingData } from '../types';
import { generateSmoothSkylinePoints, formatHeightLabel, interpolateHeights } from '../utils/skylineUtils';
import { useSceneStore } from '../store/useSceneStore';
import { getBuildingHeight } from '../utils/buildingUtils';

interface SkylineProps {
  controlPoints: SkylinePoint[];
  buildings: BuildingData[];
  streetWidth: number;
  skylineOffset: number;
}

export function Skyline({ controlPoints, buildings, streetWidth, skylineOffset }: SkylineProps) {
  const lineRef = useRef<THREE.Line>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const setBuildings = useSceneStore((state) => state.setBuildings);
  const triggerRebuild = useSceneStore((state) => state.triggerRebuild);

  useFrame((state) => {
    if (lineRef.current) {
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const { curveGeometry, labelPositions } = useMemo(() => {
    const leftPoints = controlPoints.filter((p) => {
      const building = buildings.find((b) => b.id === p.buildingId);
      return building && building.z < 0;
    });

    const rightPoints = controlPoints.filter((p) => {
      const building = buildings.find((b) => b.id === p.buildingId);
      return building && building.z > 0;
    });

    const leftCurvePoints = generateSmoothSkylinePoints(leftPoints, 50);
    const rightCurvePoints = generateSmoothSkylinePoints(rightPoints, 50);

    const leftCurveZ = -streetWidth / 2 - 3;
    const rightCurveZ = streetWidth / 2 + 3;

    const allCurvePoints = [
      ...leftCurvePoints.map((p) => new THREE.Vector3(p.x, p.y + skylineOffset, leftCurveZ)),
      ...rightCurvePoints.map((p) => new THREE.Vector3(p.x, p.y + skylineOffset, rightCurveZ))
    ];

    const positions = new Float32Array(allCurvePoints.length * 3);
    allCurvePoints.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const labels = controlPoints.map((point) => {
      const building = buildings.find((b) => b.id === point.buildingId);
      const zOffset = building && building.z > 0 ? streetWidth / 2 + 3 : -streetWidth / 2 - 3;
      return {
        x: point.x,
        y: point.height + skylineOffset + 1.5,
        z: zOffset,
        text: formatHeightLabel(point.height + skylineOffset)
      };
    });

    return { curveGeometry: geometry, labelPositions: labels };
  }, [controlPoints, buildings, streetWidth, skylineOffset]);

  const handlePointDrag = (index: number, newY: number) => {
    const newHeight = Math.max(8.4, Math.min(90, newY - skylineOffset));
    const updatedBuildings = interpolateHeights(controlPoints, buildings, index, newHeight);
    setBuildings(updatedBuildings);
    triggerRebuild();
  };

  return (
    <group>
      <line ref={lineRef} geometry={curveGeometry}>
        <lineBasicMaterial
          color="#9d4edd"
          transparent
          opacity={0.7}
          linewidth={3}
        />
      </line>

      {controlPoints.map((point, index) => {
        const building = buildings.find((b) => b.id === point.buildingId);
        const zOffset = building && building.z > 0 ? streetWidth / 2 + 3 : -streetWidth / 2 - 3;
        const isDragging = draggedIndex === index;

        return (
          <group key={point.buildingId} position={[point.x, point.height + skylineOffset, zOffset]}>
            <mesh
              onPointerDown={(e