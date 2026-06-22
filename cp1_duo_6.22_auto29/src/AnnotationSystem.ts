import * as THREE from 'three';

export interface AnnotationData {
  id: string;
  position: { x: number; y: number; z: number };
  text: string;
  createdAt: number;
}

interface Annotation {
  data: AnnotationData;
  marker: THREE.Mesh;
  label: THREE.Sprite;
  labelCanvas: HTMLCanvasElement;
}

export class AnnotationSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private annotations: Annotation[] = [];
  private modelMeshes: THREE.Mesh[] = [];
  private selectedAnnotation: Annotation | null = null;
  private isDragging: boolean = false;
  private dragAnnotation: Annotation | null = null;
  private highlightAnimationId: number | null = null;
  private highlightedAnnotationId: string | null = null;
  private isHighlightActive: boolean = false;

  private onAnnotationListChangeCallback: (() => void) | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
  }

  setModelMeshes(meshes: THREE.Mesh[]): void {
    this.modelMeshes = meshes;
  }

  onAnnotationListChange(callback: () => void): void {
    this.onAnnotationListChangeCallback = callback;
  }

  getAnnotations(): AnnotationData[] {
    return this.annotations.map((a) => ({ ...a.data }));
  }

  getAnnotationCount(): number {
    return this.annotations.length;
  }

  handleClick(event: MouseEvent, canvas: HTMLCanvasElement): boolean {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);

    const markerMeshes = this.annotations.map((a) => a.marker);
    const markerIntersects = this.raycaster.intersectObjects(markerMeshes);

    if (markerIntersects.length > 0) {
      const clickedMarker = markerIntersects[0].object as THREE.Mesh;
      const annotation = this.annotations.find((a) => a.marker === clickedMarker);
      if (annotation) {
        this.selectedAnnotation = annotation;
        return true;
      }
    }

    if (this.modelMeshes.length > 0) {
      const modelIntersects = this.raycaster.intersectObjects(this.modelMeshes, true);
      if (modelIntersects.length > 0) {
        const point = modelIntersects[0].point;
        this.createTemporaryMarker(point);
        return true;
      }
    }

    return false;
  }

  handleDoubleClick(event: MouseEvent, canvas: HTMLCanvasElement): boolean {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);

    const markerMeshes = this.annotations.map((a) => a.marker);
    const intersects = this.raycaster.intersectObjects(markerMeshes);

    if (intersects.length > 0) {
      const clickedMarker = intersects[0].object as THREE.Mesh;
      const annotation = this.annotations.find((a) => a.marker === clickedMarker);
      if (annotation) {
        this.selectedAnnotation = annotation;
        return true;
      }
    }

    return false;
  }

  private tempMarker: THREE.Mesh | null = null;

  private createTemporaryMarker(position: THREE.Vector3): void {
    if (this.tempMarker) {
      this.scene.remove(this.tempMarker);
    }

    const geometry = new THREE.SphereGeometry(0.05, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xe94560 });
    this.tempMarker = new THREE.Mesh(geometry, material);
    this.tempMarker.position.copy(position);
    this.scene.add(this.tempMarker);
  }

  confirmAnnotation(text: string): void {
    if (!this.tempMarker) return;

    const position = this.tempMarker.position.clone();
    this.scene.remove(this.tempMarker);
    this.tempMarker = null;

    this.addAnnotation(position, text);
  }

  cancelAnnotation(): void {
    if (this.tempMarker) {
      this.scene.remove(this.tempMarker);
      this.tempMarker = null;
    }
  }

  private addAnnotation(position: THREE.Vector3, text: string): void {
    const id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xe94560 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(position);
    marker.userData.annotationId = id;

    const { sprite: label, canvas: labelCanvas } = this.createLabelSprite(text);
    label.position.copy(position);
    label.position.y += 0.15;

    this.scene.add(marker);
    this.scene.add(label);

    const annotation: Annotation = {
      data: {
        id,
        position: { x: position.x, y: position.y, z: position.z },
        text,
        createdAt: Date.now(),
      },
      marker,
      label,
      labelCanvas,
    };

    this.annotations.push(annotation);
    this.selectedAnnotation = annotation;

    if (this.onAnnotationListChangeCallback) {
      this.onAnnotationListChangeCallback();
    }
  }

  private createLabelSprite(text: string): { sprite: THREE.Sprite; canvas: HTMLCanvasElement } {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const fontSize = 28;
    const padding = 16;
    const borderRadius = 8;

    ctx.font = `${fontSize}px sans-serif`;
    const textWidth = ctx.measureText(text).width;
    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize + padding * 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.roundRect(ctx, 0, 0, canvas.width, canvas.height, borderRadius);
    ctx.fill();

    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    const aspect = canvas.width / canvas.height;
    sprite.scale.set(0.3 * aspect, 0.3, 1);

    return { sprite, canvas };
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  updateLabelPosition(annotation: Annotation): void {
    annotation.label.position.copy(annotation.marker.position);
    annotation.label.position.y += 0.15;
  }

  updateLabelText(annotation: Annotation, text: string): void {
    annotation.data.text = text;
    this.scene.remove(annotation.label);

    const { sprite, canvas } = this.createLabelSprite(text);
    sprite.position.copy(annotation.marker.position);
    sprite.position.y += 0.15;

    annotation.label = sprite;
    annotation.labelCanvas = canvas;
    this.scene.add(sprite);

    if (this.onAnnotationListChangeCallback) {
      this.onAnnotationListChangeCallback();
    }
  }

  deleteAnnotation(id: string): void {
    const index = this.annotations.findIndex((a) => a.data.id === id);
    if (index === -1) return;

    const annotation = this.annotations[index];
    this.scene.remove(annotation.marker);
    this.scene.remove(annotation.label);

    if (this.selectedAnnotation?.data.id === id) {
      this.selectedAnnotation = null;
    }

    this.annotations.splice(index, 1);

    if (this.onAnnotationListChangeCallback) {
      this.onAnnotationListChangeCallback();
    }
  }

  editAnnotation(id: string, text: string): void {
    const annotation = this.annotations.find((a) => a.data.id === id);
    if (annotation) {
      this.updateLabelText(annotation, text);
    }
  }

  highlightAnnotation(id: string): boolean {
    if (this.isHighlightActive && this.highlightedAnnotationId === id) {
      this.clearHighlight();
      return false;
    }

    this.clearHighlight();

    const annotation = this.annotations.find((a) => a.data.id === id);
    if (!annotation) return false;

    this.highlightedAnnotationId = id;
    this.isHighlightActive = true;

    const baseScale = 1;
    const highlightScale = 1.5;
    const startTime = performance.now();

    const animate = () => {
      if (!this.isHighlightActive || this.highlightedAnnotationId !== id) {
        annotation.marker.scale.setScalar(baseScale);
        this.highlightAnimationId = null;
        return;
      }

      const elapsed = performance.now() - startTime;
      const pulseSpeed = 0.004;
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * pulseSpeed);
      const scale = baseScale + (highlightScale - baseScale) * pulse;
      annotation.marker.scale.setScalar(scale);

      this.highlightAnimationId = requestAnimationFrame(animate);
    };

    animate();
    return true;
  }

  clearHighlight(): void {
    if (this.highlightAnimationId !== null) {
      cancelAnimationFrame(this.highlightAnimationId);
      this.highlightAnimationId = null;
    }

    if (this.highlightedAnnotationId) {
      const annotation = this.annotations.find((a) => a.data.id === this.highlightedAnnotationId);
      if (annotation) {
        annotation.marker.scale.setScalar(1);
      }
    }

    this.highlightedAnnotationId = null;
    this.isHighlightActive = false;
  }

  getHighlightedAnnotationId(): string | null {
    return this.highlightedAnnotationId;
  }

  getSelectedAnnotation(): AnnotationData | null {
    return this.selectedAnnotation ? { ...this.selectedAnnotation.data } : null;
  }

  hasTemporaryMarker(): boolean {
    return this.tempMarker !== null;
  }

  startDrag(event: MouseEvent, canvas: HTMLCanvasElement): boolean {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);

    const markerMeshes = this.annotations.map((a) => a.marker);
    const intersects = this.raycaster.intersectObjects(markerMeshes);

    if (intersects.length > 0) {
      const marker = intersects[0].object as THREE.Mesh;
      const annotation = this.annotations.find((a) => a.marker === marker);
      if (annotation) {
        this.isDragging = true;
        this.dragAnnotation = annotation;
        return true;
      }
    }

    return false;
  }

  handleDrag(event: MouseEvent, canvas: HTMLCanvasElement): void {
    if (!this.isDragging || !this.dragAnnotation) return;

    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);

    if (this.modelMeshes.length > 0) {
      const intersects = this.raycaster.intersectObjects(this.modelMeshes, true);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        this.dragAnnotation.marker.position.copy(point);
        this.updateLabelPosition(this.dragAnnotation);
        this.dragAnnotation.data.position = {
          x: point.x,
          y: point.y,
          z: point.z,
        };
        return;
      }
    }

    const planeNormal = new THREE.Vector3();
    this.camera.getWorldDirection(planeNormal);
    planeNormal.negate();

    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      planeNormal,
      this.dragAnnotation.marker.position
    );

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
      this.dragAnnotation.marker.position.copy(intersection);
      this.updateLabelPosition(this.dragAnnotation);
      this.dragAnnotation.data.position = {
        x: intersection.x,
        y: intersection.y,
        z: intersection.z,
      };
    }
  }

  endDrag(): void {
    if (this.isDragging && this.dragAnnotation && this.onAnnotationListChangeCallback) {
      this.onAnnotationListChangeCallback();
    }
    this.isDragging = false;
    this.dragAnnotation = null;
  }

  isDraggingAnnotation(): boolean {
    return this.isDragging;
  }

  exportToJSON(): string {
    const data = this.annotations.map((a) => ({
      id: a.data.id,
      position: a.data.position,
      text: a.data.text,
      createdAt: a.data.createdAt,
    }));
    return JSON.stringify(data, null, 2);
  }

  downloadJSON(): void {
    const json = this.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const filename = `annotations_${year}${month}${day}_${hours}${minutes}${seconds}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  update(): void {
    for (const annotation of this.annotations) {
      annotation.label.lookAt(this.camera.position);
    }
  }

  dispose(): void {
    if (this.highlightAnimationId !== null) {
      cancelAnimationFrame(this.highlightAnimationId);
    }
    for (const annotation of this.annotations) {
      this.scene.remove(annotation.marker);
      this.scene.remove(annotation.label);
      annotation.marker.geometry.dispose();
      (annotation.marker.material as THREE.Material).dispose();
      (annotation.label.material as THREE.SpriteMaterial).map?.dispose();
      (annotation.label.material as THREE.Material).dispose();
    }
    this.annotations = [];
  }
}
