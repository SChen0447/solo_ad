import React, { useRef, useEffect, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Plane } from '@react-three/drei';
import * as THREE from 'three';
import { windSimulator, type Building, type Particle, type WindCell } from '../modules/windSimulator';
import { useAppStore } from '../store/useAppStore';

const GRID_SIZE = 40;
const CELL_SIZE = 1;

function speedToColor(speed: number, maxSpeed: number = 3.5): THREE.Color {
  const t = Math.min(speed / maxSpeed, 1);
  if (t < 0.33) {
    const u = t / 0.33;
    return new THREE.Color(0.0, 0.3 * u, 0.6 + 0.4 * u);
  } else if (t < 0.66) {
    const u = (t - 0.33) / 0.33;
    return new THREE.Color(0.0, 0.6 + 0.3 * u, 0.9 - 0.3 * u);
  } else {
    const u = (t - 0.66) / 0.34;
    return new THREE.Color(u, 0.8 - 0.5 * u, 0.6 - 0.6 * u);
  }
}

function BuildingMesh({ building, isSelected, onClick }: { building: Building; isSelected: boolean; onClick: () => void }) {
  const ref = useRef<THREE.Group>(null);

  const geometries = useMemo(() => {
    const geos: Array<{ geo: THREE.BoxGeometry; pos: [number, number, number] }> = [];
    const h = building.height;
    const w = building.shape.width;
    const d = building.shape.depth;

    if (building.shape.type === 'rect') {
      geos.push({ geo: new THREE.BoxGeometry(w, h, d), pos: [0, h / 2, 0] });
    } else if (building.shape.type === 'L') {
      const armW = w * 0.4;
      const armD = d * 0.4;
      geos.push({ geo: new THREE.BoxGeometry(w, h, armD), pos: [0, h / 2, -d / 2 + armD / 2] });
      geos.push({ geo: new THREE.BoxGeometry(armW, h, d), pos: [w / 2 - armW / 2, h / 2, 0] });
    } else if (building.shape.type === 'U') {
      const armW = w * 0.3;
      geos.push({ geo: new THREE.BoxGeometry(w, h, armW), pos: [0, h / 2, -d / 2 + armW / 2] });
      geos.push({ geo: new THREE.BoxGeometry(armW, h, d), pos: [-w / 2 + armW / 2, h / 2, 0] });
      geos.push({ geo: new THREE.BoxGeometry(armW, h, d), pos: [w / 2 - armW / 2, h / 2, 0] });
    }
    return geos;
  }, [building]);

  const linePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const w = building.shape.width;
    const d = building.shape.depth;
    const hw = w / 2;
    const hd = d / 2;

    const addRect = (x0: number, z0: number, x1: number, z1: number) => {
      points.push(new THREE.Vector3(x0, 0, z0));
      points.push(new THREE.Vector3(x1, 0, z0));
      points.push(new THREE.Vector3(x1, 0, z1));
      points.push(new THREE.Vector3(x0, 0, z1));
      points.push(new THREE.Vector3(x0, 0, z0));
    };

    if (building.shape.type === 'rect') {
      addRect(-hw, -hd, hw, hd);
    } else if (building.shape.type === 'L') {
      const armW = w * 0.4;
      const armD = d * 0.4;
      addRect(-hw, -hd, hw, -hd + armD);
      addRect(hw - armW, -hd, hw, hd);
    } else if (building.shape.type === 'U') {
      const armW = w * 0.3;
      addRect(-hw, -hd, hw, -hd + armW);
      addRect(-hw, -hd, -hw + armW, hd);
      addRect(hw - armW, -hd, hw, hd);
    }
    return points;
  }, [building]);

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(linePoints);
    return geo;
  }, [linePoints]);

  return (
    <group ref={ref} position={[building.x, 0, building.z]} rotation={[0, building.rotation, 0]}>
      {geometries.map((g, i) => (
        <mesh
          key={i}
          position={g.pos}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <primitive object={g.geo} attach="geometry" />
          <meshPhysicalMaterial
            color={isSelected ? '#5effff' : '#3a4a6a'}
            transparent
            opacity={0.55}
            roughness={0.7}
            metalness={0.15}
            clearcoat={0.4}
            clearcoatRoughness={0.6}
          />
        </mesh>
      ))}
      <line>
        <primitive object={lineGeometry} attach="geometry" />
        <lineBasicMaterial color={isSelected ? '#5effff' : '#4a8abf'} transparent opacity={0.7} linewidth={2} />
      </line>
    </group>
  );
}

function ParticlesLayer() {
  const lineRef = useRef<THREE.LineSegments>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const unsubscribe = windSimulator.subscribe(() => {
      setParticles(windSimulator.getParticleData());
    });
    setParticles(windSimulator.getParticleData());
    return unsubscribe;
  }, []);

  const { positions, colors } = useMemo(() => {
    const posArr: number[] = [];
    const colArr: number[] = [];
    for (const p of particles) {
      const trail = p.trail;
      for (let i = 0; i < trail.length - 1; i++) {
        const a = trail[i];
        const b = trail[i + 1];
        posArr.push(a.x, 0.1, a.age);
        posArr.push(b.x, 0.1, b.age);
        const fade = 1 - i / trail.length;
        const c = speedToColor(p.speed);
        colArr.push(c.r * fade, c.g * fade, c.b * fade);
        colArr.push(c.r * fade * 0.8, c.g * fade * 0.8, c.b * fade * 0.8);
      }
    }
    return {
      positions: new Float32Array(posArr),
      colors: new Float32Array(colArr)
    };
  }, [particles]);

  useFrame(() => {
    if (lineRef.current) {
      const geo = lineRef.current.geometry;
      const posAttr = geo.getAttribute('position');
      const colAttr = geo.getAttribute('color');
      const arr = posAttr.array as Float32Array;
      const carr = colAttr.array as Float32Array;
      arr.set(positions);
      carr.set(colors);
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      geo.setDrawRange(0, positions.length / 3);
    }
  });

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 8 * 2 * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(400 * 8 * 2 * 3), 3));
    return g;
  }, []);

  return (
    <lineSegments ref={lineRef}>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial vertexColors transparent opacity={0.95} linewidth={4} />
    </lineSegments>
  );
}

function HeatmapLayer() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [field, setField] = useState<WindCell[][]>([]);

  useEffect(() => {
    const unsubscribe = windSimulator.subscribe(() => {
      setField(windSimulator.getWindField());
    });
    setField(windSimulator.getWindField());
    return unsubscribe;
  }, []);

  const canvas = useMemo(() => {
    return document.createElement('canvas');
  }, []);

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }, [canvas]);

  useFrame(() => {
    if (field.length > 0 && field[0].length > 0) {
      canvas.width = GRID_SIZE;
      canvas.height = GRID_SIZE;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imgData = ctx.createImageData(GRID_SIZE, GRID_SIZE);
        let maxSpeed = 0;
        for (let i = 0; i < GRID_SIZE; i++) {
          for (let j = 0; j < GRID_SIZE; j++) {
            if (field[i][j].speed > maxSpeed) maxSpeed = field[i][j].speed;
          }
        }
        maxSpeed = Math.max(maxSpeed, 2);
        for (let i = 0; i < GRID_SIZE; i++) {
          for (let j = 0; j < GRID_SIZE; j++) {
            const idx = (j * GRID_SIZE + i) * 4;
            const c = speedToColor(field[i][j].speed, maxSpeed);
            imgData.data[idx] = Math.floor(c.r * 255);
            imgData.data[idx + 1] = Math.floor(c.g * 255);
            imgData.data[idx + 2] = Math.floor(c.b * 255);
            imgData.data[idx + 3] = 160;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        texture.needsUpdate = true;
      }
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[GRID_SIZE / 2, 0.05, GRID_SIZE / 2]}>
      <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
      <meshBasicMaterial map={texture} transparent opacity={0.8} depthWrite={false} />
    </mesh>
  );
}

function VectorArrowsLayer() {
  const groupRef = useRef<THREE.Group>(null);
  const [field, setField] = useState<WindCell[][]>([]);

  useEffect(() => {
    const unsubscribe = windSimulator.subscribe(() => {
      setField(windSimulator.getWindField());
    });
    setField(windSimulator.getWindField());
    return unsubscribe;
  }, []);

  const arrows = useMemo(() => {
    const arr: Array<{ pos: [number, number, number]; rotY: number; scale: number }> = [];
    const step = 2;
    for (let i = 0; i < GRID_SIZE; i += step) {
      for (let j = 0; j < GRID_SIZE; j += step) {
        arr.push({ pos: [i + 0.5, 0.1, j + 0.5], rotY: 0, scale: 0.5 });
      }
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!groupRef.current || field.length === 0) return;
    const step = 2;
    let idx = 0;
    for (let i = 0; i < GRID_SIZE; i += step) {
      for (let j = 0; j < GRID_SIZE; j += step) {
        const child = groupRef.current.children[idx];
        if (child) {
          const cell = field[i][j];
          const angle = Math.atan2(-cell.vy, cell.vx);
          child.rotation.y = -angle;
          const s = Math.min(cell.speed / 2.5, 1.2) * 0.6 + 0.15;
          child.scale.set(s, s, s);
        }
        idx++;
      }
    }
  });

  const arrowGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(-0.3, 0.3);
    shape.lineTo(-0.15, 0);
    shape.lineTo(-0.3, -0.3);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
    geo.translate(0.15, 0, 0);
    return geo;
  }, []);

  return (
    <group ref={groupRef}>
      {arrows.map((a, i) => (
        <mesh key={i} position={a.pos} rotation={[0, a.rotY, 0]} scale={a.scale}>
          <primitive object={arrowGeo} attach="geometry" />
          <meshBasicMaterial color="#5effff" transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function GridPlane() {
  const addBuilding = useAppStore((s) => s.addBuilding);
  const selectBuilding = useAppStore((s) => s.selectBuilding);

  const handleClick = (e: any) => {
    e.stopPropagation();
    const pt = e.point;
    addBuilding(
      Math.round(pt.x * 2) / 2,
      Math.round(pt.z * 2) / 2
    );
  };

  return (
    <Plane
      rotation={[-Math.PI / 2, 0, 0]}
      position={[GRID_SIZE / 2, 0, GRID_SIZE / 2]}
      args={[GRID_SIZE, GRID_SIZE]}
      onClick={handleClick}
    >
      <meshStandardMaterial color="#1e2228" />
    </Plane>
  );
}

function GridLines() {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= GRID_SIZE; i++) {
      points.push(new THREE.Vector3(i, 0.02, 0));
      points.push(new THREE.Vector3(i, 0.02, GRID_SIZE));
      points.push(new THREE.Vector3(0, 0.02, i));
      points.push(new THREE.Vector3(GRID_SIZE, 0.02, i));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  return (
    <lineSegments>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color="#2d3540" transparent opacity={0.6} />
    </lineSegments>
  );
}

function BuildingsGroup() {
  const buildings = useAppStore((s) => s.buildings);
  const selectedId = useAppStore((s) => s.selectedBuildingId);
  const selectBuilding = useAppStore((s) => s.selectBuilding);

  return (
    <group>
      {buildings.map((b) => (
        <BuildingMesh
          key={b.id}
          building={b}
          isSelected={selectedId === b.id}
          onClick={() => selectBuilding(b.id)}
        />
      ))}
    </group>
  );
}

function ModeLayers() {
  const displayMode = useAppStore((s) => s.displayMode);
  const opacityRef = useRef({ particles: 1, heatmap: 0, vectors: 0 });
  const particlesGroup = useRef<THREE.Group>(null);
  const heatmapGroup = useRef<THREE.Group>(null);
  const vectorsGroup = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    const target = { particles: 0, heatmap: 0, vectors: 0 };
    if (displayMode === 'particles') target.particles = 1;
    else if (displayMode === 'heatmap') target.heatmap = 1;
    else target.vectors = 1;

    for (const k of ['particles', 'heatmap', 'vectors'] as const) {
      opacityRef.current[k] += (target[k] - opacityRef.current[k]) * Math.min(dt * 3, 1);
    }

    if (particlesGroup.current) particlesGroup.current.visible = opacityRef.current.particles > 0.01;
    if (heatmapGroup.current) heatmapGroup.current.visible = opacityRef.current.heatmap > 0.01;
    if (vectorsGroup.current) vectorsGroup.current.visible = opacityRef.current.vectors > 0.01;
  });

  return (
    <>
      <group ref={particlesGroup}>
        <ParticlesLayer />
      </group>
      <group ref={heatmapGroup} visible={false}>
        <HeatmapLayer />
      </group>
      <group ref={vectorsGroup} visible={false}>
        <VectorArrowsLayer />
      </group>
    </>
  );
}

function SimulationSync() {
  const buildings = useAppStore((s) => s.buildings);
  const isSimulating = useAppStore((s) => s.isSimulating);
  const setFps = useAppStore((s) => s.setFps);
  const setParticleCount = useAppStore((s) => s.setParticleCount);
  const setAvgWindDirection = useAppStore((s) => s.setAvgWindDirection);
  const setIsSimulating = useAppStore((s) => s.setIsSimulating);

  useEffect(() => {
    windSimulator.setBuildings(buildings);
  }, [buildings]);

  useEffect(() => {
    if (isSimulating) {
      windSimulator.startSimulation();
    } else {
      windSimulator.pauseSimulation();
    }
  }, [isSimulating]);

  useEffect(() => {
    const unsubscribe = windSimulator.subscribe(() => {
      setFps(windSimulator.fps);
      setParticleCount(windSimulator.getParticleCount());
      setAvgWindDirection(windSimulator.getAverageWindDirection());
    });
    return unsubscribe;
  }, [setFps, setParticleCount, setAvgWindDirection]);

  useEffect(() => {
    return () => {
      windSimulator.pauseSimulation();
    };
  }, []);

  return null;
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [20, 35, 40], fov: 50, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: '#1a1d24' }}
    >
      <color attach="background" args={['#1a1d24']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[15, 30, 20]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[-15, 20, -10]} intensity={0.35} color="#7ba9d9" />

      <Suspense fallback={null}>
        <GridPlane />
        <GridLines />
        <BuildingsGroup />
        <ModeLayers />
        <SimulationSync />
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.1}
        target={[GRID_SIZE / 2, 0, GRID_SIZE / 2]}
      />
    </Canvas>
  );
}
