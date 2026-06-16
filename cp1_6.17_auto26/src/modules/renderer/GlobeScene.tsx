import { useMemo, useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, Html, useTexture, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { CityNode } from '../parser/CityParser';
import { calculateHaversineDistance } from '../parser/Validator';
import { AnimationState } from './AnimationController';

export interface GlobeSceneProps {
  cities: CityNode[];
  animationState: AnimationState;
  onCityClick: (city: CityNode) => void;
  selectedCityId: string | null;
}

const GLOBE_RADIUS = 2;
const EARTH_TEXTURE_URL = 'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg';
const ATMOSPHERE_OPACITY = 0.18;

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function getArcColor(distanceKm: number): [string, string] {
  if (distanceKm < 1000) {
    return ['#22c55e', '#4ade80'];
  } else if (distanceKm < 3000) {
    return ['#84cc16', '#eab308'];
  } else if (distanceKm < 6000) {
    return ['#eab308', '#f97316'];
  } else {
    return ['#f97316', '#ef4444'];
  }
}

interface ArcCurveData {
  points: THREE.Vector3[];
  startColor: string;
  endColor: string;
  distance: number;
  index: number;
}

function computeArcs(cities: CityNode[]): ArcCurveData[] {
  const arcs: ArcCurveData[] = [];
  for (let i = 0; i < cities.length - 1; i++) {
    const from = cities[i];
    const to = cities[i + 1];
    const startVec = latLngToVector3(from.lat, from.lng, GLOBE_RADIUS * 1.02);
    const endVec = latLngToVector3(to.lat, to.lng, GLOBE_RADIUS * 1.02);
    const midVec = startVec.clone().add(endVec).normalize().multiplyScalar(GLOBE_RADIUS * (1.15 + Math.min(0.3, calculateHaversineDistance(from.lat, from.lng, to.lat, to.lng) / 15000)));
    const curve = new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);
    const points = curve.getPoints(80);
    const dist = calculateHaversineDistance(from.lat, from.lng, to.lat, to.lng);
    const [startColor, endColor] = getArcColor(dist);
    arcs.push({ points, startColor, endColor, distance: dist, index: i });
  }
  return arcs;
}

function CityMarker({
  city,
  onClick,
  isSelected,
}: {
  city: CityNode;
  onClick: (city: CityNode) => void;
  isSelected: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const position = useMemo(
    () => latLngToVector3(city.lat, city.lng, GLOBE_RADIUS * 1.03),
    [city.lat, city.lng]
  );
  const scale = useMemo(() => {
    const base = 0.04 + Math.min(0.12, (city.days - 1) * 0.025);
    return hovered ? base * 1.6 : isSelected ? base * 1.4 : base;
  }, [city.days, hovered, isSelected]);
  
  const glowColor = hovered || isSelected ? '#a78bfa' : '#8b5cf6';
  const innerColor = hovered || isSelected ? '#60a5fa' : '#3b82f6';

  return (
    <group position={position}>
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onClick(city);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        scale={[scale * 2.5, scale * 2.5, scale * 2.5]}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.35}
        />
      </mesh>
      <mesh scale={[scale, scale, scale]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={innerColor} />
      </mesh>
      {(hovered || isSelected) && (
        <Html
          position={[0, scale * 4, 0]}
          center
          distanceFactor={10}
          zIndexRange={[100, 0]}
        >
          <div style={{
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '10px',
            padding: '8px 14px',
            color: '#f8fafc',
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
            pointerEvents: 'none',
          }}>
            <div style={{ fontWeight: 600, color: '#a78bfa' }}>{city.name}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {city.days}天 · {city.nameEn}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function TravelArc({
  data,
  animationState,
}: {
  data: ArcCurveData;
  animationState: AnimationState;
}) {
  const gradientPoints = useMemo(() => {
    const colors: THREE.Color[] = [];
    const n = data.points.length;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      colors.push(new THREE.Color(data.startColor).lerp(new THREE.Color(data.endColor), t));
    }
    return colors;
  }, [data]);
  
  const isActiveArc = animationState.currentArcIndex === data.index;
  const displayProgress = isActiveArc
    ? animationState.currentArcProgress
    : animationState.currentArcIndex > data.index
    ? 1
    : 0;
  
  const visibleCount = Math.max(2, Math.floor(displayProgress * data.points.length));
  const visiblePoints = useMemo(() => data.points.slice(0, visibleCount), [data.points, visibleCount]);
  const visibleColors = useMemo(() => gradientPoints.slice(0, visibleCount), [gradientPoints, visibleCount]);
  
  const dotPosition = useMemo(() => {
    if (displayProgress <= 0.001) return null;
    const totalPoints = data.points.length;
    const idx = Math.min(Math.floor(displayProgress * totalPoints), totalPoints - 1);
    const frac = displayProgress * totalPoints - idx;
    const nextIdx = Math.min(idx + 1, totalPoints - 1);
    const p1 = data.points[idx];
    const p2 = data.points[nextIdx];
    return p1.clone().lerp(p2, frac);
  }, [displayProgress, data.points]);

  return (
    <group>
      {visiblePoints.length >= 2 && (
        <Line
          points={visiblePoints}
          color={data.startColor}
          vertexColors={visibleColors}
          lineWidth={displayProgress === 1 ? 2 : 3}
          transparent
          opacity={displayProgress === 1 ? 0.75 : 1}
        />
      )}
      {dotPosition && (
        <group position={dotPosition}>
          <mesh scale={[0.08, 0.08, 0.08]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
          <mesh scale={[0.18, 0.18, 0.18]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.4} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function Earth({ textureUrl }: { textureUrl: string }) {
  const texture = useTexture(textureUrl);
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.015;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <mesh scale={[1.015, 1.015, 1.015]}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshBasicMaterial
          color="#8b5cf6"
          transparent
          opacity={ATMOSPHERE_OPACITY * 0.6}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function LoadingEarth() {
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
      <meshStandardMaterial
        color="#1e293b"
        roughness={0.5}
        metalness={0.2}
      />
    </mesh>
  );
}

function CameraController({ cities }: { cities: CityNode[] }) {
  const { camera } = useThree();
  useEffect(() => {
    if (cities.length > 0) {
      const first = cities[0];
      const target = latLngToVector3(first.lat, first.lng, GLOBE_RADIUS * 2);
      const initialPos = new THREE.Vector3(0, 1, 3.8);
      camera.position.copy(initialPos);
    }
  }, [cities, camera]);
  return null;
}

function GlobeContent({
  cities,
  arcs,
  animationState,
  onCityClick,
  selectedCityId,
}: {
  cities: CityNode[];
  arcs: ArcCurveData[];
  animationState: AnimationState;
  onCityClick: (city: CityNode) => void;
  selectedCityId: string | null;
}) {
  return (
    <>
      <CameraController cities={cities} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[5, 3, 5]}
        intensity={1.2}
        color="#fff7ed"
      />
      <pointLight position={[-5, -2, -3]} intensity={0.4} color="#3b82f6" />
      <Stars
        radius={120}
        depth={60}
        count={4000}
        factor={3.5}
        saturation={0.2}
        fade
        speed={0.4}
      />
      <Suspense fallback={<LoadingEarth />}>
        <Earth textureUrl={EARTH_TEXTURE_URL} />
      </Suspense>
      {arcs.map((arc) => (
        <TravelArc key={`arc-${arc.index}`} data={arc} animationState={animationState} />
      ))}
      {cities.map((city) => (
        <CityMarker
          key={city.id}
          city={city}
          onClick={onCityClick}
          isSelected={selectedCityId === city.id}
        />
      ))}
    </>
  );
}

export default function GlobeScene({
  cities,
  animationState,
  onCityClick,
  selectedCityId,
}: GlobeSceneProps) {
  const arcs = useMemo(() => computeArcs(cities), [cities]);

  return (
    <Canvas
      camera={{
        fov: 45,
        near: 0.1,
        far: 1000,
        position: [0, 1, 3.8],
      }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'linear-gradient(180deg, #05070d 0%, #0b0f1a 50%, #0a0814 100%)' }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      }}
      frameloop="always"
    >
      <GlobeContent
        cities={cities}
        arcs={arcs}
        animationState={animationState}
        onCityClick={onCityClick}
        selectedCityId={selectedCityId}
      />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        minDistance={2.6}
        maxDistance={7}
        makeDefault
      />
    </Canvas>
  );
}
