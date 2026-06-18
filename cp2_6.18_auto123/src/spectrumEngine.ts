import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus } from './eventBus';
import { getBandByIndex, SpectrumBand } from './waveData';

const WAVE_LENGTH = 10;
const VERTICES_PER_WAVE = 500;
const WAVE_SPACING = 1.5;
const TRANSITION_DURATION = 1500;

interface WaveState {
  amplitude: number;
  frequency: number;
  color: THREE.Color;
}

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let animationId: number;

let waveLines: THREE.Line[] = [];
let waveGeometries: THREE.BufferGeometry[] = [];
let scatterParticles: THREE.Points | null = null;
let starField: THREE.Points | null = null;

let currentState: WaveState = {
  amplitude: 1,
  frequency: 1,
  color: new THREE.Color(0.4, 0.2, 0.8),
};
let targetState: WaveState = { ...currentState };
let transitionStart = -1;
let transitionFromState: WaveState = { ...currentState };

let globalTime = 0;
let container: HTMLElement;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function calculateWaveParams(band: SpectrumBand): { amplitude: number; frequency: number } {
  const maxIndex = 6;
  const normalized = band.index / maxIndex;
  const amplitude = 1.5 - normalized * 1.2;
  const frequency = 1 + normalized * 9;
  return { amplitude, frequency };
}

function interpolateState(from: WaveState, to: WaveState, t: number): WaveState {
  const eased = easeInOutCubic(t);
  return {
    amplitude: from.amplitude + (to.amplitude - from.amplitude) * eased,
    frequency: from.frequency + (to.frequency - from.frequency) * eased,
    color: new THREE.Color().copy(from.color).lerp(to.color, eased),
  };
}

function createWaveGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array(VERTICES_PER_WAVE * 3);
  const colors = new Float32Array(VERTICES_PER_WAVE * 3);

  for (let i = 0; i < VERTICES_PER_WAVE; i++) {
    const z = -WAVE_LENGTH / 2 + (i / (VERTICES_PER_WAVE - 1)) * WAVE_LENGTH;
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function createStarField(): THREE.Points {
  const starsCount = 2000;
  const positions = new Float32Array(starsCount * 3);
  const sizes = new Float32Array(starsCount);

  for (let i = 0; i < starsCount; i++) {
    const radius = 50 + Math.random() * 50;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
    sizes[i] = 1 + Math.random() * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: 0xb0c4de,
    size: 0.15,
    transparent: true,
    opacity: 0.1,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}

function createScatterParticles(): THREE.Points {
  const count = 200;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 6;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.04,
    transparent: true,
    opacity: 0.15,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  (points.userData as { basePositions: Float32Array }).basePositions = new Float32Array(positions);
  return points;
}

function updateWaveGeometry(
  geometry: THREE.BufferGeometry,
  state: WaveState,
  time: number,
  yOffset: number,
): void {
  const positions = geometry.attributes.position.array as Float32Array;
  const colors = geometry.attributes.color.array as Float32Array;

  for (let i = 0; i < VERTICES_PER_WAVE; i++) {
    const z = -WAVE_LENGTH / 2 + (i / (VERTICES_PER_WAVE - 1)) * WAVE_LENGTH;
    const t = z * state.frequency + time;
    const y = yOffset + Math.sin(t) * state.amplitude;
    const y2 = yOffset * 0.6 + Math.cos(t * 0.7) * state.amplitude * 0.3;

    positions[i * 3] = y2;
    positions[i * 3 + 1] = y;

    const normalizedHeight = (y + state.amplitude) / (2 * state.amplitude);
    const whiteMix = Math.pow(Math.max(0, normalizedHeight - 0.5) * 2, 1.5);

    colors[i * 3] = state.color.r + (1 - state.color.r) * whiteMix;
    colors[i * 3 + 1] = state.color.g + (1 - state.color.g) * whiteMix;
    colors[i * 3 + 2] = state.color.b + (1 - state.color.b) * whiteMix;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
}

function onBandChange(bandIndex: number): void {
  const band = getBandByIndex(bandIndex);
  if (!band) return;

  const params = calculateWaveParams(band);
  transitionFromState = { ...currentState };
  targetState = {
    amplitude: params.amplitude,
    frequency: params.frequency,
    color: new THREE.Color(band.color.r, band.color.g, band.color.b),
  };
  transitionStart = performance.now();
}

function animate(): void {
  animationId = requestAnimationFrame(animate);

  const now = performance.now();
  let state: WaveState;

  if (transitionStart >= 0) {
    const elapsed = now - transitionStart;
    const progress = Math.min(1, elapsed / TRANSITION_DURATION);
    state = interpolateState(transitionFromState, targetState, progress);
    if (progress >= 1) {
      transitionStart = -1;
      currentState = { ...targetState };
    }
  } else {
    state = currentState;
  }

  globalTime += 0.02;

  waveGeometries.forEach((geo, idx) => {
    const yOffset = (idx - 1) * WAVE_SPACING;
    updateWaveGeometry(geo, state, globalTime + idx * 0.5, yOffset);
  });

  if (scatterParticles) {
    const basePositions = (scatterParticles.userData as { basePositions: Float32Array }).basePositions;
    const positions = scatterParticles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length / 3; i++) {
      const t = globalTime + i * 0.1;
      positions[i * 3] = basePositions[i * 3] + Math.sin(t) * 0.05;
      positions[i * 3 + 1] = basePositions[i * 3 + 1] + Math.cos(t * 0.8) * 0.05;
    }
    scatterParticles.geometry.attributes.position.needsUpdate = true;
  }

  controls.update();
  renderer.render(scene, camera);
}

export function initScene(containerId: string): void {
  container = document.getElementById(containerId)!;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(8, 6, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 2;
  controls.maxDistance = 20;
  controls.target.set(0, 0, 0);

  for (let i = 0; i < 3; i++) {
    const geometry = createWaveGeometry();
    waveGeometries.push(geometry);

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      linewidth: 2,
    });

    const line = new THREE.Line(geometry, material);
    waveLines.push(line);
    scene.add(line);

    const glowMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      linewidth: 6,
      blending: THREE.AdditiveBlending,
    });
    const glowLine = new THREE.Line(geometry, glowMaterial);
    scene.add(glowLine);
  }

  starField = createStarField();
  scene.add(starField);

  scatterParticles = createScatterParticles();
  scene.add(scatterParticles);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  eventBus.on('bandChange', (index) => onBandChange(index as number));

  window.addEventListener('resize', onWindowResize);

  animate();
}

export function updateWave(_bandIndex: number): void {
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function dispose(): void {
  if (animationId) cancelAnimationFrame(animationId);

  eventBus.removeAllListeners('bandChange');
  window.removeEventListener('resize', onWindowResize);

  waveGeometries.forEach((g) => g.dispose());
  waveLines.forEach((l) => {
    if (l.material instanceof THREE.Material) l.material.dispose();
  });

  if (starField) {
    starField.geometry.dispose();
    (starField.material as THREE.Material).dispose();
  }
  if (scatterParticles) {
    scatterParticles.geometry.dispose();
    (scatterParticles.material as THREE.Material).dispose();
  }

  renderer.dispose();
  if (container && renderer.domElement.parentNode === container) {
    container.removeChild(renderer.domElement);
  }
}

export { camera, scene };
