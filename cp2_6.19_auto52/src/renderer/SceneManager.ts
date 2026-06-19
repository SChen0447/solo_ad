import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  BasePairData,
  BaseType,
  BASE_INFO_MAP,
  BACKBONE_COLOR,
  HIGHLIGHT_COLOR,
  HYDROGEN_BOND_COLOR,
  ANIMATION_CONFIG,
  HELIX_CONFIG
} from '../data/BasePairData';
import { SequenceParser } from '../data/SequenceParser';

interface BaseMeshGroup {
  meshA: THREE.Mesh;
  meshB: THREE.Mesh;
  labelA: THREE.Sprite;
  labelB: THREE.Sprite;
  hydrogenBonds: THREE.Line[];
  backboneSegmentA?: THREE.Mesh;
  backboneSegmentB?: THREE.Mesh;
}

interface TweenAnimation {
  target: any;
  property: string;
  startValue: number | THREE.Color | THREE.Vector3;
  endValue: number | THREE.Color | THREE.Vector3;
  startTime: number;
  duration: number;
  ease: (t: number) => number;
  isColor?: boolean;
  isVector?: boolean;
  onComplete?: () => void;
}

interface ClickAnimation {
  target: THREE.Mesh;
  startTime: number;
  duration: number;
}

export interface BaseSelectionInfo {
  baseName: string;
  baseSymbol: BaseType;
  index: number;
  pairName: string;
  pairSymbol: BaseType;
  hydrogenBonds: number;
  color: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private animationFrameId: number = 0;
  private clock: THREE.Clock;

  private dnaRoot: THREE.Group;
  private backboneGroupA: THREE.Group;
  private backboneGroupB: THREE.Group;
  private basesGroup: THREE.Group;
  private hydrogenGroup: THREE.Group;

  private baseMeshMap: Map<number, BaseMeshGroup> = new Map();
  private clickableMeshes: THREE.Mesh[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private basePairs: BasePairData[] = [];
  private sequenceParser: SequenceParser;

  private rotateSpeed: number = ANIMATION_CONFIG.defaultRotateSpeed;
  private autoRotate: boolean = true;
  private backboneRadius: number = 0.2;
  private baseHeight: number = 0.5;
  private helixPitch: number = HELIX_CONFIG.verticalPitch;
  private helixRadius: number = HELIX_CONFIG.radius;

  private activeTweens: TweenAnimation[] = [];
  private clickAnimations: ClickAnimation[] = [];
  private highlightPullTweens: Map<number, { start: THREE.Vector3; end: THREE.Vector3 }> = new Map();

  private highlightRange: { start: number; end: number } | null = null;

  private onBaseSelected?: (info: BaseSelectionInfo) => void;
  private onPanelClose?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.sequenceParser = new SequenceParser();
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 4, 10);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 40;
    this.controls.rotateSpeed = window.innerWidth < 768 ? 0.6 : 1.0;

    this.dnaRoot = new THREE.Group();
    this.backboneGroupA = new THREE.Group();
    this.backboneGroupB = new THREE.Group();
    this.basesGroup = new THREE.Group();
    this.hydrogenGroup = new THREE.Group();

    this.dnaRoot.add(this.backboneGroupA);
    this.dnaRoot.add(this.backboneGroupB);
    this.dnaRoot.add(this.basesGroup);
    this.dnaRoot.add(this.hydrogenGroup);
    this.scene.add(this.dnaRoot);

    this.setupLights();
    this.setupEventListeners();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(5, 10, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x4fc3f7, 0.3);
    dirLight2.position.set(-8, 5, -5);
    this.scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0x7c4dff, 0.25);
    dirLight3.position.set(5, -5, 8);
    this.scene.add(dirLight3);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.addEventListener('click', this.onCanvasClick.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.controls.rotateSpeed = width < 768 ? 0.6 : 1.0;
  }

  private onCanvasClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableMeshes, false);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      this.handleBaseClick(clickedMesh);
    } else {
      if (this.onPanelClose) {
        this.onPanelClose();
      }
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.onPanelClose) {
      this.onPanelClose();
    }
  }

  private handleBaseClick(mesh: THREE.Mesh): void {
    const userData = mesh.userData;
    if (userData.baseIndex !== undefined && userData.baseType !== undefined) {
      this.playClickAnimation(mesh);

      const pairData = this.basePairs[userData.baseIndex as number];
      const isBaseA = userData.isBaseA as boolean;
      const selectedSymbol = isBaseA ? pairData.baseA : pairData.baseB;
      const pairSymbol = isBaseA ? pairData.baseB : pairData.baseA;
      const selectedInfo = BASE_INFO_MAP[selectedSymbol];
      const pairInfo = BASE_INFO_MAP[pairSymbol];

      if (this.onBaseSelected) {
        this.onBaseSelected({
          baseName: selectedInfo.fullName,
          baseSymbol: selectedSymbol,
          index: pairData.index,
          pairName: pairInfo.fullName,
          pairSymbol: pairSymbol,
          hydrogenBonds: pairData.hydrogenBonds,
          color: isBaseA ? pairData.colorA : pairData.colorB
        });
      }
    }
  }

  private playClickAnimation(mesh: THREE.Mesh): void {
    const now = performance.now();
    this.clickAnimations.push({
      target: mesh,
      startTime: now,
      duration: ANIMATION_CONFIG.clickAnimationDuration
    });
  }

  public setBaseSelectionCallback(callback: (info: BaseSelectionInfo) => void): void {
    this.onBaseSelected = callback;
  }

  public setPanelCloseCallback(callback: () => void): void {
    this.onPanelClose = callback;
  }

  public setRotateSpeed(speed: number): void {
    this.rotateSpeed = speed;
  }

  public setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
  }

  public setBackboneRadius(radius: number): void {
    this.backboneRadius = radius;
    this.rebuildBackbone();
  }

  public setBaseHeight(height: number): void {
    this.baseHeight = height;
    this.rebuildBases();
  }

  public setHelixPitch(pitch: number): void {
    this.helixPitch = pitch;
    this.sequenceParser.setHelixParams(this.helixRadius, HELIX_CONFIG.basePairsPerTurn, this.helixPitch);
    if (this.basePairs.length > 0) {
      this.updateSequence(this.sequenceParser.parse(
        this.basePairs.map(p => p.baseA).join('')
      ).map(p => p.baseA).join(''));
    }
  }

  public setHelixRadius(radius: number): void {
    this.helixRadius = radius;
    this.sequenceParser.setHelixParams(this.helixRadius, HELIX_CONFIG.basePairsPerTurn, this.helixPitch);
  }

  public updateSequence(sequence: string): void {
    this.sequenceParser.setHelixParams(this.helixRadius, HELIX_CONFIG.basePairsPerTurn, this.helixPitch);
    const newBasePairs = this.sequenceParser.parse(sequence);

    if (this.basePairs.length === 0 || newBasePairs.length !== this.basePairs.length) {
      this.clearScene();
      this.basePairs = newBasePairs;
      this.buildAllMeshes();
    } else {
      this.animateTransition(newBasePairs);
      this.basePairs = newBasePairs;
    }

    this.updateSeqLengthDisplay(newBasePairs.length);
  }

  private updateSeqLengthDisplay(length: number): void {
    const el = document.getElementById('seq-length');
    if (el) {
      el.textContent = length.toString();
    }
  }

  private clearScene(): void {
    this.clearGroup(this.backboneGroupA);
    this.clearGroup(this.backboneGroupB);
    this.clearGroup(this.basesGroup);
    this.clearGroup(this.hydrogenGroup);
    this.baseMeshMap.clear();
    this.clickableMeshes = [];
    this.activeTweens = [];
    this.clickAnimations = [];
    this.highlightPullTweens.clear();
    this.highlightRange = null;
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
      group.remove(child);
    }
  }

  private buildAllMeshes(): void {
    this.buildBackbones();
    this.buildBasesAndHydrogen();
  }

  private buildBackbones(): void {
    if (this.basePairs.length < 2) return;

    const pointsA: THREE.Vector3[] = [];
    const pointsB: THREE.Vector3[] = [];

    for (let i = 0; i < this.basePairs.length; i++) {
      const pair = this.basePairs[i];
      pointsA.push(new THREE.Vector3(pair.positionA.x, pair.positionA.y, pair.positionA.z));
      pointsB.push(new THREE.Vector3(pair.positionB.x, pair.positionB.y, pair.positionB.z));
    }

    const tubeA = this.createTube(pointsA, BACKBONE_COLOR, this.backboneRadius);
    const tubeB = this.createTube(pointsB, BACKBONE_COLOR, this.backboneRadius);

    tubeA.userData = { isBackbone: true, strand: 'A' };
    tubeB.userData = { isBackbone: true, strand: 'B' };

    this.backboneGroupA.add(tubeA);
    this.backboneGroupB.add(tubeB);

    this.applyHighlightStateToObject(tubeA, -1);
    this.applyHighlightStateToObject(tubeB, -1);
  }

  private createTube(points: THREE.Vector3[], color: number, radius: number): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, points.length * 4, radius, 12, false);
    const material = new THREE.MeshPhysicalMaterial({
      color: color,
      transparent: true,
      opacity: 0.75,
      roughness: 0.3,
      metalness: 0.2,
      clearcoat: 0.5,
      clearcoatRoughness: 0.4,
      emissive: new THREE.Color(color).multiplyScalar(0.1)
    });
    return new THREE.Mesh(geometry, material);
  }

  private buildBasesAndHydrogen(): void {
    for (let i = 0; i < this.basePairs.length; i++) {
      const pair = this.basePairs[i];
      this.buildBasePair(i, pair);
    }
  }

  private buildBasePair(index: number, pair: BasePairData): void {
    const posA = new THREE.Vector3(pair.positionA.x, pair.positionA.y, pair.positionA.z);
    const posB = new THREE.Vector3(pair.positionB.x, pair.positionB.y, pair.positionB.z);
    const midPos = posA.clone().add(posB).multiplyScalar(0.5);
    const direction = posB.clone().sub(posA).normalize();

    const cylinderHeight = posA.distanceTo(posB) * 0.85;
    const baseGeomA = new THREE.CylinderGeometry(0.08, 0.08, this.baseHeight, 16);
    const baseGeomB = new THREE.CylinderGeometry(0.08, 0.08, this.baseHeight, 16);

    baseGeomA.translate(0, 0, 0);
    baseGeomB.translate(0, 0, 0);

    const matA = this.createBaseMaterial(pair.colorA);
    const matB = this.createBaseMaterial(pair.colorB);

    const meshA = new THREE.Mesh(baseGeomA, matA);
    const meshB = new THREE.Mesh(baseGeomB, matB);

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    const offsetA = direction.clone().multiplyScalar(-cylinderHeight * 0.3);
    const offsetB = direction.clone().multiplyScalar(cylinderHeight * 0.3);

    meshA.position.copy(posA).add(offsetA);
    meshA.quaternion.copy(quaternion);

    meshB.position.copy(posB).add(offsetB);
    meshB.quaternion.copy(quaternion);

    meshA.userData = { baseIndex: index, isBaseA: true, baseType: pair.baseA, originalPosition: meshA.position.clone() };
    meshB.userData = { baseIndex: index, isBaseA: false, baseType: pair.baseB, originalPosition: meshB.position.clone() };

    this.clickableMeshes.push(meshA, meshB);

    const labelA = this.createLabel(pair.baseA, pair.colorA);
    const labelB = this.createLabel(pair.baseB, pair.colorB);

    const labelOffset = direction.clone().multiplyScalar(0.35);
    labelA.position.copy(meshA.position).sub(labelOffset);
    labelB.position.copy(meshB.position).add(labelOffset);

    labelA.userData = { baseIndex: index, isBaseA: true, originalPosition: labelA.position.clone() };
    labelB.userData = { baseIndex: index, isBaseA: false, originalPosition: labelB.position.clone() };

    const hydrogenBonds = this.createHydrogenBonds(posA, posB, pair.hydrogenBonds);
    hydrogenBonds.forEach(line => {
      line.userData = { baseIndex: index, originalPositions: (line.geometry.attributes.position.array as Float32Array).slice() };
    });

    this.basesGroup.add(meshA);
    this.basesGroup.add(meshB);
    this.basesGroup.add(labelA);
    this.basesGroup.add(labelB);
    hydrogenBonds.forEach(line => this.hydrogenGroup.add(line));

    this.baseMeshMap.set(index, {
      meshA,
      meshB,
      labelA,
      labelB,
      hydrogenBonds
    });

    this.applyHighlightStateToIndex(index);
  }

  private createBaseMaterial(color: number): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.35,
      metalness: 0.15,
      clearcoat: 0.4,
      emissive: new THREE.Color(color).multiplyScalar(0.08),
      emissiveIntensity: 0.5
    });
  }

  private createLabel(text: string, color: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.fillText(text, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.35, 0.35, 0.35);
    return sprite;
  }

  private createHydrogenBonds(posA: THREE.Vector3, posB: THREE.Vector3, count: number): THREE.Line[] {
    const lines: THREE.Line[] = [];
    const direction = posB.clone().sub(posA);
    const perp = new THREE.Vector3(0, 0.1, 0);
    if (Math.abs(direction.y) > 0.9) {
      perp.set(0.1, 0, 0);
    } else {
      perp.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(0.08);
    }

    for (let i = 0; i < count; i++) {
      const offset = perp.clone().multiplyScalar(i - (count - 1) / 2);
      const startPos = posA.clone().add(offset);
      const endPos = posB.clone().add(offset);

      const segments = 16;
      const dashLength = 0.08;
      const gapLength = 0.06;
      const totalLength = startPos.distanceTo(endPos);
      const segPoints: THREE.Vector3[] = [];
      let dist = 0;
      let inDash = true;

      while (dist < totalLength) {
        const tStart = dist / totalLength;
        if (inDash) {
          const tEnd = Math.min((dist + dashLength) / totalLength, 1);
          segPoints.push(startPos.clone().lerp(endPos, tStart));
          segPoints.push(startPos.clone().lerp(endPos, tEnd));
          dist += dashLength;
        } else {
          dist += gapLength;
        }
        inDash = !inDash;
      }

      const geom = new THREE.BufferGeometry().setFromPoints(segPoints);
      const mat = new THREE.LineBasicMaterial({
        color: HYDROGEN_BOND_COLOR,
        transparent: true,
        opacity: 0.6,
        linewidth: 1
      });
      const line = new THREE.LineSegments(geom, mat);
      lines.push(line);
    }

    return lines;
  }

  private rebuildBackbone(): void {
    this.clearGroup(this.backboneGroupA);
    this.clearGroup(this.backboneGroupB);
    this.buildBackbones();
  }

  private rebuildBases(): void {
    const basePairs = [...this.basePairs];
    const highlight = this.highlightRange;

    for (let i = 0; i < basePairs.length; i++) {
      const group = this.baseMeshMap.get(i);
      if (group) {
        this.basesGroup.remove(group.meshA);
        this.basesGroup.remove(group.meshB);
        this.basesGroup.remove(group.labelA);
        this.basesGroup.remove(group.labelB);
        group.meshA.geometry.dispose();
        (group.meshA.material as THREE.Material).dispose();
        group.meshB.geometry.dispose();
        (group.meshB.material as THREE.Material).dispose();

        group.hydrogenBonds.forEach(line => {
          this.hydrogenGroup.remove(line);
          line.geometry.dispose();
          (line.material as THREE.Material).dispose();
        });

        this.clickableMeshes = this.clickableMeshes.filter(m =>
          m !== group.meshA && m !== group.meshB
        );
      }
    }

    this.baseMeshMap.clear();
    this.buildBasesAndHydrogen();

    if (highlight) {
      this.highlightRange = null;
      this.applyHighlight(highlight.start, highlight.end);
    }
  }

  private animateTransition(newBasePairs: BasePairData[]): void {
    const now = performance.now();
    const duration = ANIMATION_CONFIG.transitionDuration;

    for (let i = 0; i < newBasePairs.length; i++) {
      const oldPair = this.basePairs[i];
      const newPair = newBasePairs[i];
      const meshGroup = this.baseMeshMap.get(i);

      if (!meshGroup) continue;

      const posA = new THREE.Vector3(newPair.positionA.x, newPair.positionA.y, newPair.positionA.z);
      const posB = new THREE.Vector3(newPair.positionB.x, newPair.positionB.y, newPair.positionB.z);
      const direction = posB.clone().sub(posA).normalize();
      const cylinderHeight = posA.distanceTo(posB) * 0.85;

      const offsetA = direction.clone().multiplyScalar(-cylinderHeight * 0.3);
      const offsetB = direction.clone().multiplyScalar(cylinderHeight * 0.3);

      const targetPosA = posA.clone().add(offsetA);
      const targetPosB = posB.clone().add(offsetB);

      const labelOffset = direction.clone().multiplyScalar(0.35);
      const targetLabelPosA = targetPosA.clone().sub(labelOffset);
      const targetLabelPosB = targetPosB.clone().add(labelOffset);

      const isHighlighted = this.isIndexHighlighted(i);
      const pullOffset = isHighlighted ? direction.clone().multiplyScalar(ANIMATION_CONFIG.highlightPullDistance * 0.5) : new THREE.Vector3();

      this.addVectorTween(meshGroup.meshA.position, targetPosA.clone().add(i % 2 === 0 ? pullOffset : pullOffset.clone().negate()), now, duration);
      this.addVectorTween(meshGroup.meshB.position, targetPosB.clone().add(i % 2 === 0 ? pullOffset.clone().negate() : pullOffset), now, duration);

      meshGroup.meshA.userData.originalPosition = targetPosA.clone();
      meshGroup.meshB.userData.originalPosition = targetPosB.clone();

      this.addVectorTween(meshGroup.labelA.position, targetLabelPosA.clone().add(i % 2 === 0 ? pullOffset : pullOffset.clone().negate()), now, duration);
      this.addVectorTween(meshGroup.labelB.position, targetLabelPosB.clone().add(i % 2 === 0 ? pullOffset.clone().negate() : pullOffset), now, duration);

      meshGroup.labelA.userData.originalPosition = targetLabelPosA.clone();
      meshGroup.labelB.userData.originalPosition = targetLabelPosB.clone();

      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

      meshGroup.meshA.quaternion.slerp(quaternion, 1);
      meshGroup.meshB.quaternion.slerp(quaternion, 1);

      if (oldPair.colorA !== newPair.colorA) {
        const matA = meshGroup.meshA.material as THREE.MeshPhysicalMaterial;
        this.addColorTween(matA.color, new THREE.Color(newPair.colorA), now, duration);
        matA.emissive = new THREE.Color(newPair.colorA).multiplyScalar(0.08);
        meshGroup.meshA.userData.baseType = newPair.baseA;
        this.replaceLabel(meshGroup.labelA, newPair.baseA, newPair.colorA);
      }

      if (oldPair.colorB !== newPair.colorB) {
        const matB = meshGroup.meshB.material as THREE.MeshPhysicalMaterial;
        this.addColorTween(matB.color, new THREE.Color(newPair.colorB), now, duration);
        matB.emissive = new THREE.Color(newPair.colorB).multiplyScalar(0.08);
        meshGroup.meshB.userData.baseType = newPair.baseB;
        this.replaceLabel(meshGroup.labelB, newPair.baseB, newPair.colorB);
      }

      for (let h = 0; h < meshGroup.hydrogenBonds.length; h++) {
        const line = meshGroup.hydrogenBonds[h];
        const positions = line.geometry.attributes.position.array as Float32Array;
        const perp = new THREE.Vector3(0, 0.1, 0);
        if (Math.abs(direction.y) > 0.9) {
          perp.set(0.1, 0, 0);
        } else {
          perp.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(0.08);
        }
        const perpOff = perp.clone().multiplyScalar(h - (meshGroup.hydrogenBonds.length - 1) / 2);
        const adjustedStart = posA.clone().add(perpOff);
        const adjustedEnd = posB.clone().add(perpOff);

        for (let p = 0; p < positions.length; p += 6) {
          const t1 = positions[p + 0] === 0 ? 0 : NaN;
          const totalStart = new THREE.Vector3(
            line.userData.originalPositions[p],
            line.userData.originalPositions[p + 1],
            line.userData.originalPositions[p + 2]
          );
          const totalEnd = new THREE.Vector3(
            line.userData.originalPositions[p + 3],
            line.userData.originalPositions[p + 4],
            line.userData.originalPositions[p + 5]
          );
          const totalDir = totalEnd.clone().sub(totalStart);
          const totalLen = totalDir.length();
          const startT = new THREE.Vector3(
            line.userData.originalPositions[p],
            line.userData.originalPositions[p + 1],
            line.userData.originalPositions[p + 2]
          ).sub(new THREE.Vector3(
            line.userData.originalPositions[0],
            line.userData.originalPositions[1],
            line.userData.originalPositions[2]
          )).length() / totalLen;
          const endT = new THREE.Vector3(
            line.userData.originalPositions[p + 3],
            line.userData.originalPositions[p + 4],
            line.userData.originalPositions[p + 5]
          ).sub(new THREE.Vector3(
            line.userData.originalPositions[0],
            line.userData.originalPositions[1],
            line.userData.originalPositions[2]
          )).length() / totalLen;

          const newP1 = adjustedStart.clone().lerp(adjustedEnd, Math.min(Math.max(startT, 0), 1));
          const newP2 = adjustedStart.clone().lerp(adjustedEnd, Math.min(Math.max(endT, 0), 1));

          this.addNumberTweenForArray(positions, p, newP1.x, now, duration);
          this.addNumberTweenForArray(positions, p + 1, newP1.y, now, duration);
          this.addNumberTweenForArray(positions, p + 2, newP1.z, now, duration);
          this.addNumberTweenForArray(positions, p + 3, newP2.x, now, duration);
          this.addNumberTweenForArray(positions, p + 4, newP2.y, now, duration);
          this.addNumberTweenForArray(positions, p + 5, newP2.z, now, duration);
        }
        line.geometry.attributes.position.needsUpdate = true;
      }
    }
  }

  private replaceLabel(sprite: THREE.Sprite, text: string, color: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.fillText(text, 32, 32);

    const oldTexture = (sprite.material as THREE.SpriteMaterial).map;
    const newTexture = new THREE.CanvasTexture(canvas);
    newTexture.needsUpdate = true;
    (sprite.material as THREE.SpriteMaterial).map = newTexture;
    if (oldTexture) oldTexture.dispose();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private addVectorTween(target: THREE.Vector3, endValue: THREE.Vector3, startTime: number, duration: number): void {
    this.activeTweens.push({
      target,
      property: 'vector',
      startValue: target.clone(),
      endValue: endValue.clone(),
      startTime,
      duration,
      ease: this.easeOutCubic,
      isVector: true
    });
  }

  private addColorTween(target: THREE.Color, endValue: THREE.Color, startTime: number, duration: number): void {
    this.activeTweens.push({
      target,
      property: 'color',
      startValue: target.clone(),
      endValue: endValue.clone(),
      startTime,
      duration,
      ease: this.easeOutCubic,
      isColor: true
    });
  }

  private addNumberTweenForArray(target: Float32Array, index: number, endValue: number, startTime: number, duration: number): void {
    const proxy: any = {
      value: target[index],
      set: (v: number) => { target[index] = v; }
    };
    this.activeTweens.push({
      target: proxy,
      property: 'value',
      startValue: target[index],
      endValue: endValue,
      startTime,
      duration,
      ease: this.easeOutCubic,
      onComplete: () => { target[index] = endValue; }
    });
  }

  public applyHighlight(start: number, end: number): void {
    this.resetHighlight(false);
    this.highlightRange = { start, end };

    const now = performance.now();
    const duration = ANIMATION_CONFIG.highlightPullDuration;

    for (let i = 0; i < this.basePairs.length; i++) {
      this.applyHighlightStateToIndex(i, now, duration);
    }

    this.applyHighlightToBackbone(start, end, now, duration);
  }

  public resetHighlight(animated: boolean = true): void {
    const now = performance.now();
    const duration = animated ? ANIMATION_CONFIG.highlightPullDuration : 0;

    this.highlightRange = null;

    for (let i = 0; i < this.basePairs.length; i++) {
      this.applyHighlightStateToIndex(i, now, duration);
    }

    [this.backboneGroupA, this.backboneGroupB].forEach(group => {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshPhysicalMaterial) {
          const mat = obj.material;
          const endColor = new THREE.Color(BACKBONE_COLOR);
          if (duration > 0) {
            this.addColorTween(mat.color, endColor, now, duration);
            this.addOpacityTween(mat, 0.75, now, duration);
            this.addEmissiveTween(mat, new THREE.Color(BACKBONE_COLOR).multiplyScalar(0.1), now, duration);
          } else {
            mat.color.copy(endColor);
            mat.opacity = 0.75;
            mat.emissive = new THREE.Color(BACKBONE_COLOR).multiplyScalar(0.1);
          }
        }
      });
    });
  }

  private isIndexHighlighted(index: number): boolean {
    if (!this.highlightRange) return false;
    return index >= this.highlightRange.start && index <= this.highlightRange.end;
  }

  private applyHighlightStateToIndex(index: number, startTime?: number, duration?: number): void {
    const group = this.baseMeshMap.get(index);
    if (!group) return;

    const isHighlighted = this.isIndexHighlighted(index);
    const now = startTime ?? performance.now();
    const dur = duration ?? 0;

    [
      { mesh: group.meshA, label: group.labelA, isBaseA: true },
      { mesh: group.meshB, label: group.labelB, isBaseA: false }
    ].forEach(({ mesh, label, isBaseA }) => {
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      const pair = this.basePairs[index];
      const baseColor = isBaseA ? pair.colorA : pair.colorB;
      const endColor = isHighlighted ? new THREE.Color(HIGHLIGHT_COLOR) : new THREE.Color(baseColor);
      const endOpacity = isHighlighted ? 1.0 : 1.0;
      const endEmissive = isHighlighted
        ? new THREE.Color(HIGHLIGHT_COLOR).multiplyScalar(0.6)
        : new THREE.Color(baseColor).multiplyScalar(0.08);

      if (dur > 0) {
        this.addColorTween(mat.color, endColor, now, dur);
        this.addOpacityTween(mat, endOpacity, now, dur);
        this.addEmissiveTween(mat, endEmissive, now, dur);
      } else {
        mat.color.copy(endColor);
        mat.opacity = endOpacity;
        mat.emissive.copy(endEmissive);
      }

      if (!isHighlighted) {
        const origPos = mesh.userData.originalPosition as THREE.Vector3 | undefined;
        const origLabelPos = label.userData.originalPosition as THREE.Vector3 | undefined;
        if (origPos && dur > 0) {
          this.addVectorTween(mesh.position, origPos.clone(), now, dur);
        } else if (origPos) {
          mesh.position.copy(origPos);
        }
        if (origLabelPos && dur > 0) {
          this.addVectorTween(label.position, origLabelPos.clone(), now, dur);
        } else if (origLabelPos) {
          label.position.copy(origLabelPos);
        }
      } else {
        const pair = this.basePairs[index];
        const posA = new THREE.Vector3(pair.positionA.x, pair.positionA.y, pair.positionA.z);
        const posB = new THREE.Vector3(pair.positionB.x, pair.positionB.y, pair.positionB.z);
        const outwardDir = isBaseA
          ? posA.clone().sub(posB).normalize()
          : posB.clone().sub(posA).normalize();
        const pullOffset = outwardDir.multiplyScalar(ANIMATION_CONFIG.highlightPullDistance);

        const origPos = mesh.userData.originalPosition as THREE.Vector3;
        const origLabelPos = label.userData.originalPosition as THREE.Vector3;
        const targetPos = origPos.clone().add(pullOffset);
        const targetLabelPos = origLabelPos.clone().add(pullOffset);

        if (dur > 0) {
          this.addVectorTween(mesh.position, targetPos, now, dur);
          this.addVectorTween(label.position, targetLabelPos, now, dur);
        } else {
          mesh.position.copy(targetPos);
          label.position.copy(targetLabelPos);
        }
      }

      const nonHighlightOpacity = isHighlighted ? 1.0 : 0.3;
      label.material = label.material as THREE.SpriteMaterial;
      const spriteMat = label.material as THREE.SpriteMaterial;
      if (dur > 0) {
        this.addSpriteOpacityTween(spriteMat, nonHighlightOpacity, now, dur);
      } else {
        spriteMat.opacity = nonHighlightOpacity;
      }
    });

    group.hydrogenBonds.forEach(line => {
      const mat = line.material as THREE.LineBasicMaterial;
      const endOpacity = isHighlighted ? 1.0 : 0.2;
      if (dur > 0) {
        this.addLineOpacityTween(mat, endOpacity, now, dur);
      } else {
        mat.opacity = endOpacity;
      }
    });
  }

  private applyHighlightStateToObject(obj: THREE.Object3D, baseIndex: number, startTime?: number, duration?: number): void {
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshPhysicalMaterial) {
      const isHighlighted = this.isIndexHighlighted(baseIndex);
      const mat = obj.material;
      const now = startTime ?? performance.now();
      const dur = duration ?? 0;
      const endOpacity = isHighlighted ? 1.0 : 0.75;

      if (dur > 0) {
        this.addOpacityTween(mat, endOpacity, now, dur);
      } else {
        mat.opacity = endOpacity;
      }
    }
  }

  private applyHighlightToBackbone(start: number, end: number, startTime: number, duration: number): void {
    [this.backboneGroupA, this.backboneGroupB].forEach((group, strandIdx) => {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshPhysicalMaterial) {
          const mat = obj.material;
          const totalPairs = this.basePairs.length;

          const dimAllOpacity = 0.3;
          for (let i = 0; i < totalPairs; i++) {
            if (i < start || i > end) {
              continue;
            }
          }
          this.addColorTween(mat.color, new THREE.Color(HIGHLIGHT_COLOR), startTime, duration);
          this.addOpacityTween(mat, 0.85, startTime, duration);
          this.addEmissiveTween(mat, new THREE.Color(HIGHLIGHT_COLOR).multiplyScalar(0.4), startTime, duration);
        }
      });
    });
  }

  private addOpacityTween(mat: THREE.MeshPhysicalMaterial, endOpacity: number, startTime: number, duration: number): void {
    const proxy: any = {
      get opacity() { return mat.opacity; },
      set opacity(v: number) { mat.opacity = v; }
    };
    this.activeTweens.push({
      target: proxy,
      property: 'opacity',
      startValue: mat.opacity,
      endValue: endOpacity,
      startTime,
      duration,
      ease: this.easeOutCubic
    });
  }

  private addSpriteOpacityTween(mat: THREE.SpriteMaterial, endOpacity: number, startTime: number, duration: number): void {
    const proxy: any = {
      get opacity() { return mat.opacity; },
      set opacity(v: number) { mat.opacity = v; }
    };
    this.activeTweens.push({
      target: proxy,
      property: 'opacity',
      startValue: mat.opacity,
      endValue: endOpacity,
      startTime,
      duration,
      ease: this.easeOutCubic
    });
  }

  private addLineOpacityTween(mat: THREE.LineBasicMaterial, endOpacity: number, startTime: number, duration: number): void {
    const proxy: any = {
      get opacity() { return mat.opacity; },
      set opacity(v: number) { mat.opacity = v; }
    };
    this.activeTweens.push({
      target: proxy,
      property: 'opacity',
      startValue: mat.opacity,
      endValue: endOpacity,
      startTime,
      duration,
      ease: this.easeOutCubic
    });
  }

  private addEmissiveTween(mat: THREE.MeshPhysicalMaterial, endEmissive: THREE.Color, startTime: number, duration: number): void {
    const proxy: any = {
      r: mat.emissive.r,
      g: mat.emissive.g,
      b: mat.emissive.b,
      sync: () => {
        mat.emissive.setRGB(proxy.r, proxy.g, proxy.b);
      }
    };
    const startR = mat.emissive.r;
    const startG = mat.emissive.g;
    const startB = mat.emissive.b;

    this.activeTweens.push({
      target: proxy,
      property: 'r',
      startValue: startR,
      endValue: endEmissive.r,
      startTime,
      duration,
      ease: this.easeOutCubic,
      onComplete: () => { proxy.sync(); }
    });
    this.activeTweens.push({
      target: proxy,
      property: 'g',
      startValue: startG,
      endValue: endEmissive.g,
      startTime,
      duration,
      ease: this.easeOutCubic,
      onComplete: () => { proxy.sync(); }
    });
    this.activeTweens.push({
      target: proxy,
      property: 'b',
      startValue: startB,
      endValue: endEmissive.b,
      startTime,
      duration,
      ease: this.easeOutCubic,
      onComplete: () => { proxy.sync(); }
    });
  }

  private updateTweens(now: number): void {
    const completed: number[] = [];

    for (let i = 0; i < this.activeTweens.length; i++) {
      const tween = this.activeTweens[i];
      const elapsed = now - tween.startTime;
      const progress = Math.min(elapsed / tween.duration, 1);
      const easedProgress = tween.ease(progress);

      try {
        if (tween.isVector && tween.startValue instanceof THREE.Vector3 && tween.endValue instanceof THREE.Vector3 && tween.target instanceof THREE.Vector3) {
          tween.target.lerpVectors(tween.startValue, tween.endValue, easedProgress);
        } else if (tween.isColor && tween.startValue instanceof THREE.Color && tween.endValue instanceof THREE.Color && tween.target instanceof THREE.Color) {
          tween.target.lerpColors(tween.startValue, tween.endValue, easedProgress);
        } else {
          const start = tween.startValue as number;
          const end = tween.endValue as number;
          const value = start + (end - start) * easedProgress;
          const target = tween.target as any;
          if (tween.property === 'value' && target.set) {
            target.set(value);
          } else {
            target[tween.property] = value;
          }
        }
      } catch (e) {
        // ignore
      }

      if (progress >= 1) {
        if (tween.onComplete) {
          try { tween.onComplete(); } catch (e) {}
        }
        completed.push(i);
      }
    }

    for (let i = completed.length - 1; i >= 0; i--) {
      this.activeTweens.splice(completed[i], 1);
    }
  }

  private updateClickAnimations(now: number): void {
    const completed: number[] = [];

    for (let i = 0; i < this.clickAnimations.length; i++) {
      const anim = this.clickAnimations[i];
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);

      let scale: number;
      if (progress < 0.5) {
        scale = 1 - 0.3 * this.easeOutCubic(progress * 2);
      } else {
        scale = 0.7 + 0.3 * this.easeOutBack((progress - 0.5) * 2);
      }

      anim.target.scale.setScalar(scale);

      if (progress >= 1) {
        anim.target.scale.setScalar(1);
        completed.push(i);
      }
    }

    for (let i = completed.length - 1; i >= 0; i--) {
      this.clickAnimations.splice(completed[i], 1);
    }
  }

  public start(): void {
    if (this.basePairs.length === 0) {
      this.updateSequence('ATCGATCGATCGATCGATCGATCG');
    }
    this.animate();
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    const now = performance.now();
    const delta = this.clock.getDelta();

    if (this.autoRotate) {
      this.dnaRoot.rotation.y += this.rotateSpeed * delta;
    }

    this.updateTweens(now);
    this.updateClickAnimations(now);
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  public stop(): void {
    if (this.animationFrameId !== 0) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.removeEventListener('click', this.onCanvasClick.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));

    this.clearScene();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    this.controls.dispose();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

export default SceneManager;
