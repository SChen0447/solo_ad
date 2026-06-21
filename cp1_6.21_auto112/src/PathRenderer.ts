import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { SceneManager } from './SceneManager';

export interface PathWaypoint {
  lat: number;
  lon: number;
  date: string;
}

export interface MigrationPathData {
  id: string;
  speciesId: string;
  speciesName: string;
  speciesIcon: string;
  waypoints: PathWaypoint[];
}

interface ActivePath {
  data: MigrationPathData;
  curve: THREE.CatmullRomCurve3;
  curvePoints: THREE.Vector3[];
  lineMesh: THREE.Line;
  nodes: THREE.Mesh[];
  nodePositions: THREE.Vector3[];
  progress: { value: number };
  visibleNodes: Set<number>;
  animating: boolean;
}

export class PathRenderer {
  private sceneManager: SceneManager;
  private pathsGroup: THREE.Group;
  private activePaths: Map<string, ActivePath> = new Map();
  private nodeGeometry: THREE.SphereGeometry;
  private currentSpeciesId: string;

  private dateToProgress: Map<string, number> = new Map();
  private allDates: string[] = [];
  private currentDate: string = '';

  private pendingIncoming: MigrationPathData[] = [];
  private transitioning = false;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.pathsGroup = new THREE.Group();
    this.sceneManager.earthGroup.add(this.pathsGroup);
    this.nodeGeometry = new THREE.SphereGeometry(1, 14, 14);
    this.currentSpeciesId = 'all';
    this.sceneManager.addRenderCallback(this.updateNodeSizes.bind(this));
  }

  public setDateList(dates: string[]): void {
    this.allDates = dates;
    this.dateToProgress.clear();
    dates.forEach((d, i) => {
      this.dateToProgress.set(d, dates.length > 1 ? i / (dates.length - 1) : 0);
    });
  }

  public updateCurrentDate(date: string): void {
    this.currentDate = date;
    const dateProgress = this.dateToProgress.get(date);
    if (dateProgress === undefined) return;

    for (const path of this.activePaths.values()) {
      this.applyProgressToPath(path, dateProgress);
    }
  }

  private applyProgressToPath(path: ActivePath, globalProgress: number): void {
    const totalWaypoints = path.data.waypoints.length;
    if (totalWaypoints < 2) return;

    const pathStartDate = path.data.waypoints[0].date;
    const pathEndDate = path.data.waypoints[totalWaypoints - 1].date;
    const startIdx = this.allDates.indexOf(pathStartDate);
    const endIdx = this.allDates.indexOf(pathEndDate);

    if (startIdx === -1 || endIdx === -1) return;

    const pathTotal = endIdx - startIdx;
    const currentIdx = this.allDates.indexOf(this.currentDate);
    let localProgress = 0;
    if (currentIdx <= startIdx) localProgress = 0;
    else if (currentIdx >= endIdx) localProgress = 1;
    else localProgress = pathTotal > 0 ? (currentIdx - startIdx) / pathTotal : 1;

    const targetProgress = Math.max(0, Math.min(1, localProgress));

    new TWEEN.Tween(path.progress)
      .to({ value: targetProgress }, 500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.updatePathVisibility(path);
      })
      .start();
  }

  public setSpecies(speciesId: string, paths: MigrationPathData[]): void {
    const filtered = speciesId === 'all'
      ? paths
      : paths.filter(p => p.speciesId === speciesId);

    if (this.transitioning) {
      this.pendingIncoming = filtered;
      this.currentSpeciesId = speciesId;
      return;
    }

    this.currentSpeciesId = speciesId;
    this.transitioning = true;
    const oldIds = Array.from(this.activePaths.keys());
    const newIds = new Set(filtered.map(p => p.id));

    const outPaths: ActivePath[] = [];
    for (const id of oldIds) {
      if (!newIds.has(id)) {
        outPaths.push(this.activePaths.get(id)!);
      }
    }

    for (const data of filtered) {
      if (!this.activePaths.has(data.id)) {
        this.pendingIncoming.push(data);
      }
    }

    let completedOut = 0;
    const totalOut = outPaths.length;
    const finishOut = () => {
      completedOut++;
      if (completedOut >= totalOut) {
        this.spawnPendingPaths(() => {
          this.transitioning = false;
          const remaining = this.pendingIncoming;
          this.pendingIncoming = [];
          if (remaining.length > 0) {
            this.setSpecies(this.currentSpeciesId, [...this.getCurrentActiveData(), ...remaining]);
          }
        });
      }
    };

    if (totalOut === 0) {
      this.spawnPendingPaths(() => {
        this.transitioning = false;
        this.pendingIncoming = [];
      });
    } else {
      for (const ap of outPaths) {
        this.animatePathOut(ap, finishOut);
      }
    }
  }

  private getCurrentActiveData(): MigrationPathData[] {
    return Array.from(this.activePaths.values()).map(ap => ap.data);
  }

  private spawnPendingPaths(onAllDone: () => void): void {
    const pending = [...this.pendingIncoming];
    this.pendingIncoming = [];
    if (pending.length === 0) {
      onAllDone();
      return;
    }
    let completed = 0;
    for (const data of pending) {
      this.createPath(data, () => {
        completed++;
        if (completed >= pending.length) onAllDone();
      });
    }
  }

  private generateCurvePoints(data: MigrationPathData): THREE.Vector3[] {
    const r = this.sceneManager.getEarthRadius() * 1.05;
    const basePoints: THREE.Vector3[] = data.waypoints.map(wp => {
      return this.sceneManager.latLonToVector3(wp.lat, wp.lon, r);
    });

    if (basePoints.length < 2) return basePoints;

    const curve = new THREE.CatmullRomCurve3(basePoints, false, 'catmullrom', 0.3);
    const samples = 120;
    const result: THREE.Vector3[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = curve.getPoint(t);
      const dir = p.clone().normalize();
      const lift = 0.04 + Math.sin(t * Math.PI) * 0.08;
      result.push(p.add(dir.multiplyScalar(lift)));
    }
    return result;
  }

  private createGradientTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, '#3b82f6');
    grad.addColorStop(0.35, '#06b6d4');
    grad.addColorStop(0.65, '#f59e0b');
    grad.addColorStop(1, '#ef4444');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 1);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createPath(data: MigrationPathData, onDone?: () => void): void {
    if (this.activePaths.has(data.id)) {
      onDone?.();
      return;
    }

    const curvePoints = this.generateCurvePoints(data);
    if (curvePoints.length < 2) {
      onDone?.();
      return;
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0);

    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(curvePoints.length * 3);
    const uvs = new Float32Array(curvePoints.length * 2);
    for (let i = 0; i < curvePoints.length; i++) {
      positions[i * 3] = curvePoints[i].x;
      positions[i * 3 + 1] = curvePoints[i].y;
      positions[i * 3 + 2] = curvePoints[i].z;
      uvs[i * 2] = i / (curvePoints.length - 1);
      uvs[i * 2 + 1] = 0.5;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const tex = this.createGradientTexture();

    const lineMat = new THREE.LineBasicMaterial({
      map: tex,
      vertexColors: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      linewidth: 2
    });

    const lineMesh = new THREE.Line(geom, lineMat);
    lineMesh.userData.drawRange = { start: 0, count: curvePoints.length };
    this.pathsGroup.add(lineMesh);

    const nodes: THREE.Mesh[] = [];
    const nodePositions: THREE.Vector3[] = [];
    const nodeInterval = Math.floor(curvePoints.length / 12);
    for (let i = 0; i < curvePoints.length; i += Math.max(1, nodeInterval)) {
      const nodePos = curvePoints[i].clone();
      nodePositions.push(nodePos);

      const t = i / (curvePoints.length - 1);
      const color = this.getGradientColor(t);

      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(this.nodeGeometry, mat);
      mesh.position.copy(nodePos);
      mesh.scale.setScalar(0.001);
      mesh.userData.nodeIndex = nodes.length;
      mesh.userData.pathId = data.id;
      this.pathsGroup.add(mesh);
      nodes.push(mesh);
    }

    const active: ActivePath = {
      data,
      curve,
      curvePoints,
      lineMesh,
      nodes,
      nodePositions,
      progress: { value: 0 },
      visibleNodes: new Set(),
      animating: true
    };
    this.activePaths.set(data.id, active);

    const drawRange = { value: 0 };
    const fadeOpacity = { value: 0 };

    new TWEEN.Tween(drawRange)
      .to({ value: curvePoints.length }, 1500)
      .easing(TWEEN.Easing.Cubic.Out)
      .onUpdate(() => {
        const count = Math.min(curvePoints.length, Math.ceil(drawRange.value));
        active.lineMesh.geometry.setDrawRange(0, count);
        const nodeThreshold = (drawRange.value / curvePoints.length) * nodes.length;
        for (let i = 0; i < nodes.length; i++) {
          if (i < nodeThreshold && !active.visibleNodes.has(i)) {
            active.visibleNodes.add(i);
            const nm = nodes[i];
            const nodeT = { v: 0 };
            new TWEEN.Tween(nodeT)
              .to({ v: 1 }, 350)
              .easing(TWEEN.Easing.Back.Out)
              .onUpdate(() => {
                (nm.material as THREE.MeshBasicMaterial).opacity = 0.6 * nodeT.v;
                nm.scale.setScalar(0.018 * nodeT.v);
              })
              .start();
          }
        }
      })
      .start();

    new TWEEN.Tween(fadeOpacity)
      .to({ value: 0.9 }, 400)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        (active.lineMesh.material as THREE.LineBasicMaterial).opacity = fadeOpacity.value;
      })
      .onComplete(() => {
        active.animating = false;
        const dateProgress = this.dateToProgress.get(this.currentDate);
        if (dateProgress !== undefined) {
          this.applyProgressToPath(active, dateProgress);
        }
        onDone?.();
      })
      .start();
  }

  private animatePathOut(active: ActivePath, onDone?: () => void): void {
    const totalPts = active.curvePoints.length;
    const drawRange = { value: totalPts };
    const fadeOpacity = { value: (active.lineMesh.material as THREE.LineBasicMaterial).opacity };

    new TWEEN.Tween(drawRange)
      .to({ value: 0 }, 1500)
      .easing(TWEEN.Easing.Cubic.In)
      .onUpdate(() => {
        const start = Math.max(0, Math.floor(drawRange.value));
        active.lineMesh.geometry.setDrawRange(start, totalPts - start);

        const nodeThreshold = (drawRange.value / totalPts) * active.nodes.length;
        for (let i = 0; i < active.nodes.length; i++) {
          if (i >= nodeThreshold && active.visibleNodes.has(i)) {
            active.visibleNodes.delete(i);
            const nm = active.nodes[i];
            const curScale = nm.scale.x;
            const curOp = (nm.material as THREE.MeshBasicMaterial).opacity;
            const nodeT = { s: curScale, o: curOp };
            new TWEEN.Tween(nodeT)
              .to({ s: 0, o: 0 }, 300)
              .easing(TWEEN.Easing.Cubic.In)
              .onUpdate(() => {
                nm.scale.setScalar(nodeT.s);
                (nm.material as THREE.MeshBasicMaterial).opacity = nodeT.o;
              })
              .start();
          }
        }
      })
      .start();

    new TWEEN.Tween(fadeOpacity)
      .to({ value: 0 }, 1000)
      .delay(500)
      .easing(TWEEN.Easing.Quadratic.In)
      .onUpdate(() => {
        (active.lineMesh.material as THREE.LineBasicMaterial).opacity = fadeOpacity.value;
      })
      .onComplete(() => {
        this.removePath(active.data.id);
        onDone?.();
      })
      .start();
  }

  private updatePathVisibility(path: ActivePath): void {
    const prog = path.progress.value;
    const totalPts = path.curvePoints.length;
    const count = Math.floor(prog * totalPts);
    path.lineMesh.geometry.setDrawRange(0, count);

    const nodeThreshold = prog * path.nodes.length;
    for (let i = 0; i < path.nodes.length; i++) {
      const nm = path.nodes[i];
      const shouldShow = i < nodeThreshold;
      const isShown = path.visibleNodes.has(i);
      if (shouldShow && !isShown) {
        path.visibleNodes.add(i);
        const t = { v: (nm.material as THREE.MeshBasicMaterial).opacity };
        new TWEEN.Tween(t)
          .to({ v: 0.6 }, 300)
          .easing(TWEEN.Easing.Cubic.Out)
          .onUpdate(() => {
            (nm.material as THREE.MeshBasicMaterial).opacity = t.v;
            nm.scale.setScalar(0.018 * (t.v / 0.6));
          })
          .start();
      } else if (!shouldShow && isShown) {
        path.visibleNodes.delete(i);
        const t = { v: (nm.material as THREE.MeshBasicMaterial).opacity };
        new TWEEN.Tween(t)
          .to({ v: 0 }, 300)
          .easing(TWEEN.Easing.Cubic.In)
          .onUpdate(() => {
            (nm.material as THREE.MeshBasicMaterial).opacity = t.v;
            nm.scale.setScalar(0.018 * (t.v / 0.6));
          })
          .start();
      }
    }
  }

  private updateNodeSizes(_delta: number): void {
    const camPos = this.sceneManager.camera.position;
    for (const path of this.activePaths.values()) {
      for (let i = 0; i < path.nodes.length; i++) {
        const node = path.nodes[i];
        const dist = camPos.distanceTo(path.nodePositions[i]);
        const distFactor = Math.max(0.7, Math.min(1.8, dist / 6));
        const baseScale = 0.018;
        const opacity = (node.material as THREE.MeshBasicMaterial).opacity;
        if (opacity > 0.01) {
          node.scale.setScalar(baseScale * distFactor * (opacity / 0.6));
        }
      }
    }
  }

  private getGradientColor(t: number): THREE.Color {
    const r = Math.round(59 + (239 - 59) * t);
    const g = Math.round(130 + (68 - 130) * t * 0.5);
    const b = Math.round(246 - 246 * t);
    return new THREE.Color(r / 255, g / 255, b / 255);
  }

  private removePath(id: string): void {
    const active = this.activePaths.get(id);
    if (!active) return;

    this.pathsGroup.remove(active.lineMesh);
    active.lineMesh.geometry.dispose();
    const mat = active.lineMesh.material as THREE.LineBasicMaterial;
    mat.map?.dispose();
    mat.dispose();

    for (const node of active.nodes) {
      this.pathsGroup.remove(node);
      (node.material as THREE.MeshBasicMaterial).dispose();
    }

    this.activePaths.delete(id);
  }

  public dispose(): void {
    this.sceneManager.removeRenderCallback(this.updateNodeSizes.bind(this));
    for (const id of Array.from(this.activePaths.keys())) {
      this.removePath(id);
    }
    this.nodeGeometry.dispose();
    this.sceneManager.earthGroup.remove(this.pathsGroup);
  }
}
