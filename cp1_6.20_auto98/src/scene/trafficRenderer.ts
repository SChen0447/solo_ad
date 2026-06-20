import * as THREE from 'three';
import { clamp } from 'lodash';
import type { TrafficFrame, SegmentTraffic } from '../data/dataProvider';
import type { RoadRenderResult } from './roadRenderer';

const BASE_RADIUS = 0.2;
const MAX_RADIUS = 0.6;
const TRANSITION_SPEED = 2.0;

const COLOR_LOW = new THREE.Color(0x00cc44);
const COLOR_MID = new THREE.Color(0xffcc00);
const COLOR_HIGH = new THREE.Color(0xff2200);

interface SegmentState {
  currentColor: THREE.Color;
  targetColor: THREE.Color;
  currentScaleY: number;
  targetScaleY: number;
  currentScaleXZ: number;
  targetScaleXZ: number;
}

export class TrafficRenderer {
  private roadMeshes: Map<number, THREE.Mesh>;
  private segmentStates: Map<number, SegmentState> = new Map();
  private originalScales: Map<number, THREE.Vector3> = new Map();

  constructor(roadResult: RoadRenderResult) {
    this.roadMeshes = roadResult.roadMeshes;
    this.roadMeshes.forEach((mesh, id) => {
      this.originalScales.set(id, mesh.scale.clone());
      this.segmentStates.set(id, {
        currentColor: new THREE.Color(0xaaaaaa),
        targetColor: new THREE.Color(0xaaaaaa),
        currentScaleY: 1,
        targetScaleY: 1,
        currentScaleXZ: 1,
        targetScaleXZ: 1,
      });
    });
  }

  updateFrame(frame: TrafficFrame): void {
    for (const seg of frame.segments) {
      const state = this.segmentStates.get(seg.segmentId);
      if (!state) continue;

      state.targetColor.copy(this.densityToColor(seg.density));

      const scaleRatio = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * (seg.density / 100);
      const xzScale = scaleRatio / BASE_RADIUS;
      state.targetScaleXZ = xzScale;
      state.targetScaleY = 1;
    }
  }

  updateTransition(delta: number): void {
    const t = Math.min(delta * TRANSITION_SPEED, 1);

    this.segmentStates.forEach((state, id) => {
      const mesh = this.roadMeshes.get(id);
      if (!mesh) return;

      state.currentColor.lerp(state.targetColor, t);
      (mesh.material as THREE.MeshStandardMaterial).color.copy(state.currentColor);

      state.currentScaleXZ += (state.targetScaleXZ - state.currentScaleXZ) * t;
      state.currentScaleY += (state.targetScaleY - state.currentScaleY) * t;

      const origScale = this.originalScales.get(id);
      if (origScale) {
        mesh.scale.set(
          origScale.x * state.currentScaleXZ,
          origScale.y * state.currentScaleY,
          origScale.z * state.currentScaleXZ
        );
      }
    });
  }

  highlightSegment(segmentId: number): void {
    const mesh = this.roadMeshes.get(segmentId);
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.emissive = new THREE.Color(0xffffff);
    mat.emissiveIntensity = 0.5;
  }

  unhighlightSegment(segmentId: number): void {
    const mesh = this.roadMeshes.get(segmentId);
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0;
  }

  getRoadMeshes(): THREE.Mesh[] {
    return Array.from(this.roadMeshes.values());
  }

  private densityToColor(density: number): THREE.Color {
    const d = clamp(density, 0, 100);
    if (d < 30) {
      return COLOR_LOW.clone();
    } else if (d < 70) {
      const t = (d - 30) / 40;
      return COLOR_LOW.clone().lerp(COLOR_MID, t);
    } else {
      const t = (d - 70) / 30;
      return COLOR_MID.clone().lerp(COLOR_HIGH, t);
    }
  }
}
