import * as THREE from 'three';
import * as d3 from 'd3';
import type { DataPoint, ClusterResult } from './main.js';

const COLOR_START = [52, 152, 219];
const COLOR_END = [231, 76, 60];

interface ColorTransition {
  from: Float32Array;
  to: Float32Array;
  startTime: number;
  duration: number;
}

export class PointCloudManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private dataPoints: DataPoint[] = [];
  private labels: number[] = [];
  private clusterCount: number = 0;
  private pointsGroup: THREE.Group;
  private instancedMesh: THREE.InstancedMesh | null = null;
  private spritePoints: THREE.Points | null = null;
  private boundingBoxes: THREE.Group;
  private colorScale: d3.ScaleLinear<string, string>;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredIndex: number = -1;
  private selectedIndices: Set<number> = new Set();
  private highlightMesh: THREE.Mesh | null = null;
  private tooltip: HTMLElement;
  private selectionBox: HTMLElement;
  private isBoxSelecting: boolean = false;
  private boxStart: { x: number; y: number } = { x: 0, y: 0 };
  private colorTransition: ColorTransition | null = null;
  private tempColor: Float32Array;
  private tempInstanceMatrix: THREE.Matrix4;
  private dummyObject: THREE.Object3D;
  private lodThreshold: number = 3000;
  private useLOD: boolean = false;
  private radius: number = 0.2;
  private selectedListBody: HTMLElement;
  private selectedListCount: HTMLElement;
  private onBoxSelectionEnd: ((indices: number[]) => void) | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.pointsGroup = new THREE.Group();
    this.boundingBoxes = new THREE.Group();
    this.scene.add(this.pointsGroup);
    this.scene.add(this.boundingBoxes);

    this.colorScale = d3
      .scaleLinear<string>()
      .domain([0, 1])
      .range(['rgb(' + COLOR_START.join(',') + ')', 'rgb(' + COLOR_END.join(',') + ')'])
      .interpolate(d3.interpolateRgb);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.tempColor = new Float32Array(3);
    this.tempInstanceMatrix = new THREE.Matrix4();
    this.dummyObject = new THREE.Object3D();

    this.tooltip = document.getElementById('tooltip')!;
    this.selectionBox = document.getElementById('selection-box')!;
    this.selectedListBody = document.getElementById('selected-list-body')!;
    this.selectedListCount = document.getElementById('selected-list-count')!;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousemove', this.onMouseMove.bind(this));
    dom.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    dom.addEventListener('mousedown', this.onMouseDown.bind(this));
    dom.addEventListener('mousemove', this.onBoxSelectMove.bind(this));
    dom.addEventListener('mouseup', this.onMouseUp.bind(this));
    dom.addEventListener('click', this.onClick.bind(this));
  }

  private screenToNDC(clientX: number, clientY: number): [number, number] {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return [
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    ];
  }

  private onMouseMove(e: MouseEvent): void {
    const [nx, ny] = this.screenToNDC(e.clientX, e.clientY);
    this.mouse.set(nx, ny);

    if (this.isBoxSelecting) {
      return;
    }

    const index = this.pickPoint();
    if (index !== this.hoveredIndex) {
      if (this.hoveredIndex >= 0) {
        this.removeHoverHighlight();
      }
      this.hoveredIndex = index;
      if (index >= 0) {
        this.addHoverHighlight(index);
        this.showTooltip(e.clientX, e.clientY, this.dataPoints[index], this.labels[index]);
      } else {
        this.hideTooltip();
      }
    } else if (index >= 0) {
      this.updateTooltipPosition(e.clientX, e.clientY);
    }
  }

  private onMouseLeave(): void {
    if (this.hoveredIndex >= 0) {
      this.removeHoverHighlight();
      this.hoveredIndex = -1;
    }
    this.hideTooltip();
    this.endBoxSelection(true);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.shiftKey && e.button === 0) {
      this.isBoxSelecting = true;
      this.boxStart = { x: e.clientX, y: e.clientY };
      this.selectionBox.style.display = 'block';
      this.selectionBox.style.left = e.clientX + 'px';
      this.selectionBox.style.top = e.clientY + 'px';
      this.selectionBox.style.width = '0px';
      this.selectionBox.style.height = '0px';
    }
  }

  private onBoxSelectMove(e: MouseEvent): void {
    if (!this.isBoxSelecting) return;
    const x = Math.min(e.clientX, this.boxStart.x);
    const y = Math.min(e.clientY, this.boxStart.y);
    const w = Math.abs(e.clientX - this.boxStart.x);
    const h = Math.abs(e.clientY - this.boxStart.y);
    this.selectionBox.style.left = x + 'px';
    this.selectionBox.style.top = y + 'px';
    this.selectionBox.style.width = w + 'px';
    this.selectionBox.style.height = h + 'px';
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.isBoxSelecting && e.button === 0) {
      this.endBoxSelection(false);
    }
  }

  private onClick(e: MouseEvent): void {
    if (e.shiftKey) return;
    if (this.isBoxSelecting) return;
    const index = this.pickPoint();
    if (index >= 0) {
      if (this.selectedIndices.has(index)) {
        this.selectedIndices.delete(index);
      } else {
        this.selectedIndices.add(index);
      }
      this.updateSelectedList();
      this.refreshVisualSelection();
    } else {
      this.selectedIndices.clear();
      this.updateSelectedList();
      this.refreshVisualSelection();
    }
  }

  private endBoxSelection(cancelled: boolean): void {
    if (!this.isBoxSelecting) return;

    if (!cancelled) {
      const x1 = parseFloat(this.selectionBox.style.left);
      const y1 = parseFloat(this.selectionBox.style.top);
      const w = parseFloat(this.selectionBox.style.width);
      const h = parseFloat(this.selectionBox.style.height);
      if (w > 5 && h > 5) {
        const indices = this.pickPointsInBox(x1, y1, x1 + w, y1 + h);
        indices.forEach(i => this.selectedIndices.add(i));
        this.updateSelectedList();
        this.refreshVisualSelection();
        if (this.onBoxSelectionEnd) {
          this.onBoxSelectionEnd(Array.from(this.selectedIndices));
        }
      }
    }

    this.isBoxSelecting = false;
    this.selectionBox.style.display = 'none';
  }

  public setOnBoxSelectionEnd(cb: (indices: number[]) => void): void {
    this.onBoxSelectionEnd = cb;
  }

  private pickPoint(): number {
    if (!this.dataPoints.length) return -1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.useLOD && this.spritePoints) {
      const intersects = this.raycaster.intersectObject(this.spritePoints);
      if (intersects.length > 0 && intersects[0].index !== undefined) {
        return intersects[0].index;
      }
    } else if (this.instancedMesh) {
      const intersects = this.raycaster.intersectObject(this.instancedMesh);
      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        return intersects[0].instanceId;
      }
    }
    return -1;
  }

  private pickPointsInBox(x1: number, y1: number, x2: number, y2: number): number[] {
    const result: number[] = [];
    if (!this.dataPoints.length) return result;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndcX1 = ((x1 - rect.left) / rect.width) * 2 - 1;
    const ndcX2 = ((x2 - rect.left) / rect.width) * 2 - 1;
    const ndcY1 = -((y1 - rect.top) / rect.height) * 2 + 1;
    const ndcY2 = -((y2 - rect.top) / rect.height) * 2 + 1;

    const minX = Math.min(ndcX1, ndcX2);
    const maxX = Math.max(ndcX1, ndcX2);
    const minY = Math.min(ndcY1, ndcY2);
    const maxY = Math.max(ndcY1, ndcY2);

    const v = new THREE.Vector3();
    for (let i = 0; i < this.dataPoints.length; i++) {
      const dp = this.dataPoints[i];
      v.set(dp.x, dp.y, dp.z).project(this.camera);
      if (v.x >= minX && v.x <= maxX && v.y >= minY && v.y <= maxY && v.z < 1) {
        result.push(i);
      }
    }
    return result;
  }

  private addHoverHighlight(index: number): void {
    if (!this.dataPoints[index]) return;
    const dp = this.dataPoints[index];
    const geo = new THREE.SphereGeometry(this.radius * 1.6, 24, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: this.getClusterColor(this.labels[index] || 0),
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.highlightMesh = new THREE.Mesh(geo, mat);
    this.highlightMesh.position.set(dp.x, dp.y, dp.z);
    this.scene.add(this.highlightMesh);
  }

  private removeHoverHighlight(): void {
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }
  }

  private showTooltip(clientX: number, clientY: number, dp: DataPoint, label: number): void {
    const color = this.getClusterColor(label || 0);
    const html = `
      <div class="tooltip-id" style="color: ${color};">点 #${dp.id}</div>
      <div class="tooltip-row">
        <span class="tooltip-label">特征 X</span>
        <span class="tooltip-value">${dp.x.toFixed(3)}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">特征 Y</span>
        <span class="tooltip-value">${dp.y.toFixed(3)}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">特征 Z</span>
        <span class="tooltip-value">${dp.z.toFixed(3)}</span>
      </div>
      <div class="tooltip-row" style="margin-top:6px; padding-top:6px; border-top:1px solid rgba(48,54,61,0.5);">
        <span class="tooltip-label">所属聚类</span>
        <span class="tooltip-value" style="color: ${color}; font-weight:600;">C${label >= 0 ? label : 'N/A'}</span>
      </div>
    `;
    this.tooltip.innerHTML = html;
    this.updateTooltipPosition(clientX, clientY);
    this.tooltip.classList.add('visible');
  }

  private updateTooltipPosition(clientX: number, clientY: number): void {
    const rect = this.tooltip.getBoundingClientRect();
    let left = clientX + 16;
    let top = clientY + 16;
    if (left + rect.width > window.innerWidth - 10) {
      left = clientX - rect.width - 16;
    }
    if (top + rect.height > window.innerHeight - 10) {
      top = clientY - rect.height - 16;
    }
    this.tooltip.style.left = left + 'px';
    this.tooltip.style.top = top + 'px';
  }

  private hideTooltip(): void {
    this.tooltip.classList.remove('visible');
  }

  private updateSelectedList(): void {
    this.selectedListCount.textContent = this.selectedIndices.size.toString();
    this.selectedListBody.innerHTML = '';

    const indices = Array.from(this.selectedIndices).slice(0, 100);
    indices.forEach(idx => {
      const dp = this.dataPoints[idx];
      const label = this.labels[idx] || 0;
      const color = this.getClusterColor(label);
      const div = document.createElement('div');
      div.className = 'selected-item';
      div.style.setProperty('--item-color', color);
      const extraFeatures = dp.features.map((f, i) => `F${i + 4}: ${f.toFixed(3)}`).join(' · ');
      div.innerHTML = `
        <div class="selected-item-id">#${dp.id} · 聚类 C${label}</div>
        <div class="selected-item-features">
          X:${dp.x.toFixed(3)} Y:${dp.y.toFixed(3)} Z:${dp.z.toFixed(3)}
          ${extraFeatures ? ' · ' + extraFeatures : ''}
        </div>
      `;
      this.selectedListBody.appendChild(div);
    });

    if (this.selectedIndices.size > 100) {
      const note = document.createElement('div');
      note.style.cssText = 'padding:8px 12px; font-size:11px; color:#7D8590; text-align:center;';
      note.textContent = `... 还有 ${this.selectedIndices.size - 100} 个点未显示`;
      this.selectedListBody.appendChild(note);
    }
  }

  public clearSelection(): void {
    this.selectedIndices.clear();
    this.updateSelectedList();
    this.refreshVisualSelection();
  }

  private getClusterColor(label: number): string {
    if (label < 0) return '#7D8590';
    const t = this.clusterCount > 1 ? label / (this.clusterCount - 1) : 0;
    return this.colorScale(t);
  }

  private parseColorToRGB(colorStr: string, out: Float32Array): void {
    const c = new THREE.Color(colorStr);
    out[0] = c.r;
    out[1] = c.g;
    out[2] = c.b;
  }

  public loadData(points: DataPoint[]): void {
    this.clearAll();
    this.dataPoints = points;
    this.labels = new Array(points.length).fill(0);
    this.clusterCount = 1;
    this.useLOD = points.length > this.lodThreshold;
    this.radius = this.useLOD ? 0.15 : 0.22;
    this.buildPointCloud();
  }

  public getPointCount(): number {
    return this.dataPoints.length;
  }

  public getDataPoints(): DataPoint[] {
    return this.dataPoints;
  }

  public getLabels(): number[] {
    return this.labels;
  }

  public applyClusterResult(result: ClusterResult): void {
    const previousColors = this.getCurrentColorsArray();
    this.labels = result.labels;
    this.clusterCount = result.centroids.length;
    const newColors = this.computeColorsArray();
    this.colorTransition = {
      from: previousColors,
      to: newColors,
      startTime: performance.now(),
      duration: 500
    };
    this.renderBoundingBoxes(result);
    this.refreshVisualSelection();
    this.updateSelectedList();
  }

  private computeColorsArray(): Float32Array {
    const arr = new Float32Array(this.dataPoints.length * 3);
    for (let i = 0; i < this.dataPoints.length; i++) {
      const c = new THREE.Color(this.getClusterColor(this.labels[i]));
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }

  private getCurrentColorsArray(): Float32Array {
    const arr = new Float32Array(this.dataPoints.length * 3);
    if (this.useLOD && this.spritePoints) {
      const colors = this.spritePoints.geometry.getAttribute('color') as THREE.BufferAttribute;
      if (colors && colors.array) {
        arr.set(new Float32Array(colors.array));
        return arr;
      }
    } else if (this.instancedMesh) {
      const color = new THREE.Color();
      for (let i = 0; i < this.instancedMesh.count; i++) {
        this.instancedMesh.getColorAt(i, color);
        arr[i * 3] = color.r;
        arr[i * 3 + 1] = color.g;
        arr[i * 3 + 2] = color.b;
      }
      return arr;
    }
    return this.computeColorsArray();
  }

  private clearAll(): void {
    if (this.instancedMesh) {
      this.pointsGroup.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      (this.instancedMesh.material as THREE.Material).dispose();
      this.instancedMesh = null;
    }
    if (this.spritePoints) {
      this.pointsGroup.remove(this.spritePoints);
      this.spritePoints.geometry.dispose();
      (this.spritePoints.material as THREE.Material).dispose();
      this.spritePoints = null;
    }
    this.clearBoundingBoxes();
    this.removeHoverHighlight();
    this.selectedIndices.clear();
    this.updateSelectedList();
  }

  private buildPointCloud(): void {
    const count = this.dataPoints.length;
    if (this.useLOD) {
      this.buildSpritePoints(count);
    } else {
      this.buildInstancedMesh(count);
    }
    this.refreshVisualSelection();
  }

  private buildInstancedMesh(count: number): void {
    const geometry = new THREE.SphereGeometry(this.radius, 16, 12);
    const material = new THREE.MeshStandardMaterial({
      metalness: 0.6,
      roughness: 0.25,
      vertexColors: false
    });
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    this.instancedMesh.castShadow = true;
    this.instancedMesh.receiveShadow = true;

    const defaultColor = new THREE.Color(this.getClusterColor(0));
    for (let i = 0; i < count; i++) {
      const dp = this.dataPoints[i];
      this.dummyObject.position.set(dp.x, dp.y, dp.z);
      this.dummyObject.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummyObject.matrix);
      this.instancedMesh.setColorAt(i, defaultColor);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
    this.pointsGroup.add(this.instancedMesh);
  }

  private buildSpritePoints(count: number): void {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const defaultRGB = new Float32Array(3);
    this.parseColorToRGB(this.getClusterColor(0), defaultRGB);

    for (let i = 0; i < count; i++) {
      const dp = this.dataPoints[i];
      positions[i * 3] = dp.x;
      positions[i * 3 + 1] = dp.y;
      positions[i * 3 + 2] = dp.z;
      colors[i * 3] = defaultRGB[0];
      colors[i * 3 + 1] = defaultRGB[1];
      colors[i * 3 + 2] = defaultRGB[2];
      sizes[i] = this.radius * 60;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: this.radius * 12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.spritePoints = new THREE.Points(geometry, material);
    this.pointsGroup.add(this.spritePoints);
  }

  private clearBoundingBoxes(): void {
    while (this.boundingBoxes.children.length > 0) {
      const child = this.boundingBoxes.children[0];
      this.boundingBoxes.remove(child);
      if ((child as THREE.Mesh).geometry) {
        ((child as THREE.Mesh).geometry as THREE.BufferGeometry).dispose();
      }
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose());
        } else {
          mat.dispose();
        }
      }
    }
  }

  private renderBoundingBoxes(result: ClusterResult): void {
    this.clearBoundingBoxes();

    const groups: Map<number, number[]> = new Map();
    for (let i = 0; i < this.labels.length; i++) {
      const label = this.labels[i];
      if (label < 0) continue;
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(i);
    }

    groups.forEach((indices, label) => {
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      indices.forEach(i => {
        const dp = this.dataPoints[i];
        minX = Math.min(minX, dp.x); minY = Math.min(minY, dp.y); minZ = Math.min(minZ, dp.z);
        maxX = Math.max(maxX, dp.x); maxY = Math.max(maxY, dp.y); maxZ = Math.max(maxZ, dp.z);
      });

      const pad = 0.2;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const cz = (minZ + maxZ) / 2;
      const sx = maxX - minX + pad * 2;
      const sy = maxY - minY + pad * 2;
      const sz = maxZ - minZ + pad * 2;

      const color = this.getClusterColor(label);
      const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(sx, sy, sz));
      const edgeMat = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.7
      });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      edges.position.set(cx, cy, cz);
      this.boundingBoxes.add(edges);

      const faces = new THREE.Mesh(
        new THREE.BoxGeometry(sx, sy, sz),
        new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.04,
          side: THREE.BackSide,
          depthWrite: false
        })
      );
      faces.position.set(cx, cy, cz);
      this.boundingBoxes.add(faces);
    });
  }

  private refreshVisualSelection(): void {
    this.applyColorScale(this.computeColorsArray());
  }

  private applyColorScale(colors: Float32Array): void {
    if (this.useLOD && this.spritePoints) {
      const attr = this.spritePoints.geometry.getAttribute('color') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < arr.length; i++) arr[i] = colors[i];
      attr.needsUpdate = true;
    } else if (this.instancedMesh) {
      const c = new THREE.Color();
      for (let i = 0; i < this.instancedMesh.count; i++) {
        c.setRGB(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]);
        this.instancedMesh.setColorAt(i, c);
      }
      if (this.instancedMesh.instanceColor) {
        this.instancedMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  public update(delta: number): void {
    if (this.colorTransition) {
      const now = performance.now();
      const t = Math.min(1, (now - this.colorTransition.startTime) / this.colorTransition.duration);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const blended = new Float32Array(this.dataPoints.length * 3);
      for (let i = 0; i < blended.length; i++) {
        blended[i] = this.colorTransition.from[i] + (this.colorTransition.to[i] - this.colorTransition.from[i]) * ease;
      }
      this.applyColorScale(blended);
      if (t >= 1) {
        this.colorTransition = null;
      }
    }

    if (this.highlightMesh && this.hoveredIndex >= 0) {
      const scale = 1 + 0.08 * Math.sin(performance.now() * 0.006);
      this.highlightMesh.scale.setScalar(scale);
    }
  }
}
