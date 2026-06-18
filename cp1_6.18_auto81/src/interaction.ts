import * as THREE from 'three';
import { eventBus, type Atom } from './atoms';

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private atomMeshes: THREE.Mesh[] = [];
  private selectedAtomId: string | null = null;
  private shiftSelectedAtomId: string | null = null;
  private draggedAtomId: string | null = null;
  private dragPlane: THREE.Plane;
  private dragOffset: THREE.Vector3;
  private isDragging = false;
  private dragStartTime = 0;
  private dragStartPos = new THREE.Vector2();

  private dashLine: THREE.Line | null = null;
  private dashLinePoints: THREE.Vector3[] = [];

  private hoveredAtomId: string | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer
  ) {
    this.camera = camera;
    this.scene = scene;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.dragOffset = new THREE.Vector3();

    this.createDashLine();
    this.setupEventListeners();
  }

  private createDashLine(): void {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineDashedMaterial({
      color: 0x64e0ff,
      dashSize: 0.1,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.6
    });
    this.dashLine = new THREE.Line(geometry, material);
    this.dashLine.visible = false;
    this.scene.add(this.dashLine);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this));

    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));

    eventBus.on('atom:created-mesh', (mesh: THREE.Mesh) => {
      this.atomMeshes.push(mesh);
    });

    eventBus.on('atom:removed-mesh', (mesh: THREE.Mesh) => {
      const idx = this.atomMeshes.indexOf(mesh);
      if (idx > -1) this.atomMeshes.splice(idx, 1);
    });
  }

  updateAtomMeshes(atoms: Atom[]): void {
    this.atomMeshes = atoms.map(a => a.mesh);
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;

    this.updateMouse(event);
    this.dragStartTime = Date.now();
    this.dragStartPos.set(event.clientX, event.clientY);

    const hitAtom = this.raycastAtom();

    if (hitAtom) {
      if (event.shiftKey) {
        this.handleShiftClick(hitAtom.userData.atomId);
      } else {
        this.startDragging(hitAtom);
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event);

    const hitAtom = this.raycastAtom();

    if (this.isDragging && this.draggedAtomId) {
      this.updateDragPosition();
      this.updateDashLine();
      eventBus.emit('atom:dragging', this.draggedAtomId);
    } else {
      if (hitAtom) {
        const atomId = hitAtom.userData.atomId;
        if (this.hoveredAtomId !== atomId) {
          if (this.hoveredAtomId) {
            eventBus.emit('atom:hover-end', this.hoveredAtomId);
          }
          this.hoveredAtomId = atomId;
          eventBus.emit('atom:hover-start', atomId);
        }
      } else if (this.hoveredAtomId) {
        eventBus.emit('atom:hover-end', this.hoveredAtomId);
        this.hoveredAtomId = null;
      }
    }

    this.renderer.domElement.style.cursor =
      hitAtom || this.isDragging ? 'grab' : 'default';
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button !== 0) return;

    const dragDuration = Date.now() - this.dragStartTime;
    const dragDistance = Math.sqrt(
      Math.pow(event.clientX - this.dragStartPos.x, 2) +
      Math.pow(event.clientY - this.dragStartPos.y, 2)
    );

    const isClick = dragDuration < 200 && dragDistance < 5;

    if (this.isDragging && this.draggedAtomId) {
      this.stopDragging();
      eventBus.emit('atom:drag-end', this.draggedAtomId);
      this.hideDashLine();
    }

    if (isClick) {
      const hitAtom = this.raycastAtom();
      if (!hitAtom && !event.shiftKey) {
        this.showAtomPicker(event);
      } else if (hitAtom && !event.shiftKey) {
        eventBus.emit('atom:select', hitAtom.userData.atomId);
        this.selectedAtomId = hitAtom.userData.atomId;
      }
    }

    this.draggedAtomId = null;
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY * 0.01;
    eventBus.emit('camera:zoom', delta);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      eventBus.emit('mode:shift', true);
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.selectedAtomId) {
        eventBus.emit('atom:remove', this.selectedAtomId);
        this.selectedAtomId = null;
      }
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      eventBus.emit('mode:shift', false);
      this.shiftSelectedAtomId = null;
    }
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private raycastAtom(): THREE.Mesh | null {
    if (this.atomMeshes.length === 0) return null;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.atomMeshes);

    if (intersects.length > 0) {
      return intersects[0].object as THREE.Mesh;
    }
    return null;
  }

  private handleShiftClick(atomId: string): void {
    if (!this.shiftSelectedAtomId) {
      this.shiftSelectedAtomId = atomId;
      eventBus.emit('atom:shift-select', atomId);
    } else if (this.shiftSelectedAtomId !== atomId) {
      eventBus.emit('bond:create', this.shiftSelectedAtomId, atomId);
      this.shiftSelectedAtomId = atomId;
    }
  }

  private startDragging(atomMesh: THREE.Mesh): void {
    const atomId = atomMesh.userData.atomId;
    this.draggedAtomId = atomId;
    this.isDragging = true;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const worldPos = new THREE.Vector3();
    atomMesh.getWorldPosition(worldPos);

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    this.dragPlane.setFromNormalAndCoplanarPoint(
      camDir.negate(),
      worldPos
    );

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
    if (intersection) {
      this.dragOffset.copy(worldPos).sub(intersection);
    }

    eventBus.emit('atom:drag-start', atomId);
    this.showDashLine(worldPos);
  }

  private updateDragPosition(): void {
    if (!this.draggedAtomId) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);

    if (intersection) {
      const newPos = intersection.add(this.dragOffset);
      eventBus.emit('atom:position', this.draggedAtomId, newPos);
    }
  }

  private stopDragging(): void {
    this.isDragging = false;
  }

  private showAtomPicker(event: MouseEvent): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const distance = 8;
    this.raycaster.ray.direction.multiplyScalar(distance);
    const worldPos = new THREE.Vector3().copy(this.raycaster.ray.origin)
      .add(this.raycaster.ray.direction);

    eventBus.emit('picker:show', event.clientX, event.clientY, worldPos);
  }

  private showDashLine(startPos: THREE.Vector3): void {
    if (!this.dashLine) return;
    this.dashLine.visible = true;
    this.dashLinePoints = [startPos.clone(), startPos.clone()];
    this.updateDashLineGeometry();
  }

  private hideDashLine(): void {
    if (!this.dashLine) return;
    this.dashLine.visible = false;
  }

  private updateDashLine(): void {
    if (!this.dashLine || !this.draggedAtomId) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);

    if (intersection) {
      const endPos = intersection.clone().add(this.dragOffset);

      eventBus.emit('atom:get-position', this.draggedAtomId, (pos: THREE.Vector3) => {
        this.dashLinePoints[0] = pos.clone();
        this.dashLinePoints[1] = endPos;
        this.updateDashLineGeometry();
      });
    }
  }

  private updateDashLineGeometry(): void {
    if (!this.dashLine) return;
    const positions = new Float32Array(this.dashLinePoints.length * 3);
    this.dashLinePoints.forEach((v, i) => {
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    });
    this.dashLine.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    this.dashLine.computeLineDistances();
  }

  getSelectedAtomId(): string | null {
    return this.selectedAtomId;
  }

  clearSelection(): void {
    this.selectedAtomId = null;
  }

  update(): void {
  }

  dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.removeEventListener('wheel', this.onWheel.bind(this));
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    document.removeEventListener('keyup', this.onKeyUp.bind(this));

    if (this.dashLine) {
      this.scene.remove(this.dashLine);
      this.dashLine.geometry.dispose();
      (this.dashLine.material as THREE.Material).dispose();
    }
  }
}
