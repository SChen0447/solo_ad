import * as THREE from 'three';

export interface OrganelleInfo {
  name: string;
  function: string;
  color: number;
}

export interface MarkData {
  id: string;
  organelleName: string;
  color: number;
  position: THREE.Vector3;
  marker: THREE.Object3D;
  line: THREE.Line;
}

export interface MoleculeData {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  path: THREE.Vector3[];
  pathProgress: number;
  speed: number;
  state: 'moving' | 'bound' | 'paused';
  pulseStart: number;
  ribosomeBound: THREE.Mesh | null;
}

export const ORGANELLE_INFO: Record<string, OrganelleInfo> = {
  membrane: {
    name: '细胞膜',
    function: '控制物质进出细胞，维持细胞内环境稳定，由磷脂双分子层和蛋白质组成。',
    color: 0x88ccff
  },
  nucleus: {
    name: '细胞核',
    function: '储存遗传物质DNA，是细胞代谢和遗传的控制中心，通过核孔与细胞质进行物质交换。',
    color: 0x6a0dad
  },
  mitochondrion: {
    name: '线粒体',
    function: '细胞进行有氧呼吸的主要场所，被称为"动力工厂"，通过分裂进行增殖。',
    color: 0xff6347
  },
  er: {
    name: '内质网',
    function: '蛋白质和脂质合成的"车间"，分为粗面内质网（有核糖体）和滑面内质网。',
    color: 0x2ecc71
  },
  golgi: {
    name: '高尔基体',
    function: '对来自内质网的蛋白质进行加工、分类和包装的"车间"及"发送站"。',
    color: 0x3498db
  }
};

export const MARK_COLORS = [
  0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181, 0xaa96da
];

type DisplayMode = 'solid' | 'wireframe' | 'translucent';

export class CellScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public organelles: Map<string, THREE.Object3D> = new Map();
  public ribosomes: THREE.Mesh[] = [];
  public molecules: MoleculeData[] = [];
  public marks: MarkData[] = [];
  public markersGroup: THREE.Group;
  public starField: THREE.Points;

  private cellGroup: THREE.Group;
  private nucleusRotationSpeed = 0.15;
  private mitoRotationSpeed = 0.3;
  private mrnaSpawnTimer = 0;
  private wobbleAmplitude = 0.02;
  private transportActive = false;
  private displayMode: DisplayMode = 'solid';
  private clock: THREE.Clock;
  private container: HTMLElement;
  private starVertices: Float32Array;
  private starSizes: Float32Array;
  private dividingMitochondria: THREE.Group[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 25, 45);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.cellGroup = new THREE.Group();
    this.scene.add(this.cellGroup);

    this.markersGroup = new THREE.Group();
    this.scene.add(this.markersGroup);

    this.starVertices = new Float32Array(0);
    this.starSizes = new Float32Array(0);
    this.starField = this.createStarField();

    this.setupLighting();
    this.createMembrane();
    this.createNucleus();
    this.createMitochondria();
    this.createEndoplasmicReticulum();
    this.createGolgiApparatus();
    this.createRibosomes();
    this.createCytoplasm();
    this.initWobbleParams();

    this.addWindowResize();
  }

  private initWobbleParams(): void {
    this.organelles.forEach((obj, key) => {
      const freqX = 0.5 + Math.random() * 1.0;
      const freqZ = 0.5 + Math.random() * 1.0;
      const phaseX = Math.random() * Math.PI * 2;
      const phaseZ = Math.random() * Math.PI * 2;

      let spinSpeedY = 0;
      let spinSpeedX = 0;

      if (key === 'nucleus') {
        spinSpeedY = this.nucleusRotationSpeed;
      } else if (key.startsWith('mitochondrion_')) {
        spinSpeedY = this.mitoRotationSpeed;
        spinSpeedX = this.mitoRotationSpeed * 0.5;
      } else if (key === 'er') {
        spinSpeedY = 0.03;
      } else if (key === 'golgi') {
        spinSpeedY = -0.02;
      }

      obj.userData.baseRotation = obj.rotation.clone();
      obj.userData.basePosition = obj.position.clone();
      obj.userData.spinAngleY = 0;
      obj.userData.spinAngleX = 0;
      obj.userData.spinSpeedY = spinSpeedY;
      obj.userData.spinSpeedX = spinSpeedX;
      obj.userData.wobble = {
        freqX: freqX,
        freqZ: freqZ,
        phaseX: phaseX,
        phaseZ: phaseZ
      };
    });
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(10, 12, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.35);
    fillLight.position.set(-8, -4, -6);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xff6688, 0.4, 40);
    rimLight.position.set(-6, 6, -8);
    this.scene.add(rimLight);

    const innerLight = new THREE.PointLight(0x8866ff, 0.6, 25);
    innerLight.position.set(0, 0, 0);
    this.cellGroup.add(innerLight);
  }

  private createStarField(): THREE.Points {
    const starCount = 100;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 30 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      sizes[i] = 0.5 + Math.random() * 2;

      const shade = 0.6 + Math.random() * 0.4;
      colors[i * 3] = shade;
      colors[i * 3 + 1] = shade;
      colors[i * 3 + 2] = shade + Math.random() * 0.2;
    }

    this.starVertices = positions;
    this.starSizes = sizes;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vSize;
        uniform float time;
        void main() {
          vColor = color;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float twinkle = 0.8 + 0.2 * sin(time * 2.0 + position.x * 0.5);
          gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, d);
          gl_FragColor = vec4(vColor, alpha * 0.9);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
    return points;
  }

  private createMembrane(): void {
    const geometry = new THREE.SphereGeometry(8, 48, 32);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      roughness: 0.2,
      transmission: 0.9,
      thickness: 0.5,
      metalness: 0.1
    });
    const membrane = new THREE.Mesh(geometry, material);
    membrane.name = 'membrane';
    membrane.userData.organelleType = 'membrane';
    this.cellGroup.add(membrane);
    this.organelles.set('membrane', membrane);

    const wireGeo = new THREE.SphereGeometry(8.02, 24, 16);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    const wireframe = new THREE.Mesh(wireGeo, wireMat);
    membrane.add(wireframe);
  }

  private createNucleus(): void {
    const geometry = new THREE.SphereGeometry(2.5, 48, 32);
    const basePosition = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < basePosition.count; i++) {
      vertex.fromBufferAttribute(basePosition, i);
      const noise = (Math.sin(vertex.x * 3) * Math.cos(vertex.y * 3) * Math.sin(vertex.z * 3)) * 0.08;
      vertex.multiplyScalar(1 + noise);
      basePosition.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x6a0dad,
      roughness: 0.5,
      metalness: 0.2,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
      emissive: 0x2a0040,
      emissiveIntensity: 0.3
    });
    const nucleus = new THREE.Mesh(geometry, material);
    nucleus.name = 'nucleus';
    nucleus.userData.organelleType = 'nucleus';
    this.cellGroup.add(nucleus);
    this.organelles.set('nucleus', nucleus);

    const nucleolusGeo = new THREE.SphereGeometry(0.8, 24, 16);
    const nucleolusMat = new THREE.MeshPhysicalMaterial({
      color: 0x9932cc,
      roughness: 0.4,
      emissive: 0x400060,
      emissiveIntensity: 0.4
    });
    const nucleolus = new THREE.Mesh(nucleolusGeo, nucleolusMat);
    nucleolus.position.set(0.6, 0.4, 0.3);
    nucleus.add(nucleolus);

    const nucleolus2 = nucleolus.clone();
    nucleolus2.position.set(-0.5, -0.3, -0.4);
    nucleolus2.scale.setScalar(0.7);
    nucleus.add(nucleolus2);
  }

  private createMitochondria(): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const mitoGroup = this.createSingleMitochondrion();

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 4 + Math.random() * 2.5;
      const height = (Math.random() - 0.5) * 3;

      mitoGroup.position.set(
        Math.cos(angle) * dist,
        height,
        Math.sin(angle) * dist
      );
      mitoGroup.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      mitoGroup.userData.baseRotation = mitoGroup.rotation.clone();
      mitoGroup.userData.basePosition = mitoGroup.position.clone();

      this.cellGroup.add(mitoGroup);
      this.organelles.set(`mitochondrion_${i}`, mitoGroup);

      if (i < 2) {
        this.dividingMitochondria.push(mitoGroup);
        mitoGroup.userData.isDividing = true;
        mitoGroup.userData.dividePhase = Math.random() * Math.PI * 2;

        const highlightMat = new THREE.MeshBasicMaterial({
          color: 0xffff00,
          transparent: true,
          opacity: 0.3,
          side: THREE.BackSide
        });
        const highlightGeo = new THREE.SphereGeometry(1.3, 16, 12);
        const highlight = new THREE.Mesh(highlightGeo, highlightMat);
        mitoGroup.add(highlight);
        mitoGroup.userData.highlight = highlight;
      }
    }
  }

  private createSingleMitochondrion(): THREE.Group {
    const group = new THREE.Group();
    group.userData.organelleType = 'mitochondrion';

    const geometry = new THREE.SphereGeometry(1, 24, 16);
    const positionAttr = geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < positionAttr.count; i++) {
      v.fromBufferAttribute(positionAttr, i);
      v.x *= 1.6;
      v.y *= 0.7;
      v.z *= 0.8;
      const ridge = Math.sin(v.x * 6) * 0.08;
      v.multiplyScalar(1 + ridge);
      positionAttr.setXYZ(i, v.x, v.y, v.z);
    }
    geometry.computeVertexNormals();

    const gradientTexture = this.createMitoGradientTexture();

    const material = new THREE.MeshPhysicalMaterial({
      map: gradientTexture,
      color: 0xff6347,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0x550000,
      emissiveIntensity: 0.15
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    const innerGeo = new THREE.SphereGeometry(0.7, 16, 12);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xff8866,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.scale.set(1.5, 0.8, 0.9);
    group.add(inner);

    for (let ci = 0; ci < 4; ci++) {
      const cristaGeo = new THREE.PlaneGeometry(0.6, 0.3);
      const cristaMat = new THREE.MeshBasicMaterial({
        color: 0xcc4422,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const crista = new THREE.Mesh(cristaGeo, cristaMat);
      crista.position.set(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4
      );
      crista.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        0
      );
      group.add(crista);
    }

    return group;
  }

  private createMitoGradientTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, '#ff4500');
    gradient.addColorStop(0.5, '#ff6347');
    gradient.addColorStop(1, '#ffa500');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 16);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createEndoplasmicReticulum(): void {
    const erGroup = new THREE.Group();
    erGroup.name = 'er';
    erGroup.userData.organelleType = 'er';

    const discCount = 8;
    for (let i = 0; i < discCount; i++) {
      const t = i / discCount;
      const radius = 3 + t * 2.5;
      const angle = t * Math.PI * 1.5 + 0.5;

      const curvePts: THREE.Vector3[] = [];
      const segments = 20;
      for (let s = 0; s <= segments; s++) {
        const st = s / segments;
        const a = angle + st * Math.PI * 0.6;
        const r = radius + Math.sin(st * Math.PI) * 0.5;
        const y = (t - 0.5) * 3 + Math.sin(a * 2) * 0.3;
        curvePts.push(new THREE.Vector3(
          Math.cos(a) * r,
          y,
          Math.sin(a) * r
        ));
      }

      const curve = new THREE.CatmullRomCurve3(curvePts);
      const tubeGeo = new THREE.TubeGeometry(curve, 40, 0.25, 8, false);
      const tubeMat = new THREE.MeshPhysicalMaterial({
        color: 0x2ecc71,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      erGroup.add(tube);

      for (let s = 2; s < segments; s += 3) {
        const pt = curve.getPoint(s / segments);
        const sacGeo = new THREE.SphereGeometry(0.35 + Math.random() * 0.15, 16, 12);
        const sacMat = new THREE.MeshPhysicalMaterial({
          color: 0x27ae60,
          roughness: 0.4,
          transparent: true,
          opacity: 0.9
        });
        const sac = new THREE.Mesh(sacGeo, sacMat);
        sac.position.copy(pt);
        sac.position.x += (Math.random() - 0.5) * 0.2;
        erGroup.add(sac);
      }
    }

    this.cellGroup.add(erGroup);
    this.organelles.set('er', erGroup);
  }

  private createGolgiApparatus(): void {
    const golgiGroup = new THREE.Group();
    golgiGroup.name = 'golgi';
    golgiGroup.userData.organelleType = 'golgi';

    const cisternaeCount = 5;
    for (let i = 0; i < cisternaeCount; i++) {
      const t = i / (cisternaeCount - 1);
      const scaleX = 2.2 - t * 0.6;
      const scaleZ = 1.4 - t * 0.3;
      const y = (t - 0.5) * 2.2;

      const shape = new THREE.Shape();
      const pts = 24;
      for (let p = 0; p <= pts; p++) {
        const a = (p / pts) * Math.PI * 2;
        const wobble = 1 + Math.sin(a * 3 + t * 2) * 0.08;
        const px = Math.cos(a) * scaleX * wobble;
        const pz = Math.sin(a) * scaleZ * wobble;
        if (p === 0) shape.moveTo(px, pz);
        else shape.lineTo(px, pz);
      }
      shape.closePath();

      const extrudeSettings = {
        depth: 0.12,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.06,
        bevelSegments: 2
      };

      const cisternaGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const color = new THREE.Color().setHSL(0.58, 0.7, 0.5 + t * 0.1);
      const cisternaMat = new THREE.MeshPhysicalMaterial({
        color: color,
        roughness: 0.35,
        metalness: 0.15,
        transparent: true,
        opacity: 0.9
      });
      const cisterna = new THREE.Mesh(cisternaGeo, cisternaMat);
      cisterna.rotation.x = Math.PI / 2;
      cisterna.position.y = y;
      cisterna.rotation.z = t * 0.3;
      golgiGroup.add(cisterna);
    }

    for (let v = 0; v < 6; v++) {
      const vesicleGeo = new THREE.SphereGeometry(0.18 + Math.random() * 0.1, 16, 12);
      const vesicleMat = new THREE.MeshPhysicalMaterial({
        color: 0x5dade2,
        roughness: 0.4,
        transparent: true,
        opacity: 0.85
      });
      const vesicle = new THREE.Mesh(vesicleGeo, vesicleMat);
      const angle = Math.random() * Math.PI * 2;
      const dist = 1.8 + Math.random() * 0.8;
      vesicle.position.set(
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * 2.5,
        Math.sin(angle) * dist
      );
      golgiGroup.add(vesicle);
    }

    golgiGroup.position.set(-4, 1.5, 2.5);
    golgiGroup.rotation.set(0.3, 0.5, 0.2);

    this.cellGroup.add(golgiGroup);
    this.organelles.set('golgi', golgiGroup);
  }

  private createRibosomes(): void {
    const riboCount = 25;
    for (let i = 0; i < riboCount; i++) {
      const riboGeo = new THREE.SphereGeometry(0.12, 12, 8);
      const riboMat = new THREE.MeshBasicMaterial({
        color: 0x4ade80
      });
      const ribosome = new THREE.Mesh(riboGeo, riboMat);

      let position: THREE.Vector3;
      if (i < 15) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 3.5 + Math.random() * 3;
        position = new THREE.Vector3(
          Math.cos(angle) * dist,
          (Math.random() - 0.5) * 4,
          Math.sin(angle) * dist
        );
      } else {
        const erObj = this.organelles.get('er');
        if (erObj) {
          const erBox = new THREE.Box3().setFromObject(erObj);
          position = new THREE.Vector3(
            erBox.min.x + Math.random() * (erBox.max.x - erBox.min.x),
            erBox.min.y + Math.random() * (erBox.max.y - erBox.min.y),
            erBox.min.z + Math.random() * (erBox.max.z - erBox.min.z)
          );
          position.add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.6,
            (Math.random() - 0.5) * 0.6,
            (Math.random() - 0.5) * 0.6
          ));
        } else {
          position = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 10
          );
        }
      }

      ribosome.position.copy(position);
      ribosome.userData.occupied = false;
      this.cellGroup.add(ribosome);
      this.ribosomes.push(ribosome);
    }
  }

  private createCytoplasm(): void {
    const cytoGeo = new THREE.SphereGeometry(7.9, 24, 16);
    const cytoMat = new THREE.MeshBasicMaterial({
      color: 0x1a3a5a,
      transparent: true,
      side: THREE.BackSide,
      opacity: 0.08
    });
    const cytoplasm = new THREE.Mesh(cytoGeo, cytoMat);
    this.cellGroup.add(cytoplasm);
  }

  public startTransport(): void {
    this.transportActive = true;
    this.mrnaSpawnTimer = 0;
  }

  public stopTransport(): void {
    this.transportActive = false;
  }

  public isTransportActive(): boolean {
    return this.transportActive;
  }

  private spawnMRNA(): void {
    if (this.molecules.length >= 200) return;

    const nucleus = this.organelles.get('nucleus');
    if (!nucleus) return;

    const mrnaGeo = new THREE.SphereGeometry(0.15, 12, 8);
    const mrnaMat = new THREE.MeshBasicMaterial({
      color: 0xffd700
    });
    const mrna = new THREE.Mesh(mrnaGeo, mrnaMat);

    const glowGeo = new THREE.SphereGeometry(0.22, 12, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);

    const nucleusWorldPos = new THREE.Vector3();
    nucleus.getWorldPosition(nucleusWorldPos);

    const angle = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const startRadius = 2.6;
    const startPos = new THREE.Vector3(
      nucleusWorldPos.x + startRadius * Math.sin(phi) * Math.cos(angle),
      nucleusWorldPos.y + startRadius * Math.sin(phi) * Math.sin(angle),
      nucleusWorldPos.z + startRadius * Math.cos(phi)
    );
    mrna.position.copy(startPos);
    glow.position.copy(startPos);

    const endAngle = angle + (Math.random() - 0.5) * 0.5;
    const endPhi = phi + (Math.random() - 0.5) * 0.5;
    const endRadius = 7.5;
    const endPos = new THREE.Vector3(
      Math.sin(endPhi) * Math.cos(endAngle) * endRadius,
      Math.sin(endPhi) * Math.sin(endAngle) * endRadius,
      Math.cos(endPhi) * endRadius
    );

    const mid1 = startPos.clone().lerp(endPos, 0.3).add(new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ));
    const mid2 = startPos.clone().lerp(endPos, 0.6).add(new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ));

    const path: THREE.Vector3[] = [startPos.clone(), mid1, mid2, endPos];

    this.cellGroup.add(mrna);
    this.cellGroup.add(glow);

    this.molecules.push({
      mesh: mrna,
      glow: glow,
      path: path,
      pathProgress: 0,
      speed: 0.5,
      state: 'moving',
      pulseStart: 0,
      ribosomeBound: null
    });
  }

  public addMark(organelleKey: string, color: number): MarkData | null {
    const organelle = this.organelles.get(organelleKey);
    if (!organelle) return null;

    const worldPos = new THREE.Vector3();
    organelle.getWorldPosition(worldPos);

    const offsetDir = worldPos.clone().normalize().multiplyScalar(0.5);
    const markerPos = worldPos.clone().add(offsetDir);

    const markerGeo = new THREE.SphereGeometry(0.35, 16, 12);
    const markerMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.copy(markerPos);
    marker.userData.isMarker = true;

    const ringGeo = new THREE.RingGeometry(0.4, 0.5, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.lookAt(this.camera.position);
    marker.add(ring);
    marker.userData.ring = ring;

    const lineGeo = new THREE.BufferGeometry().setFromPoints([worldPos, markerPos]);
    const lineMat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8
    });
    const line = new THREE.Line(lineGeo, lineMat);

    this.markersGroup.add(marker);
    this.markersGroup.add(line);

    const markData: MarkData = {
      id: `mark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      organelleName: organelleKey,
      color: color,
      position: worldPos.clone(),
      marker: marker,
      line: line
    };

    this.marks.push(markData);
    return markData;
  }

  public removeAllMarks(): void {
    for (const mark of this.marks) {
      this.markersGroup.remove(mark.marker);
      this.markersGroup.remove(mark.line);
      const markerMesh = mark.marker as THREE.Mesh;
      if (markerMesh.geometry) markerMesh.geometry.dispose();
      const mat = markerMesh.material;
      if (mat) {
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose());
        } else {
          mat.dispose();
        }
      }
      if (mark.line.geometry) mark.line.geometry.dispose();
      const lineMat = mark.line.material;
      if (lineMat) {
        if (Array.isArray(lineMat)) {
          lineMat.forEach(m => m.dispose());
        } else {
          lineMat.dispose();
        }
      }
    }
    this.marks = [];
  }

  public setDisplayMode(mode: DisplayMode): void {
    this.displayMode = mode;

    this.cellGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.Material | THREE.Material[];
        const mats = Array.isArray(mat) ? mat : [mat];
        mats.forEach((m) => {
          const mm = m as THREE.MeshPhysicalMaterial & {
            wireframe?: boolean;
            opacity?: number;
            transparent?: boolean;
            originalOpacity?: number;
            originalWireframe?: boolean;
            originalTransparent?: boolean;
          };

          if (mm.originalOpacity === undefined) {
            mm.originalOpacity = mm.opacity ?? 1;
            mm.originalWireframe = mm.wireframe ?? false;
            mm.originalTransparent = mm.transparent ?? false;
          }

          switch (mode) {
            case 'solid':
              mm.wireframe = false;
              mm.opacity = mm.originalOpacity;
              mm.transparent = mm.originalTransparent || mm.opacity! < 1;
              break;
            case 'wireframe':
              mm.wireframe = true;
              mm.opacity = 1;
              mm.transparent = false;
              break;
            case 'translucent':
              mm.wireframe = false;
              mm.opacity = Math.min(mm.originalOpacity!, 0.5);
              mm.transparent = true;
              break;
          }

          mm.needsUpdate = true;
        });
      }
    });
  }

  public getDisplayMode(): DisplayMode {
    return this.displayMode;
  }

  public getTriangleCount(): number {
    let count = 0;
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry) {
        const geo = obj.geometry;
        const index = geo.index;
        if (index) {
          count += index.count / 3;
        } else {
          const pos = geo.attributes.position;
          if (pos) count += pos.count / 3;
        }
      }
    });
    return Math.floor(count);
  }

  public takeScreenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  private addWindowResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
  }

  public update(): void {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.organelles.forEach((obj, key) => {
      const ud = obj.userData;
      const baseRotation = ud.baseRotation as THREE.Euler;
      const basePosition = ud.basePosition as THREE.Vector3;
      const wobble = ud.wobble;

      if (!baseRotation || !wobble) return;

      ud.spinAngleY += (ud.spinSpeedY || 0) * delta;
      ud.spinAngleX += (ud.spinSpeedX || 0) * delta;

      const wobbleX = Math.sin(elapsed * wobble.freqX * Math.PI * 2 + wobble.phaseX) * this.wobbleAmplitude;
      const wobbleZ = Math.sin(elapsed * wobble.freqZ * Math.PI * 2 + wobble.phaseZ) * this.wobbleAmplitude;

      obj.rotation.x = baseRotation.x + (ud.spinAngleX || 0) + wobbleX;
      obj.rotation.y = baseRotation.y + (ud.spinAngleY || 0);
      obj.rotation.z = baseRotation.z + wobbleZ;

      if (key === 'nucleus') {
        const floatY = Math.sin(elapsed * Math.PI * 2 / 4) * 0.1;
        obj.position.y = basePosition.y + floatY;
      }

      if (key.startsWith('mitochondrion_')) {
        const floatOffset = Math.sin(elapsed * 0.8 + baseRotation.x) * 0.08;
        obj.position.y = basePosition.y + floatOffset;
      }
    });

    for (const mito of this.dividingMitochondria) {
      mito.userData.dividePhase += delta * 1.5;
      const baseScale = 1 + Math.sin(mito.userData.dividePhase) * 0.15;
      const yScale = baseScale / (1 + Math.abs(Math.sin(mito.userData.dividePhase) * 0.25));
      mito.scale.set(baseScale, yScale, baseScale);

      if (mito.userData.highlight) {
        const hl = mito.userData.highlight as THREE.Mesh;
        const hlMat = hl.material as THREE.MeshBasicMaterial;
        hlMat.opacity = 0.15 + Math.sin(mito.userData.dividePhase * 2) * 0.2;
        const hlScale = 1.3 + Math.sin(mito.userData.dividePhase * 2) * 0.2;
        hl.scale.setScalar(hlScale);
      }
    }

    if (this.transportActive) {
      this.mrnaSpawnTimer += delta;
      if (this.mrnaSpawnTimer >= 2) {
        this.spawnMRNA();
        this.mrnaSpawnTimer = 0;
      }
    }

    for (let i = this.molecules.length - 1; i >= 0; i--) {
      const mol = this.molecules[i];

      if (mol.state === 'paused') {
        continue;
      }

      if (mol.state === 'bound') {
        mol.pulseStart += delta;
        const pulse = 0.35 + Math.sin(mol.pulseStart * 10) * 0.15;
        mol.glow.scale.setScalar(1 + pulse);
        (mol.glow.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(mol.pulseStart * 8) * 0.2;

        if (mol.pulseStart > 0.5) {
          this.cellGroup.remove(mol.mesh);
          this.cellGroup.remove(mol.glow);
          mol.mesh.geometry.dispose();
          (mol.mesh.material as THREE.Material).dispose();
          mol.glow.geometry.dispose();
          (mol.glow.material as THREE.Material).dispose();

          if (mol.ribosomeBound) {
            mol.ribosomeBound.userData.occupied = false;
          }

          this.molecules.splice(i, 1);
        }
        continue;
      }

      const pathLen = mol.path.length - 1;
      const segment = Math.floor(mol.pathProgress * pathLen);
      const segmentT = (mol.pathProgress * pathLen) - segment;

      if (segment >= pathLen) {
        this.cellGroup.remove(mol.mesh);
        this.cellGroup.remove(mol.glow);
        mol.mesh.geometry.dispose();
        (mol.mesh.material as THREE.Material).dispose();
        mol.glow.geometry.dispose();
        (mol.glow.material as THREE.Material).dispose();
        this.molecules.splice(i, 1);
        continue;
      }

      const p0 = mol.path[segment];
      const p1 = mol.path[Math.min(segment + 1, mol.path.length - 1)];

      const pos = new THREE.Vector3().lerpVectors(p0, p1, segmentT);
      mol.mesh.position.copy(pos);
      mol.glow.position.copy(pos);

      mol.pathProgress += (mol.speed * delta) / 20;

      if (mol.state === 'moving' && !mol.ribosomeBound) {
        for (const ribo of this.ribosomes) {
          if (ribo.userData.occupied) continue;

          const dist = mol.mesh.position.distanceTo(ribo.position);
          if (dist < 0.5) {
            ribo.userData.occupied = true;
            mol.ribosomeBound = ribo;
            mol.state = 'bound';
            mol.pulseStart = 0;
            (mol.mesh.material as THREE.MeshBasicMaterial).color.setHex(0x4ade80);
            (mol.glow.material as THREE.MeshBasicMaterial).color.setHex(0x00ff00);
            break;
          }
        }
      }
    }

    const starMat = this.starField.material as THREE.ShaderMaterial;
    starMat.uniforms.time.value = elapsed;
    this.starField.rotation.y += delta * 0.015;

    for (const mark of this.marks) {
      const ring = mark.marker.userData.ring as THREE.Mesh;
      if (ring) {
        ring.quaternion.copy(this.camera.quaternion);
      }
    }
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
