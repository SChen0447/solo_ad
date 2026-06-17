import * as THREE from 'three';

export type NavigationMode = 'firstPerson' | 'topDown';

export class Navigation {
  private camera: THREE.PerspectiveCamera;
  private mode: NavigationMode = 'firstPerson';
  private yaw = 0;
  private pitch = 0;
  private keys: Set<string> = new Set();
  private isRightDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private moveSpeed = 0.15;
  private lookSpeed = 0.003;
  private topDownDistance = 50;
  private topDownTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private topDownPanSpeed = 0.1;
  private enabled = true;
  private firstPersonHeight = 1.7;
  private motionBlurElement: HTMLDivElement | null = null;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.camera.position.set(0, this.firstPersonHeight, 10);
    this.camera.rotation.order = 'YXZ';
    this.createMotionBlurElement();
    this.bindEvents();
  }

  private createMotionBlurElement() {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 1;
      backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px);
      transition: backdrop-filter 0.2s, -webkit-backdrop-filter 0.2s;
    `;
    document.body.appendChild(el);
    this.motionBlurElement = el;
  }

  private bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled || this.mode !== 'firstPerson') return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.isRightDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isRightDragging = false;
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.mode === 'firstPerson' && this.isRightDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.yaw -= dx * this.lookSpeed;
        this.pitch -= dy * this.lookSpeed;
        this.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.pitch));
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      } else if (this.mode === 'topDown' && this.isRightDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        this.topDownTarget.addScaledVector(right, -dx * this.topDownPanSpeed);
        this.topDownTarget.addScaledVector(forward, dy * this.topDownPanSpeed);
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('wheel', (e) => {
      if (!this.enabled || this.mode !== 'topDown') return;
      this.topDownDistance += e.deltaY * 0.05;
      this.topDownDistance = Math.max(10, Math.min(100, this.topDownDistance));
    });
  }

  setMode(mode: NavigationMode) {
    this.mode = mode;
    this.keys.clear();
    this.isRightDragging = false;

    if (mode === 'topDown') {
      this.topDownTarget.set(
        this.camera.position.x,
        0,
        this.camera.position.z,
      );
      this.topDownDistance = 50;
      this.camera.position.set(this.topDownTarget.x, this.topDownDistance, this.topDownTarget.z + 0.01);
      this.camera.lookAt(this.topDownTarget);
    } else {
      const x = this.topDownTarget.x;
      const z = this.topDownTarget.z;
      this.camera.position.set(x, this.firstPersonHeight, z + 10);
      this.yaw = 0;
      this.pitch = 0;
    }
  }

  getMode(): NavigationMode {
    return this.mode;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.keys.clear();
      this.isRightDragging = false;
    }
  }

  update(deltaMs: number) {
    if (!this.enabled) return;

    if (this.mode === 'firstPerson') {
      this.updateFirstPerson(deltaMs);
    } else {
      this.updateTopDown(deltaMs);
    }
  }

  private updateFirstPerson(_deltaMs: number) {
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();

    let isMoving = false;
    if (this.keys.has('KeyW')) { move.addScaledVector(forward, this.moveSpeed); isMoving = true; }
    if (this.keys.has('KeyS')) { move.addScaledVector(forward, -this.moveSpeed); isMoving = true; }
    if (this.keys.has('KeyA')) { move.addScaledVector(right, -this.moveSpeed); isMoving = true; }
    if (this.keys.has('KeyD')) { move.addScaledVector(right, this.moveSpeed); isMoving = true; }

    this.camera.position.add(move);
    this.camera.position.y = this.firstPersonHeight;

    const limit = 48;
    this.camera.position.x = Math.max(-limit, Math.min(limit, this.camera.position.x));
    this.camera.position.z = Math.max(-limit, Math.min(limit, this.camera.position.z));

    this.camera.rotation.set(this.pitch, this.yaw, 0);

    if (this.motionBlurElement) {
      const blur = isMoving ? 0.3 : 0;
      this.motionBlurElement.style.backdropFilter = `blur(${blur}px)`;
      (this.motionBlurElement.style as Record<string, string>).webkitBackdropFilter = `blur(${blur}px)`;
    }
  }

  private updateTopDown(_deltaMs: number) {
    this.camera.position.set(
      this.topDownTarget.x,
      this.topDownDistance,
      this.topDownTarget.z + 0.01,
    );
    this.camera.lookAt(this.topDownTarget);
  }
}
