import * as THREE from 'three';
import {
  initScene,
  scene,
  camera,
  renderer,
  controls,
  getGroundPlane,
  CITY_SIZE,
} from './SceneSetup';
import {
  useWindStore,
  showWindSourcePanel,
  hideWindSourcePanel,
  initLayersPanel,
  createWindCone,
  removeWindCone,
  updateCones,
  updateRecordButton,
  WindSourceData,
} from './WindSource';
import {
  initParticleSystem,
  updateParticles,
  resetAllParticles,
} from './ParticleSystem';

let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let groundPlane: THREE.Plane;
let clock: THREE.Clock;

let isRecording = false;
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let recordingStartTime = 0;
let recordingIndicator: HTMLElement | null = null;
let autoRotateAngle = 0;
let isAutoRotating = false;

const app = document.getElementById('app')!;
const uiLayer = document.getElementById('ui-layer')!;

function init() {
  initScene(app);
  initParticleSystem();
  initLayersPanel();

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  groundPlane = getGroundPlane();
  clock = new THREE.Clock();

  setupEventListeners();
  setupWindSourceSync();
  addHintText();

  animate();
}

function setupEventListeners() {
  renderer.domElement.addEventListener('click', onCanvasClick);
  window.addEventListener('toggleRecording', toggleRecording);
}

function setupWindSourceSync() {
  const prevSources = new Map<string, WindSourceData>();

  useWindStore.subscribe((state) => {
    const { windSources } = state;
    const currentIds = new Set(windSources.map((s) => s.id));

    prevSources.forEach((source, id) => {
      if (!currentIds.has(id)) {
        removeWindCone(id);
        prevSources.delete(id);
      }
    });

    windSources.forEach((source) => {
      if (!prevSources.has(source.id)) {
        createWindCone(source);
        prevSources.set(source.id, source);
      } else {
        const prev = prevSources.get(source.id)!;
        if (
          prev.direction !== source.direction ||
          prev.position.distanceTo(source.position) > 0.01
        ) {
          removeWindCone(source.id);
          createWindCone(source);
          prevSources.set(source.id, source);
        }
      }
    });

    if (windSources.length === 0) {
      resetAllParticles();
    }
  });
}

function addHintText() {
  const hint = document.createElement('div');
  hint.className = 'hint-text';
  hint.textContent = '🖱️ 点击地面添加风源 | 拖拽旋转视角 | 滚轮缩放';
  uiLayer.appendChild(hint);
}

function onCanvasClick(event: MouseEvent) {
  const uiTarget = event.target as HTMLElement;
  if (uiTarget.closest('.glass-panel') || uiTarget.closest('.wind-source-panel')) {
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersectPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(groundPlane, intersectPoint);

  if (intersectPoint) {
    const halfCity = CITY_SIZE / 2;
    if (
      Math.abs(intersectPoint.x) < halfCity &&
      Math.abs(intersectPoint.z) < halfCity
    ) {
      hideWindSourcePanel();
      showWindSourcePanel(intersectPoint, event.clientX, event.clientY);
    }
  }
}

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  const canvas = renderer.domElement;

  const stream = canvas.captureStream(60);

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 8000000,
  });

  recordedChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `city-airflow-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  mediaRecorder.start();
  isRecording = true;
  recordingStartTime = Date.now();
  isAutoRotating = true;
  autoRotateAngle = 0;

  showRecordingIndicator();
  updateRecordButton(true);
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    isAutoRotating = false;
    hideRecordingIndicator();
    updateRecordButton(false);
  }
}

function showRecordingIndicator() {
  recordingIndicator = document.createElement('div');
  recordingIndicator.className = 'recording-indicator';
  recordingIndicator.innerHTML = `
    <div class="recording-dot"></div>
    <span class="recording-time">00:00</span>
  `;
  uiLayer.appendChild(recordingIndicator);
}

function hideRecordingIndicator() {
  if (recordingIndicator) {
    recordingIndicator.remove();
    recordingIndicator = null;
  }
}

function updateRecordingTime() {
  if (!isRecording || !recordingIndicator) return;

  const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  const timeEl = recordingIndicator.querySelector('.recording-time');
  if (timeEl) {
    timeEl.textContent = `${minutes}:${seconds}`;
  }

  if (elapsed >= 10) {
    stopRecording();
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (isAutoRotating) {
    autoRotateAngle += delta * 0.3;
    const radius = 450;
    const height = 300;
    camera.position.x = Math.sin(autoRotateAngle) * radius;
    camera.position.z = Math.cos(autoRotateAngle) * radius;
    camera.position.y = height;
    camera.lookAt(0, 0, 0);

    if (autoRotateAngle >= Math.PI * 2) {
      stopRecording();
    }
  } else {
    controls.update();
  }

  updateCones(delta);
  updateParticles(delta, time);
  updateRecordingTime();

  renderer.render(scene, camera);
}

init();
