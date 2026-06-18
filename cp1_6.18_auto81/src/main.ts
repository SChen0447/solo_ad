import * as THREE from 'three';
import { AtomManager, eventBus } from './atoms';
import { BondManager } from './bonds';
import { InteractionManager } from './interaction';
import { UIManager } from './ui';

class MolecularSandbox {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private atomManager!: AtomManager;
  private bondManager!: BondManager;
  private interactionManager!: InteractionManager;
  private uiManager!: UIManager;

  private moleculeGroup: THREE.Group;
  private gridHelper!: THREE.GridHelper;
  private particles!: THREE.Points;
  private particleData: { speed: THREE.Vector3; phase: number }[] = [];

  private vibrationAmount = 30;
  private rotationSpeed = 20;
  private moleculeRotation = new THREE.Euler(0, 0, 0);

  private fpsFrames = 0;
  private fpsLastTime = 0;
  private fpsCurrent = 60;

  private cameraDistance = 12;
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private cameraAngleX = 0.5;
  private cameraAngleY = 0.3;
  private isOrbiting = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor() {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    const container = document.getElementById('canvas-container')!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    container.appendChild(this.renderer.domElement);

    this.moleculeGroup = new THREE.Group();
    this.scene.add(this.moleculeGroup);

    this.setupLighting();
    this.setupBackground();
    this.setupGrid();
    this.setupParticles();

    this.atomManager = new AtomManager(this.moleculeGroup);
    this.bondManager = new BondManager(this.moleculeGroup);
    this.interactionManager = new InteractionManager(
      this.camera,
      this.scene,
      this.renderer
    );
    this.uiManager = new UIManager();

    this.setupEventListeners();
    this.addInitialMolecule();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x405080, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -15;
    mainLight.shadow.camera.right = 15;
    mainLight.shadow.camera.top = 15;
    mainLight.shadow.camera.bottom = -15;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x6080ff, 0.4);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xff8040, 0.5, 20);
    rimLight.position.set(-3, 2, 5);
    this.scene.add(rimLight);

    const cyanLight = new THREE.PointLight(0x40ffff, 0.3, 20);
    cyanLight.position.set(4, -2, -3);
    this.scene.add(cyanLight);
  }

  private setupBackground(): void {
    const bgGeometry = new THREE.SphereGeometry(100, 32, 32);
    const bgMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0a0a1a) },
        bottomColor: { value: new THREE.Color(0x1a1035) },
        offset: { value: 10 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    this.scene.add(bgMesh);
  }

  private setupGrid(): void {
    this.gridHelper = new THREE.GridHelper(30, 30, 0x304080, 0x203060);
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.15;
    this.gridHelper.position.y = -4;
    this.scene.add(this.gridHelper);
  }

  private setupParticles(): void {
    const particleCount = 80;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 8 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const colorChoice = Math.random();
      if (colorChoice < 0.5) {
        colors[i * 3] = 0.4;
        colors[i * 3 + 1] = 0.6;
        colors[i * 3 + 2] = 1;
      } else if (colorChoice < 0.8) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.7;
        colors[i * 3 + 2] = 0.4;
      } else {
        colors[i * 3] = 0.4;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      }

      sizes[i] = Math.random() * 0.08 + 0.03;

      this.particleData.push({
        speed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.3
        ),
        phase: Math.random() * Math.PI * 2
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 2 || (e.button === 0 && e.altKey)) {
        this.isOrbiting = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isOrbiting) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.cameraAngleX += dx * 0.005;
        this.cameraAngleY += dy * 0.005;
        this.cameraAngleY = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.cameraAngleY));
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.updateCameraPosition();
      }
    });

    document.addEventListener('mouseup', () => {
      this.isOrbiting = false;
    });

    this.renderer.domElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    eventBus.on('atom:create', (type, position) => {
      const atom = this.atomManager.createAtom(type, position);
      this.bondManager.registerAtom(atom);
      this.atomManager.popAnimation(atom.id);
      this.interactionManager.updateAtomMeshes(this.atomManager.getAllAtoms());
    });

    eventBus.on('camera:zoom', (delta: number) => {
      this.cameraDistance += delta * 2;
      this.cameraDistance = Math.max(4, Math.min(30, this.cameraDistance));
      this.updateCameraPosition();
    });

    eventBus.on('vibration:change', (value: number) => {
      this.vibrationAmount = value;
    });

    eventBus.on('rotation:change', (value: number) => {
      this.rotationSpeed = value;
    });

    eventBus.on('atom:hover-start', (id: string) => {
      this.atomManager.setAtomScale(id, 1.15);
    });

    eventBus.on('atom:hover-end', (id: string) => {
      this.atomManager.setAtomScale(id, 1);
    });

    eventBus.on('atom:drag-start', (id: string) => {
      this.atomManager.setAtomScale(id, 1.2);
    });

    eventBus.on('atom:drag-end', (id: string) => {
      this.atomManager.setAtomScale(id, 1);
    });

    eventBus.on('atom:get-position', (id: string, callback: (pos: THREE.Vector3) => void) => {
      const atom = this.atomManager.getAtom(id);
      if (atom) {
        callback(atom.mesh.position.clone());
      }
    });

    eventBus.on('window:resize', (_w: number, _h: number) => {
      this.onResize();
    });
  }

  private addInitialMolecule(): void {
    const baseY = 0;

    const c1 = this.atomManager.createAtom('carbon', new THREE.Vector3(0, baseY, 0));
    const c2 = this.atomManager.createAtom('carbon', new THREE.Vector3(1.5, baseY, 0));
    const o1 = this.atomManager.createAtom('oxygen', new THREE.Vector3(-1.2, baseY + 0.5, 0));
    const n1 = this.atomManager.createAtom('nitrogen', new THREE.Vector3(2.7, baseY + 0.3, 0));
    const h1 = this.atomManager.createAtom('hydrogen', new THREE.Vector3(0, baseY + 1, 0));
    const h2 = this.atomManager.createAtom('hydrogen', new THREE.Vector3(0, baseY - 1, 0));
    const h3 = this.atomManager.createAtom('hydrogen', new THREE.Vector3(2.7, baseY + 1.2, 0));
    const h4 = this.atomManager.createAtom('hydrogen', new THREE.Vector3(3.5, baseY - 0.2, 0));

    [c1, c2, o1, n1, h1, h2, h3, h4].forEach(atom => {
      this.bondManager.registerAtom(atom);
      this.atomManager.popAnimation(atom.id);
    });

    setTimeout(() => {
      eventBus.emit('bond:create', c1.id, c2.id);
      eventBus.emit('bond:create', c1.id, o1.id);
      eventBus.emit('bond:create', c2.id, n1.id);
      eventBus.emit('bond:create', c1.id, h1.id);
      eventBus.emit('bond:create', c1.id, h2.id);
      eventBus.emit('bond:create', n1.id, h3.id);
      eventBus.emit('bond:create', n1.id, h4.id);
    }, 300);

    this.interactionManager.updateAtomMeshes(this.atomManager.getAllAtoms());
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY);
    const y = this.cameraDistance * Math.sin(this.cameraAngleY);
    const z = this.cameraDistance * Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY);

    this.camera.position.set(
      this.cameraTarget.x + x,
      this.cameraTarget.y + y,
      this.cameraTarget.z + z
    );
    this.camera.lookAt(this.cameraTarget);
  }

  private onResize(): void {
    const container = document.getElementById('canvas-container')!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private updateParticles(delta: number): void {
    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    const time = Date.now() * 0.001;

    for (let i = 0; i < this.particleData.length; i++) {
      const data = this.particleData[i];
      positions[i * 3] += data.speed.x * delta * 0.5;
      positions[i * 3 + 1] += data.speed.y * delta * 0.3;
      positions[i * 3 + 2] += data.speed.z * delta * 0.5;

      const dist = Math.sqrt(
        positions[i * 3] ** 2 +
        positions[i * 3 + 1] ** 2 +
        positions[i * 3 + 2] ** 2
      );
      if (dist > 25) {
        const scale = 8 / dist;
        positions[i * 3] *= scale;
        positions[i * 3 + 1] *= scale;
        positions[i * 3 + 2] *= scale;
      }

      const colors = this.particles.geometry.attributes.color.array as Float32Array;
      const pulse = 0.5 + Math.sin(time * 2 + data.phase) * 0.5;
      colors[i * 3 + 3] = colors[i * 3] * pulse;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.moleculeRotation.y += delta * this.rotationSpeed * 0.01;
    this.moleculeGroup.rotation.y = this.moleculeRotation.y;
    this.moleculeGroup.rotation.x = Math.sin(Date.now() * 0.0003) * 0.1;

    this.atomManager.update(delta, this.vibrationAmount);
    this.bondManager.update(delta, this.vibrationAmount);
    this.updateParticles(delta);

    this.gridHelper.position.y = -4 + Math.sin(Date.now() * 0.0005) * 0.1;
    const gridMat = this.gridHelper.material as THREE.Material;
    gridMat.opacity = 0.1 + Math.sin(Date.now() * 0.001) * 0.05;

    this.renderer.render(this.scene, this.camera);

    this.updateFPS();
  }

  private updateFPS(): void {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 1000) {
      this.fpsCurrent = this.fpsFrames * 1000 / (now - this.fpsLastTime);
      this.fpsFrames = 0;
      this.fpsLastTime = now;
      this.uiManager.setFPS(this.fpsCurrent);
    }
  }

  dispose(): void {
    this.atomManager.dispose();
    this.bondManager.dispose();
    this.interactionManager.dispose();
    this.uiManager.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MolecularSandbox();
});
