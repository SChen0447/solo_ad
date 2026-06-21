import * as THREE from 'three';
import { HandData, HandLandmark } from './handTracker';

export interface DeformParams {
  amplitude: number;
  speed: number;
  subdivisionLevel: number;
}

export interface DeformState {
  targetScale: number;
  currentScale: number;
  pinchIntensity: number;
  kneadPhase: number;
  lastUpdateTime: number;
  smoothingFactor: number;
  isResetting: boolean;
  resetStartTime: number;
}

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];

export class MeshDeformer {
  private mesh: THREE.Mesh | null = null;
  private wireframe: THREE.LineSegments | null = null;
  private geometry: THREE.IcosahedronGeometry | null = null;
  private originalPositions: Float32Array | null = null;
  private deformedPositions: Float32Array | null = null;
  private targetPositions: Float32Array | null = null;
  private baseRadius: number = 1.2;
  private params: DeformParams = {
    amplitude: 0.3,
    speed: 0.1,
    subdivisionLevel: 3
  };
  private state: DeformState = {
    targetScale: 1.0,
    currentScale: 1.0,
    pinchIntensity: 0,
    kneadPhase: 0,
    lastUpdateTime: performance.now(),
    smoothingFactor: 0.9,
    isResetting: false,
    resetStartTime: 0
  };
  private material: THREE.MeshPhongMaterial | null = null;

  constructor() {}

  createMesh(subdivisionLevel: number = 3): THREE.Group {
    const group = new THREE.Group();
    
    this.params.subdivisionLevel = subdivisionLevel;
    this.geometry = new THREE.IcosahedronGeometry(this.baseRadius, subdivisionLevel);
    
    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const vertexCount = positionAttr.count;
    
    this.originalPositions = new Float32Array(vertexCount * 3);
    this.deformedPositions = new Float32Array(vertexCount * 3);
    this.targetPositions = new Float32Array(vertexCount * 3);
    
    for (let i = 0; i < vertexCount * 3; i++) {
      this.originalPositions[i] = positionAttr.array[i] as number;
      this.deformedPositions[i] = positionAttr.array[i] as number;
      this.targetPositions[i] = positionAttr.array[i] as number;
    }

    this.material = new THREE.MeshPhongMaterial({
      color: 0xE8F0F0,
      transparent: true,
      opacity: 0.85,
      shininess: 30,
      side: THREE.DoubleSide,
      depthWrite: true
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    const wireGeo = new THREE.WireframeGeometry(this.geometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x4A6B6B,
      transparent: true,
      opacity: 0.6
    });
    this.wireframe = new THREE.LineSegments(wireGeo, wireMat);

    group.add(this.mesh);
    group.add(this.wireframe);

    return group;
  }

  updateSubdivision(level: number): void {
    if (!this.mesh || !this.wireframe) return;
    if (level === this.params.subdivisionLevel) return;

    const parent = this.mesh.parent;
    if (!parent) return;

    parent.remove(this.mesh);
    parent.remove(this.wireframe);

    this.geometry?.dispose();
    this.wireframe?.geometry.dispose();

    const group = this.createMesh(level);
    while (group.children.length > 0) {
      parent.add(group.children[0]);
    }
  }

  setParams(params: Partial<DeformParams>): void {
    Object.assign(this.params, params);
    if (params.speed !== undefined) {
      this.state.smoothingFactor = 1.0 - (params.speed / 0.3) * 0.5;
      this.state.smoothingFactor = Math.max(0.7, Math.min(0.95, this.state.smoothingFactor));
    }
  }

  getParams(): DeformParams {
    return { ...this.params };
  }

  resetDeformation(): void {
    this.state.isResetting = true;
    this.state.resetStartTime = performance.now();
  }

  update(hands: HandData[], deltaTime: number): void {
    if (!this.geometry || !this.originalPositions || !this.deformedPositions || !this.targetPositions) {
      return;
    }

    const now = performance.now();
    const dt = Math.min(deltaTime, 0.05);

    if (this.state.isResetting) {
      const resetProgress = Math.min((now - this.state.resetStartTime) / 500, 1);
      const eased = this.easeOutCubic(resetProgress);

      for (let i = 0; i < this.originalPositions.length; i++) {
        this.targetPositions[i] = this.originalPositions[i];
        this.deformedPositions[i] = THREE.MathUtils.lerp(
          this.deformedPositions[i],
          this.originalPositions[i],
          eased
        );
      }

      this.state.targetScale = 1.0;
      this.state.currentScale = THREE.MathUtils.lerp(this.state.currentScale, 1.0, eased);

      if (resetProgress >= 1) {
        this.state.isResetting = false;
      }
    } else {
      this.calculateTargetDeformation(hands, dt);
      this.smoothDeformation(dt);
      this.updateScale(hands, dt);
    }

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.deformedPositions.length; i++) {
      positionAttr.array[i] = this.deformedPositions[i];
    }
    positionAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    if (this.mesh) {
      this.mesh.scale.setScalar(this.state.currentScale);
    }
    if (this.wireframe) {
      this.wireframe.scale.setScalar(this.state.currentScale);
    }
  }

  private calculateTargetDeformation(hands: HandData[], dt: number): void {
    if (!this.originalPositions || !this.targetPositions) return;

    for (let i = 0; i < this.originalPositions.length; i++) {
      this.targetPositions[i] = this.originalPositions[i];
    }

    const leftHand = hands.find(h => h.handedness === 'Left');
    const rightHand = hands.find(h => h.handedness === 'Right');

    const leftPinchActive = leftHand?.gesture === 'pinch';
    const rightPinchActive = rightHand?.gesture === 'pinch';
    const leftKneadActive = leftHand?.gesture === 'knead';
    const rightKneadActive = rightHand?.gesture === 'knead';

    this.state.kneadPhase += dt * 2 * Math.PI * 2;

    const leftTips = leftHand ? this.getFingertipPositions(leftHand.landmarks) : null;
    const rightTips = rightHand ? this.getFingertipPositions(rightHand.landmarks) : null;

    const vertexCount = this.originalPositions.length / 3;

    for (let vi = 0; vi < vertexCount; vi++) {
      const ox = this.originalPositions[vi * 3];
      const oy = this.originalPositions[vi * 3 + 1];
      const oz = this.originalPositions[vi * 3 + 2];

      const normal = new THREE.Vector3(ox, oy, oz).normalize();

      let totalOffset = 0;

      const isLeftArea = ox < 0 && oy > 0;
      const isRightArea = ox > 0 && oy < 0;

      if (isLeftArea && leftTips) {
        for (let i = 0; i < leftTips.length; i++) {
          const tip = leftTips[i];
          const weight = this.calculateBilinearWeight(normal, tip, 'left');

          if (leftPinchActive && i < 2) {
            totalOffset -= weight * this.params.amplitude * 0.3;
          }
          if (leftKneadActive) {
            const wave = Math.sin(this.state.kneadPhase + tip.x * 5 + tip.y * 5);
            totalOffset += weight * this.params.amplitude * 0.2 * (0.5 + 0.5 * wave);
          }
        }
      }

      if (isRightArea && rightTips) {
        for (let i = 0; i < rightTips.length; i++) {
          const tip = rightTips[i];
          const weight = this.calculateBilinearWeight(normal, tip, 'right');

          if (rightPinchActive && i < 2) {
            totalOffset -= weight * this.params.amplitude * 0.3;
          }
          if (rightKneadActive) {
            const wave = Math.sin(this.state.kneadPhase + tip.x * 5 + tip.y * 5);
            totalOffset += weight * this.params.amplitude * 0.2 * (0.5 + 0.5 * wave);
          }
        }
      }

      totalOffset = Math.max(-0.5, Math.min(0.5, totalOffset));

      this.targetPositions[vi * 3] = ox + normal.x * totalOffset;
      this.targetPositions[vi * 3 + 1] = oy + normal.y * totalOffset;
      this.targetPositions[vi * 3 + 2] = oz + normal.z * totalOffset;
    }
  }

  private getFingertipPositions(landmarks: HandLandmark[]): THREE.Vector2[] {
    const tips: THREE.Vector2[] = [];
    for (const idx of FINGERTIP_INDICES) {
      const lm = landmarks[idx];
      if (lm) {
        tips.push(new THREE.Vector2(
          (lm.x - 0.5) * 2,
          -(lm.y - 0.5) * 2
        ));
      }
    }
    return tips;
  }

  private calculateBilinearWeight(
    vertexNormal: THREE.Vector3,
    fingerTip: THREE.Vector2,
    side: 'left' | 'right'
  ): number {
    let mappedVertexX: number;
    let mappedVertexY: number;
    let mappedTipX: number;
    let mappedTipY: number;

    if (side === 'left') {
      mappedVertexX = -vertexNormal.x;
      mappedVertexY = vertexNormal.y;
      mappedTipX = -fingerTip.x;
      mappedTipY = fingerTip.y;
    } else {
      mappedVertexX = vertexNormal.x;
      mappedVertexY = -vertexNormal.y;
      mappedTipX = fingerTip.x;
      mappedTipY = -fingerTip.y;
    }

    const xWeight = Math.max(0, 1 - Math.abs(mappedVertexX - mappedTipX) / 1.2);
    const yWeight = Math.max(0, 1 - Math.abs(mappedVertexY - mappedTipY) / 1.2);
    const bilinearWeight = xWeight * yWeight;

    const euclideanDist = Math.sqrt(
      Math.pow(mappedVertexX - mappedTipX, 2) +
      Math.pow(mappedVertexY - mappedTipY, 2)
    );
    const distanceWeight = Math.max(0, 1 - euclideanDist / 1.0);

    const finalWeight = bilinearWeight * 0.6 + distanceWeight * distanceWeight * 0.4;

    return finalWeight * finalWeight;
  }

  private smoothDeformation(dt: number): void {
    if (!this.deformedPositions || !this.targetPositions) return;

    const alpha = 1 - Math.pow(this.state.smoothingFactor, dt * 60);

    for (let i = 0; i < this.deformedPositions.length; i++) {
      this.deformedPositions[i] = THREE.MathUtils.lerp(
        this.deformedPositions[i],
        this.targetPositions[i],
        alpha
      );
    }
  }

  private updateScale(hands: HandData[], dt: number): void {
    const openHandCount = hands.filter(h => h.gesture === 'open').length;
    
    if (openHandCount >= 2) {
      this.state.targetScale = 1.2;
    } else {
      this.state.targetScale = 1.0;
    }

    const alpha = 1 - Math.pow(0.85, dt * 60);
    this.state.currentScale = THREE.MathUtils.lerp(
      this.state.currentScale,
      this.state.targetScale,
      alpha
    );
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  getWireframe(): THREE.LineSegments | null {
    return this.wireframe;
  }
}
