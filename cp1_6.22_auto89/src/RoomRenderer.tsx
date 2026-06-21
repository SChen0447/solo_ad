import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RoomData } from './types';

interface RoomRendererProps {
  room: RoomData;
  isSelected: boolean;
  onClick: (room: RoomData) => void;
}

const WALL_HEIGHT = 3;
const WALL_THICKNESS = 0.1;
const DOOR_WIDTH = 1.2;
const FLOOR_COLOR_DEFAULT = '#63b3ed';
const FLOOR_COLOR_SELECTED = '#f6ad55';
const WALL_COLOR = '#ffffff';
const DOOR_MARKER_COLOR = '#fefcbf';

function pointNearSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tolerance: number = 0.05,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return false;
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;
  const dist = Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
  return dist < tolerance;
}

function splitSegmentWithDoor(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  doorX: number,
  doorY: number,
): Array<{ sx: number; sy: number; ex: number; ey: number }> {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return [];
  const ux = dx / len;
  const uy = dy / len;
  let t = ((doorX - x1) * ux + (doorY - y1) * uy) / len;
  t = Math.max(0, Math.min(1, t));
  const halfDoorT = DOOR_WIDTH / 2 / len;
  const tDoorStart = Math.max(0, t - halfDoorT);
  const tDoorEnd = Math.min(1, t + halfDoorT);
  const segments: Array<{ sx: number; sy: number; ex: number; ey: number }> = [];
  if (tDoorStart > 0.001) {
    segments.push({
      sx: x1,
      sy: y1,
      ex: x1 + ux * len * tDoorStart,
      ey: y1 + uy * len * tDoorStart,
    });
  }
  if (tDoorEnd < 0.999) {
    segments.push({
      sx: x1 + ux * len * tDoorEnd,
      sy: y1 + uy * len * tDoorEnd,
      ex: x2,
      ey: y2,
    });
  }
  return segments;
}

export default function RoomRenderer({ room, isSelected, onClick }: RoomRendererProps) {
  const floorRef = useRef<THREE.Mesh>(null);
  const currentColor = useRef(new THREE.Color(FLOOR_COLOR_DEFAULT));
  const targetColor = useRef(new THREE.Color(isSelected ? FLOOR_COLOR_SELECTED : FLOOR_COLOR_DEFAULT));

  const { floorShape, wallSegments, doorCenter } = useMemo(() => {
    const pts = room.polygon;
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i][0], pts[i][1]);
    }
    shape.closePath();

    const [doorX, doorY] = room.doorPosition;
    const walls: Array<{ sx: number; sy: number; ex: number; ey: number }> = [];

    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      if (pointNearSegment(doorX, doorY, x1, y1, x2, y2, 0.2)) {
        const segs = splitSegmentWithDoor(x1, y1, x2, y2, doorX, doorY);
        walls.push(...segs);
      } else {
        walls.push({ sx: x1, sy: y1, ex: x2, ey: y2 });
      }
    }

    return { floorShape: shape, wallSegments: walls, doorCenter: [doorX, doorY] as [number, number] };
  }, [room]);

  useFrame(() => {
    if (floorRef.current) {
      targetColor.current.set(isSelected ? FLOOR_COLOR_SELECTED : FLOOR_COLOR_DEFAULT);
      currentColor.current.lerp(targetColor.current, 0.15);
      const mat = floorRef.current.material as THREE.MeshStandardMaterial;
      mat.color.copy(currentColor.current);
    }
  });

  return (
    <group>
      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick(room);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <shapeGeometry args={[floorShape]} />
        <meshStandardMaterial
          color={FLOOR_COLOR_DEFAULT}
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>

      {wallSegments.map((seg, idx) => {
        const dx = seg.ex - seg.sx;
        const dy = seg.ey - seg.sy;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 0.001) return null;
        const angle = Math.atan2(dy, dx);
        const cx = (seg.sx + seg.ex) / 2;
        const cy = (seg.sy + seg.ey) / 2;
        return (
          <mesh
            key={`wall-${room.id}-${idx}`}
            position={[cx, WALL_HEIGHT / 2, cy]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[length, WALL_HEIGHT, WALL_THICKNESS]} />
            <meshStandardMaterial
              color={WALL_COLOR}
              transparent
              opacity={0.35}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      <mesh position={[doorCenter[0], 0.05, doorCenter[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.4, 32]} />
        <meshBasicMaterial color={DOOR_MARKER_COLOR} transparent opacity={0.9} />
      </mesh>
      <pointLight
        position={[doorCenter[0], 0.6, doorCenter[1]]}
        color={DOOR_MARKER_COLOR}
        intensity={0.8}
        distance={2}
      />
    </group>
  );
}
