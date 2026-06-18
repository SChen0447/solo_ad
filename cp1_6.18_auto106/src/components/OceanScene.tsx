import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  initializeSimulation,
  updateSimulation,
  getParticleDetail,
  TRAIL_LENGTH,
  type SimulationState,
} from '../simulation/oceanSimulation';
import {
  getCurrents,
  getCurrentLabels,
  EARTH_RADIUS,
  type CurrentLabelData,
} from '../data/oceanData';
import { useStore } from '../App';

const particleVertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float glow = 1.0 - dist * 2.0;
    glow = pow(glow, 1.5);
    gl_FragColor = vec4(vColor * glow, vAlpha * glow);
  }
`;

const trailVertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * 0.6 * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const trailFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float glow = 1.0 - dist * 2.0;
    glow = pow(glow, 2.0);
    gl_FragColor = vec4(vColor * glow, vAlpha * glow * 0.5);
  }
`;

function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a3a5c');
    gradient.addColorStop(0.15, '#0d2847');
    gradient.addColorStop(0.5, '#0a1e3d');
    gradient.addColorStop(0.85, '#0d2847');
    gradient.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const landColor = '#1a4a2e';
    const landHighlights = '#2a6a3e';

    const continents: [number, number, number, number][] = [
      [280, 120, 220, 260],
      [540, 80, 180, 200],
      [580, 300, 120, 220],
      [950, 100, 300, 250],
      [1350, 140, 250, 280],
      [1550, 350, 140, 130],
      [100, 200, 100, 120],
    ];

    for (const [x, y, w, h] of continents) {
      ctx.fillStyle = landColor;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.1, y + h * 0.2);
      ctx.bezierCurveTo(x + w * 0.3, y, x + w * 0.7, y + h * 0.1, x + w * 0.9, y + h * 0.3);
      ctx.bezierCurveTo(x + w, y + h * 0.5, x + w * 0.8, y + h * 0.8, x + w * 0.6, y + h);
      ctx.bezierCurveTo(x + w * 0.3, y + h * 0.9, x, y + h * 0.6, x + w * 0.1, y + h * 0.2);
      ctx.fill();

      ctx.fillStyle = landHighlights;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, y + h * 0.3);
      ctx.bezierCurveTo(x + w * 0.4, y + h * 0.15, x + w * 0.6, y + h * 0.2, x + w * 0.7, y + h * 0.4);
      ctx.bezierCurveTo(x + w * 0.65, y + h * 0.5, x + w * 0.4, y + h * 0.45, x + w * 0.2, y + h * 0.3);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(100, 180, 255, 0.08)';
    ctx.lineWidth = 0.5;
    for (let lat = -80; lat <= 80; lat += 10) {
      const py = ((90 - lat) / 180) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(canvas.width, py);
      ctx.stroke();
    }
    for (let lon = -180; lon <= 180; lon += 10) {
      const px = ((lon + 180) / 360) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvas.height);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          vec3 atmosphereColor = vec3(0.3, 0.6, 1.0);
          gl_FragColor = vec4(atmosphereColor, intensity * 0.6);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshPhongMaterial
          map={earthTexture}
          shininess={15}
          specular={new THREE.Color(0x1a3a5c)}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh ref={atmosphereRef} material={atmosphereMaterial}>
        <sphereGeometry args={[EARTH_RADIUS * 1.06, 64, 64]} />
      </mesh>
    </group>
  );
}

function ParticleSystem() {
  const month = useStore((s) => s.month);
  const visibleCurrents = useStore((s) => s.visibleCurrents);
  const setParticleDetail = useStore((s) => s.setParticleDetail);
  const setSelectedParticle = useStore((s) => s.setSelectedParticle);
  const selectedParticle = useStore((s) => s.selectedParticle);
  const isPlaying = useStore((s) => s.isPlaying);

  const pointsRef = useRef<THREE.Points>(null);
  const trailRefs = useRef<(THREE.Points | null)[]>([]);
  const simRef = useRef<SimulationState | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const trailGeomRefs = useRef<(THREE.BufferGeometry | null)[]>([]);
  const lastTimeRef = useRef(0);
  const hoverRef = useRef<number | null>(null);
  const haloRef = useRef<THREE.Mesh | null>(null);

  const initSim = useCallback(() => {
    const sim = initializeSimulation(month, visibleCurrents);
    simRef.current = sim;

    if (geometryRef.current) {
      geometryRef.current.setAttribute(
        'position',
        new THREE.BufferAttribute(sim.positions, 3),
      );
      geometryRef.current.setAttribute(
        'color',
        new THREE.BufferAttribute(sim.colors, 3),
      );
      geometryRef.current.setAttribute(
        'aSize',
        new THREE.BufferAttribute(sim.sizes, 1),
      );
      const alphas = new Float32Array(sim.particleCount).fill(1.0);
      geometryRef.current.setAttribute(
        'aAlpha',
        new THREE.BufferAttribute(alphas, 1),
      );
    }

    for (let t = 0; t < TRAIL_LENGTH; t++) {
      const geom = trailGeomRefs.current[t];
      if (geom) {
        geom.setAttribute(
          'position',
          new THREE.BufferAttribute(sim.trailPositions[t], 3),
        );
        geom.setAttribute(
          'color',
          new THREE.BufferAttribute(sim.colors, 3),
        );
        const trailSizes = new Float32Array(sim.particleCount);
        for (let i = 0; i < sim.particleCount; i++) {
          trailSizes[i] = sim.sizes[i] * 0.6;
        }
        geom.setAttribute('aSize', new THREE.BufferAttribute(trailSizes, 1));
        geom.setAttribute(
          'aAlpha',
          new THREE.BufferAttribute(sim.trailAlphas[t], 1),
        );
      }
    }
  }, [month, visibleCurrents]);

  useEffect(() => {
    initSim();
  }, [initSim]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const delta = Math.min(time - lastTimeRef.current, 0.05);
    lastTimeRef.current = time;

    if (!simRef.current || !isPlaying) return;

    updateSimulation(simRef.current, month, delta * 60, visibleCurrents);

    if (geometryRef.current) {
      geometryRef.current.attributes.position.needsUpdate = true;
      geometryRef.current.attributes.color.needsUpdate = true;
      geometryRef.current.attributes.aSize.needsUpdate = true;
    }

    for (let t = 0; t < TRAIL_LENGTH; t++) {
      const geom = trailGeomRefs.current[t];
      if (geom) {
        geom.attributes.position.needsUpdate = true;
        geom.attributes.aAlpha.needsUpdate = true;
      }
    }

    if (selectedParticle !== null && simRef.current && haloRef.current) {
      const posArr = simRef.current.positions;
      const idx = selectedParticle;
      haloRef.current.position.set(
        posArr[idx * 3],
        posArr[idx * 3 + 1],
        posArr[idx * 3 + 2],
      );
      const pulse = 1.0 + 0.3 * Math.sin(time * 5);
      haloRef.current.scale.setScalar(pulse);
    }
  });

  const handleClick = useCallback(
    (e: THREE.Event & { point?: THREE.Vector3; index?: number }) => {
      if (!simRef.current) return;

      const raycaster = new THREE.Raycaster();
      raycaster.params.Points = { threshold: 0.2 };

      if (pointsRef.current && e.point) {
        const idx = e.index ?? hoverRef.current;
        if (idx !== null && idx !== undefined && idx < simRef.current.particleCount) {
          const detail = getParticleDetail(simRef.current, idx);
          if (detail) {
            setSelectedParticle(idx);
            setParticleDetail(detail);
          }
        }
      }
    },
    [setParticleDetail, setSelectedParticle],
  );

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const trailMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: trailVertexShader,
        fragmentShader: trailFragmentShader,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const haloGeometry = useMemo(() => new THREE.RingGeometry(0.08, 0.12, 32), []);
  const haloMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  return (
    <group>
      <points
        ref={pointsRef}
        material={shaderMaterial}
        onClick={handleClick}
      >
        <bufferGeometry ref={geometryRef} />
      </points>

      {Array.from({ length: TRAIL_LENGTH }).map((_, t) => (
        <points key={t} ref={(el) => { trailRefs.current[t] = el; }} material={trailMaterial}>
          <bufferGeometry ref={(el) => { trailGeomRefs.current[t] = el; }} />
        </points>
      ))}

      {selectedParticle !== null && (
        <mesh ref={haloRef} geometry={haloGeometry} material={haloMaterial} />
      )}
    </group>
  );
}

function CurrentLabels() {
  const month = useStore((s) => s.month);
  const visibleCurrents = useStore((s) => s.visibleCurrents);

  const labels = useMemo<CurrentLabelData[]>(() => {
    return getCurrentLabels(month).filter((l) =>
      visibleCurrents.includes(l.currentId),
    );
  }, [month, visibleCurrents]);

  return (
    <group>
      {labels.map((label) => (
        <Html
          key={label.currentId}
          position={label.position}
          center
          distanceFactor={10}
          style={{
            pointerEvents: 'auto',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(0, 20, 60, 0.85)',
              border: '1px solid rgba(60, 140, 255, 0.5)',
              borderRadius: '6px',
              padding: '4px 10px',
              color: '#8cc8ff',
              fontSize: '11px',
              fontFamily: 'system-ui, sans-serif',
              whiteSpace: 'nowrap',
              boxShadow: '0 0 12px rgba(60, 140, 255, 0.3)',
              textShadow: '0 0 6px rgba(60, 140, 255, 0.5)',
              animation: 'fadeIn 0.5s ease',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '12px', color: '#a0d8ff' }}>
              {label.nameCN}
            </div>
            <div>流速: {label.avgSpeed.toFixed(1)} m/s</div>
            <div>温度: {label.avgTemp.toFixed(1)}°C</div>
          </div>
        </Html>
      ))}
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[10, 8, 5]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-10, -5, -8]} intensity={0.3} color="#4488ff" />
    </>
  );
}

export default function OceanScene() {
  return (
    <>
      <Lights />
      <Earth />
      <ParticleSystem />
      <CurrentLabels />
      <OrbitControls
        enablePan={false}
        minDistance={7}
        maxDistance={20}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />
    </>
  );
}
