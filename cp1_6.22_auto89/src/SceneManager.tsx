import { OrbitControls, Grid } from '@react-three/drei';
import RoomRenderer from './RoomRenderer';
import type { RoomData } from './types';

interface SceneManagerProps {
  rooms: RoomData[];
  selectedRoomId: string | null;
  onRoomSelect: (room: RoomData | null) => void;
}

export default function SceneManager({ rooms, selectedRoomId, onRoomSelect }: SceneManagerProps) {
  return (
    <>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.05}
      />
      <Grid
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2d3748"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#4a5568"
        fadeDistance={40}
        fadeStrength={1}
        position={[0, 0, 0]}
      />
      <mesh position={[4.5, -0.02, 5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#1a202c" />
      </mesh>
      {rooms.map((room) => (
        <RoomRenderer
          key={room.id}
          room={room}
          isSelected={selectedRoomId === room.id}
          onClick={(r) => onRoomSelect(r)}
        />
      ))}
    </>
  );
}
