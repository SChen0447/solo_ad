import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Building, CityData, GlobalParams, LightMode } from '../types/city';

interface BuildingInstanceProps {
  building: Building;
  baseSize: number;
  gridOffset: number;
  lightMode: LightMode;
  isSelected: boolean;
  onClick: (id: string) => void;
}

const BuildingMesh: React.FC<BuildingInstanceProps> = ({
  building,
  baseSize,
  gridOffset,
  lightMode,
  isSelected,
  onClick,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  const targetHeight = useRef(building.height);
  const currentHeight = useRef(building.height);
  const highlightOpacity = useRef(0);

  const posX = useMemo(
    () => (building.gridX - gridOffset / 2) * baseSize,
    [building.gridX, gridOffset, baseSize]
  );
  const posZ = useMemo(
    () => (building.gridZ - gridOffset / 2) * baseSize,
    [building.gridZ, gridOffset, baseSize]
  );

  useEffect(() => {
    targetHeight.current = building.height;
  }, [building.height]);

  useEffect(() => {
    if (isSelected) {
      building.highlightTime = performance.now();
    }
  }, [isSelected, building]);

  useFrame(() => {
    const now = performance.now();
    const diff = targetHeight.current - currentHeight.current;
    if (Math.abs(diff) > 0.05) {
      currentHeight.current += diff * 0.1;
    } else {
      currentHeight.current = targetHeight.current;
    }

    if (meshRef.current) {
      meshRef.current.scale.y = Math.max(0.01, currentHeight.current / Math.max(1, building.height));
      meshRef.current.position.y = (currentHeight.current * meshRef.current.scale.y) / 2;
    }

    let opacity = 0;
    if (building.highlightTime > 0) {
      const elapsed = now - building.highlightTime;
      if (elapsed < 2000) {
        opacity = 1;
      } else if (elapsed < 2800) {
        opacity = 1 - (elapsed - 2000) / 800;
      } else {
        building.highlightTime = 0;
      }
    }
    if (isSelected) {
      opacity = Math.max(opacity, 1);
    }
    highlightOpacity.current = opacity;

    if (edgesRef.current && edgesRef.current.material instanceof THREE.LineBasicMaterial) {
      edgesRef.current.material.opacity = highlightOpacity.current;
      edgesRef.current.visible = highlightOpacity.current > 0.01;
    }
  });

  const windowMeshes = useMemo(() => {
    if (lightMode !== 'night') return [];
    return building.windowLights.map((wl, i) => {
      const h = currentHeight.current || building.height;
      const winSize = baseSize * wl.size;
      const offsets: { x: number; z: number; rotY: number }[] = [
        { x: 0, z: baseSize / 2 + 0.01, rotY: 0 },
        { x: baseSize / 2 + 0.01, z: 0, rotY: Math.PI / 2 },
        { x: 0, z: -baseSize / 2 - 0.01, rotY: Math.PI },
        { x: -baseSize / 2 - 0.01, z: 0, rotY: -Math.PI / 2 },
      ];
      const off = offsets[wl.face];
      return (
        <mesh
          key={i}
          position={[
            posX + off.x + (wl.u - 0.5) * baseSize * 0.9,
            wl.v * h,
            posZ + off.z + (wl.v - 0.5) * baseSize * 0.9,
          ]}
          rotation={[0, off.rotY, 0]}
        >
          <planeGeometry args={[winSize, winSize * 0.6]} />
          <meshBasicMaterial color="#ffdd66" transparent opacity={0.95} />
        </mesh>
      );
    });
  }, [building.windowLights, lightMode, baseSize, posX, posZ, building.height]);

  const color = useMemo(() => {
    const c = new THREE.Color(building.color);
    if (lightMode === 'night') {
      c.multiplyScalar(0.6);
    }
    return c;
  }, [building.color, lightMode]);

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[posX, building.height / 2, posZ]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick(building.id);
        }}
      >
        <boxGeometry args={[baseSize * 0.92, building.height, baseSize * 0.92]} />
        <meshStandardMaterial color={color} roughness={0.8} metalness={0.1} />
      </mesh>
      <lineSegments ref={edgesRef} position={[posX, building.height / 2, posZ]}>
        <edgesGeometry args={[new THREE.BoxGeometry(baseSize * 0.95, building.height * 1.002, baseSize * 0.95)]} />
        <lineBasicMaterial color="#ffdd00" transparent opacity={0} linewidth={2} />
      </lineSegments>
      {lightMode === 'night' && windowMeshes}
    </group>
  );
};

interface GroundProps {
  gridOffset: number;
  baseSize: number;
  lightMode: LightMode;
}

const Ground: React.FC<GroundProps> = ({ gridOffset, baseSize, lightMode }) => {
  const size = gridOffset * baseSize + 20;
  const groundColor = lightMode === 'night' ? '#1a1a2e' : '#d5d5d5';
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color={groundColor} roughness={0.9} />
    </mesh>
  );
};

interface RoadsProps {
  cityData: CityData;
  globalParams: GlobalParams;
  gridOffset: number;
  lightMode: LightMode;
}

const Roads: React.FC<RoadsProps> = ({ cityData, globalParams, gridOffset, lightMode }) => {
  const roads = useMemo(() => {
    const result: { x: number; z: number; w: number; h: number }[] = [];
    const { width, height, classMap } = cityData;
    const step = Math.max(1, Math.floor(globalParams.roadWidth / globalParams.baseSize));

    for (let z = 0; z < height; z += step) {
      let startX = -1;
      for (let x = 0; x < width; x++) {
        if (classMap[z]?.[x] === 'road') {
          if (startX === -1) startX = x;
        } else {
          if (startX !== -1) {
            result.push({
              x: startX,
              z,
              w: x - startX,
              h: 1,
            });
            startX = -1;
          }
        }
      }
      if (startX !== -1) {
        result.push({
          x: startX,
          z,
          w: width - startX,
          h: 1,
        });
      }
    }
    return result;
  }, [cityData, globalParams.roadWidth, globalParams.baseSize]);

  const roadColor = lightMode === 'night' ? '#2c2c3e' : '#3a3a4a';

  return (
    <group>
      {roads.slice(0, 2000).map((r, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[
            (r.x + r.w / 2 - gridOffset / 2) * globalParams.baseSize,
            0.005,
            (r.z + r.h / 2 - gridOffset / 2) * globalParams.baseSize,
          ]}
          receiveShadow
        >
          <planeGeometry args={[r.w * globalParams.baseSize, r.h * globalParams.baseSize]} />
          <meshStandardMaterial color={roadColor} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

interface SelectionBoxProps {
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
}

const SelectionBoxOverlay: React.FC<SelectionBoxProps> = ({ start, end }) => {
  if (!start || !end) return null;
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  if (width < 3 && height < 3) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        border: '2px solid rgba(100, 200, 255, 0.9)',
        background: 'rgba(100, 200, 255, 0.15)',
        pointerEvents: 'none',
        animation: 'selectFadeIn 0.2s ease-out',
        borderRadius: 2,
        zIndex: 10,
      }}
    />
  );
};

interface CitySceneProps {
  cityData: CityData;
  globalParams: GlobalParams;
  lightMode: LightMode;
  selectedIds: Set<string>;
  onSelectBuilding: (id: string) => void;
  onSelectRegion: (ids: string[]) => void;
  selectionStart: { x: number; y: number } | null;
  selectionEnd: { x: number; y: number } | null;
  setSelectionEnd: (p: { x: number; y: number } | null) => void;
  setIsSelecting: (v: boolean) => void;
}

const CityScene: React.FC<CitySceneProps> = ({
  cityData,
  globalParams,
  lightMode,
  selectedIds,
  onSelectBuilding,
  onSelectRegion,
  selectionStart,
  selectionEnd,
  setSelectionEnd,
  setIsSelecting,
}) => {
  const { camera, gl, size } = useThree();
  const containerRef = useRef<HTMLDivElement>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const isDragging = useRef(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const gridOffset = cityData.width;

  const lights = useMemo(() => {
    if (lightMode === 'sunset') {
      return {
        directional: { color: '#ff9a44', intensity: 1.0, position: [50, 80, 30] as [number, number, number] },
        ambient: { color: '#ffffff', intensity: 0.3 },
        bg: '#1a0f0a',
      };
    }
    return {
      directional: { color: '#4a90d9', intensity: 0.4, position: [-30, 60, -40] as [number, number, number] },
      ambient: { color: '#334466', intensity: 0.1 },
      bg: '#050510',
    };
  }, [lightMode]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      isDragging.current = false;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartPos.current) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      if (!isDragging.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        isDragging.current = true;
        setIsSelecting(true);
        setSelectionEnd({ x: dragStartPos.current.x, y: dragStartPos.current.y });
      }
      if (isDragging.current) {
        setSelectionEnd({ x: e.clientX, y: e.clientY });
      }
    },
    [setIsSelecting, setSelectionEnd]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging.current && selectionStart && selectionEnd) {
        const left = Math.min(selectionStart.x, selectionEnd.x);
        const right = Math.max(selectionStart.x, selectionEnd.x);
        const top = Math.min(selectionStart.y, selectionEnd.y);
        const bottom = Math.max(selectionStart.y, selectionEnd.y);
        const rect = gl.domElement.getBoundingClientRect();

        const ndcLeft = ((left - rect.left) / rect.width) * 2 - 1;
        const ndcRight = ((right - rect.left) / rect.width) * 2 - 1;
        const ndcTop = -((top - rect.top) / rect.height) * 2 + 1;
        const ndcBottom = -((bottom - rect.top) / rect.height) * 2 + 1;

        const selectedIdsArr: string[] = [];
        const bs = globalParams.baseSize;
        const go = gridOffset / 2;

        for (const b of cityData.buildings) {
          const worldPos = new THREE.Vector3(
            (b.gridX - go) * bs,
            b.height / 2,
            (b.gridZ - go) * bs
          );
          const projected = worldPos.project(camera);
          if (
            projected.x >= ndcLeft &&
            projected.x <= ndcRight &&
            projected.y >= ndcBottom &&
            projected.y <= ndcTop &&
            projected.z < 1
          ) {
            selectedIdsArr.push(b.id);
          }
        }
        onSelectRegion(selectedIdsArr);
      }
      isDragging.current = false;
      dragStartPos.current = null;
      setIsSelecting(false);
      setSelectionEnd(null);
    },
    [selectionStart, selectionEnd, gl, camera, cityData.buildings, globalParams.baseSize, gridOffset, onSelectRegion, setIsSelecting, setSelectionEnd]
  );

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <color attach="background" args={[lights.bg]} />
      <fog attach="fog" args={[lights.bg, 200, 600]} />

      <ambientLight color={lights.ambient.color} intensity={lights.ambient.intensity} />
      <directionalLight
        color={lights.directional.color}
        intensity={lights.directional.intensity}
        position={lights.directional.position}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={500}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-bias={-0.0005}
      />
      {lightMode === 'sunset' && (
        <directionalLight
          color="#ffaa66"
          intensity={0.4}
          position={[-60, 40, -50]}
        />
      )}

      <Ground gridOffset={gridOffset} baseSize={globalParams.baseSize} lightMode={lightMode} />
      <Roads cityData={cityData} globalParams={globalParams} gridOffset={gridOffset} lightMode={lightMode} />

      {cityData.buildings.slice(0, 20000).map((b) => (
        <BuildingMesh
          key={b.id}
          building={b}
          baseSize={globalParams.baseSize}
          gridOffset={gridOffset}
          lightMode={lightMode}
          isSelected={selectedIds.has(b.id)}
          onClick={onSelectBuilding}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.2}
        minDistance={5}
        maxDistance={200}
        target={[0, 20, 0]}
        maxPolarAngle={Math.PI / 2.1}
      />

      <SelectionBoxOverlay start={selectionStart} end={selectionEnd} />
    </div>
  );
};

interface CityBuilderProps {
  cityData: CityData;
  globalParams: GlobalParams;
  lightMode: LightMode;
  selectedIds: Set<string>;
  onSelectBuilding: (id: string, additive?: boolean) => void;
  onSelectRegion: (ids: string[], additive?: boolean) => void;
}

export const CityBuilder: React.FC<CityBuilderProps> = ({
  cityData,
  globalParams,
  lightMode,
  selectedIds,
  onSelectBuilding,
  onSelectRegion,
}) => {
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelectBuilding = useCallback(
    (id: string) => {
      if (!isSelecting) {
        onSelectBuilding(id);
      }
    },
    [isSelecting, onSelectBuilding]
  );

  const handleSelectRegion = useCallback(
    (ids: string[]) => {
      onSelectRegion(ids);
    },
    [onSelectRegion]
  );

  const wrapPointerDown = (e: React.PointerEvent) => {
    if (e.button === 0) {
      setSelectionStart({ x: e.clientX, y: e.clientY });
    }
  };

  const wrapPointerUp = (e: React.PointerEvent) => {
    if (e.button === 0) {
      setSelectionStart(null);
    }
  };

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onPointerDown={wrapPointerDown}
      onPointerUp={wrapPointerUp}
    >
      <Canvas
        shadows
        camera={{ position: [120, 100, 120], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, pixelRatio: Math.min(window.devicePixelRatio, 2) }}
        style={{ width: '100%', height: '100%' }}
      >
        <CityScene
          cityData={cityData}
          globalParams={globalParams}
          lightMode={lightMode}
          selectedIds={selectedIds}
          onSelectBuilding={handleSelectBuilding}
          onSelectRegion={handleSelectRegion}
          selectionStart={selectionStart}
          selectionEnd={selectionEnd}
          setSelectionEnd={setSelectionEnd}
          setIsSelecting={setIsSelecting}
        />
      </Canvas>
    </div>
  );
};
