import * as THREE from 'three';

export interface WaveSourceOptions {
  position: THREE.Vector3;
  color: number;
  radius: number;
  boundaryRadius: number;
}

export class WaveSource {
  public mesh: THREE.Group;
  public glowMesh: THREE.Mesh;
  public coreMesh: THREE.Mesh;
  public trail: THREE.Points;
  public trailPositions: Float32Array;
  public trailAlphas: Float32Array;
  public color: THREE.Color;
  public boundaryRadius: number;
  public isDragging: boolean = false;
  public onPositionChange?: (position: THREE.Vector3) => void;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private dragPlane: THREE.Plane;
  private dragOffset: THREE.Vector3;
  private maxTrailLength: number = 30;
  private currentTrailIndex: number = 0;

  constructor(
    options: WaveSourceOptions,
    camera: THREE.Camera,
    domElement: HTMLElement
  ) {
    this.color = new THREE.Color(options.color);
    this.boundaryRadius = options.boundaryRadius;
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane();
    this.dragOffset = new THREE.Vector3();

    this.mesh = new THREE.Group();
    this.mesh.position.copy(options.position);

    const glowGeometry = new THREE.SphereGeometry(options.radius * 2, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(this.glowMesh);

    const coreGeometry = new THREE.SphereGeometry(options.radius, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.9
    });
    this.coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    this.mesh.add(this.coreMesh);

    this.trailPositions = new Float32Array(this.maxTrailLength * 3);
    this.trailAlphas = new Float32Array(this.maxTrailLength);
    
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(this.trailAlphas, 1));
    
    const trailMaterial = new THREE.PointsMaterial({
      color: this.color,
      size: 0.3,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    
    this.trail = new THREE.Points(trailGeometry, trailMaterial);
    this.mesh.add(this.trail);

    this.bindEvents();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.domElement.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.domElement.addEventListener('touchend', this.onTouchEnd);
  }

  private updateMouse(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onMouseDown = (event: MouseEvent): void => {
    this.updateMouse(event.clientX, event.clientY);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObject(this.coreMesh, true);
    if (intersects.length > 0) {
      this.isDragging = true;
      this.coreMesh.scale.setScalar(1.2);
      
      this.dragPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        this.mesh.position
      );
      
      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
      this.dragOffset.copy(this.mesh.position).sub(intersection);
    }
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging) return;
    this.updateMouse(event.clientX, event.clientY);
    this.updateDragPosition();
  };

  private onMouseUp = (): void => {
    if (this.isDragging) {
      this.isDragging = false;
      this.coreMesh.scale.setScalar(1);
    }
  };

  private onTouchStart = (event: TouchEvent): void => {
    event.preventDefault();
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.updateMouse(touch.clientX, touch.clientY);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      const intersects = this.raycaster.intersectObject(this.coreMesh, true);
      if (intersects.length > 0) {
        this.isDragging = true;
        this.coreMesh.scale.setScalar(1.2);
        
        this.dragPlane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 1, 0),
          this.mesh.position
        );
        
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
        this.dragOffset.copy(this.mesh.position).sub(intersection);
      }
    }
  };

  private onTouchMove = (event: TouchEvent): void => {
    event.preventDefault();
    if (!this.isDragging || event.touches.length !== 1) return;
    const touch = event.touches[0];
    this.updateMouse(touch.clientX, touch.clientY);
    this.updateDragPosition();
  };

  private onTouchEnd = (): void => {
    if (this.isDragging) {
      this.isDragging = false;
      this.coreMesh.scale.setScalar(1);
    }
  };

  private updateDragPosition(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
    
    const newPos = intersection.add(this.dragOffset);
    
    const length = newPos.length();
    if (length > this.boundaryRadius * 0.9) {
      newPos.normalize().multiplyScalar(this.boundaryRadius * 0.9);
    }
    
    this.mesh.position.copy(newPos);
    this.onPositionChange?.(this.mesh.position.clone());
  }

  public update(deltaTime: number): void {
    const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;
    this.glowMesh.scale.setScalar(pulse);
    
    const glowOpacity = (Math.sin(Date.now() * 0.005) * 0.5 + 0.5) * 0.3 + 0.1;
    (this.glowMesh.material as THREE.MeshBasicMaterial).opacity = glowOpacity;

    if (this.isDragging || this.mesh.position.distanceTo(this.getLastTrailPosition()) > 0.1) {
      this.addTrailPoint();
    }
    
    this.fadeTrail(deltaTime);
  }

  private getLastTrailPosition(): THREE.Vector3 {
    const idx = (this.currentTrailIndex - 1 + this.maxTrailLength) % this.maxTrailLength;
    return new THREE.Vector3(
      this.trailPositions[idx * 3],
      this.trailPositions[idx * 3 + 1],
      this.trailPositions[idx * 3 + 2]
    );
  }

  private addTrailPoint(): void {
    const pos = this.mesh.position;
    const idx = this.currentTrailIndex * 3;
    this.trailPositions[idx] = pos.x;
    this.trailPositions[idx + 1] = pos.y;
    this.trailPositions[idx + 2] = pos.z;
    this.trailAlphas[this.currentTrailIndex] = 1.0;
    
    this.currentTrailIndex = (this.currentTrailIndex + 1) % this.maxTrailLength;
    
    (this.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.trail.geometry.attributes.alpha as THREE.BufferAttribute).needsUpdate = true;
  }

  private fadeTrail(deltaTime: number): void {
    const fadeSpeed = 2;
    for (let i = 0; i < this.maxTrailLength; i++) {
      this.trailAlphas[i] = Math.max(0, this.trailAlphas[i] - deltaTime * fadeSpeed);
    }
    (this.trail.geometry.attributes.alpha as THREE.BufferAttribute).needsUpdate = true;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
    this.onPositionChange?.(position.clone());
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('touchmove', this.onTouchMove);
    this.domElement.removeEventListener('touchend', this.onTouchEnd);
    
    this.glowMesh.geometry.dispose();
    (this.glowMesh.material as THREE.Material).dispose();
    this.coreMesh.geometry.dispose();
    (this.coreMesh.material as THREE.Material).dispose();
    this.trail.geometry.dispose();
    (this.trail.material as THREE.Material).dispose();
  }
}
