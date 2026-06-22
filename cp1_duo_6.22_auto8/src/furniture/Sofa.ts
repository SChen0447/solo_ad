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

export type SofaPartType = 'cushion' | 'frame' | 'backrest' | 'armrest' | 'leg' | 'stitch';

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
  private stitchMaterial: THREE.LineBasicMaterial;

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

    this.stitchMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3
    });

    this.createSofa();
  }

  private createSofa(): void {
    this.createFrame();
    this.createCushions();
    this.createBackrest();
    this.createArmrests();
    this.createLegs();
    this.createStitching();
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

    const frontTrim = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.15, 0.1),
      this.frameMaterial
    );
    frontTrim.position.set(0, 0.65, 0.55);
    frontTrim.castShadow = true;
    frontTrim.userData.sofaPart = 'frame';
    this.frameParts.push(frontTrim);
    this.group.add(frontTrim);
  }

  private createCushions(): void {
    const cushionWidth = 1.0;
    const cushionDepth = 1.0;
    const cushionHeight = 0.3;
    const gap = 0.05;

    for (let i = 0; i < 3; i++) {
      const cushionGroup = new THREE.Group();

      const mainCushion = new THREE.Mesh(
        new THREE.BoxGeometry(cushionWidth, cushionHeight, cushionDepth),
        this.cushionMaterial
      );
      mainCushion.castShadow = true;
      mainCushion.receiveShadow = true;
      mainCushion.userData.sofaPart = 'cushion';
      cushionGroup.add(mainCushion);

      const topBump = new THREE.Mesh(
        new THREE.BoxGeometry(cushionWidth * 0.95, cushionHeight * 0.3, cushionDepth * 0.9),
        this.cushionMaterial
      );
      topBump.position.y = cushionHeight * 0.6;
      topBump.castShadow = true;
      topBump.userData.sofaPart = 'cushion';
      cushionGroup.add(topBump);

      const frontRounded = new THREE.Mesh(
        new THREE.CylinderGeometry(cushionHeight * 0.5, cushionHeight * 0.5, cushionWidth, 16, 1, false, 0, Math.PI),
        this.cushionMaterial
      );
      frontRounded.rotation.z = Math.PI / 2;
      frontRounded.rotation.x = Math.PI / 2;
      frontRounded.position.z = cushionDepth / 2;
      frontRounded.castShadow = true;
      frontRounded.userData.sofaPart = 'cushion';
      cushionGroup.add(frontRounded);

      cushionGroup.position.set(
        -1.05 + i * (cushionWidth + gap),
        0.4 + cushionHeight / 2 + 0.05,
        -0.05
      );

      this.cushionParts.push(mainCushion, topBump, frontRounded);
      this.group.add(cushionGroup);
    }
  }

  private createBackrest(): void {
    const backrestAngle = -0.25;

    const backrestFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.3, 1.3, 0.3),
      this.frameMaterial
    );
    backrestFrame.position.set(0, 1.15, -0.55);
    backrestFrame.rotation.x = backrestAngle;
    backrestFrame.castShadow = true;
    backrestFrame.receiveShadow = true;
    backrestFrame.userData.sofaPart = 'backrest';
    this.frameParts.push(backrestFrame);
    this.group.add(backrestFrame);

    const backCushionHeight = 1.0;
    const backCushionWidth = 1.0;
    const backCushionDepth = 0.25;
    const gap = 0.05;

    for (let i = 0; i < 3; i++) {
      const cushionGroup = new THREE.Group();

      const backCushion = new THREE.Mesh(
        new THREE.BoxGeometry(backCushionWidth, backCushionHeight, backCushionDepth),
        this.cushionMaterial
      );
      backCushion.castShadow = true;
      backCushion.userData.sofaPart = 'cushion';
      cushionGroup.add(backCushion);

      const frontBump = new THREE.Mesh(
        new THREE.BoxGeometry(backCushionWidth * 0.9, backCushionHeight * 0.85, backCushionDepth * 0.6),
        this.cushionMaterial
      );
      frontBump.position.z = backCushionDepth * 0.4;
      frontBump.castShadow = true;
      frontBump.userData.sofaPart = 'cushion';
      cushionGroup.add(frontBump);

      const topRounded = new THREE.Mesh(
        new THREE.CylinderGeometry(backCushionDepth * 0.5, backCushionDepth * 0.5, backCushionWidth, 16, 1, false, 0, Math.PI),
        this.cushionMaterial
      );
      topRounded.rotation.x = Math.PI / 2;
      topRounded.position.y = backCushionHeight / 2;
      topRounded.castShadow = true;
      topRounded.userData.sofaPart = 'cushion';
      cushionGroup.add(topRounded);

      cushionGroup.position.set(
        -1.05 + i * (backCushionWidth + gap),
        0.95,
        -0.4
      );
      cushionGroup.rotation.x = backrestAngle;

      this.cushionParts.push(backCushion, frontBump, topRounded);
      this.group.add(cushionGroup);
    }
  }

  private createArmrests(): void {
    const armrestHeight = 0.85;
    const armrestWidth = 0.25;
    const armrestDepth = 1.25;

    const createArmrest = (side: 'left' | 'right') => {
      const armGroup = new THREE.Group();
      const xOffset = side === 'left' ? -1.6 : 1.6;

      const mainSupport = new THREE.Mesh(
        new THREE.BoxGeometry(armrestWidth, armrestHeight - 0.15, armrestDepth - 0.1),
        this.frameMaterial
      );
      mainSupport.position.y = 0.2 + (armrestHeight - 0.15) / 2;
      mainSupport.position.z = -0.05;
      mainSupport.castShadow = true;
      mainSupport.userData.sofaPart = 'armrest';
      armGroup.add(mainSupport);

      const topPad = new THREE.Mesh(
        new THREE.BoxGeometry(armrestWidth * 1.3, 0.18, armrestDepth),
        this.cushionMaterial
      );
      topPad.position.y = 0.2 + armrestHeight - 0.1;
      topPad.position.z = -0.05;
      topPad.castShadow = true;
      topPad.userData.sofaPart = 'cushion';
      armGroup.add(topPad);

      const topRounded = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, armrestDepth, 12, 1, false, 0, Math.PI),
        this.cushionMaterial
      );
      topRounded.rotation.x = Math.PI / 2;
      topRounded.position.y = 0.2 + armrestHeight;
      topRounded.position.z = -0.05;
      topRounded.castShadow = true;
      topRounded.userData.sofaPart = 'cushion';
      armGroup.add(topRounded);

      const frontPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.09, armrestHeight, 16),
        this.frameMaterial
      );
      frontPost.position.set(0, armrestHeight / 2 + 0.2, armrestDepth / 2 - 0.05 - 0.05);
      frontPost.castShadow = true;
      frontPost.userData.sofaPart = 'armrest';
      armGroup.add(frontPost);

      const backPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.09, armrestHeight, 16),
        this.frameMaterial
      );
      backPost.position.set(0, armrestHeight / 2 + 0.2, -armrestDepth / 2 + 0.05 - 0.05);
      backPost.castShadow = true;
      backPost.userData.sofaPart = 'armrest';
      armGroup.add(backPost);

      armGroup.position.x = xOffset;
      this.frameParts.push(mainSupport, frontPost, backPost);
      this.cushionParts.push(topPad, topRounded);
      this.group.add(armGroup);
    };

    createArmrest('left');
    createArmrest('right');
  }

  private createLegs(): void {
    const legRadius = 0.07;
    const legHeight = 0.4;
    const geometry = new THREE.CylinderGeometry(legRadius, legRadius * 1.2, legHeight, 16);

    const positions = [
      { x: -1.4, z: 0.45 },
      { x: 1.4, z: 0.45 },
      { x: -1.4, z: -0.55 },
      { x: 1.4, z: -0.55 }
    ];

    positions.forEach(pos => {
      const legGroup = new THREE.Group();

      const leg = new THREE.Mesh(geometry, this.frameMaterial);
      leg.castShadow = true;
      leg.userData.sofaPart = 'leg';
      legGroup.add(leg);

      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(legRadius * 1.3, legRadius * 1.4, 0.05, 16),
        this.frameMaterial
      );
      foot.position.y = -legHeight / 2 + 0.025;
      foot.castShadow = true;
      foot.userData.sofaPart = 'leg';
      legGroup.add(foot);

      legGroup.position.set(pos.x, legHeight / 2, pos.z - 0.05);
      this.frameParts.push(leg, foot);
      this.group.add(legGroup);
    });
  }

  private createStitching(): void {
    const cushionWidth = 1.0;
    const cushionDepth = 1.0;
    const cushionHeight = 0.3;
    const gap = 0.05;

    for (let i = 0; i < 3; i++) {
      const xPos = -1.05 + i * (cushionWidth + gap);
      const yPos = 0.4 + cushionHeight / 2 + 0.05;
      const zPos = -0.05;

      const points = [];
      const halfW = cushionWidth / 2 - 0.05;
      const halfD = cushionDepth / 2 - 0.05;

      points.push(new THREE.Vector3(xPos - halfW, yPos + cushionHeight * 0.15, zPos + halfD));
      points.push(new THREE.Vector3(xPos + halfW, yPos + cushionHeight * 0.15, zPos + halfD));
      points.push(new THREE.Vector3(xPos + halfW, yPos + cushionHeight * 0.15, zPos - halfD));
      points.push(new THREE.Vector3(xPos - halfW, yPos + cushionHeight * 0.15, zPos - halfD));
      points.push(new THREE.Vector3(xPos - halfW, yPos + cushionHeight * 0.15, zPos + halfD));

      const stitchGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const stitchLine = new THREE.Line(stitchGeometry, this.stitchMaterial);
      stitchLine.userData.sofaPart = 'stitch';
      this.group.add(stitchLine);
    }
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
    const isCushion = type === 'cushion';
    if (isCushion) {
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
    let partType = object.userData.sofaPart as SofaPartType;
    if (!partType && object.parent) {
      partType = object.parent.userData.sofaPart as SofaPartType;
    }
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

    let mesh = object as THREE.Mesh;
    if (!mesh.geometry && object.parent) {
      mesh = object.parent as THREE.Mesh;
    }
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

    this.edgeHighlights.set(mesh, lineSegments);
    this.selectedPart = mesh;
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
    return !!(object.userData && object.userData.sofaPart !== undefined) ||
           !!(object.parent && object.parent.userData && object.parent.userData.sofaPart !== undefined);
  }

  public getAllParts(): THREE.Mesh[] {
    return [...this.cushionParts, ...this.frameParts];
  }
}
