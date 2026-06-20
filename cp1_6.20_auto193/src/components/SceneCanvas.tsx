import React, { useRef, useMemo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { TreeMeshData, Season } from "../types";

interface BranchMeshProps {
  branches: TreeMeshData["branches"];
}

function BranchMeshes({ branches }: BranchMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!meshRef.current) return;
    branches.forEach((b, i) => {
      dummy.position.set(...b.position);
      const dir = new THREE.Vector3(...b.direction).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      dummy.quaternion.copy(quat);
      dummy.scale.set(b.thickness, b.length, b.thickness);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [branches, dummy]);

  if (branches.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, branches.length]}>
      <cylinderGeometry args={[0.4, 0.6, 1, 6]} />
      <meshStandardMaterial color="#8B6914" roughness={0.9} />
    </instancedMesh>
  );
}

interface LeafMeshProps {
  leaves: TreeMeshData["leaves"];
  seasonColor: string;
}

function LeafMeshes({ leaves, seasonColor }: LeafMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(seasonColor), [seasonColor]);

  useEffect(() => {
    if (!meshRef.current) return;
    leaves.forEach((l, i) => {
      dummy.position.set(...l.position);
      dummy.scale.setScalar(l.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, color);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [leaves, color, dummy]);

  if (leaves.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, leaves.length]}>
      <sphereGeometry args={[0.5, 6, 4]} />
      <meshStandardMaterial roughness={0.7} />
    </instancedMesh>
  );
}

interface GrowthMarkerProps {
  markers: number[];
  trunkHeight: number;
}

function GrowthMarkers({ markers, trunkHeight }: GrowthMarkerProps) {
  return (
    <group>
      {markers.map((step) => {
        const y = (step / 100) * trunkHeight;
        return (
          <mesh key={step} position={[0.3, y, 0]}>
            <boxGeometry args={[0.1, 0.02, 0.1]} />
            <meshStandardMaterial color="#FF4444" />
          </mesh>
        );
      })}
    </group>
  );
}

interface GroundPlaneProps {
  season: Season;
}

function GroundPlane({ season }: GroundPlaneProps) {
  const colorMap: Record<Season, string> = {
    spring: "#7CB342",
    summer: "#558B2F",
    autumn: "#BF8C3E",
    winter: "#BDBDBD",
  };
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <circleGeometry args={[20, 32]} />
      <meshStandardMaterial color={colorMap[season]} roughness={1} />
    </mesh>
  );
}

interface TreeSceneProps {
  treeMesh: TreeMeshData;
  growthStep: number;
  season: Season;
  seasonColor: string;
}

function TreeScene({ treeMesh, growthStep, season, seasonColor }: TreeSceneProps) {
  const markers = useMemo(() => {
    const ms: number[] = [];
    for (let s = 10; s <= growthStep; s += 10) {
      ms.push(s);
    }
    return ms;
  }, [growthStep]);

  return (
    <group>
      <BranchMeshes branches={treeMesh.branches} />
      <LeafMeshes leaves={treeMesh.leaves} seasonColor={seasonColor} />
      <GrowthMarkers markers={markers} trunkHeight={treeMesh.trunkHeight} />
      <GroundPlane season={season} />
    </group>
  );
}

interface SceneCanvasProps {
  treeMesh: TreeMeshData;
  growthStep: number;
  season: Season;
  seasonColor: string;
  bgColor: string;
  compareMode?: boolean;
  compareTreeMesh?: TreeMeshData;
  compareSeason?: Season;
  compareSeasonColor?: string;
  compareBgColor?: string;
}

function SceneContent({
  treeMesh,
  growthStep,
  season,
  seasonColor,
  compareMode,
  compareTreeMesh,
  compareSeason,
  compareSeasonColor,
}: Omit<SceneCanvasProps, "bgColor" | "compareBgColor">) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      <TreeScene
        treeMesh={treeMesh}
        growthStep={growthStep}
        season={season}
        seasonColor={seasonColor}
      />
      {compareMode && compareTreeMesh && compareSeason && compareSeasonColor && (
        <group position={[8, 0, 0]}>
          <TreeScene
            treeMesh={compareTreeMesh}
            growthStep={growthStep}
            season={compareSeason}
            seasonColor={compareSeasonColor}
          />
        </group>
      )}
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={30}
        target={[compareMode ? 4 : 0, 3, 0]}
      />
    </>
  );
}

const SceneCanvas: React.FC<SceneCanvasProps> = ({
  treeMesh,
  growthStep,
  season,
  seasonColor,
  bgColor,
  compareMode,
  compareTreeMesh,
  compareSeason,
  compareSeasonColor,
  compareBgColor: _compareBgColor,
}) => {
  const bgThreeColor = useMemo(() => new THREE.Color(bgColor), [bgColor]);

  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(bgThreeColor);
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={[bgThreeColor.r, bgThreeColor.g, bgThreeColor.b]} />
      <SceneContent
        treeMesh={treeMesh}
        growthStep={growthStep}
        season={season}
        seasonColor={seasonColor}
        compareMode={compareMode}
        compareTreeMesh={compareTreeMesh}
        compareSeason={compareSeason}
        compareSeasonColor={compareSeasonColor}
      />
    </Canvas>
  );
};

export default SceneCanvas;
