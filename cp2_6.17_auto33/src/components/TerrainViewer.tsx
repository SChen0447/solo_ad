import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HeightMap } from '../server/terrainGenerator';
import { ParticlePath } from '../server/erosionSimulator';

interface TerrainViewerProps {
  heightMap: HeightMap | null;
  size: number;
  waterPaths: ParticlePath[];
  isSimulating: boolean;
}

interface WaterParticle {
  mesh: THREE.Mesh;
  path: THREE.Vector3[];
  progress: number;
  speed: number;
}

const LOW_COLOR = new THREE.Color(0x2e7d32);
const MID_COLOR = new THREE.Color(0x795548);
const HIGH_COLOR = new THREE.Color(0xffffff);
const PARTICLE_LOW_COLOR = new THREE.Color(0x4FC3F7);
const PARTICLE_HIGH_COLOR = new THREE.Color(0x01579B);

const lerpColor = (a: THREE.Color, b: THREE.Color, t: number): THREE.Color => {
  return a.clone().lerp(b, t);
};

const getTerrainColor = (height: number, maxHeight: number): THREE.Color => {
  const t = Math.max(0, Math.min(1, height / maxHeight));
  if (t < 0.5) {
    return lerpColor(LOW_COLOR, MID_COLOR, t * 2);
  } else {
    return lerpColor(MID_COLOR, HIGH_COLOR, (t - 0.5) * 2);
  }
};

const TerrainViewer: React.FC<TerrainViewerProps> = ({
  heightMap,
  size,
  waterPaths,
  isSimulating
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const waterParticlesRef = useRef<WaterParticle[]>([]);
  const animationIdRef = useRef<number>(0);

  const maxHeight = useMemo(() => {
    if (!heightMap || heightMap.length === 0) return 100;
    return Math.max(...heightMap.map((p) => p.z));
  }, [heightMap]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d1a);
    scene.fog = new THREE.Fog(0x0d0d1a, 50, 200);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 40, 60);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 10;
    controls.maxDistance = 150;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 80, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x362d1a, 0.4);
    scene.add(hemisphereLight);

    const gridHelper = new THREE.GridHelper(100, 50, 0x333344, 0x222233);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();

      waterParticlesRef.current.forEach((particle) => {
        if (particle.path.length < 2) return;
        particle.progress += particle.speed;
        if (particle.progress >= particle.path.length - 1) {
          particle.progress = 0;
        }
        const idx = Math.floor(particle.progress);
        const frac = particle.progress - idx;
        const p1 = particle.path[idx];
        const p2 = particle.path[Math.min(idx + 1, particle.path.length - 1)];
        particle.mesh.position.lerpVectors(p1, p2, frac);
      });

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !heightMap || size < 2) return;

    const scene = sceneRef.current;

    if (terrainMeshRef.current) {
      scene.remove(terrainMeshRef.current);
      terrainMeshRef.current.geometry.dispose();
      (terrainMeshRef.current.material as THREE.Material).dispose();
    }

    const geometry = new THREE.PlaneGeometry(size - 1, size - 1, size - 1, size - 1);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i++) {
      const x = Math.round(positions.getX(i) + size / 2);
      const y = Math.round(positions.getZ(i) + size / 2);
      const clampedX = Math.max(0, Math.min(size - 1, x));
      const clampedY = Math.max(0, Math.min(size - 1, y));
      const idx = clampedY * size + clampedX;
      const z = heightMap[idx]?.z || 0;
      positions.setY(i, z);

      const color = getTerrainColor(z, maxHeight);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    terrainMeshRef.current = mesh;
  }, [heightMap, size, maxHeight]);

  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;

    waterParticlesRef.current.forEach((p) => {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    waterParticlesRef.current = [];

    if (!isSimulating || waterPaths.length === 0) return;

    const particleCount = Math.min(300, Math.max(100, waterPaths.length * 5));
    const sphereGeometry = new THREE.SphereGeometry(0.3, 8, 6);

    for (let i = 0; i < particleCount; i++) {
      const pathData = waterPaths[i % waterPaths.length];
      if (!pathData || pathData.points.length < 2) continue;

      const path = pathData.points.map(
        (p) => new THREE.Vector3(p.x, p.y + 0.5, p.z)
      );

      const colorT = Math.random();
      const color = PARTICLE_LOW_COLOR.clone().lerp(PARTICLE_HIGH_COLOR, colorT);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.65 + Math.random() * 0.3
      });

      const mesh = new THREE.Mesh(sphereGeometry, material);
      scene.add(mesh);

      waterParticlesRef.current.push({
        mesh,
        path,
        progress: Math.random() * (path.length - 1),
        speed: 0.02 + Math.random() * 0.04
      });
    }
  }, [waterPaths, isSimulating]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative'
      }}
    />
  );
};

export default TerrainViewer;
