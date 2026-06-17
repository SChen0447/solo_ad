import * as THREE from 'three';

export type NavigationMode = 'firstPerson' | 'overhead';

export class Navigation {
  private camera: THREE.PerspectiveCamera;
  private mode: NavigationMode = 'firstPerson';

  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;

  private yaw = 0;
  private pitch = 0;

  private isRightDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private overheadDistance = 50;
  private overheadTarget = new THREE.Vector3(0, 0, 0);
  private isOverheadPanning = false;
  private overheadPanStart = new THREE.Vector2();

  private moveSpeed = 10;
  private lookSensitivity = 0.003;

  private firstPersonHeight = 1.7;
  private position: THREE.Vector3 = new THREE.Vector3(0, 1.7, 20);

  private motionBlurElement: HTMLElement | null = null;
  private motionBlurActive = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.setupFirstPerson();
  }

  getMode(): NavigationMode {
    return this.mode;
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  setMotionBlurElement(el: HTMLElement | null): void {
    this.motionBlurElement = el;
  }

  switchMode(mode: NavigationMode): void {
    if (this.mode === mode) return;
    this.mode = mode;

    if (mode === 'firstPerson') {
      this.setupFirstPerson();
    } else {
      this.setupOverhead();
    }
  }

  private setupFirstPerson(): void {
    this.position.y = this.firstPersonHeight;
    this.updateFirstPersonCamera();
  }

  private setupOverhead(): void {
    this.overheadTarget.set(0, 0, 0);
    this.overheadDistance = 50;
    this.updateOverheadCamera();
  }

  private updateFirstPersonCamera(): void {
    const direction = new THREE.Vector3();
    direction.x = Math.sin(this.yaw) * Math.cos(this.pitch);
    direction.y = Math.sin(this.pitch);
    direction.z = Math.cos(this.yaw) * Math.cos(this.pitch);

    this.camera.position.copy(this.position);
    this.camera.lookAt(this.position.clone().add(direction));
  }

  private updateOverheadCamera(): void {
    this.camera.position.set(
      this.overheadTarget.x,
      this.overheadDistance,
      this.overheadTarget.z + this.overheadDistance * 0.5
    );
    this.camera.lookAt(this.overheadTarget);
  }

  handleKeyDown(key: string): void {
    if (this.mode === 'firstPerson') {
      switch (key.toLowerCase()) {
        case 'w': this.moveForward = true; break;
        case 's': this.moveBackward = true; break;
        case 'a': this.moveLeft = true; break;
        case 'd': this.moveRight = true; break;
      }
    }
  }

  handleKeyUp(key: string): void {
    if (this.mode === 'firstPerson') {
      switch (key.toLowerCase()) {
        case 'w': this.moveForward = false; break;
        case 's': this.moveBackward = false; break;
        case 'a': this.moveLeft = false; break;
        case 'd': this.moveRight = false; break;
      }
    }
  }

  handleMouseDown(event: MouseEvent): void {
    if (event.button === 2) {
      this.isRightDragging = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;

      if (this.mode === 'overhead') {
        this.isOverheadPanning = true;
        this.overheadPanStart.set(event.clientX, event.clientY);
      }
    }
  }

  handleMouseUp(event: MouseEvent): void {
    if (event.button === 2) {
      this.isRightDragging = false;
      this.isOverheadPanning = false;
    }
  }

  handleMouseMove(event: MouseEvent): void {
    if (!this.isRightDragging) return;

    if (this.mode === 'firstPerson') {
      const dx = event.clientX - this.lastMouseX;
      const dy = event.clientY - this.lastMouseY;
      this.yaw -= dx * this.lookSensitivity;
      this.pitch -= dy * this.lookSensitivity;
      this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }

    if (this.mode === 'overhead' && this.isOverheadPanning) {
      const dx = (event.clientX - this.overheadPanStart.x) * 0.15;
      const dy = (event.clientY - this.overheadPanStart.y) * 0.15;
      this.overheadTarget.x -= dx;
      this.overheadTarget.z -= dy;
      this.overheadPanStart.set(event.clientX, event.clientY);
    }
  }

  handleWheel(delta: number): void {
    if (this.mode === 'overhead') {
      this.overheadDistance += delta > 0 ? 3 : -3;
      this.overheadDistance = Math.max(10, Math.min(100, this.overheadDistance));
    }
  }

  isMoving(): boolean {
    return this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
  }

  update(delta: number): void {
    if (this.mode === 'firstPerson') {
      const speed = this.moveSpeed * delta;
      const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

      if (this.moveForward) this.position.add(forward.clone().multiplyScalar(speed));
      if (this.moveBackward) this.position.add(forward.clone().multiplyScalar(-speed));
      if (this.moveLeft) this.position.add(right.clone().multiplyScalar(-speed));
      if (this.moveRight) this.position.add(right.clone().multiplyScalar(speed));

      this.position.y = this.firstPersonHeight;
      this.updateFirstPersonCamera();

      const shouldBlur = this.isMoving();
      if (shouldBlur !== this.motionBlurActive) {
        this.motionBlurActive = shouldBlur;
        if (this.motionBlurElement) {
          this.motionBlurElement.style.filter = shouldBlur ? 'blur(0.3px)' : 'none';
        }
      }
    } else {
      this.updateOverheadCamera();
      if (this.motionBlurActive) {
        this.motionBlurActive = false;
        if (this.motionBlurElement) {
          this.motionBlurElement.style.filter = 'none';
        }
      }
    }
  }
}
