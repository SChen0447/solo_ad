import * as THREE from 'three';
import { HandTracker, HandData, TrackingResult } from './handTracker';
import { MeshDeformer, DeformParams } from './meshDeformer';

const GESTURE_TEXT_MAP: Record<string, string> = {
  pinch: '捏合',
  open: '张开',
  knead: '揉捏',
  fist: '握拳',
  unknown: '未知'
};

const GESTURE_ICON_MAP: Record<string, string> = {
  pinch: '✊',
  open: '✋',
  knead: '🌀',
  fist: '✊',
  unknown: '✋'
};

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private handTracker: HandTracker | null = null;
  private meshDeformer: MeshDeformer;
  private currentHands: HandData[] = [];
  private lastFrameTime: number = performance.now();
  private frameTimes: number[] = [];
  private lowFrameCount: number = 0;
  private consecutiveLowFrames: number = 0;
  private fpsCounter: number = 0;
  private fpsLastUpdate: number = performance.now();
  private fpsFrameCount: number = 0;
  private deformWorker: Worker | null = null;
  private kneadPhase: number = 0;
  private pendingWorkerResult: Float32Array | null = null;
  private workerBusy: boolean = false;
  private autoOptimized: boolean = false;
  private performanceWarningTimeout: number | null = null;
  private panelHidden: boolean = false;
  private wasLeftPinching: boolean = false;
  private wasRightPinching: boolean = false;
  private wasBothPinching: boolean = false;
  private bothPinchFadeTimer: number | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1A2A2A);

    const container = document.getElementById('canvas-container')!;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 4);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.setupLights();

    this.meshDeformer = new MeshDeformer();
    const meshGroup = this.meshDeformer.createMesh(3);
    this.scene.add(meshGroup);

    this.initDeformWorker();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x7FB3B3, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x7FB3B3, 0.4);
    pointLight1.position.set(-3, 2, 2);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xA0B0F0, 0.3);
    pointLight2.position.set(3, -2, -2);
    this.scene.add(pointLight2);
  }

  private initDeformWorker(): void {
    try {
      this.deformWorker = new Worker(
        new URL('./deformWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.deformWorker.onmessage = (e: MessageEvent) => {
        this.pendingWorkerResult = e.data.targetPositions;
        this.workerBusy = false;
      };

      this.deformWorker.onerror = (error) => {
        console.warn('Deform Worker error:', error);
        this.deformWorker = null;
      };
    } catch (e) {
      console.warn('Failed to initialize deform worker, using main thread fallback');
      this.deformWorker = null;
    }
  }

  async init(): Promise<void> {
    this.setupUI();
    await this.initHandTracking();
    window.addEventListener('resize', () => this.onResize());
    this.animate();
  }

  private setupUI(): void {
    const amplitudeSlider = document.getElementById('amplitude-slider') as HTMLInputElement;
    const amplitudeValue = document.getElementById('amplitude-value');
    if (amplitudeSlider && amplitudeValue) {
      amplitudeSlider.addEventListener('input', () => {
        const val = parseFloat(amplitudeSlider.value);
        amplitudeValue.textContent = val.toFixed(2);
        this.meshDeformer.setParams({ amplitude: val });
      });
    }

    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value');
    if (speedSlider && speedValue) {
      speedSlider.addEventListener('input', () => {
        const val = parseFloat(speedSlider.value);
        speedValue.textContent = val.toFixed(2);
        this.meshDeformer.setParams({ speed: val });
      });
    }

    const subdivisionSelect = document.getElementById('subdivision-select') as HTMLSelectElement;
    if (subdivisionSelect) {
      subdivisionSelect.addEventListener('change', () => {
        const level = parseInt(subdivisionSelect.value);
        this.meshDeformer.updateSubdivision(level);
      });
    }

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.meshDeformer.resetDeformation();
        resetBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
          resetBtn.style.transform = 'scale(1)';
        }, 100);
      });
    }

    const panelToggle = document.getElementById('panel-toggle');
    const controlPanel = document.getElementById('control-panel');
    if (panelToggle && controlPanel) {
      panelToggle.addEventListener('click', () => {
        this.panelHidden = !this.panelHidden;
        if (this.panelHidden) {
          controlPanel.classList.add('hidden');
        } else {
          controlPanel.classList.remove('hidden');
        }
      });
    }

    if (window.innerWidth <= 768 && controlPanel) {
      controlPanel.classList.add('hidden');
      this.panelHidden = true;
    }
  }

  private async initHandTracking(): Promise<void> {
    const video = document.getElementById('video') as HTMLVideoElement;
    const canvas = document.getElementById('hand-canvas') as HTMLCanvasElement;
    const permissionTip = document.getElementById('permission-tip')!;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      video.srcObject = stream;
      await video.play();

      this.handTracker = new HandTracker(video, canvas);
      const success = await this.handTracker.initialize();

      if (!success) {
        throw new Error('HandTracker initialization failed');
      }

      this.handTracker.onResults((result: TrackingResult) => {
        this.currentHands = result.hands;
        this.updateGestureUI(result.hands);
        this.checkPerformanceOptimization(result.hands);
      });
    } catch (error) {
      console.error('Camera or hand tracking failed:', error);
      permissionTip.style.display = 'block';
      setTimeout(() => {
        permissionTip.style.opacity = '0';
        setTimeout(() => {
          permissionTip.style.display = 'none';
        }, 500);
      }, 5000);
    }
  }

  private updateGestureUI(hands: HandData[]): void {
    const leftHand = hands.find(h => h.handedness === 'Left');
    const rightHand = hands.find(h => h.handedness === 'Right');

    const leftGestureEl = document.getElementById('left-gesture');
    const rightGestureEl = document.getElementById('right-gesture');
    const leftIconEl = document.getElementById('left-icon');
    const rightIconEl = document.getElementById('right-icon');

    if (!leftGestureEl || !rightGestureEl || !leftIconEl || !rightIconEl) {
      return;
    }

    const leftGesture = leftHand?.gesture || 'unknown';
    const rightGesture = rightHand?.gesture || 'unknown';

    const leftText = GESTURE_TEXT_MAP[leftGesture] || '等待...';
    const rightText = GESTURE_TEXT_MAP[rightGesture] || '等待...';
    const newLeftIcon = GESTURE_ICON_MAP[leftGesture] || '✋';
    const newRightIcon = GESTURE_ICON_MAP[rightGesture] || '✋';

    if (leftGestureEl.textContent !== leftText) {
      leftGestureEl.style.transition = 'opacity 0.15s ease';
      leftGestureEl.style.opacity = '0.5';
      setTimeout(() => {
        leftGestureEl.textContent = leftText;
        leftGestureEl.style.opacity = '1';
      }, 100);
    }

    if (rightGestureEl.textContent !== rightText) {
      rightGestureEl.style.transition = 'opacity 0.15s ease';
      rightGestureEl.style.opacity = '0.5';
      setTimeout(() => {
        rightGestureEl.textContent = rightText;
        rightGestureEl.style.opacity = '1';
      }, 100);
    }

    if (leftIconEl.textContent !== newLeftIcon) {
      leftIconEl.classList.add('switching');
      setTimeout(() => {
        leftIconEl.textContent = newLeftIcon;
        leftIconEl.classList.remove('switching');
      }, 150);
    }

    if (rightIconEl.textContent !== newRightIcon) {
      rightIconEl.classList.add('switching');
      setTimeout(() => {
        rightIconEl.textContent = newRightIcon;
        rightIconEl.classList.remove('switching');
      }, 150);
    }

    const isLeftPinching = leftGesture === 'pinch';
    const isRightPinching = rightGesture === 'pinch';
    const isBothPinching = isLeftPinching && isRightPinching;

    const leftDotEl = document.getElementById('left-dot');
    const rightDotEl = document.getElementById('right-dot');
    const bothHintEl = document.getElementById('both-pinch-hint');

    if (isLeftPinching && !this.wasLeftPinching) {
      leftIconEl.classList.remove('pulse-left');
      void leftIconEl.offsetWidth;
      leftIconEl.classList.add('pulse-left');

      leftGestureEl.classList.add('pinch-highlight');
      window.setTimeout(() => {
        leftGestureEl.classList.remove('pinch-highlight');
      }, 200);

      if (leftDotEl) {
        leftDotEl.classList.remove('blinking');
        void leftDotEl.offsetWidth;
        leftDotEl.classList.add('blinking');
      }
    }

    if (isRightPinching && !this.wasRightPinching) {
      rightIconEl.classList.remove('pulse-right');
      void rightIconEl.offsetWidth;
      rightIconEl.classList.add('pulse-right');

      rightGestureEl.classList.add('pinch-highlight');
      window.setTimeout(() => {
        rightGestureEl.classList.remove('pinch-highlight');
      }, 200);

      if (rightDotEl) {
        rightDotEl.classList.remove('blinking');
        void rightDotEl.offsetWidth;
        rightDotEl.classList.add('blinking');
      }
    }

    if (bothHintEl) {
      if (isBothPinching && !this.wasBothPinching) {
        if (this.bothPinchFadeTimer) {
          window.clearTimeout(this.bothPinchFadeTimer);
          this.bothPinchFadeTimer = null;
        }
        bothHintEl.classList.remove('fading');
        bothHintEl.classList.add('visible');
      } else if (!isBothPinching && this.wasBothPinching) {
        bothHintEl.classList.remove('visible');
        bothHintEl.classList.add('fading');
        this.bothPinchFadeTimer = window.setTimeout(() => {
          bothHintEl.classList.remove('fading');
          this.bothPinchFadeTimer = null;
        }, 500);
      }
    }

    this.wasLeftPinching = isLeftPinching;
    this.wasRightPinching = isRightPinching;
    this.wasBothPinching = isBothPinching;
  }

  private checkPerformanceOptimization(hands: HandData[]): void {
    if (!this.handTracker) return;

    let maxSpeed = 0;
    for (const hand of hands) {
      const speed = this.handTracker.getHandRotationSpeed(hand.handedness);
      maxSpeed = Math.max(maxSpeed, speed);
    }

    const params = this.meshDeformer.getParams();
    if (maxSpeed > 90 && params.subdivisionLevel > 2 && !this.autoOptimized) {
      this.meshDeformer.updateSubdivision(2);
      this.autoOptimized = true;
      this.showPerformanceWarning();

      const subdivisionSelect = document.getElementById('subdivision-select') as HTMLSelectElement;
      subdivisionSelect.value = '2';
    }
  }

  private showPerformanceWarning(): void {
    const warning = document.getElementById('performance-warning')!;
    warning.classList.add('visible');

    if (this.performanceWarningTimeout) {
      window.clearTimeout(this.performanceWarningTimeout);
    }

    this.performanceWarningTimeout = window.setTimeout(() => {
      warning.classList.remove('visible');
      this.performanceWarningTimeout = null;
    }, 2000);
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    const controlPanel = document.getElementById('control-panel')!;
    if (width <= 768) {
      if (!this.panelHidden) {
        controlPanel.classList.add('hidden');
        this.panelHidden = true;
      }
    } else {
      if (this.panelHidden) {
        controlPanel.classList.remove('hidden');
        this.panelHidden = false;
      }
    }
  }

  private dispatchDeformWorker(): void {
    if (!this.deformWorker || this.workerBusy) return;

    const mesh = this.meshDeformer.getMesh();
    if (!mesh) return;

    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const originalPositions = new Float32Array(positionAttr.array as Float32Array);

    const leftHand = this.currentHands.find(h => h.handedness === 'Left');
    const rightHand = this.currentHands.find(h => h.handedness === 'Right');

    const params = this.meshDeformer.getParams();

    const workerInput = {
      originalPositions,
      leftHand: leftHand ? {
        gesture: leftHand.gesture,
        fingertipX: FINGERTIP_INDICES.map(i => leftHand.landmarks[i].x),
        fingertipY: FINGERTIP_INDICES.map(i => leftHand.landmarks[i].y)
      } : null,
      rightHand: rightHand ? {
        gesture: rightHand.gesture,
        fingertipX: FINGERTIP_INDICES.map(i => rightHand.landmarks[i].x),
        fingertipY: FINGERTIP_INDICES.map(i => rightHand.landmarks[i].y)
      } : null,
      kneadPhase: this.kneadPhase,
      amplitude: params.amplitude
    };

    this.workerBusy = true;
    this.deformWorker.postMessage(workerInput);
  }

  private monitorFramerate(deltaTime: number): void {
    const fps = 1 / Math.max(deltaTime, 0.001);

    this.fpsFrameCount++;
    const now = performance.now();
    if (now - this.fpsLastUpdate >= 500) {
      this.fpsCounter = Math.round((this.fpsFrameCount * 1000) / (now - this.fpsLastUpdate));
      this.fpsFrameCount = 0;
      this.fpsLastUpdate = now;
    }

    this.frameTimes.push(fps);
    if (this.frameTimes.length > 30) {
      this.frameTimes.shift();
    }

    if (fps < 55) {
      this.consecutiveLowFrames++;
      this.lowFrameCount++;
    } else {
      this.consecutiveLowFrames = 0;
      this.lowFrameCount = Math.max(0, this.lowFrameCount - 1);
    }

    if (this.consecutiveLowFrames >= 5 && !this.autoOptimized) {
      const params = this.meshDeformer.getParams();
      if (params.subdivisionLevel > 2) {
        this.meshDeformer.updateSubdivision(2);
        this.autoOptimized = true;
        this.consecutiveLowFrames = 0;
        this.showPerformanceWarning();

        const subdivisionSelect = document.getElementById('subdivision-select') as HTMLSelectElement;
        if (subdivisionSelect) {
          subdivisionSelect.value = '2';
        }
      }
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.kneadPhase += deltaTime * 2 * Math.PI * 2;

    this.monitorFramerate(deltaTime);
    this.dispatchDeformWorker();

    if (this.pendingWorkerResult && this.deformWorker) {
      this.meshDeformer.update(this.currentHands, deltaTime);
      this.pendingWorkerResult = null;
    } else {
      this.meshDeformer.update(this.currentHands, deltaTime);
    }

    this.renderer.render(this.scene, this.camera);
  };

  destroy(): void {
    this.handTracker?.destroy();
    this.deformWorker?.terminate();
    this.renderer.dispose();
  }
}

const app = new App();
app.init().catch(console.error);
