import * as THREE from 'three';
import { ControlPoint, CurveData, TubeParams, DEFAULT_TUBE_PARAMS, MAX_CURVES, MAX_CONTROL_POINTS } from './types';

export interface CurveObject3D {
  id: string;
  name: string;
  group: THREE.Group;
  curveLine: THREE.Line;
  controlPointsMesh: THREE.Points;
  tubeMesh: THREE.Mesh | null;
  outlineMesh: THREE.LineSegments | null;
  controlPoints: ControlPoint[];
  params: TubeParams;
  originalColor: THREE.Color;
  isHovered: boolean;
  isSelected: boolean;
}

type CurveChangeListener = (curves: CurveData[], selectedId: string | null) => void;
type CountChangeListener = (count: number) => void;

export class CurveManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private curves: Map<string, CurveObject3D> = new Map();
  private curveCounter = 0;
  private selectedCurveId: string | null = null;

  private isDrawing = false;
  private drawingPoints: THREE.Vector3[] = [];
  private drawingLine: THREE.Line | null = null;
  private lastScreenPos = new THREE.Vector2();

  private undoStack: CurveData[] = [];
  private curveChangeListeners: CurveChangeListener[] = [];
  private countChangeListeners: CountChangeListener[] = [];

  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private drawingGroup: THREE.Group;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.drawingGroup = new THREE.Group();
    this.drawingGroup.name = '_drawing_group';
    this.scene.add(this.drawingGroup);
  }

  onCurveChange(listener: CurveChangeListener) {
    this.curveChangeListeners.push(listener);
  }

  onCountChange(listener: CountChangeListener) {
    this.countChangeListeners.push(listener);
  }

  private emitCurveChange() {
    const data = this.getCurveDataList();
    this.curveChangeListeners.forEach(l => l(data, this.selectedCurveId));
  }

  private emitCountChange() {
    this.countChangeListeners.forEach(l => l(this.curves.size));
  }

  getCurveCount(): number {
    return this.curves.size;
  }

  canAddCurve(): boolean {
    return this.curves.size < MAX_CURVES;
  }

  private screenToWorld(clientX: number, clientY: number, container: HTMLElement): THREE.Vector3 | null {
    const rect = container.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const target = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, target);
    return hit ? target : null;
  }

  startDraw(clientX: number, clientY: number, container: HTMLElement): boolean {
    if (!this.canAddCurve()) return false;
    if (this.isDrawing) return false;

    const worldPos = this.screenToWorld(clientX, clientY, container);
    if (!worldPos) return false;

    this.isDrawing = true;
    this.drawingPoints = [worldPos.clone()];
    this.lastScreenPos.set(clientX, clientY);
    this.createDrawingLine();
    return true;
  }

  updateDraw(clientX: number, clientY: number, container: HTMLElement) {
    if (!this.isDrawing) return;
    if (this.drawingPoints.length >= MAX_CONTROL_POINTS) return;

    const worldPos = this.screenToWorld(clientX, clientY, container);
    if (!worldPos) return;

    const dx = clientX - this.lastScreenPos.x;
    const dy = clientY - this.lastScreenPos.y;
    const screenDist = Math.sqrt(dx * dx + dy * dy);

    if (screenDist > 20) {
      const lastPoint = this.drawingPoints[this.drawingPoints.length - 1];
      const worldDist = lastPoint.distanceTo(worldPos);
      if (worldDist > 0.2) {
        this.drawingPoints.push(worldPos.clone());
        this.lastScreenPos.set(clientX, clientY);
      }
    }

    this.updateDrawingLine(worldPos);
  }

  endDraw(): CurveObject3D | null {
    if (!this.isDrawing) return null;
    this.isDrawing = false;

    if (this.drawingPoints.length < 2) {
      this.clearDrawing();
      return null;
    }

    const curve = this.createCurve(this.drawingPoints.map(p => ({ x: p.x, y: p.y, z: p.z })));
    this.clearDrawing();

    this.undoStack = [];
    this.selectCurve(curve.id);
    this.emitCurveChange();
    this.emitCountChange();
    return curve;
  }

  private clearDrawing() {
    this.drawingPoints = [];
    if (this.drawingLine) {
      this.drawingGroup.remove(this.drawingLine);
      if (this.drawingLine.geometry) this.drawingLine.geometry.dispose();
      if (this.drawingLine.material) {
        const mat = this.drawingLine.material as THREE.LineBasicMaterial;
        mat.dispose();
      }
      this.drawingLine = null;
    }
  }

  private createDrawingLine() {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });
    this.drawingLine = new THREE.Line(geometry, material);
    this.drawingGroup.add(this.drawingLine);
    this.updateDrawingLine(this.drawingPoints[0]);
  }

  private updateDrawingLine(current: THREE.Vector3) {
    if (!this.drawingLine) return;
    const allPoints = [...this.drawingPoints, current];
    const positions = new Float32Array(allPoints.length * 3);
    allPoints.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    this.drawingLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.drawingLine.geometry.attributes.position.needsUpdate = true;
    this.drawingLine.geometry.computeBoundingSphere();
  }

  createCurve(points: ControlPoint[], params?: Partial<TubeParams>, name?: string, id?: string): CurveObject3D {
    this.curveCounter++;
    const curveId = id || `curve_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const curveName = name || `曲线 ${this.curveCounter}`;
    const tubeParams: TubeParams = { ...DEFAULT_TUBE_PARAMS, ...params };

    const group = new THREE.Group();
    group.name = curveName;
    this.scene.add(group);

    const curveLine = this.buildCurveLine(points);
    group.add(curveLine);

    const controlPointsMesh = this.buildControlPoints(points);
    group.add(controlPointsMesh);

    const obj: CurveObject3D = {
      id: curveId,
      name: curveName,
      group,
      curveLine,
      controlPointsMesh,
      tubeMesh: null,
      outlineMesh: null,
      controlPoints: [...points],
      params: tubeParams,
      originalColor: new THREE.Color(tubeParams.color),
      isHovered: false,
      isSelected: false
    };
    this.curves.set(curveId, obj);
    return obj;
  }

  private buildCurveLine(points: ControlPoint[]): THREE.Line {
    const vectors = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
    const curve = new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.5);
    const sampled = curve.getPoints(Math.max(vectors.length * 10, 50));

    const geometry = new THREE.BufferGeometry().setFromPoints(sampled);
    const material = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.5
    });
    return new THREE.Line(geometry, material);
  }

  private buildControlPoints(points: ControlPoint[]): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);

    points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      const t = points.length > 1 ? i / (points.length - 1) : 0;
      const color = new THREE.Color().setHSL(0.55 - t * 0.3, 0.9, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });
    return new THREE.Points(geometry, material);
  }

  selectCurve(id: string | null) {
    this.curves.forEach((obj) => {
      obj.isSelected = (obj.id === id);
      this.updateOutline(obj);
    });
    this.selectedCurveId = id;
    this.emitCurveChange();
  }

  getSelectedCurve(): CurveObject3D | null {
    return this.selectedCurveId ? this.curves.get(this.selectedCurveId) || null : null;
  }

  getCurveById(id: string): CurveObject3D | null {
    return this.curves.get(id) || null;
  }

  updateOutline(obj: CurveObject3D) {
    if (obj.outlineMesh) {
      obj.group.remove(obj.outlineMesh);
      if (obj.outlineMesh.geometry) obj.outlineMesh.geometry.dispose();
      const mat = obj.outlineMesh.material as THREE.LineBasicMaterial;
      if (mat) mat.dispose();
      obj.outlineMesh = null;
    }

    if (obj.isSelected && obj.tubeMesh) {
      const edges = new THREE.EdgesGeometry(obj.tubeMesh.geometry, 30);
      const material = new THREE.LineBasicMaterial({
        color: 0x4da6ff,
        transparent: true,
        opacity: 0.7,
        linewidth: 2
      });
      obj.outlineMesh = new THREE.LineSegments(edges, material);
      obj.group.add(obj.outlineMesh);
    }
  }

  deleteCurve(id: string): boolean {
    const obj = this.curves.get(id);
    if (!obj) return false;

    this.undoStack.push({
      id: obj.id,
      name: obj.name,
      controlPoints: [...obj.controlPoints],
      params: { ...obj.params }
    });
    if (this.undoStack.length > 20) this.undoStack.shift();

    this.disposeCurve(obj);
    this.curves.delete(id);

    if (this.selectedCurveId === id) {
      this.selectedCurveId = null;
    }
    this.emitCurveChange();
    this.emitCountChange();
    return true;
  }

  private disposeCurve(obj: CurveObject3D) {
    this.scene.remove(obj.group);

    if (obj.curveLine) {
      obj.curveLine.geometry.dispose();
      (obj.curveLine.material as THREE.Material).dispose();
    }
    if (obj.controlPointsMesh) {
      obj.controlPointsMesh.geometry.dispose();
      (obj.controlPointsMesh.material as THREE.Material).dispose();
    }
    if (obj.tubeMesh) {
      obj.tubeMesh.geometry.dispose();
      (obj.tubeMesh.material as THREE.Material).dispose();
    }
    if (obj.outlineMesh) {
      obj.outlineMesh.geometry.dispose();
      (obj.outlineMesh.material as THREE.Material).dispose();
    }
  }

  undo(): boolean {
    const data = this.undoStack.pop();
    if (!data) return false;

    const obj = this.createCurve(data.controlPoints, data.params, data.name, data.id);
    this.selectCurve(obj.id);
    this.emitCurveChange();
    this.emitCountChange();
    return true;
  }

  renameCurve(id: string, name: string): boolean {
    const obj = this.curves.get(id);
    if (!obj) return false;
    obj.name = name;
    obj.group.name = name;
    this.emitCurveChange();
    return true;
  }

  updateParams(id: string, params: Partial<TubeParams>): boolean {
    const obj = this.curves.get(id);
    if (!obj) return false;
    obj.params = { ...obj.params, ...params };
    if (params.color) {
      obj.originalColor = new THREE.Color(params.color);
    }
    return true;
  }

  getAllTubeMeshes(): THREE.Mesh[] {
    const result: THREE.Mesh[] = [];
    this.curves.forEach(obj => {
      if (obj.tubeMesh) result.push(obj.tubeMesh);
    });
    return result;
  }

  getCurveDataList(): CurveData[] {
    const data: CurveData[] = [];
    this.curves.forEach(obj => {
      data.push({
        id: obj.id,
        name: obj.name,
        controlPoints: [...obj.controlPoints],
        params: { ...obj.params }
      });
    });
    return data;
  }

  getSelectedId(): string | null {
    return this.selectedCurveId;
  }

  clearAll() {
    this.curves.forEach(obj => this.disposeCurve(obj));
    this.curves.clear();
    this.selectedCurveId = null;
    this.curveCounter = 0;
    this.undoStack = [];
    this.clearDrawing();
    this.emitCurveChange();
    this.emitCountChange();
  }

  loadCurves(curves: CurveData[]) {
    this.clearAll();
    curves.forEach(data => {
      const obj = this.createCurve(data.controlPoints, data.params, data.name, data.id);
      this.curveCounter = Math.max(this.curveCounter, parseInt(data.name.replace(/\D/g, '')) || 0);
    });
    this.emitCurveChange();
    this.emitCountChange();
  }
}
