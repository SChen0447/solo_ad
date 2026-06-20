import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  PlantInstance,
  PlantStructure,
  PlantType,
  RenderData,
  generatePlantStructure,
  buildRenderData,
  generatePlantDistribution,
  applyEnvironmentToParams,
  GROWTH_TOTAL_FRAMES,
  computePlantHeight,
  computeEnvScoreForPlant,
} from './plantEngine';
import { SceneId, SCENE_PRESETS, hexToThreeColor } from './dataManager';
import { useEnv } from './envPanel';

const GROUND_SIZE = 50;
const HALF_GROUND = GROUND_SIZE / 2;

interface PlantRenderProps {
  plants: PlantInstance[];
  currentFrame: number;
  onPlantClick: (data: {
    id: string;
    type: PlantType;
    height: number;
    branchLevels: number;
    envScore: number;
    screenX: number;
    screenY: number;
  }) => void;
}

const TYPE_LABELS: Record<PlantType, string> = {
  tree: '🌳 乔木',
  shrub: '🌿 灌木',
  grass: '🌾 草本',
};

class PlantRenderer: React.FC<PlantRenderProps> = ({ plants, currentFrame, onPlantClick }) => {
  const { smoothedEnv, currentScene } = useEnv();
  const stemMeshRef = useRef<THREE.InstancedMesh>(null);
  const leafMeshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const archetypeCache = useMemo(() => {
    const types: PlantType[] = ['tree', 'shrub', 'grass'];
    const cache = new Map<string, { structure: PlantStructure }>();

    types.forEach((type) => {
      const sceneDist = SCENE_PRESETS[currentScene].plantDistribution;
      const typeWeight = sceneDist[type];
      if (typeWeight <= 0) return;

      const variants = type === 'tree' ? 3 : type === 'shrub' ? 2 : 1;
      for (let v = 0; v < variants; v++) {
        const baseKey = `${type}_base_${v}`;
        const params = {
          branchAngle: type === 'tree' ? 22 + v * 3 : type === 'shrub' ? 38 + v * 4 : 14 + v,
          internodeLength: type === 'tree' ? 1.15 : type === 'shrub' ? 0.7 : 0.4,
          leafCount: type === 'tree' ? 5 : type === 'shrub' ? 8 : 3,
          recursionDepth: type === 'tree' ? 4 : type === 'shrub' ? 3 : 2,
          thicknessRatio: type === 'tree' ? 0.7 : type === 'shrub' ? 0.65 : 0.8,
        };
        const structure = generatePlantStructure(type, params);
        cache.set(baseKey, { structure });
      }
    });

    return cache;
  }, [currentScene]);

  const archetypeMap = useMemo(() => {
    const map = new Map<string, PlantStructure>();
    plants.forEach((p) => {
      const structure = generatePlantStructure(p.type, p.params);
      map.set(p.id, structure);
    });
    return map;
  }, [plants]);

  const renderCache = useRef<Map<string, RenderData>>(new Map());
  const spawnStart = useRef<number>(performance.now());

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      const instanceId = e.instanceId as number;
      if (instanceId == null || instanceId < 0) return;
      const plant = plants[instanceId];
      if (!plant) return;

      const structure = archetypeMap.get(plant.id);
      if (!structure) return;

      const elapsed = (performance.now() - spawnStart.current) / 1000;
      const delay = plant.spawnDelay;
      const effFrame = elapsed < delay ? 0 : currentFrame;

      const height = computePlantHeight(structure, plant.scale, effFrame);
      const score = computeEnvScoreForPlant(plant, smoothedEnv);

      const v = new THREE.Vector3(plant.position[0], height + 1, plant.position[2]);
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight;

      onPlantClick({
        id: plant.id,
        type: plant.type,
        height,
        branchLevels: structure.branchLevels,
        envScore: score,
        screenX: x,
        screenY: y,
      });
    },
    [plants, archetypeMap, currentFrame, camera, smoothedEnv, onPlantClick]
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
  });

  const totalLeavesStem = useMemo(() => {
    const maxInstances = plants.length;
    const dummy = new THREE.Object3D();

    const stemGeos: THREE.BufferGeometry[] = [];
    const leafGeos: THREE.BufferGeometry[] = [];

    return { maxInstances, dummy, stemGeos, leafGeos };
  }, [plants.length]);

  useFrame(({ clock }) => {
    if (!stemMeshRef.current || !leafMeshRef.current) return;

    const elapsed = clock.getElapsedTime();

    for (let i = 0; i < plants.length; i++) {
      const plant = plants[i];
      const structure = archetypeMap.get(plant.id);
      if (!structure) continue;

      const effFrame =
        elapsed < plant.spawnDelay
          ? 0
          : currentFrame;

      const data = buildRenderData(structure, effFrame);

      const fadeT = Math.max(0, Math.min(1, (elapsed - plant.spawnDelay) / 0.5);
      const scale = plant.scale * fadeT;

      totalLeavesStem.dummy.position.set(
        plant.position[0], plant.position[1], plant.position[2]
      );
      totalLeavesStem.dummy.rotation.y = plant.rotation;
      totalLeavesStem.dummy.scale.set(scale, scale, scale);
      totalLeavesStem.dummy.updateMatrix();

      stemMeshRef.current.setMatrixAt(i, totalLeavesStem.dummy.matrix);
      leafMeshRef.current.setMatrixAt(i, totalLeavesStem.dummy.matrix);
    }

    stemMeshRef.current.instanceMatrix.needsUpdate = true;
    leafMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  const referenceStructure = useMemo(() => {
    const anyPlant = plants[0];
    if (!anyPlant) return null;
    return generatePlantStructure(anyPlant.type, anyPlant.params);
  }, [plants]);

  const referenceRender = useMemo(() => {
    if (!referenceStructure) return null;
    return buildRenderData(referenceStructure, GROWTH_TOTAL_FRAMES);
  }, [referenceStructure]);

  if (!referenceRender || plants.length === 0) return null;

  const stemGeo = new THREE.BufferGeometry();
  stemGeo.setAttribute('position', new THREE.BufferAttribute(referenceRender.stemPositions, 3));
  stemGeo.setAttribute('normal', new THREE.BufferAttribute(referenceRender.stemNormals, 3));
  stemGeo.setAttribute('color', new THREE.BufferAttribute(referenceRender.stemColors, 3));
  stemGeo.setIndex(new THREE.BufferAttribute(referenceRender.stemIndices, 1));

  const leafGeo = new THREE.BufferGeometry();
  leafGeo.setAttribute('position', new THREE.BufferAttribute(referenceRender.leafPositions, 3));
  leafGeo.setAttribute('normal', new THREE.BufferAttribute(referenceRender.leafNormals, 3));
  leafGeo.setAttribute('color', new THREE.BufferAttribute(referenceRender.leafColors, 3));
  leafGeo.setIndex(new THREE.BufferAttribute(referenceRender.leafIndices, 1));

  const plantCount = plants.length;

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={stemMeshRef}
        args={[stemGeo, undefined, plantCount]}
        onPointerDown={handleClick}
        castShadow
      >
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.85}
          metalness={0.05}
        />
      </instancedMesh>
      <instancedMesh
        ref={leafMeshRef}
        args={[leafGeo, undefined, plantCount]}
        onPointerDown={handleClick}
        castShadow
      >
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.75}
          metalness={0.02}
          transparent
          opacity={0.95}
        />
      </instancedMesh>
    </group>
  );
};

const IndividualPlant: React.FC<{
  plant: PlantInstance;
  structure: PlantStructure;
  currentFrame: number;
  onClick: (data: any) => void;
  spawnStart: number;
}> = ({ plant, structure, currentFrame, onClick, spawnStart }) => {
  const stemRef = useRef<THREE.Mesh>(null);
  const leafRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const { smoothedEnv } = useEnv();
  const spawned = useRef(false);

  const renderData = useMemo(() => buildRenderData(structure, currentFrame), [structure, currentFrame]);

  const stemGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(renderData.stemPositions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(renderData.stemNormals, 3));
    g.setAttribute('color', new THREE.BufferAttribute(renderData.stemColors, 3));
    g.setIndex(new THREE.BufferAttribute(renderData.stemIndices, 1));
    return g;
  }, [renderData]);

  const leafGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(renderData.leafPositions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(renderData.leafNormals, 3));
    g.setAttribute('color', new THREE.BufferAttribute(renderData.leafColors, 3));
    g.setIndex(new THREE.BufferAttribute(renderData.leafIndices, 1));
    return g;
  }, [renderData]);

  const fadeRef = useRef(0);
  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const fadeT = Math.max(0, Math.min(1, (elapsed - spawnStart - plant.spawnDelay) / 0.5));
    fadeRef.current = fadeT;

    if (stemRef.current) {
      const m = stemRef.current.material as THREE.MeshStandardMaterial;
      if (m && m.opacity !== fadeT) {
        m.opacity = fadeT;
        m.transparent = fadeT < 1;
        m.needsUpdate = true;
      }
    }
    if (leafRef.current) {
      const m = leafRef.current.material as THREE.MeshStandardMaterial;
      if (m) {
        m.opacity = fadeT;
        m.transparent = fadeT < 1;
        m.needsUpdate = true;
      }
    }
  });

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      const height = computePlantHeight(structure, plant.scale, currentFrame);
      const score = computeEnvScoreForPlant(plant, smoothedEnv);

      const v = new THREE.Vector3(plant.position[0], Math.max(0.5, height), plant.position[2]);
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight;

      onClick({
        id: plant.id,
        type: plant.type,
        typeLabel: TYPE_LABELS[plant.type],
        height,
        branchLevels: structure.branchLevels,
        envScore: score,
        screenX: x,
        screenY: y,
      });
    },
    [plant, structure, currentFrame, camera, smoothedEnv, onClick]
  );

  const s = plant.scale;

  return (
    <group
      position={[plant.position[0], plant.position[1], plant.position[2]]}
      rotation={[0, plant.rotation, 0]}
      scale={[s, s, s]}
    >
      <mesh ref={stemRef} geometry={stemGeo} onPointerDown={handleClick} castShadow>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh ref={leafRef} geometry={leafGeo} onPointerDown={handleClick} castShadow>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.75} metalness={0.02} transparent opacity={1} />
      </mesh>
    </group>
  );
};

const PlantForest: React.FC<{
  plants: PlantInstance[];
  currentFrame: number;
  onPlantClick: (data: any) => void;
}> = ({ plants, currentFrame, onPlantClick }) => {
  const spawnStartRef = useRef(performance.now() / 1000);

  const plantData = useMemo(() => {
    return plants.map((p) => ({
      plant: p,
      structure: generatePlantStructure(p.type, p.params),
    }));
  }, [plants]);

  return (
    <group>
      {plantData.map(({ plant, structure }, idx) => (
        <IndividualPlant
          key={plant.id}
          plant={plant}
          structure={structure}
          currentFrame={currentFrame}
          onClick={onPlantClick}
          spawnStart={spawnStartRef.current + idx * 0.001}
        />
      ))}
    </group>
  );
};

const Ground: React.FC<{ groundColor: string }> = ({ groundColor }) => {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const targetColor = useRef(new THREE.Color(groundColor));
  const currentColor = useRef(new THREE.Color(groundColor));

  useEffect(() => {
    targetColor.current = new THREE.Color(groundColor);
  }, [groundColor]);

  useFrame((_, delta) => {
    if (!materialRef.current) return;
    currentColor.current.lerp(targetColor.current, Math.min(1, delta * 2));
    materialRef.current.color.copy(currentColor.current);
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE, 1, 1]} />
        <meshStandardMaterial ref={materialRef} color={groundColor} roughness={0.95} metalness={0.02} />
      </mesh>
      <gridHelper
        args={[GROUND_SIZE, 50, '#3a3a3a', '#3a3a3a']}
        position={[0, 0.01, 0]}
      >
        <meshBasicMaterial
          attach="material"
          transparent
          opacity={0.1}
          color="#3a3a3a"
        />
      </gridHelper>
    </group>
  );
};

const River: React.FC = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0.3]} position={[0, 0.02, 0]}>
      <planeGeometry args={[1.8, GROUND_SIZE * 1.2, 1, 1]} />
      <meshStandardMaterial
        color="#1e6091"
        transparent
        opacity={0.55}
        roughness={0.1}
        metalness={0.3}
      />
    </mesh>
  );
};

const GrowthDriver: React.FC<{ onFrame: (frame: number) => void }> = ({ onFrame }) => {
  const { paused, growthFrame, setGrowthFrame } = useEnv();
  const lastTick = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const dt = t - lastTick.current;
    lastTick.current = t;

    if (!paused && growthFrame < GROWTH_TOTAL_FRAMES) {
      const speed = 1.0;
      const increment = dt * 60 * speed * (1 / 60);
      const newFrame = Math.min(GROWTH_TOTAL_FRAMES, growthFrame + increment * 60);
      setGrowthFrame(newFrame);
      onFrame(Math.floor(newFrame));
    } else {
      onFrame(Math.floor(growthFrame));
    }
  });

  return null;
};

const SceneLighting: React.FC = () => {
  const { smoothedEnv } = useEnv();

  const lightIntensity = 0.5 + smoothedEnv.light * 0.5;
  const tempT = (smoothedEnv.temperature - 5) / 35;
  const lightColor = new THREE.Color().setHSL(0.12 - tempT * 0.05, 0.6, 0.6);

  return (
    <>
      <ambientLight intensity={0.4} color={lightColor} />
      <directionalLight
        position={[22, 35, 25]}
        intensity={0.75 * lightIntensity}
        color={lightColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-HALF_GROUND}
        shadow-camera-right={HALF_GROUND}
        shadow-camera-top={HALF_GROUND}
        shadow-camera-bottom={-HALF_GROUND}
      />
      <directionalLight position={[-18, 22, -15]} intensity={0.3 * lightIntensity} color="#c4e0ff" />
      <hemisphereLight args={['#87ceeb', '#556633', 0.35]} />
    </>
  );
};

const SceneFog: React.FC = () => {
  const { scene } = useThree();
  const { currentScene } = useEnv();
  const fogRef = useRef<THREE.Fog>(
    new THREE.Fog('#0a0a1a', 35, 75)
  );

  useEffect(() => {
    scene.fog = fogRef.current;
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  return null;
};

interface SceneProps {
  plants: PlantInstance[];
  groundColor: string;
  onPlantClick: (data: any) => void;
}

export const SceneInner: React.FC<SceneProps> = ({ plants, groundColor, onPlantClick }) => {
  const [frame, setFrame] = useState(0);

  return (
    <>
      <SceneFog />
      <SceneLighting />
      <GrowthDriver onFrame={setFrame} />
      <Ground groundColor={groundColor} />
      <River />
      <PlantForest plants={plants} currentFrame={frame} onPlantClick={onPlantClick} />
      <OrbitControls
        enableDamping
        dampingFactor={0.8}
        minDistance={5}
        maxDistance={40}
        enablePan={true}
        panSpeed={0.6}
        rotateSpeed={0.6}
        zoomSpeed={0.7}
        target={[0, 2, 0]}
      />
    </>
  );
};

interface SceneSetupProps {
  sceneId: SceneId;
  onPlantInfo: (info: any) => void;
  onPlantClick: (info: any) => void;
  regenKey: number;
}

export const SceneSetup: React.FC<SceneSetupProps> = ({ sceneId, onPlantInfo, onPlantClick, regenKey }) => {
  const { smoothedEnv, growthFrame } = useEnv();
  const [plants, setPlants] = useState<PlantInstance[]>([]);

  const preset = SCENE_PRESETS[sceneId];

  useEffect(() => {
    const newPlants = generatePlantDistribution(smoothedEnv, {
      minDistance: 2,
      plantCount: preset.targetCount,
      distribution: preset.plantDistribution,
    });
    setPlants(newPlants);
  }, [sceneId, regenKey]);

  const handlePlantClick = useCallback(
    (data: any) => {
      onPlantInfo({
        id: data.id,
        type: data.type,
        typeLabel: TYPE_LABELS[data.type],
        height: data.height,
        branchLevels: data.branchLevels,
        envScore: data.envScore,
        x: data.screenX,
        y: data.screenY,
      });
      onPlantClick(data);
    },
    [onPlantInfo, onPlantClick]
  );

  return (
    <Canvas
      shadows
      camera={{ position: [20, 18, 25], fov: 55, near: 0.1, far: 200 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      onPointerMissed={() => onPlantInfo(null)}
      style={{ background: '#0a0a1a' }}
    >
      <SceneInner
        plants={plants}
        groundColor={preset.groundColor}
        onPlantClick={handlePlantClick}
      />
    </Canvas>
  );
};
