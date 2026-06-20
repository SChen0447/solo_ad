import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS, ATMOSPHERE_RADIUS } from '@/utils/constants';

export function EarthCore() {
  const earthRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Points>(null);
  const outlineRef = useRef<THREE.LineSegments>(null);

  const earthTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a3a5c');
    gradient.addColorStop(0.3, '#0d2840');
    gradient.addColorStop(0.5, '#1e4d6b');
    gradient.addColorStop(0.7, '#0d2840');
    gradient.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const continents = [
      { x: 300, y: 200, w: 400, h: 300 },
      { x: 900, y: 150, w: 250, h: 400 },
      { x: 1200, y: 250, w: 500, h: 350 },
      { x: 1550, y: 550, w: 200, h: 150 },
      { x: 200, y: 600, w: 350, h: 250 },
      { x: 700, y: 650, w: 250, h: 200 },
    ];
    
    continents.forEach((c) => {
      const continentGradient = ctx.createRadialGradient(
        c.x + c.w / 2, c.y + c.h / 2, 0,
        c.x + c.w / 2, c.y + c.h / 2, Math.max(c.w, c.h) / 2
      );
      continentGradient.addColorStop(0, '#2d5a3d');
      continentGradient.addColorStop(0.6, '#1e4a2e');
      continentGradient.addColorStop(1, '#153322');
      ctx.fillStyle = continentGradient;
      ctx.beginPath();
      ctx.ellipse(c.x + c.w / 2, c.y + c.h / 2, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 3 + 1;
      ctx.fillStyle = `rgba(30, 74, 46, ${Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  const outlineGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let lat = -90; lat <= 90; lat += 10) {
      for (let lon = -180; lon <= 180; lon += 2) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const r = EARTH_RADIUS + 0.005;
        points.push(new THREE.Vector3(
          -r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        ));
      }
    }
    for (let lon = -180; lon <= 180; lon += 30) {
      for (let lat = -90; lat <= 90; lat += 2) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const r = EARTH_RADIUS + 0.005;
        points.push(new THREE.Vector3(
          -r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        ));
      }
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, []);

  const atmosphereGeometry = useMemo(() => {
    const particleCount = 4000;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const phi = Math.random() * Math.PI;
      const theta = Math.random() * Math.PI * 2;
      const r = ATMOSPHERE_RADIUS + (Math.random() - 0.5) * 0.15;
      positions[i * 3] = -r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.02;
    }
    if (outlineRef.current) {
      outlineRef.current.rotation.y += delta * 0.02;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += delta * 0.015;
    }
  });

  return (
    <group>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 5, 10]} intensity={1.2} />
      <directionalLight position={[-10, -5, -10]} intensity={0.3} color="#4a9eff" />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#ffffff" />

      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshPhongMaterial
          map={earthTexture}
          shininess={15}
          specular={new THREE.Color(0x333333)}
        />
      </mesh>

      <lineSegments ref={outlineRef} geometry={outlineGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </lineSegments>

      <points ref={atmosphereRef} geometry={atmosphereGeometry}>
        <pointsMaterial
          color="#4a9eff"
          size={0.04}
          transparent
          opacity={0.15}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

export default EarthCore;
