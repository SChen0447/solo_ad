import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { BodyModel } from './bodyModel';
import { InteractionManager } from './interaction';

class AnatomyApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private bodyModel: BodyModel;
  private interaction: InteractionManager;
  private modelGroup: THREE.Group;
  private clock: THREE.Clock;
  private autoRotate = true;
  private lastInteractionTime = 0;
  private autoRotateSpeed = THREE.MathUtils.degToRad(1);

  private readonly initialCameraPos = new THREE.Vector3(0, 0.6, 2.8);
  private readonly initialCameraTarget = new THREE.Vector3(0, 0.4, 0);

  constructor() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.copy(this.initialCameraPos);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    const container = document.getElementById('canvas-container')!;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.copy(this.initialCameraTarget);
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 6;
    this.controls.enablePan = false;

    this.controls.addEventListener('start', () => {
      this.autoRotate = false;
      this.lastInteractionTime = this.clock.getElapsedTime();
    });

    this.controls.addEventListener('end', () => {
      this.lastInteractionTime = this.clock.getElapsedTime();
    });

    this.setupLights();

    this.bodyModel = new BodyModel();
    this.modelGroup = this.bodyModel.getGroup();
    this.scene.add(this.modelGroup);

    this.interaction = new InteractionManager(this.scene, this.camera, this.bodyModel);

    this.setupUI();
    this.setupResize();

    this.startDNALoading();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 1.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(2, 3, 4);
    dirLight.castShadow = false;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x4fc3f7, 0.5);
    fillLight.position.set(-3, 1, -2);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x7c4dff, 0.3);
    rimLight.position.set(0, -2, -3);
    this.scene.add(rimLight);
  }

  private setupUI(): void {
    const xrayBtn = document.getElementById('xray-btn')!;
    xrayBtn.addEventListener('click', () => {
      const active = this.bodyModel.toggleXray();
      xrayBtn.classList.toggle('active', active);
    });

    const resetBtn = document.getElementById('reset-btn')!;
    resetBtn.addEventListener('click', () => {
      this.resetCamera();
    });

    const panelClose = document.getElementById('panel-close')!;
    panelClose.addEventListener('click', () => {
      this.interaction.hidePanel();
    });
  }

  private resetCamera(): void {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();

    new TWEEN.Tween(startPos)
      .to({ x: this.initialCameraPos.x, y: this.initialCameraPos.y, z: this.initialCameraPos.z }, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.camera.position.copy(startPos);
      })
      .start();

    new TWEEN.Tween(startTarget)
      .to({ x: this.initialCameraTarget.x, y: this.initialCameraTarget.y, z: this.initialCameraTarget.z }, 1000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.controls.target.copy(startTarget);
      })
      .start();
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private startDNALoading(): void {
    const canvas = document.getElementById('dna-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = 120;
    canvas.height = 200;

    let angle = 0;
    const centerX = 60;
    const amplitude = 25;
    const verticalStep = 8;
    const numPairs = 20;

    const drawDNA = () => {
      ctx.clearRect(0, 0, 120, 200);

      const points1: { x: number; y: number }[] = [];
      const points2: { x: number; y: number }[] = [];

      for (let i = 0; i < numPairs; i++) {
        const y = 10 + i * verticalStep;
        const offset = angle + i * 0.3;
        const x1 = centerX + amplitude * Math.cos(offset);
        const x2 = centerX + amplitude * Math.cos(offset + Math.PI);
        points1.push({ x: x1, y });
        points2.push({ x: x2, y });
      }

      for (let i = 0; i < numPairs - 1; i++) {
        const depth1 = Math.cos(angle + i * 0.3);
        const depth2 = Math.cos(angle + i * 0.3 + Math.PI);

        ctx.beginPath();
        ctx.moveTo(points1[i]!.x, points1[i]!.y);
        ctx.lineTo(points2[i]!.x, points2[i]!.y);
        ctx.strokeStyle = depth1 > depth2
          ? `rgba(79, 195, 247, ${0.15 + 0.15 * Math.abs(depth2)})`
          : `rgba(79, 195, 247, ${0.15 + 0.15 * Math.abs(depth1)})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        const drawStrand = (pts: { x: number; y: number }[], idx: number, depth: number, color: string) => {
          ctx.beginPath();
          ctx.arc(pts[idx]!.x, pts[idx]!.y, 3, 0, Math.PI * 2);
          const alpha = 0.4 + 0.6 * (depth + 1) / 2;
          ctx.fillStyle = color.replace('1)', `${alpha})`);
          ctx.fill();
        };

        drawStrand(points1, i, depth1, 'rgba(79, 195, 247, 1)');
        drawStrand(points2, i, depth2, 'rgba(124, 77, 255, 1)');
      }

      ctx.beginPath();
      for (let i = 0; i < numPairs - 1; i++) {
        if (i === 0) {
          ctx.moveTo(points1[i]!.x, points1[i]!.y);
        } else {
          ctx.lineTo(points1[i]!.x, points1[i]!.y);
        }
      }
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < numPairs - 1; i++) {
        if (i === 0) {
          ctx.moveTo(points2[i]!.x, points2[i]!.y);
        } else {
          ctx.lineTo(points2[i]!.x, points2[i]!.y);
        }
      }
      ctx.strokeStyle = 'rgba(124, 77, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      angle += 0.06;
    };

    const loadingInterval = setInterval(drawDNA, 33);

    setTimeout(() => {
      clearInterval(loadingInterval);
      const loadingScreen = document.getElementById('loading-screen')!;
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 600);
    }, 2000);
  }

  animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    TWEEN.update();

    if (!this.autoRotate) {
      const timeSinceInteraction = elapsed - this.lastInteractionTime;
      if (timeSinceInteraction > 5) {
        this.autoRotate = true;
      }
    }

    if (this.autoRotate) {
      this.modelGroup.rotation.y += this.autoRotateSpeed * delta;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

const app = new AnatomyApp();
app.animate();
