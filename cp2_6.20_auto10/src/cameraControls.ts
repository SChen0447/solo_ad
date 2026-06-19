import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GrowthSnapshot } from './plantSystem';

type ViewPresetName = 'top' | 'front' | 'side' | 'close';

interface ViewPreset {
  name: ViewPresetName;
  label: string;
  color: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
}

type RecordCompleteCallback = (snapshots: GrowthSnapshot[], duration: number) => void;

export class CameraManager {
  public readonly controls: OrbitControls;
  private camera: THREE.PerspectiveCamera;
  private rendererDom: HTMLElement;
  private container: HTMLElement;

  private viewButtons: HTMLButtonElement[] = [];
  private selectedView: ViewPresetName | null = null;
  private transitioningCamera = false;
  private cameraTransitionStart = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  private cameraTransitionEnd = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  private cameraTransitionProgress = 0;
  private cameraTransitionDuration = 900;

  private recording = false;
  private recordElapsed = 0;
  private recordMaxDuration = 15000;
  private recordSnapshots: GrowthSnapshot[] = [];
  private recordButton: HTMLButtonElement | null = null;
  private recordTimerDisplay: HTMLElement | null = null;
  private recordDot: HTMLElement | null = null;
  private recordBarContainer: HTMLElement | null = null;
  private recordBar: HTMLInputElement | null = null;
  private playbackTimeLabel: HTMLElement | null = null;
  private recordDuration = 0;
  private onRecordComplete: RecordCompleteCallback | null = null;
  private onPlaybackRequest: ((snapshot: GrowthSnapshot) => void) | null = null;
  private isPlayingBack = false;

  private viewPresets: ViewPreset[] = [
    { name: 'top', label: '俯视45°', color: '#f1c40f',
      position: new THREE.Vector3(4.5, 5.5, 4.5), target: new THREE.Vector3(0, 2, 0) },
    { name: 'front', label: '正面平视', color: '#3498db',
      position: new THREE.Vector3(0, 2.5, 8), target: new THREE.Vector3(0, 2, 0) },
    { name: 'side', label: '侧视90°', color: '#2ecc71',
      position: new THREE.Vector3(8, 2.5, 0), target: new THREE.Vector3(0, 2, 0) },
    { name: 'close', label: '近景微距', color: '#9b59b6',
      position: new THREE.Vector3(1.5, 2.8, 2.5), target: new THREE.Vector3(0, 2.2, 0) },
  ];

  constructor(camera: THREE.PerspectiveCamera, rendererDom: HTMLElement, container: HTMLElement) {
    this.camera = camera;
    this.rendererDom = rendererDom;
    this.container = container;

    this.controls = new OrbitControls(camera, rendererDom);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 15;
    this.controls.target.set(0, 2, 0);
    this.controls.update();

    camera.position.set(4.5, 5.5, 4.5);
    camera.lookAt(0, 2, 0);

    this.buildViewSwitcher();
    this.buildRecordControls();
    this.injectRecordSliderStyles();
  }

  public setOnRecordComplete(cb: RecordCompleteCallback): void { this.onRecordComplete = cb; }
  public setOnPlaybackRequest(cb: (snapshot: GrowthSnapshot) => void): void { this.onPlaybackRequest = cb; }

  public addSnapshotForRecording(snap: GrowthSnapshot): void {
    if (this.recording) this.recordSnapshots.push(snap);
  }
  public isRecording(): boolean { return this.recording; }
  public isPlaybackMode(): boolean { return this.isPlayingBack; }

  public update(dtMs: number): void {
    if (this.transitioningCamera) {
      this.cameraTransitionProgress += dtMs;
      const t = Math.min(1, this.cameraTransitionProgress / this.cameraTransitionDuration);
      const eased = this.easeInOutCubic(t);
      this.camera.position.lerpVectors(this.cameraTransitionStart.pos, this.cameraTransitionEnd.pos, eased);
      this.controls.target.lerpVectors(this.cameraTransitionStart.target, this.cameraTransitionEnd.target, eased);
      if (t >= 1) this.transitioningCamera = false;
    }
    this.controls.update();
    if (this.recording) {
      this.recordElapsed += dtMs;
      this.updateRecordTimerDisplay();
      if (this.recordElapsed >= this.recordMaxDuration) this.stopRecording();
    }
  }

  private buildViewSwitcher(): void {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
      position: 'fixed', right: '20px', top: '50%', transform: 'translateY(-50%)',
      display: 'flex', flexDirection: 'column', gap: '12px', zIndex: '100',
    } as unknown as CSSStyleDeclaration);

    this.viewPresets.forEach(preset => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.title = preset.label;
      Object.assign(btn.style, {
        width: '28px', height: '28px', borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.5)', background: preset.color,
        cursor: 'pointer', padding: '0',
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      } as unknown as CSSStyleDeclaration);

      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.05)';
        btn.style.filter = 'brightness(1.1)';
      });
      btn.addEventListener('mouseleave', () => {
        if (this.selectedView !== preset.name) btn.style.transform = 'scale(1)';
        btn.style.filter = '';
      });
      btn.addEventListener('click', () => {
        btn.animate(
          [
            { transform: 'scale(0.95)' },
            { transform: 'scale(1.05)' },
            { transform: `scale(${this.selectedView === preset.name ? '1' : '1.2'})` },
          ],
          { duration: 150, easing: 'ease-out' }
        );
        this.selectView(preset.name);
      });

      this.viewButtons.push(btn);
      wrap.appendChild(btn);
    });

    this.container.appendChild(wrap);
    setTimeout(() => this.selectView('top'), 100);
  }

  private selectView(name: ViewPresetName): void {
    const preset = this.viewPresets.find(p => p.name === name);
    if (!preset) return;
    this.selectedView = name;
    this.viewButtons.forEach((btn, i) => {
      const p = this.viewPresets[i];
      if (p.name === name) {
        btn.style.transform = 'scale(1.2)';
        btn.style.boxShadow = `0 0 0 3px rgba(255,255,255,0.3), 0 2px 12px rgba(0,0,0,0.5)`;
        btn.animate(
          [{ transform: 'scale(1.2)', filter: 'brightness(1.4)' },
           { transform: 'scale(1.2)', filter: 'brightness(1.1)' }],
          { duration: 400, iterations: 1 }
        );
      } else {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
      }
    });
    this.transitionCameraTo(preset.position, preset.target);
  }

  private transitionCameraTo(pos: THREE.Vector3, target: THREE.Vector3): void {
    this.cameraTransitionStart.pos.copy(this.camera.position);
    this.cameraTransitionStart.target.copy(this.controls.target);
    this.cameraTransitionEnd.pos.copy(pos);
    this.cameraTransitionEnd.target.copy(target);
    this.cameraTransitionProgress = 0;
    this.transitioningCamera = true;
  }

  private buildRecordControls(): void {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
      position: 'fixed', left: '50%', bottom: '30px', transform: 'translateX(-50%)',
      zIndex: '100', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: '12px',
    } as unknown as CSSStyleDeclaration);

    this.recordButton = document.createElement('button');
    this.recordButton.type = 'button';
    Object.assign(this.recordButton.style, {
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 22px', borderRadius: '10px', border: 'none',
      background: '#e74c3c', color: '#fff', fontSize: '14px',
      fontWeight: '600', cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(231,76,60,0.4)',
      transition: 'transform 0.1s ease, background 0.15s ease, filter 0.1s ease',
      fontFamily: 'inherit', minWidth: '130px', justifyContent: 'center',
    } as unknown as CSSStyleDeclaration);

    this.recordDot = document.createElement('span');
    Object.assign(this.recordDot.style, {
      width: '12px', height: '12px', borderRadius: '50%',
      background: '#fff', display: 'inline-block',
      boxShadow: '0 0 8px rgba(255,255,255,0.6)',
    } as unknown as CSSStyleDeclaration);

    this.recordTimerDisplay = document.createElement('span');
    this.recordTimerDisplay.textContent = '录制 00:00';
    this.recordTimerDisplay.style.minWidth = '64px';
    this.recordTimerDisplay.style.fontVariantNumeric = 'tabular-nums';

    this.recordButton.appendChild(this.recordDot);
    this.recordButton.appendChild(this.recordTimerDisplay);

    this.recordButton.addEventListener('mouseenter', () => {
      this.recordButton!.style.transform = 'scale(1.05)';
      this.recordButton!.style.filter = 'brightness(1.1)';
    });
    this.recordButton.addEventListener('mouseleave', () => {
      this.recordButton!.style.transform = 'scale(1)';
      this.recordButton!.style.filter = '';
    });
    this.recordButton.addEventListener('click', () => {
      this.recordButton!.animate(
        [{ transform: 'scale(0.95)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
        { duration: 150, easing: 'ease-out' }
      );
      if (!this.recording) this.startRecording();
      else this.stopRecording();
    });

    wrap.appendChild(this.recordButton);

    this.recordBarContainer = document.createElement('div');
    Object.assign(this.recordBarContainer.style, {
      position: 'fixed', left: '40px', right: '40px', bottom: '90px',
      display: 'none', flexDirection: 'column', gap: '6px', zIndex: '99',
      background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
      padding: '14px 20px', borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.15)',
    } as unknown as CSSStyleDeclaration);

    const labelRow = document.createElement('div');
    Object.assign(labelRow.style, {
      display: 'flex', justifyContent: 'space-between',
      color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: '500',
    } as unknown as CSSStyleDeclaration);
    labelRow.innerHTML = `<span>🎬 生长回放</span><span id="pb-time">00:00 / 00:00</span>`;
    this.playbackTimeLabel = labelRow.querySelector('#pb-time') as HTMLElement;

    this.recordBar = document.createElement('input');
    this.recordBar.type = 'range';
    this.recordBar.min = '0';
    this.recordBar.max = '1000';
    this.recordBar.step = '1';
    this.recordBar.value = '0';
    this.recordBar.className = 'record-slider';
    Object.assign(this.recordBar.style, {
      width: '100%', cursor: 'pointer', appearance: 'none',
      WebkitAppearance: 'none', height: '6px', borderRadius: '3px',
      background: 'linear-gradient(to right, #e74c3c 0%, rgba(255,255,255,0.15) 0%)',
      padding: '0', margin: '4px 0',
    } as unknown as CSSStyleDeclaration);

    this.recordBar.addEventListener('input', () => {
      if (!this.recordBar) return;
      const ratio = Number(this.recordBar.value) / 1000;
      this.updateRecordBarFill();
      this.handlePlayback(ratio);
    });
    this.recordBar.addEventListener('mousedown', () => { this.isPlayingBack = true; });
    this.recordBar.addEventListener('mouseup', () => {
      if (!this.recordBar || Number(this.recordBar.value) >= 1000) this.isPlayingBack = false;
    });

    const hintRow = document.createElement('div');
    Object.assign(hintRow.style, {
      display: 'flex', justifyContent: 'space-between',
      color: 'rgba(255,255,255,0.5)', fontSize: '11px',
    } as unknown as CSSStyleDeclaration);
    hintRow.innerHTML = `<span>拖动滑块回放任意时刻生长姿态</span><span>点击录制按钮可重新录制</span>`;

    this.recordBarContainer.appendChild(labelRow);
    this.recordBarContainer.appendChild(this.recordBar);
    this.recordBarContainer.appendChild(hintRow);

    this.container.appendChild(wrap);
    this.container.appendChild(this.recordBarContainer);
  }

  private injectRecordSliderStyles(): void {
    if (document.getElementById('record-slider-style')) return;
    const s = document.createElement('style');
    s.id = 'record-slider-style';
    s.textContent = `
      .record-slider { -webkit-appearance: none; appearance: none; outline: none; }
      .record-slider::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; background: transparent; }
      .record-slider::-moz-range-track { height: 6px; border-radius: 3px; background: transparent; }
      .record-slider::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none;
        width: 18px; height: 18px; border-radius: 50%;
        background: #e74c3c; border: 2px solid #fff;
        margin-top: -6px; cursor: pointer;
        box-shadow: 0 2px 10px rgba(231,76,60,0.5);
        transition: transform 0.1s ease;
      }
      .record-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
      .record-slider::-moz-range-thumb {
        width: 18px; height: 18px; border-radius: 50%;
        background: #e74c3c; border: 2px solid #fff; cursor: pointer;
      }
    `;
    document.head.appendChild(s);
  }

  private startRecording(): void {
    this.recording = true;
    this.recordElapsed = 0;
    this.recordSnapshots = [];
    if (this.recordButton) {
      this.recordButton.style.background = '#7f8c8d';
      this.recordButton.style.boxShadow = '0 4px 14px rgba(0,0,0,0.3)';
    }
    if (this.recordDot && this.recordDot.style) {
      this.recordDot.style.animation = 'pulse-rec 0.8s infinite';
      const styleId = 'pulse-rec-anim';
      if (!document.getElementById(styleId)) {
        const s = document.createElement('style');
        s.id = styleId;
        s.textContent = `@keyframes pulse-rec {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }`;
        document.head.appendChild(s);
      }
    }
    if (this.recordBarContainer) this.recordBarContainer.style.display = 'none';
    this.isPlayingBack = false;
  }

  private stopRecording(): void {
    this.recording = false;
    this.recordDuration = this.recordElapsed;
    if (this.recordButton) {
      this.recordButton.style.background = '#e74c3c';
      this.recordButton.style.boxShadow = '0 4px 14px rgba(231,76,60,0.4)';
    }
    if (this.recordDot) this.recordDot.style.animation = '';
    if (this.recordSnapshots.length > 1 && this.recordBarContainer) {
      this.recordBarContainer.style.display = 'flex';
      if (this.recordBar) {
        this.recordBar.value = '0';
        this.updateRecordBarFill();
      }
      this.updatePlaybackTime(0);
    }
    if (this.onRecordComplete && this.recordSnapshots.length > 0) {
      this.onRecordComplete(this.recordSnapshots.slice(), this.recordDuration);
    }
  }

  private updateRecordTimerDisplay(): void {
    if (!this.recordTimerDisplay) return;
    const totalSec = Math.floor(this.recordElapsed / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    this.recordTimerDisplay.textContent = `录制 ${m}:${s}`;
  }

  private updateRecordBarFill(): void {
    if (!this.recordBar) return;
    const v = Number(this.recordBar.value);
    this.recordBar.style.background =
      `linear-gradient(to right, #e74c3c ${v / 10}%, rgba(255,255,255,0.15) ${v / 10}%)`;
  }

  private updatePlaybackTime(currentMs: number): void {
    if (!this.playbackTimeLabel) return;
    const fmt = (ms: number) => {
      const sec = Math.floor(ms / 1000);
      return `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
    };
    this.playbackTimeLabel.textContent = `${fmt(currentMs)} / ${fmt(this.recordDuration)}`;
  }

  private handlePlayback(ratio: number): void {
    if (this.recordSnapshots.length === 0 || !this.onPlaybackRequest) return;
    const idx = Math.min(this.recordSnapshots.length - 1,
      Math.floor(ratio * (this.recordSnapshots.length - 1)));
    const snap = this.recordSnapshots[idx];
    this.updatePlaybackTime(snap.timestamp - (this.recordSnapshots[0]?.timestamp ?? 0));
    this.onPlaybackRequest(snap);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
