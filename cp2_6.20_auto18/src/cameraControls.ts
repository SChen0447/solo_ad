import * as THREE from 'three';
import type { PlantSystem } from './plantSystem';

interface CameraPreset {
  name: string;
  color: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
}

type RecordingState = 'idle' | 'recording' | 'ready' | 'playing';

export class CameraControls {
  public camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private container: HTMLElement;
  private plantSystem: PlantSystem;

  private target: THREE.Vector3 = new THREE.Vector3(0, 2, 0);
  private spherical: THREE.Spherical = new THREE.Spherical(8, Math.PI / 4, 0);
  private targetSpherical: THREE.Spherical = new THREE.Spherical(8, Math.PI / 4, 0);

  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private readonly ROTATION_DAMPING = 0.1;
  private readonly MIN_DISTANCE = 2;
  private readonly MAX_DISTANCE = 15;

  private readonly PRESETS: CameraPreset[] = [
    {
      name: '俯视',
      color: '#fbbf24',
      position: new THREE.Vector3(0, 7, 7),
      target: new THREE.Vector3(0, 2, 0)
    },
    {
      name: '正面',
      color: '#3b82f6',
      position: new THREE.Vector3(0, 3, 9),
      target: new THREE.Vector3(0, 2, 0)
    },
    {
      name: '侧视',
      color: '#22c55e',
      position: new THREE.Vector3(9, 3, 0),
      target: new THREE.Vector3(0, 2, 0)
    },
    {
      name: '微距',
      color: '#a855f7',
      position: new THREE.Vector3(1.5, 2.5, 3),
      target: new THREE.Vector3(0, 2, 0)
    }
  ];

  private presetButtons: HTMLElement[] = [];
  private activePresetIndex = -1;

  private recordingState: RecordingState = 'idle';
  private recordStartTime = 0;
  private readonly RECORD_DURATION = 15;
  private recordTimerInterval: number | null = null;
  private recordBtn: HTMLElement | null = null;
  private recordTimeDisplay: HTMLElement | null = null;
  private progressContainer: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private progressThumb: HTMLElement | null = null;
  private progressTrack: HTMLElement | null = null;
  private isDraggingProgress = false;

  private transitionProgress = 1;
  private transitionFromSpherical: THREE.Spherical | null = null;
  private transitionFromTarget: THREE.Vector3 | null = null;
  private transitionToSpherical: THREE.Spherical | null = null;
  private transitionToTarget: THREE.Vector3 | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    container: HTMLElement,
    plantSystem: PlantSystem
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.container = container;
    this.plantSystem = plantSystem;

    this.initSphericalFromCamera();
    this.createStyles();
    this.createUI();
    this.setupEventListeners();
    this.updateCamera();
  }

  private initSphericalFromCamera(): void {
    const offset = this.camera.position.clone().sub(this.target);
    this.spherical.setFromVector3(offset);
    this.targetSpherical.copy(this.spherical);
  }

  private createStyles(): void {
    const styleId = 'camera-controls-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes pulseOnce {
        0% { transform: scale(1); opacity: 1; filter: brightness(1); }
        25% { transform: scale(1.5); opacity: 0.6; filter: brightness(1.5); }
        50% { transform: scale(1.35); opacity: 0.9; filter: brightness(1.3); }
        75% { transform: scale(1.25); opacity: 1; filter: brightness(1.15); }
        100% { transform: scale(1.2); opacity: 1; filter: brightness(1); }
      }
      @keyframes elasticBounce {
        0% { transform: scale(1); }
        30% { transform: scale(0.95); }
        60% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      @keyframes recordPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
        50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      }
      .preset-buttons {
        position: fixed;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 100;
      }
      .preset-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.5);
        cursor: pointer;
        transition: transform 0.1s ease, filter 0.1s ease, border-color 0.2s ease;
        position: relative;
      }
      .preset-btn:hover {
        transform: scale(1.05);
        filter: brightness(1.1);
      }
      .preset-btn:active {
        animation: elasticBounce 0.15s ease;
      }
      .preset-btn.active {
        transform: scale(1.2);
        animation: pulseOnce 0.3s ease;
        border-color: rgba(255, 255, 255, 0.9);
        box-shadow: 0 0 12px currentColor;
      }
      .preset-btn .tooltip {
        position: absolute;
        right: 38px;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease;
      }
      .preset-btn:hover .tooltip {
        opacity: 1;
      }
      .record-btn-container {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }
      .record-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 24px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.1s ease, filter 0.1s ease, background 0.2s ease;
        box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
      }
      .record-btn:hover {
        transform: scale(1.05);
        filter: brightness(1.1);
      }
      .record-btn:active {
        animation: elasticBounce 0.15s ease;
      }
      .record-btn.recording {
        background: #6b7280;
        box-shadow: 0 4px 16px rgba(107, 114, 128, 0.4);
        animation: recordPulse 1.5s ease infinite;
      }
      .record-btn-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: white;
      }
      .record-btn.recording .record-btn-dot {
        border-radius: 2px;
      }
      .record-time {
        font-variant-numeric: tabular-nums;
        min-width: 36px;
      }
      .progress-container {
        position: fixed;
        bottom: 90px;
        left: 40px;
        right: 40px;
        height: 40px;
        display: none;
        align-items: center;
        z-index: 100;
      }
      .progress-container.visible {
        display: flex;
      }
      .progress-time-label {
        color: rgba(255, 255, 255, 0.8);
        font-size: 12px;
        font-variant-numeric: tabular-nums;
        min-width: 40px;
        text-align: center;
      }
      .progress-track-wrapper {
        flex: 1;
        height: 8px;
        position: relative;
        margin: 0 12px;
        cursor: pointer;
        padding: 8px 0;
      }
      .progress-track {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 6px;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
        transition: filter 0.1s ease;
      }
      .progress-track-wrapper.hovered .progress-track {
        filter: brightness(1.15);
      }
      .progress-fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: linear-gradient(90deg, #4ade80, #22d3ee);
        border-radius: 3px;
        transition: width 0.05s linear;
      }
      .progress-thumb {
        position: absolute;
        top: 50%;
        width: 16px;
        height: 16px;
        background: white;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        transition: transform 0.1s ease;
        cursor: grab;
      }
      .progress-track-wrapper.hovered .progress-thumb,
      .progress-track-wrapper.dragging .progress-thumb {
        transform: translate(-50%, -50%) scale(1.15);
      }
      .progress-track-wrapper.dragging .progress-thumb {
        cursor: grabbing;
      }
      @media (max-width: 768px) {
        .preset-buttons {
          right: 10px;
        }
        .progress-container {
          left: 16px;
          right: 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createUI(): void {
    this.createPresetButtons();
    this.createRecordButton();
    this.createProgressBar();
  }

  private createPresetButtons(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'preset-buttons';

    this.PRESETS.forEach((preset, index) => {
      const btn = document.createElement('div');
      btn.className = 'preset-btn';
      btn.style.backgroundColor = preset.color;
      btn.title = preset.name;
      btn.style.color = preset.color;

      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = preset.name;
      btn.appendChild(tooltip);

      btn.addEventListener('click', () => {
        this.setPreset(index);
      });

      wrapper.appendChild(btn);
      this.presetButtons.push(btn);
    });

    this.container.appendChild(wrapper);
  }

  private createRecordButton(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'record-btn-container';

    this.recordBtn = document.createElement('button');
    this.recordBtn.className = 'record-btn';

    const dot = document.createElement('span');
    dot.className = 'record-btn-dot';

    const label = document.createElement('span');
    label.textContent = '录制 15秒';

    this.recordTimeDisplay = document.createElement('span');
    this.recordTimeDisplay.className = 'record-time';
    this.recordTimeDisplay.textContent = '';
    this.recordTimeDisplay.style.display = 'none';

    this.recordBtn.appendChild(dot);
    this.recordBtn.appendChild(label);
    this.recordBtn.appendChild(this.recordTimeDisplay);

    this.recordBtn.addEventListener('click', () => this.toggleRecording());

    wrapper.appendChild(this.recordBtn);
    this.container.appendChild(wrapper);
  }

  private createProgressBar(): void {
    this.progressContainer = document.createElement('div');
    this.progressContainer.className = 'progress-container';

    const startTimeLabel = document.createElement('div');
    startTimeLabel.className = 'progress-time-label';
    startTimeLabel.textContent = '0:00';

    const trackWrapper = document.createElement('div');
    trackWrapper.className = 'progress-track-wrapper';

    this.progressTrack = document.createElement('div');
    this.progressTrack.className = 'progress-track';

    this.progressBar = document.createElement('div');
    this.progressBar.className = 'progress-fill';
    this.progressBar.style.width = '0%';
    this.progressTrack.appendChild(this.progressBar);

    this.progressThumb = document.createElement('div');
    this.progressThumb.className = 'progress-thumb';
    this.progressThumb.style.left = '0%';
    this.progressTrack.appendChild(this.progressThumb);

    trackWrapper.appendChild(this.progressTrack);

    const endTimeLabel = document.createElement('div');
    endTimeLabel.className = 'progress-time-label';
    endTimeLabel.textContent = this.formatTime(this.RECORD_DURATION);

    this.progressContainer.appendChild(startTimeLabel);
    this.progressContainer.appendChild(trackWrapper);
    this.progressContainer.appendChild(endTimeLabel);

    this.container.appendChild(this.progressContainer);

    trackWrapper.addEventListener('mouseenter', () => {
      trackWrapper.classList.add('hovered');
    });
    trackWrapper.addEventListener('mouseleave', () => {
      if (!this.isDraggingProgress) trackWrapper.classList.remove('hovered');
    });

    trackWrapper.addEventListener('pointerdown', (e: PointerEvent) => {
      this.isDraggingProgress = true;
      trackWrapper.classList.add('dragging');
      this.handleProgressClick(e, trackWrapper);
      trackWrapper.setPointerCapture(e.pointerId);
    });

    trackWrapper.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.isDraggingProgress) {
        this.handleProgressClick(e, trackWrapper);
      }
    });

    trackWrapper.addEventListener('pointerup', () => {
      this.isDraggingProgress = false;
      trackWrapper.classList.remove('dragging');
      trackWrapper.classList.remove('hovered');
    });
  }

  private handleProgressClick(e: PointerEvent, wrapper: HTMLElement): void {
    if (!this.progressBar || !this.progressThumb) return;

    const rect = wrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));

    this.progressBar.style.width = `${percent * 100}%`;
    this.progressThumb.style.left = `${percent * 100}%`;

    const snapshots = this.plantSystem.getSnapshots();
    if (snapshots.length >= 2) {
      const startTime = snapshots[0].time;
      const endTime = snapshots[snapshots.length - 1].time;
      const seekTime = startTime + (endTime - startTime) * percent;
      this.plantSystem.setReplayMode(true);
      this.plantSystem.seekToTime(seekTime);
    }
  }

  private toggleRecording(): void {
    if (this.recordingState === 'idle' || this.recordingState === 'ready') {
      this.startRecording();
    } else if (this.recordingState === 'recording') {
      this.stopRecording();
    }
  }

  private startRecording(): void {
    this.recordingState = 'recording';
    this.recordStartTime = performance.now() / 1000;
    this.plantSystem.startRecording();
    this.plantSystem.setReplayMode(false);

    if (this.recordBtn) {
      this.recordBtn.classList.add('recording');
      const label = this.recordBtn.querySelector('span:not(.record-btn-dot):not(.record-time)');
      if (label) label.textContent = '停止录制';
    }
    if (this.recordTimeDisplay) {
      this.recordTimeDisplay.style.display = 'inline';
      this.recordTimeDisplay.textContent = '0:00';
    }
    if (this.progressContainer) {
      this.progressContainer.classList.remove('visible');
    }

    this.recordTimerInterval = window.setInterval(() => {
      const elapsed = (performance.now() / 1000) - this.recordStartTime;
      if (elapsed >= this.RECORD_DURATION) {
        this.stopRecording();
        return;
      }
      if (this.recordTimeDisplay) {
        this.recordTimeDisplay.textContent = this.formatTime(elapsed);
      }
    }, 100);
  }

  private stopRecording(): void {
    this.recordingState = 'ready';
    if (this.recordTimerInterval) {
      clearInterval(this.recordTimerInterval);
      this.recordTimerInterval = null;
    }

    if (this.recordBtn) {
      this.recordBtn.classList.remove('recording');
      const label = this.recordBtn.querySelector('span:not(.record-btn-dot):not(.record-time)');
      if (label) label.textContent = '重新录制';
    }
    if (this.recordTimeDisplay) {
      this.recordTimeDisplay.style.display = 'none';
    }
    if (this.progressContainer) {
      this.progressContainer.classList.add('visible');
    }

    this.plantSystem.setReplayMode(true);
    const snapshots = this.plantSystem.getSnapshots();
    if (snapshots.length > 0) {
      this.plantSystem.seekToTime(snapshots[0].time);
    }
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  public setPreset(index: number): void {
    if (index < 0 || index >= this.PRESETS.length) return;

    this.presetButtons.forEach((btn, i) => {
      btn.classList.remove('active');
      if (i === index) {
        void btn.offsetWidth;
        btn.classList.add('active');
      }
    });
    this.activePresetIndex = index;

    const preset = this.PRESETS[index];

    this.transitionFromSpherical = this.spherical.clone();
    this.transitionFromTarget = this.target.clone();

    const offset = preset.position.clone().sub(preset.target);
    this.transitionToSpherical = new THREE.Spherical().setFromVector3(offset);
    this.transitionToTarget = preset.target.clone();
    this.transitionProgress = 0;
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('pointercancel', this.onPointerUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 2) return;
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.domElement.setPointerCapture(e.pointerId);
    this.deactivatePresets();
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    this.targetSpherical.theta -= dx * 0.005;
    this.targetSpherical.phi = Math.max(
      0.05,
      Math.min(Math.PI - 0.05, this.targetSpherical.phi - dy * 0.005)
    );
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.isDragging = false;
    try {
      this.domElement.releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const scale = Math.pow(0.95, e.deltaY * 0.01);
    this.targetSpherical.radius = Math.max(
      this.MIN_DISTANCE,
      Math.min(this.MAX_DISTANCE, this.targetSpherical.radius * scale)
    );
  };

  private deactivatePresets(): void {
    this.presetButtons.forEach(btn => btn.classList.remove('active'));
    this.activePresetIndex = -1;
  }

  private updateCamera(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  public update(delta: number): void {
    const fromS = this.transitionFromSpherical;
    const toS = this.transitionToSpherical;
    const fromT = this.transitionFromTarget;
    const toT = this.transitionToTarget;
    const inPresetTransition = this.transitionProgress < 1 && !!fromS && !!toS && !!fromT && !!toT;

    if (inPresetTransition && fromS && toS && fromT && toT) {
      this.transitionProgress = Math.min(1, this.transitionProgress + delta * 2);
      const t = this.easeInOutCubic(this.transitionProgress);

      const theta = this.lerp(fromS.theta, toS.theta, t);
      const phi = this.lerp(fromS.phi, toS.phi, t);
      const radius = this.lerp(fromS.radius, toS.radius, t);
      this.targetSpherical.set(radius, phi, theta);

      this.target.lerpVectors(fromT, toT, t);

      this.spherical.copy(this.targetSpherical);
    } else {
      this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * this.ROTATION_DAMPING;
      this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * this.ROTATION_DAMPING;
      this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * this.ROTATION_DAMPING;
    }

    this.updateCamera();
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public getActivePreset(): number {
    return this.activePresetIndex;
  }

  public isRecording(): boolean {
    return this.recordingState === 'recording';
  }

  public isReplayMode(): boolean {
    return this.recordingState === 'ready';
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointercancel', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    if (this.recordTimerInterval) {
      clearInterval(this.recordTimerInterval);
    }
  }
}
