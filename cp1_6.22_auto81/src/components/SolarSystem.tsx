import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BASE_PLANETS, calculateUpdatedOrbit, getOrbitPosition, easeOut, lerp, PlanetData } from '../utils/orbitPhysics';

export interface PlanetRuntimeData {
  orbitRadius: number;
  orbitalPeriod: number;
  orbitalVelocity: number;
  currentAngle: number;
}

export interface SolarSystemHandle {
  getPlanetData: (planetKey: string) => PlanetRuntimeData | null;
  updatePlanetParams: (planetKey: string, massMultiplier: number, radiusMultiplier: number) => void;
  togglePause: () => void;
  isPaused: () => boolean;
}

interface PlanetObject {
  mesh: THREE.Mesh;
  orbitLine: THREE.Line;
  trailParticles: THREE.Points;
  color: string;
  baseOrbitRadius: number;
  currentOrbitRadius: number;
  targetOrbitRadius: number;
  baseOrbitalPeriod: number;
  currentOrbitalPeriod: number;
  targetOrbitalPeriod: number;
  currentAngle: number;
  trailAngles: number[];
  animating: boolean;
  animStartTime: number;
  startOrbitRadius: number;
  startOrbitalPeriod: number;
  animDuration: number;
}

const SCALE_FACTOR = 5;
const TIME_SCALE = 0.5;
const TRAIL_PARTICLE_COUNT = 120;
const ANIM_DURATION = 500;

const SolarSystem = forwardRef<SolarSystemHandle>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const planetsRef = useRef<Map<string, PlanetObject>>(new Map());
  const animationIdRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const lastTimeRef = useRef(0);

  useImperativeHandle(ref, () => ({
    getPlanetData: (planetKey: string) => {
      const planet = planetsRef.current.get(planetKey);
      if (!planet) return null;
      return {
        orbitRadius: planet.currentOrbitRadius,
        orbitalPeriod: planet.currentOrbitalPeriod,
        orbitalVelocity: (2 * Math.PI * planet.currentOrbitRadius * 1.496e8) / (planet.currentOrbitalPeriod * 365.25 * 24 * 3600),
        currentAngle: planet.currentAngle
      };
    },
    updatePlanetParams: (planetKey: string, massMultiplier: number, radiusMultiplier: number) => {
      const planet = planetsRef.current.get(planetKey);
      if (!planet) return;
      
      const updated = calculateUpdatedOrbit(planetKey, massMultiplier, radiusMultiplier);
      
      planet.startOrbitRadius = planet.currentOrbitRadius;
      planet.startOrbitalPeriod = planet.currentOrbitalPeriod;
      planet.targetOrbitRadius = updated.orbitRadius;
      planet.targetOrbitalPeriod = updated.orbitalPeriod;
      planet.animating = true;
      planet.animStartTime = performance.now();
      planet.animDuration = ANIM_DURATION;
    },
    togglePause: () => {
      pausedRef.current = !pausedRef.current;
    },
    isPaused: () => pausedRef.current
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a2a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 20);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 100;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    createSun(scene);
    createPlanets(scene);
    createStars(scene);

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        pausedRef.current = !pausedRef.current;
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    lastTimeRef.current = performance.now();
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      if (!pausedRef.current) {
        updatePlanets(deltaTime, currentTime);
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationIdRef.current);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const createSun = (scene: THREE.Scene) => {
    const sunGeometry = new THREE.SphereGeometry(2, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    const glowGeometry = new THREE.BufferGeometry();
    const glowCount = 200;
    const glowPositions = new Float32Array(glowCount * 3);
    const glowSizes = new Float32Array(glowCount);

    for (let i = 0; i < glowCount; i++) {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const radius = 2.2 + Math.random() * 1.5;
      
      glowPositions[i * 3] = radius * Math.cos(angle1) * Math.sin(angle2);
      glowPositions[i * 3 + 1] = radius * Math.sin(angle1) * Math.sin(angle2);
      glowPositions[i * 3 + 2] = radius * Math.cos(angle2);
      glowSizes[i] = Math.random() * 2 + 1;
    }

    glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
    glowGeometry.setAttribute('size', new THREE.BufferAttribute(glowSizes, 1));

    const glowMaterial = new THREE.PointsMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.6,
      size: 0.1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });

    const glowParticles = new THREE.Points(glowGeometry, glowMaterial);
    scene.add(glowParticles);

    const pointLight = new THREE.PointLight(0xffaa33, 2, 100);
    scene.add(pointLight);
  };

  const createPlanets = (scene: THREE.Scene) => {
    const planetKeys = ['mercury', 'venus', 'earth', 'mars'];
    
    planetKeys.forEach((key) => {
      const config = BASE_PLANETS[key];
      const scaledOrbitRadius = config.orbitRadius * SCALE_FACTOR;
      const scaledRadius = config.radius * 0.3;

      const planetGeometry = new THREE.SphereGeometry(scaledRadius, 32, 32);
      const planetMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(config.color),
        roughness: 0.7,
        metalness: 0.1
      });
      const planet = new THREE.Mesh(planetGeometry, planetMaterial);
      scene.add(planet);

      const orbitPoints: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const angle = (i / 128) * Math.PI * 2;
        orbitPoints.push(new THREE.Vector3(
          Math.cos(angle) * scaledOrbitRadius,
          0,
          Math.sin(angle) * scaledOrbitRadius
        ));
      }
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(config.color),
        transparent: true,
        opacity: 0.3
      });
      const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
      scene.add(orbitLine);

      const trailGeometry = new THREE.BufferGeometry();
      const trailPositions = new Float32Array(TRAIL_PARTICLE_COUNT * 3);
      const trailSizes = new Float32Array(TRAIL_PARTICLE_COUNT);
      
      for (let i = 0; i < TRAIL_PARTICLE_COUNT; i++) {
        trailPositions[i * 3] = 0;
        trailPositions[i * 3 + 1] = 0;
        trailPositions[i * 3 + 2] = 0;
        trailSizes[i] = 0.05;
      }
      
      trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));
      
      const trailMaterial = new THREE.PointsMaterial({
        color: new THREE.Color(config.color),
        transparent: true,
        opacity: 0.5,
        size: 0.05,
        sizeAttenuation: true
      });
      
      const trailParticles = new THREE.Points(trailGeometry, trailMaterial);
      scene.add(trailParticles);

      const initialAngle = Math.random() * Math.PI * 2;
      const initialPos = getOrbitPosition(scaledOrbitRadius, initialAngle);
      planet.position.set(initialPos.x, initialPos.y, initialPos.z);

      const trailAngles: number[] = [];
      for (let i = 0; i < TRAIL_PARTICLE_COUNT; i++) {
        const trailAngle = initialAngle - (i / TRAIL_PARTICLE_COUNT) * Math.PI * 2;
        trailAngles.push(trailAngle);
      }

      planetsRef.current.set(key, {
        mesh: planet,
        orbitLine,
        trailParticles,
        color: config.color,
        baseOrbitRadius: scaledOrbitRadius,
        currentOrbitRadius: scaledOrbitRadius,
        targetOrbitRadius: scaledOrbitRadius,
        baseOrbitalPeriod: config.orbitalPeriod,
        currentOrbitalPeriod: config.orbitalPeriod,
        targetOrbitalPeriod: config.orbitalPeriod,
        currentAngle: initialAngle,
        trailAngles,
        animating: false,
        animStartTime: 0,
        startOrbitRadius: scaledOrbitRadius,
        startOrbitalPeriod: config.orbitalPeriod,
        animDuration: ANIM_DURATION
      });
    });
  };

  const createStars = (scene: THREE.Scene) => {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 80 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      sizes[i] = Math.random() * 0.5 + 0.1;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      size: 0.15,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
  };

  const updatePlanets = (deltaTime: number, currentTime: number) => {
    planetsRef.current.forEach((planet, key) => {
      if (planet.animating) {
        const elapsed = currentTime - planet.animStartTime;
        const progress = Math.min(elapsed / planet.animDuration, 1);
        const easedProgress = easeOut(progress);

        planet.currentOrbitRadius = lerp(planet.startOrbitRadius, planet.targetOrbitRadius, easedProgress);
        planet.currentOrbitalPeriod = lerp(planet.startOrbitalPeriod, planet.targetOrbitalPeriod, easedProgress);

        updateOrbitLine(planet);

        if (progress >= 1) {
          planet.animating = false;
        }
      }

      const angularVelocity = (2 * Math.PI) / planet.currentOrbitalPeriod * TIME_SCALE;
      planet.currentAngle += angularVelocity * deltaTime;
      
      if (planet.currentAngle > Math.PI * 2) {
        planet.currentAngle -= Math.PI * 2;
      }

      const pos = getOrbitPosition(planet.currentOrbitRadius, planet.currentAngle);
      planet.mesh.position.set(pos.x, pos.y, pos.z);

      updateTrailParticles(planet);
    });
  };

  const updateOrbitLine = (planet: PlanetObject) => {
    const positions = planet.orbitLine.geometry.attributes.position.array as Float32Array;
    const pointCount = positions.length / 3;
    
    for (let i = 0; i < pointCount; i++) {
      const angle = (i / (pointCount - 1)) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * planet.currentOrbitRadius;
      positions[i * 3 + 2] = Math.sin(angle) * planet.currentOrbitRadius;
    }
    
    planet.orbitLine.geometry.attributes.position.needsUpdate = true;
  };

  const updateTrailParticles = (planet: PlanetObject) => {
    const positions = planet.trailParticles.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < TRAIL_PARTICLE_COUNT; i++) {
      const trailProgress = i / TRAIL_PARTICLE_COUNT;
      const trailAngle = planet.currentAngle - trailProgress * Math.PI * 2;
      const pos = getOrbitPosition(planet.currentOrbitRadius, trailAngle);
      
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
    }
    
    planet.trailParticles.geometry.attributes.position.needsUpdate = true;
  };

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
});

SolarSystem.displayName = 'SolarSystem';

export default SolarSystem;
