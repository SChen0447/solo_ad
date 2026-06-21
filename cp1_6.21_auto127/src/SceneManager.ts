import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Planet, PlanetData } from './Planet';
import { DataPanel } from './DataPanel';

export const PLANET_DATA: PlanetData[] = [
  {
    name: 'Mercury',
    nameCn: '水星',
    diameter: '4,879 km',
    period: '88 天',
    distanceFromSun: '5,790万 km',
    description: '水星是太阳系中最小的行星，也是距离太阳最近的行星。其表面布满陨石坑，与月球相似，几乎没有大气层，昼夜温差极大，白天可达430°C，夜间降至-180°C。',
    color: 0x8c7e6d,
    radius: 0.38,
    orbitSemiMajor: 8,
    orbitEccentricity: 0.205,
    orbitalPeriodDays: 88,
  },
  {
    name: 'Venus',
    nameCn: '金星',
    diameter: '12,104 km',
    period: '225 天',
    distanceFromSun: '1.082亿 km',
    description: '金星是太阳系中最热的行星，拥有浓密的二氧化碳大气层和极端的温室效应。其表面温度高达465°C，大气压是地球的92倍。金星是逆向自转的，太阳从西方升起。',
    color: 0xe8cda0,
    radius: 0.95,
    orbitSemiMajor: 12,
    orbitEccentricity: 0.007,
    orbitalPeriodDays: 225,
  },
  {
    name: 'Earth',
    nameCn: '地球',
    diameter: '12,756 km',
    period: '365.25 天',
    distanceFromSun: '1.496亿 km',
    description: '地球是太阳系中唯一已知存在生命的行星，拥有液态水和适宜的大气层。其表面71%被海洋覆盖，拥有一颗天然卫星——月球。地球磁场保护着生命免受太阳风侵害。',
    color: 0x4488cc,
    radius: 1.0,
    orbitSemiMajor: 16,
    orbitEccentricity: 0.017,
    orbitalPeriodDays: 365.25,
    textureColors: [0x1a5276, 0x2e86c1, 0x27ae60, 0x2e86c1, 0x1a5276],
  },
  {
    name: 'Mars',
    nameCn: '火星',
    diameter: '6,792 km',
    period: '687 天',
    distanceFromSun: '2.279亿 km',
    description: '火星被称为"红色星球"，其表面富含氧化铁呈现红褐色。火星拥有太阳系最高的山峰——奥林帕斯山（21.9km）和最大的峡谷——水手号峡谷。极冠由干冰和水冰组成。',
    color: 0xc1440e,
    radius: 0.53,
    orbitSemiMajor: 21,
    orbitEccentricity: 0.093,
    orbitalPeriodDays: 687,
    textureColors: [0xd4a574, 0xc1440e, 0xb5651d, 0xc1440e, 0xd4a574],
  },
  {
    name: 'Jupiter',
    nameCn: '木星',
    diameter: '142,984 km',
    period: '4,333 天',
    distanceFromSun: '7.786亿 km',
    description: '木星是太阳系中最大的行星，质量是其他行星总和的2.5倍。其标志性的大红斑是一个持续了数百年的巨型风暴。木星拥有至少95颗已知卫星，其中四颗伽利略卫星最为著名。',
    color: 0xd4a76a,
    radius: 3.5,
    orbitSemiMajor: 32,
    orbitEccentricity: 0.049,
    orbitalPeriodDays: 4333,
    textureColors: [0xc4a35a, 0xd4a76a, 0xb8924a, 0xe0c080, 0xc4a35a, 0xa88040, 0xd4a76a],
  },
  {
    name: 'Saturn',
    nameCn: '土星',
    diameter: '120,536 km',
    period: '10,759 天',
    distanceFromSun: '14.335亿 km',
    description: '土星以其壮观的环系统闻名，环主要由冰粒和岩石碎片组成，宽度达28万公里但厚度仅约10米。土星密度极低，甚至可以漂浮在水上。拥有146颗已知卫星。',
    color: 0xe8d5a3,
    radius: 2.9,
    orbitSemiMajor: 44,
    orbitEccentricity: 0.057,
    orbitalPeriodDays: 10759,
    hasRing: true,
    ringColor: 0xc8b478,
    textureColors: [0xd4c090, 0xe8d5a3, 0xc8b080, 0xe0cc98, 0xd4c090],
  },
  {
    name: 'Uranus',
    nameCn: '天王星',
    diameter: '51,118 km',
    period: '30,687 天',
    distanceFromSun: '28.725亿 km',
    description: '天王星是一颗冰巨星，其独特之处在于自转轴几乎平行于公转平面（倾斜97.8°），像是"躺着"公转。大气中的甲烷赋予它蓝绿色的外观。拥有暗淡的环系统和27颗已知卫星。',
    color: 0x7ec8e3,
    radius: 2.0,
    orbitSemiMajor: 58,
    orbitEccentricity: 0.046,
    orbitalPeriodDays: 30687,
  },
  {
    name: 'Neptune',
    nameCn: '海王星',
    diameter: '49,528 km',
    period: '60,190 天',
    distanceFromSun: '44.951亿 km',
    description: '海王星是太阳系最外层的行星，也是风速最快的行星，风速可达2,100 km/h。其深蓝色外观源于大气中的甲烷。海王星拥有16颗已知卫星，其中最大的海卫一具有逆行轨道。',
    color: 0x3355cc,
    radius: 1.9,
    orbitSemiMajor: 72,
    orbitEccentricity: 0.011,
    orbitalPeriodDays: 60190,
  },
];

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private planets: Planet[] = [];
  private sun: THREE.Group;
  private dataPanel: DataPanel;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private selectedPlanet: Planet | null = null;
  private starField: THREE.Points | null = null;
  private sunGlow: THREE.Sprite | null = null;
  private sunRotationSpeed: number = 0.1;
  private animationId: number = 0;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05050f, 0.003);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(30, 45, 60);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;
    this.controls.enablePan = true;
    this.controls.autoRotate = false;
    this.controls.target.set(0, 0, 0);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-9999, -9999);
    this.clock = new THREE.Clock();

    this.dataPanel = new DataPanel();
    this.sun = new THREE.Group();

    this.setupLighting();
    this.createStarField();
    this.createSun();
    this.createPlanets();

    this.setupEventListeners();

    this.onResize();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x1a1a3e, 0.4);
    this.scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xfff0dd, 2.5, 300, 0.5);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = false;
    this.scene.add(sunLight);

    const hemisphereLight = new THREE.HemisphereLight(0x4444aa, 0x111122, 0.15);
    this.scene.add(hemisphereLight);
  }

  private createStarField(): void {
    const starCount = 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const twinklePhase = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 300 + Math.random() * 700;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      sizes[i] = 0.5 + Math.random() * 2.0;
      twinklePhase[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(twinklePhase, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.2, 'rgba(220, 220, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(180, 180, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(150, 150, 255, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      map: texture,
      size: 1.5,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  private createSun(): void {
    const sunGeometry = new THREE.SphereGeometry(4, 48, 32);
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = 512;
    sunCanvas.height = 256;
    const sunCtx = sunCanvas.getContext('2d')!;

    const gradient = sunCtx.createRadialGradient(256, 128, 0, 256, 128, 200);
    gradient.addColorStop(0, '#ffffcc');
    gradient.addColorStop(0.3, '#ffee88');
    gradient.addColorStop(0.6, '#ffcc44');
    gradient.addColorStop(0.85, '#ff9900');
    gradient.addColorStop(1, '#ff6600');
    sunCtx.fillStyle = gradient;
    sunCtx.fillRect(0, 0, 512, 256);

    sunCtx.globalAlpha = 0.3;
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const r = 5 + Math.random() * 20;
      const spotGrad = sunCtx.createRadialGradient(x, y, 0, x, y, r);
      spotGrad.addColorStop(0, '#ffffff');
      spotGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
      sunCtx.fillStyle = spotGrad;
      sunCtx.beginPath();
      sunCtx.arc(x, y, r, 0, Math.PI * 2);
      sunCtx.fill();
    }
    sunCtx.globalAlpha = 1.0;

    const sunTexture = new THREE.CanvasTexture(sunCanvas);
    const sunMaterial = new THREE.MeshBasicMaterial({
      map: sunTexture,
    });

    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sun.add(sunMesh);

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const glowCtx = glowCanvas.getContext('2d')!;
    const glowGradient = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    glowGradient.addColorStop(0, 'rgba(255, 220, 100, 0.8)');
    glowGradient.addColorStop(0.2, 'rgba(255, 180, 60, 0.4)');
    glowGradient.addColorStop(0.5, 'rgba(255, 140, 30, 0.15)');
    glowGradient.addColorStop(0.8, 'rgba(255, 100, 10, 0.05)');
    glowGradient.addColorStop(1, 'rgba(255, 80, 0, 0.0)');
    glowCtx.fillStyle = glowGradient;
    glowCtx.fillRect(0, 0, 256, 256);

    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sunGlow = new THREE.Sprite(glowMaterial);
    this.sunGlow.scale.set(22, 22, 1);
    this.sun.add(this.sunGlow);

    const outerGlowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerGlow = new THREE.Sprite(outerGlowMaterial);
    outerGlow.scale.set(35, 35, 1);
    this.sun.add(outerGlow);

    this.scene.add(this.sun);
  }

  private createPlanets(): void {
    PLANET_DATA.forEach((data, index) => {
      const initialAngle = (index / PLANET_DATA.length) * Math.PI * 2 + Math.random() * 0.5;
      const planet = new Planet(data, initialAngle);
      this.planets.push(planet);
      this.scene.add(planet.group);
      this.scene.add(planet.orbit.line);
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());

    this.renderer.domElement.addEventListener('click', (event) => this.onClick(event));
    this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event));
  }

  private onClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const planetMeshes = this.planets.map((p) => p.mesh);
    const intersects = this.raycaster.intersectObjects(planetMeshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const planet = hitMesh.userData.planet as Planet;
      if (planet) {
        this.selectPlanet(planet);
      }
    } else {
      this.deselectPlanet();
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const planetMeshes = this.planets.map((p) => p.mesh);
    const intersects = this.raycaster.intersectObjects(planetMeshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const planet = hitMesh.userData.planet as Planet;
      if (planet) {
        this.dataPanel.updateHoverLabel(`${planet.data.nameCn} (${planet.data.name})`);
        this.renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      this.dataPanel.updateHoverLabel('');
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  private selectPlanet(planet: Planet): void {
    if (this.selectedPlanet) {
      this.selectedPlanet.deselect();
    }
    this.selectedPlanet = planet;
    planet.select();
    this.dataPanel.show(planet.data);
  }

  private deselectPlanet(): void {
    if (this.selectedPlanet) {
      this.selectedPlanet.deselect();
      this.selectedPlanet = null;
    }
    this.dataPanel.hide();
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public start(): void {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 800);
    }

    this.clock.start();
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();

    this.sun.rotation.y += this.sunRotationSpeed * delta;

    if (this.sunGlow) {
      const pulse = 1.0 + Math.sin(Date.now() * 0.002) * 0.05;
      this.sunGlow.scale.set(22 * pulse, 22 * pulse, 1);
    }

    for (const planet of this.planets) {
      planet.updatePosition(delta);
      planet.updateFlash(delta);
      planet.updateSelection(delta);
    }

    this.updateStarTwinkle();

    this.renderer.render(this.scene, this.camera);
  };

  private updateStarTwinkle(): void {
    if (!this.starField) return;
    const material = this.starField.material as THREE.PointsMaterial;
    const time = Date.now() * 0.001;
    material.opacity = 0.7 + Math.sin(time * 0.5) * 0.2;
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);

    for (const planet of this.planets) {
      planet.dispose();
    }

    this.renderer.dispose();
    this.controls.dispose();
  }
}
