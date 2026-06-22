import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem } from '../pollution/ParticleSystem';
import type { PollutionSourceConfig } from '../pollution/PollutionSource';
import buildingsData from '../data/buildings.json';

export interface SceneViewHandle {
  reset: () => void;
  updateSource: (source: PollutionSourceConfig) => void;
  setGlobalWindMultiplier: (value: number) => void;
  getActiveParticleCount: () => number;
}

interface BuildingJSON {
  id: number;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}

interface SceneViewProps {
  sources: PollutionSourceConfig[];
  onFpsUpdate?: (fps: number) => void;
}

const SceneView = forwardRef<SceneViewHandle, SceneViewProps>(function SceneView(
  { sources, onFpsUpdate },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const sourceMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const windArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const animationIdRef = useRef<number>(0);
  const pulseTimeRef = useRef<number>(0);

  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useImperativeHandle(ref, () => ({
    reset: () => {
      particleSystemRef.current?.reset();
    },
    updateSource: (source: PollutionSourceConfig) => {
      particleSystemRef.current?.updateSource(source);
    },
    setGlobalWindMultiplier: (value: number) => {
      particleSystemRef.current?.setGlobalWindMultiplier(value);
    },
    getActiveParticleCount: () => {
      return particleSystemRef.current?.getActiveCount() ?? 0;
    }
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 150, 400);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(120, 80, 120);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.minDistance = 30;
    controls.maxDistance = 300;
    controls.maxPolarAngle = Math.PI * 0.48;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(60, 100, 40);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 300;
    directionalLight.shadow.camera.left = -80;
    directionalLight.shadow.camera.right = 80;
    directionalLight.shadow.camera.top = 80;
    directionalLight.shadow.camera.bottom = -80;
    directionalLight.shadow.bias = -0.0005;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.25);
    fillLight.position.set(-40, 50, -60);
    scene.add(fillLight);

    const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x444444);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    const groundGeo = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x252535,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    const buildings = buildingsData as BuildingJSON[];
    const buildingGroup = new THREE.Group();

    buildings.forEach((b) => {
      const clampedHeight = Math.max(5, Math.min(80, b.height));
      const geometry = new THREE.BoxGeometry(b.width, clampedHeight, b.depth);
      const material = new THREE.MeshStandardMaterial({
        color: 0xb0b0b0,
        transparent: true,
        opacity: 0.85,
        roughness: 0.7,
        metalness: 0.15
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(b.x, clampedHeight / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      buildingGroup.add(mesh);
    });

    scene.add(buildingGroup);

    const windDir = new THREE.Vector3(-1, 0.15, 0).normalize();
    const windArrow = new THREE.ArrowHelper(
      windDir,
      new THREE.Vector3(0, 35, 0),
      50,
      0x60a5fa,
      8,
      5
    );
    scene.add(windArrow);
    windArrowRef.current = windArrow;

    const particleSystem = new ParticleSystem();
    scene.add(particleSystem.getPoints());
    particleSystemRef.current = particleSystem;

    sources.forEach((source) => {
      particleSystem.registerSource(source);
      createSourceMesh(source, scene);
    });

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      const deltaTime = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      pulseTimeRef.current += deltaTime;
      const pulseScale = 1 + 0.1 * Math.sin(pulseTimeRef.current * Math.PI * 2);
      sourceMeshesRef.current.forEach((mesh) => {
        mesh.scale.setScalar(pulseScale);
      });

      particleSystem.update(deltaTime);
      controls.update();
      renderer.render(scene, camera);

      frameCountRef.current++;
      fpsTimerRef.current += deltaTime;
      if (fpsTimerRef.current >= 0.5) {
        const fps = frameCountRef.current / fpsTimerRef.current;
        onFpsUpdate?.(fps);
        frameCountRef.current = 0;
        fpsTimerRef.current = 0;
      }
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);

      sourceMeshesRef.current.forEach((mesh) => {
        (mesh.material as THREE.Material).dispose();
        mesh.geometry.dispose();
      });
      sourceMeshesRef.current.clear();

      particleSystem.dispose();
      controls.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !particleSystemRef.current) return;

    const existingIds = new Set(sourceMeshesRef.current.keys());
    const newIds = new Set(sources.map((s) => s.id));

    existingIds.forEach((id) => {
      if (!newIds.has(id)) {
        const mesh = sourceMeshesRef.current.get(id);
        if (mesh) {
          scene.remove(mesh);
          (mesh.material as THREE.Material).dispose();
          mesh.geometry.dispose();
          sourceMeshesRef.current.delete(id);
          particleSystemRef.current?.unregisterSource(id);
        }
      }
    });

    sources.forEach((source) => {
      if (!sourceMeshesRef.current.has(source.id)) {
        createSourceMesh(source, scene);
      }
      particleSystemRef.current?.updateSource(source);
    });
  }, [sources]);

  const createSourceMesh = (source: PollutionSourceConfig, scene: THREE.Scene) => {
    const geometry = new THREE.SphereGeometry(3, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0.55,
      emissive: 0xff3333,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(source.position.x, source.position.y, source.position.z);
    mesh.castShadow = true;
    scene.add(mesh);
    sourceMeshesRef.current.set(source.id, mesh);

    const haloGeo = new THREE.SphereGeometry(5, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0.12
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(mesh.position);
    scene.add(halo);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0
      }}
    />
  );
});

export default SceneView;
