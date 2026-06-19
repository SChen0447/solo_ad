import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { OrbitalSystemParams, PlanetOrbitParams, StarType } from "./orbitCalculator";

export interface SceneHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  animationId: number;
  starMesh: THREE.Mesh | null;
  starGlow: THREE.Sprite | null;
  planetMeshes: THREE.Mesh[];
  orbitLines: THREE.Line[];
  orbitMarkers: THREE.Points[];
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  onPlanetClick: ((index: number) => void) | null;
  speedMultiplier: number;
  time: number;
  currentParams: OrbitalSystemParams | null;
  transitioning: boolean;
  transitionStart: number;
  transitionDuration: number;
  fromParams: OrbitalSystemParams | null;
  toParams: OrbitalSystemParams | null;
  starPulseTime: number;
  highlightMeshes: THREE.Mesh[];
  highlightTimers: Map<number, number>;
  velocityArrows: THREE.ArrowHelper[];
  backgroundStars: THREE.Points | null;
}

function cubicBezier(t: number): number {
  const p0 = 0;
  const p1 = 0.25;
  const p2 = 0.75;
  const p3 = 1;
  const u = 1 - t;
  return (
    u * u * u * p0 +
    3 * u * u * t * p1 +
    3 * u * t * t * p2 +
    t * t * t * p3
  );
}

function createStarfield(scene: THREE.Scene): THREE.Points {
  const count = 2000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 80 + Math.random() * 120;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const brightness = 0.5 + Math.random() * 0.5;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness + Math.random() * 0.2;

    sizes[i] = 0.3 + Math.random() * 0.7;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 0.4,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return points;
}

function createStarMesh(
  params: OrbitalSystemParams
): { mesh: THREE.Mesh; glow: THREE.Sprite; light: THREE.PointLight } {
  const star = params.star;
  const geometry = new THREE.SphereGeometry(star.radius, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(star.color),
  });
  const mesh = new THREE.Mesh(geometry, material);

  const glowTexture = createGlowTexture(star.glowColor);
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Sprite(glowMaterial);
  glow.scale.set(star.radius * 6, star.radius * 6, 1);

  const light = new THREE.PointLight(star.color, 2, 100);
  light.position.set(0, 0, 0);

  return { mesh, glow, light };
}

function createGlowTexture(colorStr: string): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  const color = new THREE.Color(colorStr);
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  gradient.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gradient.addColorStop(0.2, `rgba(${r},${g},${b},0.6)`);
  gradient.addColorStop(0.5, `rgba(${r},${g},${b},0.2)`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function createOrbitLine(
  planet: PlanetOrbitParams
): { line: THREE.Line; markers: THREE.Points } {
  const segments = 360;
  const a = planet.orbitRadius;
  const e = planet.eccentricity;
  const b = a * Math.sqrt(1 - e * e);
  const points: THREE.Vector3[] = [];
  const inclinationRad = (planet.inclination * Math.PI) / 180;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = a * Math.cos(angle);
    const z = b * Math.sin(angle);
    const y = z * Math.sin(inclinationRad);
    const adjustedZ = z * Math.cos(inclinationRad);
    points.push(new THREE.Vector3(x, y, adjustedZ));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0.35,
  });
  const line = new THREE.Line(geometry, material);

  const markerCount = 24;
  const markerPositions: THREE.Vector3[] = [];
  for (let i = 0; i < markerCount; i++) {
    const angle = (i / markerCount) * Math.PI * 2;
    const x = a * Math.cos(angle);
    const z = b * Math.sin(angle);
    const y = z * Math.sin(inclinationRad);
    const adjustedZ = z * Math.cos(inclinationRad);
    markerPositions.push(new THREE.Vector3(x, y, adjustedZ));
  }

  const markerGeometry = new THREE.BufferGeometry().setFromPoints(
    markerPositions
  );
  const markerMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true,
  });
  const markers = new THREE.Points(markerGeometry, markerMaterial);

  return { line, markers };
}

function createPlanetMesh(planet: PlanetOrbitParams): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(planet.radius, 24, 24);
  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(planet.color),
    shininess: 30,
    emissive: new THREE.Color(planet.color),
    emissiveIntensity: 0.15,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = { planetName: planet.name };
  return mesh;
}

function createVelocityArrow(planet: PlanetOrbitParams): THREE.ArrowHelper {
  const dir = new THREE.Vector3(0, 0, 1).normalize();
  const origin = new THREE.Vector3(planet.orbitRadius, 0, 0);
  const length = 0.8;
  const headLength = 0.2;
  const headWidth = 0.1;
  const color = new THREE.Color(planet.color);

  const arrow = new THREE.ArrowHelper(dir, origin, length, color, headLength, headWidth);
  return arrow;
}

function getOrbitPosition(
  planet: PlanetOrbitParams,
  angle: number
): THREE.Vector3 {
  const a = planet.orbitRadius;
  const e = planet.eccentricity;
  const b = a * Math.sqrt(1 - e * e);
  const inclinationRad = (planet.inclination * Math.PI) / 180;

  const x = a * Math.cos(angle);
  const z = b * Math.sin(angle);
  const y = z * Math.sin(inclinationRad);
  const adjustedZ = z * Math.cos(inclinationRad);

  return new THREE.Vector3(x, y, adjustedZ);
}

function getOrbitTangent(
  planet: PlanetOrbitParams,
  angle: number
): THREE.Vector3 {
  const a = planet.orbitRadius;
  const e = planet.eccentricity;
  const b = a * Math.sqrt(1 - e * e);
  const inclinationRad = (planet.inclination * Math.PI) / 180;

  const dx = -a * Math.sin(angle);
  const dz = b * Math.cos(angle);
  const dy = dz * Math.sin(inclinationRad);
  const adjustedDz = dz * Math.cos(inclinationRad);

  return new THREE.Vector3(dx, dy, adjustedDz).normalize();
}

export function createScene(container: HTMLElement): SceneHandle {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    500
  );
  camera.position.set(15, 12, 20);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 80;
  controls.target.set(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
  scene.add(ambientLight);

  const backgroundStars = createStarfield(scene);

  const handle: SceneHandle = {
    scene,
    camera,
    renderer,
    controls,
    animationId: 0,
    starMesh: null,
    starGlow: null,
    planetMeshes: [],
    orbitLines: [],
    orbitMarkers: [],
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    onPlanetClick: null,
    speedMultiplier: 1.0,
    time: 0,
    currentParams: null,
    transitioning: false,
    transitionStart: 0,
    transitionDuration: 2000,
    fromParams: null,
    toParams: null,
    starPulseTime: 0,
    highlightMeshes: [],
    highlightTimers: new Map(),
    velocityArrows: [],
    backgroundStars,
  };

  renderer.domElement.addEventListener("click", (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    handle.mouse.x =
      ((event.clientX - rect.left) / rect.width) * 2 - 1;
    handle.mouse.y =
      -((event.clientY - rect.top) / rect.height) * 2 + 1;

    handle.raycaster.setFromCamera(handle.mouse, handle.camera);
    const intersects = handle.raycaster.intersectObjects(
      handle.planetMeshes
    );

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const index = handle.planetMeshes.indexOf(clickedMesh);
      if (index !== -1 && handle.onPlanetClick) {
        highlightPlanet(handle, index);
        handle.onPlanetClick(index);
      }
    }
  });

  const onResize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    handle.camera.aspect = width / height;
    handle.camera.updateProjectionMatrix();
    handle.renderer.setSize(width, height);
  };
  window.addEventListener("resize", onResize);

  startAnimation(handle);

  return handle;
}

function startAnimation(handle: SceneHandle): void {
  let lastTime = performance.now();

  const animate = (now: number) => {
    handle.animationId = requestAnimationFrame(animate);

    const delta = (now - lastTime) / 1000;
    lastTime = now;
    handle.time += delta * handle.speedMultiplier;
    handle.starPulseTime += delta;

    if (handle.transitioning && handle.fromParams && handle.toParams) {
      const elapsed = now - handle.transitionStart;
      let t = Math.min(elapsed / handle.transitionDuration, 1);
      t = cubicBezier(t);
      updateTransition(handle, t);
      if (t >= 1) {
        handle.transitioning = false;
        handle.fromParams = null;
        handle.toParams = null;
      }
    }

    updatePlanetPositions(handle);
    updateStarPulse(handle);
    updateHighlights(handle, now);

    handle.controls.update();
    handle.renderer.render(handle.scene, handle.camera);
  };

  handle.animationId = requestAnimationFrame(animate);
}

function updatePlanetPositions(handle: SceneHandle): void {
  if (!handle.currentParams) return;

  const planets = handle.currentParams.planets;
  for (let i = 0; i < planets.length; i++) {
    const planet = planets[i];
    const mesh = handle.planetMeshes[i];
    if (!mesh) continue;

    const angularSpeed = (2 * Math.PI) / Math.max(planet.period, 1);
    const angle = handle.time * angularSpeed;

    const pos = getOrbitPosition(planet, angle);
    mesh.position.copy(pos);

    mesh.rotation.y += (Math.PI * 2 * (1 / 2)) * (1 / 60) * handle.speedMultiplier;

    if (handle.velocityArrows[i]) {
      const tangent = getOrbitTangent(planet, angle);
      handle.velocityArrows[i].position.copy(pos);
      handle.velocityArrows[i].setDirection(tangent);
    }
  }
}

function updateStarPulse(handle: SceneHandle): void {
  if (!handle.starGlow || !handle.currentParams) return;

  const star = handle.currentParams.star;
  const pulsePhase = Math.sin(handle.starPulseTime * 1.5) * 0.5 + 0.5;
  const baseScale = star.radius * 6;
  const scale = baseScale * (0.8 + pulsePhase * 0.4);
  handle.starGlow.scale.set(scale, scale, 1);
  handle.starGlow.material.opacity = 0.3 + pulsePhase * 0.3;

  if (handle.currentParams.star.type === "red-giant") {
    const pulsate = Math.sin(handle.starPulseTime * 0.8) * 0.1 + 1.0;
    if (handle.starMesh) {
      handle.starMesh.scale.set(pulsate, pulsate, pulsate);
    }
  }

  if (handle.currentParams.star.type === "white-dwarf") {
    const flicker = Math.sin(handle.starPulseTime * 5) * 0.3 + 0.7;
    handle.starGlow.material.opacity = flicker * 0.6;
  }
}

function updateHighlights(handle: SceneHandle, now: number): void {
  const toRemove: number[] = [];
  handle.highlightTimers.forEach((startTime, index) => {
    const elapsed = now - startTime;
    if (elapsed > 1500) {
      const mesh = handle.highlightMeshes[index];
      if (mesh) {
        handle.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        handle.highlightMeshes[index] = null as unknown as THREE.Mesh;
      }
      toRemove.push(index);
    } else {
      const opacity = 1 - elapsed / 1500;
      const mesh = handle.highlightMeshes[index];
      if (mesh) {
        (mesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.6;
        const scale = 1 + (elapsed / 1500) * 0.5;
        mesh.scale.set(scale, scale, scale);
      }
    }
  });
  toRemove.forEach((i) => handle.highlightTimers.delete(i));
}

function updateTransition(handle: SceneHandle, t: number): void {
  if (!handle.fromParams || !handle.toParams) return;

  const fromPlanets = handle.fromParams.planets;
  const toPlanets = handle.toParams.planets;

  for (let i = 0; i < toPlanets.length; i++) {
    const from = fromPlanets[i];
    const to = toPlanets[i];
    const orbitLine = handle.orbitLines[i];
    const orbitMarkers = handle.orbitMarkers[i];

    if (!orbitLine || !orbitMarkers) continue;

    const a = from.orbitRadius + (to.orbitRadius - from.orbitRadius) * t;
    const e = to.eccentricity;
    const b = a * Math.sqrt(1 - e * e);
    const inclinationRad =
      ((from.inclination + (to.inclination - from.inclination) * t) * Math.PI) /
      180;

    const segments = 360;
    const points: THREE.Vector3[] = [];
    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      const x = a * Math.cos(angle);
      const z = b * Math.sin(angle);
      const y = z * Math.sin(inclinationRad);
      const adjustedZ = z * Math.cos(inclinationRad);
      points.push(new THREE.Vector3(x, y, adjustedZ));
    }

    orbitLine.geometry.dispose();
    orbitLine.geometry = new THREE.BufferGeometry().setFromPoints(points);

    const markerCount = 24;
    const markerPositions: THREE.Vector3[] = [];
    for (let j = 0; j < markerCount; j++) {
      const angle = (j / markerCount) * Math.PI * 2;
      const x = a * Math.cos(angle);
      const z = b * Math.sin(angle);
      const y = z * Math.sin(inclinationRad);
      const adjustedZ = z * Math.cos(inclinationRad);
      markerPositions.push(new THREE.Vector3(x, y, adjustedZ));
    }
    orbitMarkers.geometry.dispose();
    orbitMarkers.geometry = new THREE.BufferGeometry().setFromPoints(
      markerPositions
    );
  }

  if (t >= 1) {
    handle.currentParams = handle.toParams;
  } else {
    const interpolated: OrbitalSystemParams = {
      star: handle.toParams.star,
      planets: fromPlanets.map((from, i) => {
        const to = toPlanets[i];
        return {
          ...to,
          orbitRadius: from.orbitRadius + (to.orbitRadius - from.orbitRadius) * t,
          inclination: from.inclination + (to.inclination - from.inclination) * t,
        };
      }),
    };
    handle.currentParams = interpolated;
  }
}

export function updateOrbitalSystem(
  handle: SceneHandle,
  params: OrbitalSystemParams,
  animate: boolean = true
): void {
  if (handle.currentParams && animate) {
    handle.transitioning = true;
    handle.transitionStart = performance.now();
    handle.fromParams = handle.currentParams;
    handle.toParams = params;
  }

  clearSceneObjects(handle);

  const { mesh: starMesh, glow: starGlow, light } = createStarMesh(params);
  handle.scene.add(starMesh);
  handle.scene.add(starGlow);
  handle.scene.add(light);
  handle.starMesh = starMesh;
  handle.starGlow = starGlow;

  const planetMeshes: THREE.Mesh[] = [];
  const orbitLines: THREE.Line[] = [];
  const orbitMarkers: THREE.Points[] = [];
  const velocityArrows: THREE.ArrowHelper[] = [];

  params.planets.forEach((planet) => {
    const { line, markers } = createOrbitLine(planet);
    handle.scene.add(line);
    handle.scene.add(markers);
    orbitLines.push(line);
    orbitMarkers.push(markers);

    const mesh = createPlanetMesh(planet);
    handle.scene.add(mesh);
    planetMeshes.push(mesh);

    const arrow = createVelocityArrow(planet);
    handle.scene.add(arrow);
    velocityArrows.push(arrow);
  });

  handle.planetMeshes = planetMeshes;
  handle.orbitLines = orbitLines;
  handle.orbitMarkers = orbitMarkers;
  handle.velocityArrows = velocityArrows;
  handle.highlightMeshes = new Array(planetMeshes.length).fill(null);

  if (!animate) {
    handle.currentParams = params;
  }
}

function clearSceneObjects(handle: SceneHandle): void {
  if (handle.starMesh) {
    handle.scene.remove(handle.starMesh);
    handle.starMesh.geometry.dispose();
    (handle.starMesh.material as THREE.Material).dispose();
  }
  if (handle.starGlow) {
    handle.scene.remove(handle.starGlow);
    handle.starGlow.material.dispose();
    if ((handle.starGlow.material as THREE.SpriteMaterial).map) {
      (handle.starGlow.material as THREE.SpriteMaterial).map!.dispose();
    }
  }

  handle.scene.children
    .filter(
      (c) =>
        c instanceof THREE.PointLight ||
        c instanceof THREE.Line ||
        c instanceof THREE.Points ||
        (c instanceof THREE.Mesh && c !== handle.starMesh && c !== handle.backgroundStars) ||
        c instanceof THREE.ArrowHelper
    )
    .forEach((c) => {
      handle.scene.remove(c);
      if (c instanceof THREE.Mesh || c instanceof THREE.Line || c instanceof THREE.Points) {
        c.geometry.dispose();
        if (c.material instanceof THREE.Material) {
          c.material.dispose();
        }
      }
    });

  handle.planetMeshes = [];
  handle.orbitLines = [];
  handle.orbitMarkers = [];
  handle.velocityArrows = [];
  handle.highlightMeshes = [];
  handle.highlightTimers.clear();
}

export function setSpeedMultiplier(
  handle: SceneHandle,
  speed: number
): void {
  handle.speedMultiplier = speed;
}

export function highlightPlanet(
  handle: SceneHandle,
  planetIndex: number
): void {
  if (planetIndex < 0 || planetIndex >= handle.planetMeshes.length) return;

  if (handle.highlightMeshes[planetIndex]) {
    handle.scene.remove(handle.highlightMeshes[planetIndex]);
    handle.highlightMeshes[planetIndex].geometry.dispose();
    (handle.highlightMeshes[planetIndex].material as THREE.Material).dispose();
  }

  const planet = handle.planetMeshes[planetIndex];
  const highlightGeometry = new THREE.SphereGeometry(
    planet.geometry.parameters.radius * 1.8,
    16,
    16
  );
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(planet.userData.planetName === "地球型" ? 0x4488ff : 0xffffff),
    transparent: true,
    opacity: 0.6,
    side: THREE.BackSide,
  });
  const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
  highlightMesh.position.copy(planet.position);
  handle.scene.add(highlightMesh);
  handle.highlightMeshes[planetIndex] = highlightMesh;
  handle.highlightTimers.set(planetIndex, performance.now());
}

export function resetCamera(handle: SceneHandle): void {
  handle.camera.position.set(15, 12, 20);
  handle.controls.target.set(0, 0, 0);
  handle.controls.update();
}

export function dispose(handle: SceneHandle): void {
  cancelAnimationFrame(handle.animationId);
  handle.renderer.dispose();
  handle.controls.dispose();
  if (handle.renderer.domElement.parentElement) {
    handle.renderer.domElement.parentElement.removeChild(
      handle.renderer.domElement
    );
  }
}
