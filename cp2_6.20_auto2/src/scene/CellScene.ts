import * as THREE from 'three';

export interface MitochondrionState {
  stage: 'idle' | 'stretching' | 'pinching' | 'separating' | 'recovering';
  timer: number;
  childGroup: THREE.Group | null;
  originalChildPosition: THREE.Vector3;
}

export interface Organelle {
  name: string;
  description: string;
  mesh: THREE.Object3D;
  type: 'nucleus' | 'mitochondrion' | 'er' | 'golgi';
  rotationSpeed: number;
  originalPosition: THREE.Vector3;
  originalScale: THREE.Vector3;
  mitochondrionState?: MitochondrionState;
}

export interface MRNA {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  path: THREE.Vector3[];
  pathIndex: number;
  paused: boolean;
  bound: boolean;
  pulseTime: number;
  originalColor: THREE.Color;
  glowMesh: THREE.Mesh;
}

export interface Ribosome {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
}

export interface Mark {
  id: string;
  organelle: Organelle;
  color: THREE.Color;
  markerMesh: THREE.Mesh;
  line: THREE.Line;
  name: string;
}

export interface PulseGlow {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export type DisplayMode = 'solid' | 'wireframe' | 'transparent';

export class CellScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public organelles: Organelle[] = [];
  public mRNAParticles: MRNA[] = [];
  public ribosomes: Ribosome[] = [];
  public marks: Mark[] = [];
  public pulseGlows: PulseGlow[] = [];
  public cellMembrane: THREE.Mesh | null = null;
  public starField: THREE.Points | null = null;
  public cytoplasm: THREE.Mesh | null = null;

  private clock: THREE.Clock = new THREE.Clock();
  private particleTimer: number = 0;
  private transportActive: boolean = false;
  private displayMode: DisplayMode = 'solid';
  private readonly MARK_COLORS = [
    0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181, 0xaa96da
  ];

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 18);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.createLighting();
    this.createStarField();
    this.createCellMembrane();
    this.createCytoplasm();
    this.createNucleus();
    this.createMitochondria();
    this.createEndoplasmicReticulum();
    this.createGolgiApparatus();
    this.createRibosomes();

    window.addEventListener('resize', () => this.onResize(container));
  }

  private createLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 7);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-5, -3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xff00ff, 0.5, 30);
    rimLight.position.set(-8, 5, -8);
    this.scene.add(rimLight);

    const innerLight = new THREE.PointLight(0x6666ff, 0.6, 15);
    innerLight.position.set(0, 0, 0);
    this.scene.add(innerLight);
  }

  private createStarField(): void {
    const starCount = 100;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const phases = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      sizes[i] = 0.3 + Math.random() * 1.2;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xffffff) }
      },
      vertexShader: `
        attribute float size;
        attribute float phase;
        uniform float time;
        varying float vAlpha;
        void main() {
          vAlpha = 0.5 + 0.5 * sin(time * 0.5 + phase);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * vAlpha;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starField = new THREE.Points(geometry, material);
    this.starField.userData.shaderMaterial = material;
    this.scene.add(this.starField);
  }

  private createCellMembrane(): void {
    const geometry = new THREE.SphereGeometry(8, 64, 64);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
      depthWrite: false
    });
    this.cellMembrane = new THREE.Mesh(geometry, material);
    this.cellMembrane.renderOrder = -10;
    this.scene.add(this.cellMembrane);
  }

  private createCytoplasm(): void {
    const geometry = new THREE.SphereGeometry(7.8, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x2a2a5e,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.cytoplasm = new THREE.Mesh(geometry, material);
    this.cytoplasm.renderOrder = -5;
    this.scene.add(this.cytoplasm);
  }

  private createBumpySphere(radius: number, color: number, bumpScale: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 48, 48);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);
      const nx = x / len;
      const ny = y / len;
      const nz = z / len;
      const noise = (Math.sin(nx * 8 + ny * 6) + Math.cos(ny * 7 + nz * 5) + Math.sin(nz * 9 + nx * 4)) / 3;
      const newRadius = radius + noise * bumpScale;
      positions.setXYZ(i, nx * newRadius, ny * newRadius, nz * newRadius);
    }
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.1
    });
    return new THREE.Mesh(geometry, material);
  }

  private createNucleus(): void {
    const nucleus = this.createBumpySphere(2.5, 0x4a1a7a, 0.15);
    nucleus.position.set(0, 0, 0);

    const nucleolusGeo = new THREE.SphereGeometry(0.8, 24, 24);
    const nucleolusMat = new THREE.MeshStandardMaterial({
      color: 0x6b2d9b,
      roughness: 0.8
    });
    const nucleolus = new THREE.Mesh(nucleolusGeo, nucleolusMat);
    nucleolus.position.set(0.6, -0.4, 0.5);
    nucleus.add(nucleolus);

    this.scene.add(nucleus);

    this.organelles.push({
      name: '细胞核',
      description: '细胞核是细胞的控制中心，含有遗传物质DNA，负责基因表达和细胞周期的调控。核膜是双层膜结构，上面有核孔允许物质进出。核仁是核糖体合成的场所。',
      mesh: nucleus,
      type: 'nucleus',
      rotationSpeed: 0.1,
      originalPosition: nucleus.position.clone(),
      originalScale: nucleus.scale.clone()
    });
  }

  private createSingleMitochondrion(color: number, highlight: boolean): THREE.Group {
    const group = new THREE.Group();

    const outerGeo = new THREE.SphereGeometry(1, 32, 16);
    const scaleMatrix = new THREE.Matrix4().makeScale(0.6, 1.2, 0.5);
    outerGeo.applyMatrix4(scaleMatrix);

    const outerMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.2,
      emissive: highlight ? 0x331100 : 0x000000,
      emissiveIntensity: highlight ? 0.5 : 0
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    group.add(outer);

    const innerGeo = new THREE.SphereGeometry(1, 24, 12);
    innerGeo.applyMatrix4(new THREE.Matrix4().makeScale(0.45, 0.95, 0.35));
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      roughness: 0.6,
      transparent: true,
      opacity: 0.6
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    group.add(inner);

    for (let i = 0; i < 4; i++) {
      const cristaeGeo = new THREE.TorusGeometry(0.35, 0.03, 8, 16);
      const cristaeMat = new THREE.MeshStandardMaterial({
        color: 0xff4400,
        roughness: 0.4
      });
      const cristae = new THREE.Mesh(cristaeGeo, cristaeMat);
      cristae.rotation.x = Math.PI / 2;
      cristae.position.y = -0.6 + i * 0.35;
      cristae.scale.set(1, 0.8, 0.5);
      group.add(cristae);
    }

    return group;
  }

  private createMitochondria(): void {
    const positions = [
      { x: 4.5, y: 1.5, z: 2, highlight: true },
      { x: -3, y: 3, z: -2, highlight: false },
      { x: 2, y: -3.5, z: 3, highlight: true },
      { x: -4, y: -1, z: 3.5, highlight: false },
      { x: 5, y: -2, z: -1.5, highlight: false },
      { x: -2, y: 2, z: -4, highlight: false }
    ];

    positions.forEach((pos, index) => {
      const color = pos.highlight ? 0xff6633 : 0xcc3333;
      const group = this.createSingleMitochondrion(color, pos.highlight);

      group.position.set(pos.x, pos.y, pos.z);
      group.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      let mitoState: MitochondrionState | undefined;

      if (pos.highlight) {
        const childColor = 0xff8844;
        const childGroup = this.createSingleMitochondrion(childColor, true);
        childGroup.visible = false;
        childGroup.scale.copy(group.scale);
        childGroup.position.copy(group.position);
        childGroup.rotation.copy(group.rotation);
        this.scene.add(childGroup);

        const childOffset = new THREE.Vector3(0, 1.5, 0);
        childOffset.applyQuaternion(group.quaternion);

        mitoState = {
          stage: 'stretching',
          timer: Math.random() * 1.0,
          childGroup: childGroup,
          originalChildPosition: group.position.clone().add(childOffset)
        };
      }

      this.scene.add(group);

      this.organelles.push({
        name: `线粒体${index + 1}`,
        description: pos.highlight
          ? '线粒体是细胞的"动力工厂"，通过有氧呼吸将有机物转化为ATP，为细胞提供能量。该线粒体正处于分裂增殖状态。线粒体有自己的DNA，能够半自主复制。'
          : '线粒体是细胞的"动力工厂"，通过有氧呼吸将有机物转化为ATP，为细胞提供能量。线粒体有自己的DNA，能够半自主复制。内膜向内折叠形成嵴，增加了反应面积。',
        mesh: group,
        type: 'mitochondrion',
        rotationSpeed: 0.3,
        originalPosition: group.position.clone(),
        originalScale: group.scale.clone(),
        mitochondrionState: mitoState
      });
    });
  }

  private createEndoplasmicReticulum(): void {
    const group = new THREE.Group();

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 3 + Math.random() * 1.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 3;

      const sheetWidth = 1.5 + Math.random() * 1;
      const sheetHeight = 0.08;
      const sheetDepth = 1 + Math.random() * 0.8;

      const sheetGeo = new THREE.BoxGeometry(sheetWidth, sheetHeight, sheetDepth, 8, 1, 6);
      const positions = sheetGeo.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        const px = positions.getX(j);
        const pz = positions.getZ(j);
        positions.setY(j, positions.getY(j) + Math.sin(px * 2 + pz * 2) * 0.1 + Math.cos(px * 3) * 0.05);
      }
      sheetGeo.computeVertexNormals();

      const sheetMat = new THREE.MeshStandardMaterial({
        color: 0x22aa55,
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide
      });
      const sheet = new THREE.Mesh(sheetGeo, sheetMat);

      sheet.position.set(x, y, z);
      sheet.lookAt(0, y, 0);
      sheet.rotateZ((Math.random() - 0.5) * 0.5);

      group.add(sheet);
    }

    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.8 + Math.random() * 2;
      const tubeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(angle) * radius, -1, Math.sin(angle) * radius),
        new THREE.Vector3(Math.cos(angle + 0.3) * (radius + 0.5), 0, Math.sin(angle + 0.3) * (radius + 0.5)),
        new THREE.Vector3(Math.cos(angle + 0.6) * (radius + 1), 1, Math.sin(angle + 0.6) * (radius + 1))
      ]);
      const tubeGeo = new THREE.TubeGeometry(tubeCurve, 16, 0.08, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x33cc66,
        roughness: 0.7
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      group.add(tube);
    }

    this.scene.add(group);

    this.organelles.push({
      name: '内质网',
      description: '内质网是由膜连接而成的网状结构，分为粗面内质网（附着核糖体）和光面内质网。粗面内质网参与蛋白质的合成和加工，光面内质网参与脂质合成和解毒作用。内质网与核膜相连，是细胞内膜系统的重要组成部分。',
      mesh: group,
      type: 'er',
      rotationSpeed: 0.05,
      originalPosition: group.position.clone(),
      originalScale: group.scale.clone()
    });
  }

  private createGolgiApparatus(): void {
    const group = new THREE.Group();

    const cisternaeCount = 5;
    for (let i = 0; i < cisternaeCount; i++) {
      const y = -1.5 + i * 0.6;
      const scaleXZ = 1.4 - i * 0.12;
      const cisternaGeo = new THREE.CylinderGeometry(1.2 * scaleXZ, 1.4 * scaleXZ, 0.12, 48, 1, true);

      const opacity = 0.8 - i * 0.05;
      const color = new THREE.Color().setHSL(0.6, 0.7, 0.4 + i * 0.05);
      const cisternaMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.5,
        metalness: 0.1,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide
      });
      const cisterna = new THREE.Mesh(cisternaGeo, cisternaMat);
      cisterna.position.set(0, y, 0);
      cisterna.rotation.y = (i * 0.15);
      group.add(cisterna);

      for (let j = 0; j < 6; j++) {
        const angle = (j / 6) * Math.PI * 2 + i * 0.2;
        const vesicleGeo = new THREE.SphereGeometry(0.15, 12, 12);
        const vesicleMat = new THREE.MeshStandardMaterial({
          color: 0x4488ff,
          roughness: 0.5,
          transparent: true,
          opacity: 0.7
        });
        const vesicle = new THREE.Mesh(vesicleGeo, vesicleMat);
        vesicle.position.set(
          Math.cos(angle) * (1.3 * scaleXZ),
          y,
          Math.sin(angle) * (1.3 * scaleXZ)
        );
        group.add(vesicle);
      }
    }

    group.position.set(4.5, 0.5, -2);
    group.rotation.set(0.3, -0.5, 0.2);

    this.scene.add(group);

    this.organelles.push({
      name: '高尔基体',
      description: '高尔基体由一系列扁平囊泡堆叠而成，主要功能是对内质网合成的蛋白质进行加工、分类、修饰和包装，然后运送到细胞特定部位或分泌到细胞外。高尔基体还参与溶酶体的形成和植物细胞壁的构建。',
      mesh: group,
      type: 'golgi',
      rotationSpeed: 0.08,
      originalPosition: group.position.clone(),
      originalScale: group.scale.clone()
    });
  }

  private createRibosomes(): void {
    const ribosomeCount = 30;
    for (let i = 0; i < ribosomeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 3.5 + Math.random() * 3.5;

      const position = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(angle),
        radius * Math.sin(phi) * Math.sin(angle),
        radius * Math.cos(phi)
      );

      const ribosomeGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const ribosomeMat = new THREE.MeshStandardMaterial({
        color: 0x55dd88,
        emissive: 0x113322,
        emissiveIntensity: 0.3
      });
      const ribosome = new THREE.Mesh(ribosomeGeo, ribosomeMat);
      ribosome.position.copy(position);
      ribosome.userData.isRibosome = true;

      this.scene.add(ribosome);
      this.ribosomes.push({ mesh: ribosome, position });
    }
  }

  public createMRNACurvedPath(): THREE.Vector3[] {
    const startAngle = Math.random() * Math.PI * 2;
    const startPhi = Math.acos(2 * Math.random() - 1);
    const startPos = new THREE.Vector3(
      2.6 * Math.sin(startPhi) * Math.cos(startAngle),
      2.6 * Math.sin(startPhi) * Math.sin(startAngle),
      2.6 * Math.cos(startPhi)
    );

    const endAngle = startAngle + (Math.random() - 0.5) * 1.5;
    const endPhi = startPhi + (Math.random() - 0.5) * 1;
    const endPos = new THREE.Vector3(
      7.2 * Math.sin(endPhi) * Math.cos(endAngle),
      7.2 * Math.sin(endPhi) * Math.sin(endAngle),
      7.2 * Math.cos(endPhi)
    );

    const midPoint = new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);
    midPoint.x += (Math.random() - 0.5) * 3;
    midPoint.y += (Math.random() - 0.5) * 3;
    midPoint.z += (Math.random() - 0.5) * 3;

    const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);
    return curve.getPoints(50);
  }

  public spawnMRNA(): void {
    if (this.mRNAParticles.length >= 200) return;

    const path = this.createMRNACurvedPath();

    const mRNAGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const mRNAMat = new THREE.MeshStandardMaterial({
      color: 0xffdd00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5
    });
    const mRNA = new THREE.Mesh(mRNAGeo, mRNAMat);
    mRNA.position.copy(path[0]);
    mRNA.userData.isMRNA = true;

    const glowGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    mRNA.add(glow);

    this.scene.add(mRNA);

    this.mRNAParticles.push({
      mesh: mRNA,
      velocity: new THREE.Vector3(),
      path,
      pathIndex: 0,
      paused: false,
      bound: false,
      pulseTime: 0,
      originalColor: new THREE.Color(0xffdd00),
      glowMesh: glow
    });
  }

  public setTransportActive(active: boolean): void {
    this.transportActive = active;
  }

  public isTransportActive(): boolean {
    return this.transportActive;
  }

  public getDisplayMode(): DisplayMode {
    return this.displayMode;
  }

  public setDisplayMode(mode: DisplayMode): void {
    this.displayMode = mode;
    this.applyDisplayMode();
  }

  private applyDisplayMode(): void {
    this.organelles.forEach(organelle => {
      organelle.mesh.traverse(child => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (this.displayMode === 'wireframe') {
            mat.wireframe = true;
            mat.transparent = false;
            mat.opacity = 1;
          } else if (this.displayMode === 'transparent') {
            mat.wireframe = false;
            mat.transparent = true;
            mat.opacity = 0.5;
          } else {
            mat.wireframe = false;
            if (child === this.cellMembrane) {
              mat.transparent = true;
              mat.opacity = 0.3;
            } else if (organelle.type === 'golgi') {
              mat.transparent = true;
            } else {
              mat.transparent = false;
              mat.opacity = 1;
            }
          }
        }
      });
    });
  }

  public addMark(organelle: Organelle): Mark | null {
    const existing = this.marks.find(m => m.organelle === organelle);
    if (existing) return null;

    const colorIndex = Math.floor(Math.random() * this.MARK_COLORS.length);
    const color = new THREE.Color(this.MARK_COLORS[colorIndex]);

    const markerGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6
    });
    const markerMesh = new THREE.Mesh(markerGeo, markerMat);
    const markerPos = organelle.mesh.position.clone();
    const dir = markerPos.clone().normalize();
    markerPos.add(dir.multiplyScalar(1.5));
    markerMesh.position.copy(markerPos);
    this.scene.add(markerMesh);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      markerPos,
      organelle.mesh.position.clone()
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8
    });
    const line = new THREE.Line(lineGeo, lineMat);
    this.scene.add(line);

    const mark: Mark = {
      id: `mark_${Date.now()}_${Math.random()}`,
      organelle,
      color,
      markerMesh,
      line,
      name: organelle.name
    };
    this.marks.push(mark);
    return mark;
  }

  public removeMark(mark: Mark): void {
    this.scene.remove(mark.markerMesh);
    this.scene.remove(mark.line);
    const index = this.marks.indexOf(mark);
    if (index > -1) {
      this.marks.splice(index, 1);
    }
  }

  public clearAllMarks(): void {
    this.marks.forEach(mark => {
      this.scene.remove(mark.markerMesh);
      this.scene.remove(mark.line);
    });
    this.marks = [];
  }

  public getMarkColorHex(mark: Mark): string {
    return '#' + mark.color.getHexString();
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private createPulseGlow(position: THREE.Vector3, color: number): void {
    const ringGeo = new THREE.RingGeometry(0.1, 0.3, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position);
    ring.lookAt(this.camera.position);
    this.scene.add(ring);

    this.pulseGlows.push({
      mesh: ring,
      life: 0.5,
      maxLife: 0.5
    });
  }

  private updatePulseGlows(delta: number): void {
    for (let i = this.pulseGlows.length - 1; i >= 0; i--) {
      const glow = this.pulseGlows[i];
      glow.life -= delta;

      const t = 1 - glow.life / glow.maxLife;
      const scale = 1 + t * 4;
      glow.mesh.scale.setScalar(scale);
      const mat = glow.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - t;

      glow.mesh.lookAt(this.camera.position);

      if (glow.life <= 0) {
        this.scene.remove(glow.mesh);
        glow.mesh.geometry.dispose();
        (glow.mesh.material as THREE.Material).dispose();
        this.pulseGlows.splice(i, 1);
      }
    }
  }

  private updateMitochondrionDivision(organelle: Organelle, delta: number): void {
    const state = organelle.mitochondrionState!;
    state.timer += delta;

    const parent = organelle.mesh;
    const child = state.childGroup;
    const origPos = organelle.originalPosition;
    const origScale = organelle.originalScale;

    const longAxis = new THREE.Vector3(0, 1, 0);
    longAxis.applyQuaternion(parent.quaternion);

    switch (state.stage) {
      case 'stretching': {
        const dur = 0.8;
        const t = Math.min(state.timer / dur, 1);
        const eased = this.easeInOut(t);

        const stretchY = 1 + eased * 0.8;
        const shrinkXZ = 1 - eased * 0.2;
        parent.scale.set(
          origScale.x * shrinkXZ,
          origScale.y * stretchY,
          origScale.z * shrinkXZ
        );

        if (t >= 1) {
          state.stage = 'pinching';
          state.timer = 0;
        }
        break;
      }

      case 'pinching': {
        const dur = 0.6;
        const t = Math.min(state.timer / dur, 1);
        const eased = this.easeInOut(t);

        parent.scale.y = origScale.y * (1.8 - eased * 0.3);
        parent.scale.x = origScale.x * (0.8 - eased * 0.15);
        parent.scale.z = origScale.z * (0.8 - eased * 0.15);

        if (child) {
          child.visible = true;
          child.scale.copy(parent.scale);
          child.position.copy(parent.position);
          child.rotation.copy(parent.rotation);
          child.traverse(c => {
            if (c instanceof THREE.Mesh) {
              const mat = c.material as THREE.MeshStandardMaterial;
              mat.transparent = true;
              mat.opacity = eased * 0.8;
            }
          });
        }

        if (t >= 1) {
          state.stage = 'separating';
          state.timer = 0;
        }
        break;
      }

      case 'separating': {
        const dur = 0.9;
        const t = Math.min(state.timer / dur, 1);
        const eased = this.easeInOut(t);

        const separateDist = eased * 2.5;
        const parentOffset = longAxis.clone().multiplyScalar(-separateDist * 0.5);
        parent.position.copy(origPos).add(parentOffset);

        if (child) {
          const childOffset = longAxis.clone().multiplyScalar(separateDist * 0.5);
          child.position.copy(origPos).add(childOffset);
          child.rotation.copy(parent.rotation);
          child.traverse(c => {
            if (c instanceof THREE.Mesh) {
              const mat = c.material as THREE.MeshStandardMaterial;
              mat.opacity = 0.8;
            }
          });
        }

        parent.scale.y = origScale.y * (1.5 - eased * 0.5);
        parent.scale.x = origScale.x * (0.65 + eased * 0.35);
        parent.scale.z = origScale.z * (0.65 + eased * 0.35);

        if (child) {
          child.scale.copy(parent.scale);
        }

        if (t >= 1) {
          state.stage = 'recovering';
          state.timer = 0;
        }
        break;
      }

      case 'recovering': {
        const dur = 0.6;
        const t = Math.min(state.timer / dur, 1);
        const eased = this.easeInOut(t);

        const finalDist = 2.5;
        const parentOffset = longAxis.clone().multiplyScalar(-finalDist * 0.5 + (1 - eased) * 0.3);
        parent.position.copy(origPos).add(parentOffset);

        if (child) {
          const childOffset = longAxis.clone().multiplyScalar(finalDist * 0.5 - (1 - eased) * 0.3);
          child.position.copy(origPos).add(childOffset);
          child.rotation.copy(parent.rotation);
        }

        parent.scale.lerp(origScale, eased);
        if (child) {
          child.scale.lerp(origScale, eased);
          child.traverse(c => {
            if (c instanceof THREE.Mesh) {
              const mat = c.material as THREE.MeshStandardMaterial;
              mat.opacity = 0.8 + eased * 0.2;
              if (t >= 1) mat.transparent = false;
            }
          });
        }

        if (t >= 1) {
          state.stage = 'idle';
          state.timer = 0;
        }
        break;
      }

      case 'idle': {
        const dur = 0.8;
        if (state.timer >= dur) {
          state.stage = 'stretching';
          state.timer = 0;

          if (child) {
            child.visible = false;
            child.position.copy(parent.position);
          }
          parent.position.copy(origPos);
          parent.scale.copy(origScale);
        }
        break;
      }
    }
  }

  private updateMRNA(delta: number): void {
    if (this.transportActive) {
      this.particleTimer += delta;
      if (this.particleTimer >= 2) {
        this.particleTimer = 0;
        this.spawnMRNA();
      }
    }

    for (let i = this.mRNAParticles.length - 1; i >= 0; i--) {
      const mrna = this.mRNAParticles[i];

      if (mrna.paused) {
        if (mrna.pulseTime > 0) {
          mrna.pulseTime -= delta;
          const pulse = 1 + Math.sin((0.5 - mrna.pulseTime) * Math.PI * 4) * 0.3 * (mrna.pulseTime / 0.5);
          mrna.glowMesh.scale.setScalar(pulse);
          (mrna.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.3 * (mrna.pulseTime / 0.5);
        }
        continue;
      }

      const speed = 0.5 * delta * 10;
      mrna.pathIndex += speed / mrna.path.length;

      if (mrna.pathIndex >= 1) {
        this.scene.remove(mrna.mesh);
        this.mRNAParticles.splice(i, 1);
        continue;
      }

      const idx = Math.floor(mrna.pathIndex * (mrna.path.length - 1));
      const t = (mrna.pathIndex * (mrna.path.length - 1)) - idx;
      const nextIdx = Math.min(idx + 1, mrna.path.length - 1);
      const pos = mrna.path[idx].clone().lerp(mrna.path[nextIdx], t);
      mrna.mesh.position.copy(pos);

      if (!mrna.bound) {
        for (const ribosome of this.ribosomes) {
          const dist = mrna.mesh.position.distanceTo(ribosome.position);
          if (dist < 0.4) {
            mrna.bound = true;
            mrna.pulseTime = 0.5;
            const mat = mrna.mesh.material as THREE.MeshStandardMaterial;
            mat.color.setHex(0x55dd88);
            mat.emissive.setHex(0x22aa44);
            (mrna.glowMesh.material as THREE.MeshBasicMaterial).color.setHex(0x55dd88);
            this.createPulseGlow(mrna.mesh.position.clone(), 0x55ff88);
            break;
          }
        }
      }

      if (mrna.pulseTime > 0) {
        mrna.pulseTime -= delta;
        const pulse = 1 + Math.sin((0.5 - mrna.pulseTime) * Math.PI * 4) * 0.3 * (mrna.pulseTime / 0.5);
        mrna.glowMesh.scale.setScalar(pulse);
        (mrna.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.3 * (mrna.pulseTime / 0.5);
      } else {
        mrna.glowMesh.scale.setScalar(1);
        (mrna.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.2;
      }
    }
  }

  public update(): void {
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    if (this.starField) {
      this.starField.rotation.y += delta * 0.02;
      const shader = this.starField.userData.shaderMaterial as THREE.ShaderMaterial;
      if (shader && shader.uniforms) {
        shader.uniforms.time.value = time;
      }
    }

    this.organelles.forEach(organelle => {
      organelle.mesh.rotation.y += organelle.rotationSpeed * delta;
      if (organelle.type === 'mitochondrion') {
        organelle.mesh.rotation.x += organelle.rotationSpeed * 0.5 * delta;
      }

      if (organelle.type === 'mitochondrion' && organelle.mitochondrionState) {
        this.updateMitochondrionDivision(organelle, delta);
      }
    });

    this.updateMRNA(delta);
    this.updatePulseGlows(delta);

    this.marks.forEach(mark => {
      const organellePos = mark.organelle.mesh.position;
      const dir = organellePos.clone().normalize();
      const markerPos = organellePos.clone().add(dir.multiplyScalar(1.5));
      mark.markerMesh.position.copy(markerPos);
      mark.markerMesh.rotation.y += delta * 2;

      const positions = mark.line.geometry.attributes.position as THREE.BufferAttribute;
      positions.setXYZ(0, markerPos.x, markerPos.y, markerPos.z);
      positions.setXYZ(1, organellePos.x, organellePos.y, organellePos.z);
      positions.needsUpdate = true;
    });

    if (this.cytoplasm) {
      this.cytoplasm.rotation.y += delta * 0.01;
    }

    this.renderer.render(this.scene, this.camera);
  }

  public onResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  public getScreenshotDataURL(): string {
    return this.renderer.domElement.toDataURL('image/png');
  }

  public resetCamera(): void {
    this.camera.position.set(0, 0, 18);
    this.camera.lookAt(0, 0, 0);
  }
}
