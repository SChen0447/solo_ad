import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioManager } from './audioManager';
import { ParticleSystem, LayoutType } from './particleSystem';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let clock: THREE.Clock;

let audioManager: AudioManager;
let particleSystem: ParticleSystem;
let torus: THREE.LineSegments;
let torusColorStart: THREE.Color;
let torusColorEnd: THREE.Color;
let starField: THREE.Points;

let peakFreqEl: HTMLElement;
let avgAmpEl: HTMLElement;
let rmsValEl: HTMLElement;
let progressBar: HTMLElement;
let playTopBtn: HTMLButtonElement;
let playSidebarBtn: HTMLButtonElement;
let playSidebarText: HTMLElement;
let playIconTop: SVGElement;
let speedLabelEl: HTMLElement;
let fileInput: HTMLInputElement;
let fileBtn: HTMLButtonElement;
let layoutBtns: NodeListOf<HTMLButtonElement>;

let infoUpdateAccumulator: number = 0;
const INFO_UPDATE_INTERVAL: number = 1 / 30;

const TORUS_ROTATION_SPEED = 0.2;
const STAR_ROTATION_SPEED = 0.01;

function init(): void {
  initThree();
  initAudio();
  initUI();
  initEventListeners();
  animate();
}

function initThree(): void {
  const container = document.getElementById('canvas-container')!;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 30;

  clock = new THREE.Clock();

  particleSystem = new ParticleSystem(scene);

  createTorus();
  createStarField();

  window.addEventListener('resize', onWindowResize);
}

function createTorus(): void {
  const torusGeometry = new THREE.TorusGeometry(4.5, 0.05, 8, 64);
  torusColorStart = new THREE.Color(0xff3366);
  torusColorEnd = new THREE.Color(0x3366ff);

  const positions = torusGeometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const t = i / positions.count;
    const c = torusColorStart.clone().lerp(torusColorEnd, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  torusGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const edges = new THREE.EdgesGeometry(torusGeometry);
  const torusMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });
  torus = new THREE.LineSegments(edges, torusMaterial);
  scene.add(torus);
}

function updateTorusColor(avgAmplitude: number): void {
  const t = (avgAmplitude / 255 + performance.now() * 0.0001) % 1;
  const color = torusColorStart.clone().lerp(torusColorEnd, t);
  const mat = torus.material as THREE.LineBasicMaterial;
  mat.color.copy(color);
}

function createStarField(): void {
  const starCount = 1000;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const r = 15 + Math.random() * 25;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = 1 + Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.05,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    depthWrite: false,
  });

  starField = new THREE.Points(geometry, material);
  scene.add(starField);
}

function initAudio(): void {
  audioManager = new AudioManager();
  audioManager.setOnEnded(() => {
    updatePlayButtonState(false);
  });
}

function initUI(): void {
  peakFreqEl = document.getElementById('peak-freq')!;
  avgAmpEl = document.getElementById('avg-amp')!;
  rmsValEl = document.getElementById('rms-val')!;
  progressBar = document.getElementById('progress-bar')!;
  playTopBtn = document.getElementById('play-top') as HTMLButtonElement;
  playSidebarBtn = document.getElementById('play-sidebar') as HTMLButtonElement;
  playSidebarText = document.getElementById('play-sidebar-text')!;
  playIconTop = document.getElementById('play-icon-top') as SVGElement;
  speedLabelEl = document.getElementById('speed-label')!;
  fileInput = document.getElementById('file-input') as HTMLInputElement;
  fileBtn = document.getElementById('file-btn') as HTMLButtonElement;
  layoutBtns = document.querySelectorAll('.layout-btn') as NodeListOf<HTMLButtonElement>;

  updateSpeedLabel();
}

function initEventListeners(): void {
  fileBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      await audioManager.loadFile(file);
      playTopBtn.disabled = false;
      playSidebarBtn.disabled = false;
      audioManager.play();
      updatePlayButtonState(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载失败';
      alert(msg);
    } finally {
      fileInput.value = '';
    }
  });

  playTopBtn.addEventListener('click', togglePlay);
  playSidebarBtn.addEventListener('click', togglePlay);

  layoutBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const layout = btn.dataset.layout as LayoutType;
      if (layout) {
        setLayout(layout);
      }
    });
  });

  window.addEventListener('keydown', onKeyDown);
}

function togglePlay(): void {
  if (!audioManager.hasAudio()) return;

  if (audioManager.getIsPlaying()) {
    audioManager.pause();
    updatePlayButtonState(false);
  } else {
    audioManager.play();
    updatePlayButtonState(true);
  }
}

function updatePlayButtonState(isPlaying: boolean): void {
  if (isPlaying) {
    playIconTop.innerHTML = '<rect x="6" y="4" width="4" height="16" fill="currentColor"></rect><rect x="14" y="4" width="4" height="16" fill="currentColor"></rect>';
    playSidebarText.textContent = '暂停';
    playSidebarBtn.querySelector('svg')!.innerHTML = '<rect x="6" y="4" width="4" height="16" fill="currentColor"></rect><rect x="14" y="4" width="4" height="16" fill="currentColor"></rect>';
  } else {
    playIconTop.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon>';
    playSidebarText.textContent = '播放';
    playSidebarBtn.querySelector('svg')!.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon>';
  }
}

function setLayout(layout: LayoutType): void {
  particleSystem.setLayout(layout);
  layoutBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.layout === layout);
  });
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.target instanceof HTMLInputElement) return;

  switch (e.key) {
    case '1':
      setLayout('sphere');
      break;
    case '2':
      setLayout('spiral');
      break;
    case '3':
      setLayout('waterfall');
      break;
    case '+':
    case '=':
      e.preventDefault();
      adjustSpeed(0.1);
      break;
    case '-':
    case '_':
      e.preventDefault();
      adjustSpeed(-0.1);
      break;
    case ' ':
      e.preventDefault();
      togglePlay();
      break;
  }
}

function adjustSpeed(delta: number): void {
  const newSpeed = Math.max(0.5, Math.min(2.0, particleSystem.getSpeedMultiplier() + delta));
  particleSystem.setSpeedMultiplier(newSpeed);
  updateSpeedLabel();
}

function updateSpeedLabel(): void {
  speedLabelEl.textContent = `${particleSystem.getSpeedMultiplier().toFixed(1)}x`;
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function computeAudioStats(frequencyData: Uint8Array): { peak: number; avg: number; rms: number } {
  let sum = 0;
  let peak = 0;
  let peakIndex = 0;
  let sumSq = 0;

  for (let i = 0; i < frequencyData.length; i++) {
    const v = frequencyData[i];
    sum += v;
    sumSq += v * v;
    if (v > peak) {
      peak = v;
      peakIndex = i;
    }
  }

  const avg = sum / frequencyData.length;
  const rms = Math.sqrt(sumSq / frequencyData.length);

  const audioCtxSampleRate = 44100;
  const nyquist = audioCtxSampleRate / 2;
  const binWidth = nyquist / 128;
  const peakFreqHz = peakIndex * binWidth;

  return { peak: peakFreqHz, avg, rms };
}

function updateInfoDisplay(frequencyData: Uint8Array): void {
  const { peak, avg, rms } = computeAudioStats(frequencyData);
  peakFreqEl.textContent = `${peak.toFixed(0)} Hz`;
  avgAmpEl.textContent = avg.toFixed(1);
  rmsValEl.textContent = rms.toFixed(1);
  updateTorusColor(avg);
}

function updateProgress(): void {
  const duration = audioManager.getDuration();
  if (duration > 0) {
    const current = audioManager.getCurrentTime();
    const percent = Math.min(100, (current / duration) * 100);
    progressBar.style.width = `${percent}%`;
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.1);

  const frequencyData = audioManager.getFrequencyData();
  particleSystem.update(frequencyData, deltaTime);

  torus.rotation.y += TORUS_ROTATION_SPEED * deltaTime * particleSystem.getSpeedMultiplier();
  torus.rotation.x += TORUS_ROTATION_SPEED * 0.3 * deltaTime * particleSystem.getSpeedMultiplier();
  starField.rotation.y += STAR_ROTATION_SPEED * deltaTime;

  infoUpdateAccumulator += deltaTime;
  if (infoUpdateAccumulator >= INFO_UPDATE_INTERVAL) {
    infoUpdateAccumulator = 0;
    if (audioManager.hasAudio()) {
      updateInfoDisplay(frequencyData);
      updateProgress();
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

init();
