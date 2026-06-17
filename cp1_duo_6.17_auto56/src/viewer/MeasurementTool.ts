import * as THREE from 'three';
import { MolecularModel, AtomMeshInfo } from './MolecularModel.js';

export interface MeasurementResult {
  distance1: number | null;
  distance2: number | null;
  angle: number | null;
}

export type MeasurementUpdateCallback = (result: MeasurementResult, hint: string) => void;
export type MeasurementExitCallback = () => void;

export class MeasurementTool {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private model: MolecularModel;
  private container: HTMLElement;
  private isActive: boolean = false;
  private selectedAtoms: AtomMeshInfo[] = [];
  private measureGroup: THREE.Group;
  private labelContainer: HTMLElement | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private onUpdate: MeasurementUpdateCallback | null = null;
  private onExit: MeasurementExitCallback | null = null;
  private line1: THREE.Line | null = null;
  private line2: THREE.Line | null = null;
  private angleArc: THREE.Line | null = null;
  private label1El: HTMLElement | null = null;
  private label2El: HTMLElement | null = null;
  private angleLabelEl: HTMLElement | null = null;
  private highlightMarkers: THREE.Mesh[] = [];

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    model: MolecularModel,
    container: HTMLElement
  ) {
    this.scene = scene;
    this.camera = camera;
    this.model = model;
    this.container = container;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.measureGroup = new THREE.Group();
    this.measureGroup.name = 'MeasurementOverlay';
    this.scene.add(this.measureGroup);

    this.createLabelContainer();
    this.bindEvents();
  }

  private createLabelContainer(): void {
    this.labelContainer = document.createElement('div');
    this.labelContainer.style.position = 'absolute';
    this.labelContainer.style.top = '0';
    this.labelContainer.style.left = '0';
    this.labelContainer.style.width = '100%';
    this.labelContainer.style.height = '100%';
    this.labelContainer.style.pointerEvents = 'none';
    this.labelContainer.style.overflow = 'hidden';
    this.labelContainer.style.zIndex = '5';
    this.container.appendChild(this.labelContainer);
  }

  private bindEvents(): void {
    this.container.addEventListener('click', this.handleClick);
  }

  public setCallbacks(
    onUpdate: MeasurementUpdateCallback | null,
    onExit: MeasurementExitCallback | null = null
  ): void {
    this.onUpdate = onUpdate;
    this.onExit = onExit;
  }

  public activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.clearMeasurement();
    this.notifyUpdate();
  }

  public deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.clearMeasurement();
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  private handleClick = (event: MouseEvent): void => {
    if (!this.isActive) return;

    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const atomMeshes = this.model.getAtomInfos().map(info => info.mesh);
    const intersects = this.raycaster.intersectObjects(atomMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const atomInfo = this.model.getAtomByMesh(hitMesh);
      if (atomInfo) {
        this.selectAtom(atomInfo);
        return;
      }
    }

    this.exitMeasurement();
  };

  private selectAtom(atomInfo: AtomMeshInfo): void {
    if (this.selectedAtoms.length >= 3) {
      this.clearMeasurement();
    }

    const alreadySelected = this.selectedAtoms.find(a => a.index === atomInfo.index);
    if (alreadySelected) return;

    this.selectedAtoms.push(atomInfo);
    this.addHighlightMarker(atomInfo);
    this.updateMeasurementVisuals();
    this.notifyUpdate();

    if (this.selectedAtoms.length === 3) {
    }
  }

  private addHighlightMarker(atomInfo: AtomMeshInfo): void {
    const idx = this.selectedAtoms.indexOf(atomInfo);
    const colors = [0x60a5fa, 0xfbbf24, 0xa78bfa];
    const color = colors[idx] || 0xffffff;

    const worldPos = new THREE.Vector3();
    atomInfo.mesh.getWorldPosition(worldPos);

    const geo = new THREE.SphereGeometry(0.1, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    const marker = new THREE.Mesh(geo, mat);
    marker.position.copy(worldPos);
    marker.userData = { type: 'measureMarker', atomIndex: atomInfo.index };
    this.measureGroup.add(marker);
    this.highlightMarkers.push(marker);

    this.animateMarkerPulse(marker, color);
  }

  private animateMarkerPulse(marker: THREE.Mesh, color: number): void {
    const start = performance.now();
    const duration = 400;
    const animate = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const scale = 1 + Math.sin(t * Math.PI) * 0.5;
      marker.scale.setScalar(scale);
      if (t < 1) requestAnimationFrame(animate);
      else marker.scale.setScalar(1);
    };
    animate();
  }

  private updateMeasurementVisuals(): void {
    this.clearLines();
    this.clearLabels();

    const n = this.selectedAtoms.length;

    if (n >= 2) {
      this.createDistanceLine(1);
    }
    if (n >= 3) {
      this.createDistanceLine(2);
      this.createAngleArc();
    }
  }

  private createDistanceLine(lineNum: 1 | 2): void {
    const fromIdx = lineNum === 1 ? 0 : 1;
    const toIdx = lineNum === 1 ? 1 : 2;
    const fromAtom = this.selectedAtoms[fromIdx];
    const toAtom = this.selectedAtoms[toIdx];

    const fromPos = new THREE.Vector3();
    const toPos = new THREE.Vector3();
    fromAtom.mesh.getWorldPosition(fromPos);
    toAtom.mesh.getWorldPosition(toPos);

    const direction = new THREE.Vector3().subVectors(toPos, fromPos);
    const fromRadius = this.getAtomWorldRadius(fromAtom);
    const toRadius = this.getAtomWorldRadius(toAtom);

    const dirNorm = direction.clone().normalize();
    const startP = fromPos.clone().add(dirNorm.clone().multiplyScalar(fromRadius));
    const endP = toPos.clone().sub(dirNorm.clone().multiplyScalar(toRadius));

    const geometry = new THREE.BufferGeometry().setFromPoints([startP, endP]);
    const color = lineNum === 1 ? 0x60a5fa : 0xfbbf24;

    const material = new THREE.LineDashedMaterial({
      color: color,
      dashSize: 0.08,
      gapSize: 0.06,
      transparent: true,
      opacity: 0.95,
      linewidth: 2
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    line.userData = { type: 'measureLine' };
    this.measureGroup.add(line);

    if (lineNum === 1) this.line1 = line;
    else this.line2 = line;

    this.createDistanceLabel(startP, endP, lineNum);
  }

  private createDistanceLabel(from: THREE.Vector3, to: THREE.Vector3, lineNum: 1 | 2): void {
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const distance = from.distanceTo(to);
    const color = lineNum === 1 ? '#60a5fa' : '#fbbf24';

    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.padding = '3px 8px';
    label.style.background = 'rgba(11, 13, 23, 0.9)';
    label.style.border = `1px solid ${color}`;
    label.style.borderRadius = '4px';
    label.style.color = color;
    label.style.fontSize = '12px';
    label.style.fontWeight = '600';
    label.style.whiteSpace = 'nowrap';
    label.style.transform = 'translate(-50%, -50%)';
    label.style.pointerEvents = 'none';
    label.style.boxShadow = `0 0 8px ${color}55`;
    label.textContent = `${distance.toFixed(2)} Å`;
    label.dataset.lineNum = String(lineNum);

    this.labelContainer!.appendChild(label);

    if (lineNum === 1) this.label1El = label;
    else this.label2El = label;

    this.updateLabelPosition(label, mid);
  }

  private createAngleArc(): void {
    const a0 = new THREE.Vector3();
    const a1 = new THREE.Vector3();
    const a2 = new THREE.Vector3();
    this.selectedAtoms[0].mesh.getWorldPosition(a0);
    this.selectedAtoms[1].mesh.getWorldPosition(a1);
    this.selectedAtoms[2].mesh.getWorldPosition(a2);

    const v1 = new THREE.Vector3().subVectors(a0, a1).normalize();
    const v2 = new THREE.Vector3().subVectors(a2, a1).normalize();

    const angleRad = v1.angleTo(v2);
    const arcRadius = 0.4;

    const cross = new THREE.Vector3().crossVectors(v1, v2);
    const normal = cross.lengthSq() > 0.0001 ? cross.normalize() : new THREE.Vector3(0, 0, 1);

    const start = v1.clone().multiplyScalar(arcRadius).add(a1);
    const end = v2.clone().multiplyScalar(arcRadius).add(a1);

    const steps = 48;
    const points: THREE.Vector3[] = [];
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal
    );
    const angleStep = angleRad / steps;
    const baseVec = v1.clone();

    for (let i = 0; i <= steps; i++) {
      const tAngle = angleStep * i;
      const rotQuat = new THREE.Quaternion().setFromAxisAngle(normal, tAngle);
      const point = baseVec.clone().applyQuaternion(rotQuat).multiplyScalar(arcRadius).add(a1);
      points.push(point);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.95
    });
    const arc = new THREE.Line(geometry, material);
    arc.userData = { type: 'measureArc' };
    this.measureGroup.add(arc);
    this.angleArc = arc;

    const midAngle = angleRad / 2;
    const rotQuat = new THREE.Quaternion().setFromAxisAngle(normal, midAngle);
    const midArcPos = baseVec.clone().applyQuaternion(rotQuat)
      .multiplyScalar(arcRadius * 1.5).add(a1);
    this.createAngleLabel(midArcPos, angleRad * (180 / Math.PI));
  }

  private createAngleLabel(pos: THREE.Vector3, angleDeg: number): void {
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.padding = '3px 10px';
    label.style.background = 'rgba(11, 13, 23, 0.9)';
    label.style.border = '1px solid #a78bfa';
    label.style.borderRadius = '4px';
    label.style.color = '#a78bfa';
    label.style.fontSize = '12px';
    label.style.fontWeight = '600';
    label.style.whiteSpace = 'nowrap';
    label.style.transform = 'translate(-50%, -50%)';
    label.style.pointerEvents = 'none';
    label.style.boxShadow = '0 0 8px rgba(167, 139, 250, 0.3)';
    label.textContent = `${angleDeg.toFixed(1)}°`;

    this.labelContainer!.appendChild(label);
    this.angleLabelEl = label;
    this.updateLabelPosition(label, pos);
  }

  private getAtomWorldRadius(atomInfo: AtomMeshInfo): number {
    const mesh = atomInfo.mesh;
    const scale = mesh.getWorldScale(new THREE.Vector3());
    const geo = mesh.geometry as THREE.SphereGeometry;
    const baseRadius = geo.parameters?.radius || 0.4;
    return baseRadius * Math.max(scale.x, scale.y, scale.z);
  }

  private clearLines(): void {
    [this.line1, this.line2, this.angleArc].forEach(line => {
      if (line) {
        this.measureGroup.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
    });
    this.line1 = null;
    this.line2 = null;
    this.angleArc = null;
  }

  private clearLabels(): void {
    [this.label1El, this.label2El, this.angleLabelEl].forEach(label => {
      if (label && label.parentNode) {
        label.parentNode.removeChild(label);
      }
    });
    this.label1El = null;
    this.label2El = null;
    this.angleLabelEl = null;
  }

  private clearHighlights(): void {
    this.highlightMarkers.forEach(marker => {
      this.measureGroup.remove(marker);
      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();
    });
    this.highlightMarkers = [];
  }

  public clearMeasurement(): void {
    this.selectedAtoms = [];
    this.clearLines();
    this.clearLabels();
    this.clearHighlights();
    this.notifyUpdate();
  }

  private exitMeasurement(): void {
    this.deactivate();
    if (this.onExit) this.onExit();
  }

  private notifyUpdate(): void {
    if (!this.onUpdate) return;

    let distance1: number | null = null;
    let distance2: number | null = null;
    let angle: number | null = null;

    const n = this.selectedAtoms.length;
    if (n >= 2) {
      const p1 = new THREE.Vector3();
      const p2 = new THREE.Vector3();
      this.selectedAtoms[0].mesh.getWorldPosition(p1);
      this.selectedAtoms[1].mesh.getWorldPosition(p2);
      distance1 = p1.distanceTo(p2);
    }
    if (n >= 3) {
      const p1 = new THREE.Vector3();
      const p2 = new THREE.Vector3();
      const p3 = new THREE.Vector3();
      this.selectedAtoms[1].mesh.getWorldPosition(p2);
      this.selectedAtoms[0].mesh.getWorldPosition(p1);
      this.selectedAtoms[2].mesh.getWorldPosition(p3);
      const v1 = new THREE.Vector3().subVectors(p1, p2).normalize();
      const v2 = new THREE.Vector3().subVectors(p3, p2).normalize();
      distance2 = p2.distanceTo(p3);
      angle = v1.angleTo(v2) * (180 / Math.PI);
    }

    let hint = '测量模式：点击空白退出';
    if (!this.isActive) {
      hint = '';
    } else if (n === 0) {
      hint = '请点击第1个原子（顶点A）';
    } else if (n === 1) {
      hint = '请点击第2个原子（顶点B）- 距离测量';
    } else if (n === 2) {
      hint = '请点击第3个原子（顶点C）- 键角测量';
    } else {
      hint = '测量完成！点击任意原子重新开始，或点击空白退出';
    }

    this.onUpdate({ distance1, distance2, angle }, hint);
  }

  public update(): void {
    if (!this.isActive) return;

    const n = this.selectedAtoms.length;
    if (n === 0) return;

    this.highlightMarkers.forEach((marker, idx) => {
      if (this.selectedAtoms[idx]) {
        const pos = new THREE.Vector3();
        this.selectedAtoms[idx].mesh.getWorldPosition(pos);
        marker.position.copy(pos);
      }
    });

    if (n >= 2) {
      this.refreshLine(1);
      if (this.label1El) {
        this.refreshDistanceLabel(0, 1, this.label1El);
      }
    }
    if (n >= 3) {
      this.refreshLine(2);
      if (this.label2El) {
        this.refreshDistanceLabel(1, 2, this.label2El);
      }
      this.refreshAngleArc();
      if (this.angleLabelEl) {
        this.refreshAngleLabel(this.angleLabelEl);
      }
    }

    this.notifyUpdate();
  }

  private refreshLine(lineNum: 1 | 2): void {
    const line = lineNum === 1 ? this.line1 : this.line2;
    if (!line) return;

    const fromIdx = lineNum === 1 ? 0 : 1;
    const toIdx = lineNum === 1 ? 1 : 2;

    const fromPos = new THREE.Vector3();
    const toPos = new THREE.Vector3();
    this.selectedAtoms[fromIdx].mesh.getWorldPosition(fromPos);
    this.selectedAtoms[toIdx].mesh.getWorldPosition(toPos);

    const direction = new THREE.Vector3().subVectors(toPos, fromPos);
    const fromRadius = this.getAtomWorldRadius(this.selectedAtoms[fromIdx]);
    const toRadius = this.getAtomWorldRadius(this.selectedAtoms[toIdx]);

    const dirNorm = direction.clone().normalize();
    const startP = fromPos.clone().add(dirNorm.clone().multiplyScalar(fromRadius));
    const endP = toPos.clone().sub(dirNorm.clone().multiplyScalar(toRadius));

    const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    positions[0] = startP.x; positions[1] = startP.y; positions[2] = startP.z;
    positions[3] = endP.x; positions[4] = endP.y; positions[5] = endP.z;
    posAttr.needsUpdate = true;
    line.geometry.computeBoundingSphere();
    line.computeLineDistances();
  }

  private refreshDistanceLabel(fromIdx: number, toIdx: number, label: HTMLElement): void {
    const fromPos = new THREE.Vector3();
    const toPos = new THREE.Vector3();
    this.selectedAtoms[fromIdx].mesh.getWorldPosition(fromPos);
    this.selectedAtoms[toIdx].mesh.getWorldPosition(toPos);

    const direction = new THREE.Vector3().subVectors(toPos, fromPos);
    const fromRadius = this.getAtomWorldRadius(this.selectedAtoms[fromIdx]);
    const toRadius = this.getAtomWorldRadius(this.selectedAtoms[toIdx]);

    const dirNorm = direction.clone().normalize();
    const startP = fromPos.clone().add(dirNorm.clone().multiplyScalar(fromRadius));
    const endP = toPos.clone().sub(dirNorm.clone().multiplyScalar(toRadius));
    const mid = new THREE.Vector3().addVectors(startP, endP).multiplyScalar(0.5);
    const distance = startP.distanceTo(endP);

    const lineNum = label.dataset.lineNum;
    const prefix = lineNum === '1' ? '' : '';
    label.textContent = `${prefix}${distance.toFixed(2)} Å`;
    this.updateLabelPosition(label, mid);
  }

  private refreshAngleArc(): void {
    if (!this.angleArc) return;

    const a0 = new THREE.Vector3();
    const a1 = new THREE.Vector3();
    const a2 = new THREE.Vector3();
    this.selectedAtoms[0].mesh.getWorldPosition(a0);
    this.selectedAtoms[1].mesh.getWorldPosition(a1);
    this.selectedAtoms[2].mesh.getWorldPosition(a2);

    const v1 = new THREE.Vector3().subVectors(a0, a1).normalize();
    const v2 = new THREE.Vector3().subVectors(a2, a1).normalize();
    const angleRad = v1.angleTo(v2);
    const arcRadius = 0.4;

    const cross = new THREE.Vector3().crossVectors(v1, v2);
    const normal = cross.lengthSq() > 0.0001 ? cross.normalize() : new THREE.Vector3(0, 0, 1);

    const steps = 48;
    const posAttr = this.angleArc.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const angleStep = angleRad / steps;
    const baseVec = v1.clone();

    for (let i = 0; i <= steps; i++) {
      const tAngle = angleStep * i;
      const rotQuat = new THREE.Quaternion().setFromAxisAngle(normal, tAngle);
      const point = baseVec.clone().applyQuaternion(rotQuat).multiplyScalar(arcRadius).add(a1);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    }
    posAttr.needsUpdate = true;
    this.angleArc.geometry.computeBoundingSphere();
  }

  private refreshAngleLabel(label: HTMLElement): void {
    const a0 = new THREE.Vector3();
    const a1 = new THREE.Vector3();
    const a2 = new THREE.Vector3();
    this.selectedAtoms[0].mesh.getWorldPosition(a0);
    this.selectedAtoms[1].mesh.getWorldPosition(a1);
    this.selectedAtoms[2].mesh.getWorldPosition(a2);

    const v1 = new THREE.Vector3().subVectors(a0, a1).normalize();
    const v2 = new THREE.Vector3().subVectors(a2, a1).normalize();
    const angleRad = v1.angleTo(v2);

    const cross = new THREE.Vector3().crossVectors(v1, v2);
    const normal = cross.lengthSq() > 0.0001 ? cross.normalize() : new THREE.Vector3(0, 0, 1);

    const midAngle = angleRad / 2;
    const arcRadius = 0.4 * 1.5;
    const rotQuat = new THREE.Quaternion().setFromAxisAngle(normal, midAngle);
    const midArcPos = v1.clone().applyQuaternion(rotQuat)
      .multiplyScalar(arcRadius).add(a1);

    label.textContent = `${(angleRad * 180 / Math.PI).toFixed(1)}°`;
    this.updateLabelPosition(label, midArcPos);
  }

  private updateLabelPosition(label: HTMLElement, worldPos: THREE.Vector3): void {
    const projected = worldPos.clone().project(this.camera);
    const rect = this.container.getBoundingClientRect();
    const x = (projected.x * 0.5 + 0.5) * rect.width;
    const y = (-projected.y * 0.5 + 0.5) * rect.height;

    if (projected.z < 1 && projected.z > -1) {
      label.style.display = 'block';
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
    } else {
      label.style.display = 'none';
    }
  }

  public dispose(): void {
    this.container.removeEventListener('click', this.handleClick);
    this.deactivate();
    if (this.labelContainer && this.labelContainer.parentNode) {
      this.labelContainer.parentNode.removeChild(this.labelContainer);
    }
    if (this.measureGroup.parent) {
      this.scene.remove(this.measureGroup);
    }
    this.clearHighlights();
  }
}
