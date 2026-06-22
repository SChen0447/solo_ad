import * as THREE from 'three';

export interface SofaMaterialParams {
  cushionColor?: string;
  frameColor?: string;
  glossiness?: number;
}

export const CUSHION_COLORS: { name: string; value: string }[] = [
  { name: '浅蓝', value: '#87ceeb' },
  { name: '米黄', value: '#f5deb3' },
  { name: '墨绿', value: '#2f4f4f' },
  { name: '酒红', value: '#722f37' },
  { name: '驼色', value: '#c19a6b' },
  { name: '深紫', value: '#4b0082' }
];

export const FRAME_COLORS: { name: string; value: string }[] = [
  { name: '米白', value: '#f5f5dc' },
  { name: '胡桃木', value: '#5c4033' },
  { name: '橡木', value: '#a67c52' },
  { name: '炭黑', value: '#2c2c2c' }
];

const DEFAULT_CUSHION_COLOR = '#87ceeb';
const DEFAULT_FRAME_COLOR = '#f5f5dc';
const DEFAULT_GLOSSINESS = 0.5;

export type SofaPartType = 'cushion' | 'frame' | 'backrest' | 'armrest' | 'leg';

export interface SofaPartInfo {
  part: THREE.Object3D;
  type: SofaPartType;
  materialName: string;
  color: string;
}

export class Sofa {
  public group: THREE.Group;
  private cushionMaterial: THREE.MeshStandardMaterial;
  private frameMaterial: THREE.MeshStandardMaterial;

  private cushionParts: THREE.Mesh[] = [];
  private frameParts: THREE.Mesh[] = [];
  private edgeHighlights: Map<THREE.Object3D, THREE.LineSegments> = new Map();

  private selectedPart: THREE.Object3D | null = null;

  constructor() {
    this.group = new THREE.Group();

    const glossFactor = 1 - DEFAULT_GLOSSINESS;
    this.cushionMaterial = new THREE.MeshStandardMaterial({
      color: DEFAULT_CUSHION_COLOR,
      roughness: glossFactor * 0.8 + 0.1,
      metalness: 0.0
    });

    this.frameMaterial = new THREE.MeshStandardMaterial({
      color: DEFAULT_FRAME_COLOR,
      roughness: glossFactor * 0.7 + 0.2,
      metalness: 0.1
    });

    this.createSofa();
  }

  private createSofa(): void {
    this.createFrame();
    this.createCushions();
    this.createBackrest();
    this.createArmrests();
    this.createLegs();
  }

  private createFrame(): void {
    const baseFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.4, 1.2),
      this.frameMaterial
    );
    baseFrame.position.y = 0.4;
    baseFrame.castShadow = true;
    baseFrame.receiveShadow = true;
    baseFrame.userData.sofaPart = 'frame';
    this.frameParts.push(baseFrame);
    this.group.add(baseFrame);
  }

  private createCushions(): void {
    const cushionWidth = 1.0;
    const cushionDepth = 1.0;
    const cushionHeight = 0.25;
    const gap = 0.05;

    for (let i = 0; i < 3; i++) {
      const cushion = new THREE.Mesh(
        new THREE.BoxGeometry(cushionWidth, cushionHeight, cushionDepth),
        this.cushionMaterial
      );
      cushion.position.set(
        -1.05 + i * (cushionWidth + gap),
        0.4 + cushionHeight / 2 + 0.1,
        -0.05
      );
      cushion.castShadow = true;
      cushion.receiveShadow = true;
      cushion.userData.sofaPart = 'cushion';
      this.cushionParts.push(cushion);
      this.group.add(cushion);
    }
  }

  private createBackrest(): void {
    const backrest = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.2, 0.25),
      this.frameMaterial
    );
    backrest.position.set(0, 1.1, -0.6);
    backrest.castShadow = true;
    backrest.receiveShadow = true;
    backrest.userData.sofaPart = 'backrest';
    this.frameParts.push(backrest);
    this.group.add(backrest);

    const backCushionHeight = 0.9;
    const backCushionWidth = 1.0;
    const backCushionDepth = 0.2;
    const gap = 0.05;

    for (let i = 0; i < 3; i++) {
      const backCushion = new THREE.Mesh(
        new THREE.BoxGeometry(backCushionWidth, backCushionHeight, backCushionDepth),
        this.cushionMaterial
      );
      backCushion.position.set(
        -1.05 + i * (backCushionWidth + gap),
        0.9,
        -0.45
      );
      backCushion.castShadow = true;
      backCushion.userData.sofaPart = 'cushion';
      this.cushionParts.push(backCushion);
      this.group.add(backCushion);
    }
  }

  private createArmrests(): void {
    const armrestHeight = 0.9;
    const armrestWidth = 0.2;
    const armrestDepth = 1.2;

    const leftArmrest = new THREE.Mesh(
      new THREE.BoxGeometry(armrestWidth, armrestHeight, armrestDepth),
      this.frameMaterial
    );
    leftArmrest.position.set(-1.6, armrestHeight / 2 + 0.2, -0.05);
    leftArmrest.castShadow = true;
    leftArmrest.userData.sofaPart = 'armrest';
    this.frameParts.push(leftArmrest);
    this.group.add(leftArmrest);

    const rightArmrest = new THREE.Mesh(
      new THREE.BoxGeometry(armrestWidth, armrestHeight, armrestDepth),
      this.frameMaterial
    );
    rightArmrest.position.set(1.6, armrestHeight / 2 + 0.2, -0.05);
    rightArmrest.castShadow = true;
    rightArmrest.userData.sofaPart = 'armrest';
    this.frameParts.push(rightArmrest);
    this.group.add(rightArmrest);
  }

  private createLegs(): void {
    const legRadius = 0.06;
    const legHeight = 0.4;
    const geometry = new THREE.CylinderGeometry(legRadius, legRadius * 1.1, legHeight, 16);

    const positions = [
      { x: -1.4, z: 0.45 },
      { x: 1.4, z: 0.45 },
      { x: -1.4, z: -0.55 },
      { x: 1.4, z: -0.55 }
    ];

    positions.forEach(pos => {
      const leg = new THREE.Mesh(geometry, this.frameMaterial);
      leg.position.set(pos.x, legHeight / 2, pos.z - 0.05);
      leg.castShadow = true;
      leg.userData.sofaPart = 'leg';
      this.frameParts.push(leg);
      this.group.add(leg);
    });
  }

  public setMaterial(params: SofaMaterialParams): void {
    const { cushionColor, frameColor, glossiness } = params;

    if (cushionColor !== undefined) {
      this.cushionMaterial.color.set(cushionColor);
    }

    if (frameColor !== undefined) {
      this.frameMaterial.color.set(frameColor);
    }

    if (glossiness !== undefined) {
      const roughness = (1 - glossiness) * 0.8 + 0.1;
      this.cushionMaterial.roughness = roughness;
      this.frameMaterial.roughness = roughness * 0.85 + 0.1;
    }

    this.cushionMaterial.needsUpdate = true;
    this.frameMaterial.needsUpdate = true;
  }

  public getCushionColor(): string {
    return '#' + this.cushionMaterial.color.getHexString();
  }

  public getFrameColor(): string {
    return '#' + this.frameMaterial.color.getHexString();
  }

  public getGlossiness(): number {
    return 1 - (this.cushionMaterial.roughness - 0.1) / 0.8;
  }

  public getMaterialName(type: SofaPartType): string {
    if (type === 'cushion') {
      const hex = this.getCushionColor();
      const found = CUSHION_COLORS.find(c => c.value.toLowerCase() === hex.toLowerCase());
      return found ? found.name : '自定义';
    } else {
      const hex = this.getFrameColor();
      const found = FRAME_COLORS.find(c => c.value.toLowerCase() === hex.toLowerCase());
      return found ? found.name : '自定义';
    }
  }

  public getPartInfo(object: THREE.Object3D): SofaPartInfo | null {
    const partType = object.userData.sofaPart as SofaPartType;
    if (!partType) return null;

    const isCushion = partType === 'cushion';
    const color = isCushion ? this.getCushionColor() : this.getFrameColor();
    const materialName = this.getMaterialName(partType);

    return {
      part: object,
      type: partType,
      materialName,
      color
    };
  }

  public highlightPart(object: THREE.Object3D): void {
    this.clearHighlight();

    const mesh = object as THREE.Mesh;
    if (!mesh.geometry) return;

    const edges = new THREE.EdgesGeometry(mesh.geometry, 20);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });
    const lineSegments = new THREE.LineSegments(edges, lineMaterial);

    lineSegments.position.copy(mesh.position);
    lineSegments.rotation.copy(mesh.rotation);
    lineSegments.scale.copy(mesh.scale);

    if (mesh.parent) {
      mesh.parent.add(lineSegments);
    }

    this.edgeHighlights.set(object, lineSegments);
    this.selectedPart = object;
  }

  public clearHighlight(): void {
    this.edgeHighlights.forEach(line => {
      if (line.parent) {
        line.parent.remove(line);
      }
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.edgeHighlights.clear();
    this.selectedPart = null;
  }

  public getSelectedPart(): THREE.Object3D | null {
    return this.selectedPart;
  }

  public reset(): void {
    this.setMaterial({
      cushionColor: DEFAULT_CUSHION_COLOR,
      frameColor: DEFAULT_FRAME_COLOR,
      glossiness: DEFAULT_GLOSSINESS
    });
    this.clearHighlight();
  }

  public isSofaPart(object: THREE.Object3D): boolean {
    return object.userData && object.userData.sofaPart !== undefined;
  }

  public getAllParts(): THREE.Mesh[] {
    return [...this.cushionParts, ...this.frameParts];
  }
}
