import * as THREE from 'three';
import { PaintingRenderer } from './PaintingRenderer';
import type { Painting, Exhibition } from '../services/dataService';

export interface SceneManagerOptions {
  paintings: Painting[];
  exhibitions: Exhibition[];
  onPaintingClick: (painting: Painting) => void;
  onExhibitionChange: (exhibitionId: string) => void;
  onFpsUpdate?: (fps: number) => void;
}

export class SceneManager {
  private container: HTMLElement;
  private options: SceneManagerOptions;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private paintingRenderer: PaintingRenderer;
  private animationFrameId: number | null = null;
  private isDisposed: boolean = false;

  private keys: Set<string> = new Set();
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private yaw: number = 0;
  private pitch: number = 0;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseZ: number = 0;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredPaintingId: number | null = null;

  private audioContext: AudioContext | null = null;
  private lastFootstepTime: number = 0;
  private bgmOscillators: Map<string, OscillatorNode[]> = new Map();
  private bgmGains: Map<string, GainNode> = new Map();
  private currentBgmKey: string | null = null;

  private galleryLength: number = 90;
  private corridorWidth: number = 9;
  private wallHeight: number = 6;
  private currentExhibitionId: string = '';
  private collisionFlashOpacity: number = 0;

  private lastFpsUpdateTime: number = 0;
  private frameCount: number = 0;

  constructor(container: HTMLElement, options: SceneManagerOptions) {
    this.container = container;
    this.options = options;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1A1A1A);
    this.scene.fog = new THREE.Fog(0x1A1A1A, 15, 50);

    this.camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / container.clientHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 1.7, 2);
    this.camera.rotation.order = 'YXZ';

    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.cursor = 'grab';

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.paintingRenderer = new PaintingRenderer(this.scene);

    this.setupEnvironment();
    this.setupExhibitions();
    this.setupLights();
    this.paintingRenderer.setPaintings(options.paintings);
    this.setupEventListeners();
    this.initAudio();
    this.startAnimationLoop();

    setTimeout(() => {
      this.paintingRenderer.loadVisiblePaintings(this.camera.position, 20);
    }, 100);
  }

  private setupEnvironment() {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x3E2723,
      roughness: 0.85,
      metalness: 0.05
    });

    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x2A1810,
      roughness: 0.9,
      metalness: 0.0
    });

    const leftWallGeometry = new THREE.BoxGeometry(0.5, this.wallHeight, this.galleryLength);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-this.corridorWidth / 2 - 0.25, this.wallHeight / 2, this.galleryLength / 2);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWallGeometry = new THREE.BoxGeometry(0.5, this.wallHeight, this.galleryLength);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(this.corridorWidth / 2 + 0.25, this.wallHeight / 2, this.galleryLength / 2);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    const backWallGeometry = new THREE.BoxGeometry(this.corridorWidth + 1, this.wallHeight, 0.5);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, this.wallHeight / 2, -0.25);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const endWallGeometry = new THREE.BoxGeometry(this.corridorWidth + 1, this.wallHeight, 0.5);
    const endWall = new THREE.Mesh(endWallGeometry, wallMaterial);
    endWall.position.set(0, this.wallHeight / 2, this.galleryLength + 0.25);
    endWall.receiveShadow = true;
    this.scene.add(endWall);

    const ceilingGeometry = new THREE.PlaneGeometry(this.corridorWidth + 1, this.galleryLength);
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = -Math.PI / 2;
    ceiling.position.set(0, this.wallHeight, this.galleryLength / 2);
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);

    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 1024;
    floorCanvas.height = 1024;
    const fctx = floorCanvas.getContext('2d')!;
    const baseGradient = fctx.createLinearGradient(0, 0, 1024, 1024);
    baseGradient.addColorStop(0, '#6D4C35');
    baseGradient.addColorStop(0.3, '#5D4037');
    baseGradient.addColorStop(0.5, '#7A5538');
    baseGradient.addColorStop(0.7, '#5D4037');
    baseGradient.addColorStop(1, '#6D4C35');
    fctx.fillStyle = baseGradient;
    fctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const size = Math.random() * 60 + 20;
      fctx.strokeStyle = `rgba(${70 + Math.random() * 30}, ${45 + Math.random() * 20}, ${25 + Math.random() * 15}, ${0.2 + Math.random() * 0.3})`;
      fctx.lineWidth = Math.random() * 2 + 0.5;
      fctx.beginPath();
      fctx.moveTo(x, y);
      fctx.quadraticCurveTo(x + size / 2, y + Math.random() * 20 - 10, x + size, y + Math.random() * 30 - 15);
      fctx.stroke();
    }
    fctx.strokeStyle = 'rgba(212, 160, 23, 0.15)';
    fctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const pos = (i + 1) * (1024 / 9);
      fctx.beginPath();
      fctx.moveTo(pos, 0);
      fctx.lineTo(pos, 1024);
      fctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const pos = (i + 1) * (1024 / 9);
      fctx.beginPath();
      fctx.moveTo(0, pos);
      fctx.lineTo(1024, pos);
      fctx.stroke();
    }
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(4, 18);
    floorTexture.colorSpace = THREE.SRGBColorSpace;
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.6,
      metalness: 0.1
    });
    const floorGeometry = new THREE.PlaneGeometry(this.corridorWidth + 1, this.galleryLength);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, this.galleryLength / 2);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const skirtingMaterial = new THREE.MeshStandardMaterial({
      color: 0x5D3A1A,
      roughness: 0.7,
      metalness: 0.2
    });
    const leftSkirting = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.3, this.galleryLength),
      skirtingMaterial
    );
    leftSkirting.position.set(-this.corridorWidth / 2 + 0.05, 0.15, this.galleryLength / 2);
    this.scene.add(leftSkirting);

    const rightSkirting = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.3, this.galleryLength),
      skirtingMaterial
    );
    rightSkirting.position.set(this.corridorWidth / 2 - 0.05, 0.15, this.galleryLength / 2);
    this.scene.add(rightSkirting);
  }

  private setupExhibitions() {
    const archZPositions = [30, 60];
    const exhibitionColors = ['#8B4513', '#4682B4', '#9370DB'];
    const archMaterial = new THREE.MeshStandardMaterial({
      color: 0x5D4037,
      roughness: 0.8,
      metalness: 0.1
    });

    archZPositions.forEach((z, index) => {
      const archGroup = new THREE.Group();
      const pillarGeometry = new THREE.BoxGeometry(0.8, this.wallHeight, 0.6);

      const leftPillar = new THREE.Mesh(pillarGeometry, archMaterial);
      leftPillar.position.set(-3.2, this.wallHeight / 2, 0);
      leftPillar.castShadow = true;
      leftPillar.receiveShadow = true;
      archGroup.add(leftPillar);

      const rightPillar = new THREE.Mesh(pillarGeometry, archMaterial);
      rightPillar.position.set(3.2, this.wallHeight / 2, 0);
      rightPillar.castShadow = true;
      rightPillar.receiveShadow = true;
      archGroup.add(rightPillar);

      const topBeam = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 0.8, 0.6),
        archMaterial
      );
      topBeam.position.set(0, this.wallHeight - 0.4, 0);
      topBeam.castShadow = true;
      topBeam.receiveShadow = true;
      archGroup.add(topBeam);

      const curveShape = new THREE.Shape();
      curveShape.moveTo(-3.2, 0);
      curveShape.quadraticCurveTo(0, 2.5, 3.2, 0);
      curveShape.lineTo(2.8, 0);
      curveShape.quadraticCurveTo(0, 2.0, -2.8, 0);
      curveShape.lineTo(-3.2, 0);

      const curveExtrudeSettings = {
        depth: 0.6,
        bevelEnabled: false
      };

      const archCurve = new THREE.Mesh(
        new THREE.ExtrudeGeometry(curveShape, curveExtrudeSettings),
        archMaterial
      );
      archCurve.position.set(0, this.wallHeight - 1.2, -0.3);
      archCurve.rotation.x = 0;
      archCurve.castShadow = true;
      archGroup.add(archCurve);

      const plaqueCanvas = document.createElement('canvas');
      plaqueCanvas.width = 800;
      plaqueCanvas.height = 160;
      const pctx = plaqueCanvas.getContext('2d')!;
      const plaqueBg = pctx.createLinearGradient(0, 0, 0, 160);
      plaqueBg.addColorStop(0, '#2A1810');
      plaqueBg.addColorStop(0.5, '#3E2723');
      plaqueBg.addColorStop(1, '#2A1810');
      pctx.fillStyle = plaqueBg;
      pctx.fillRect(0, 0, 800, 160);
      pctx.strokeStyle = '#D4A017';
      pctx.lineWidth = 4;
      pctx.strokeRect(10, 10, 780, 140);
      pctx.strokeStyle = '#D4A017';
      pctx.lineWidth = 2;
      pctx.strokeRect(20, 20, 760, 120);
      pctx.fillStyle = '#D4A017';
      pctx.shadowColor = 'rgba(212, 160, 23, 0.5)';
      pctx.shadowBlur = 15;
      pctx.font = 'bold 48px "Georgia", "Times New Roman", serif';
      pctx.textAlign = 'center';
      pctx.textBaseline = 'middle';
      const nextExhibition = this.options.exhibitions[index + 1];
      if (nextExhibition) {
        pctx.fillText(nextExhibition.nameEn, 400, 65);
        pctx.font = 'bold 30px "Georgia", "Times New Roman", serif';
        pctx.fillStyle = '#F5E6D3';
        pctx.fillText(nextExhibition.name, 400, 110);
      }
      pctx.shadowBlur = 0;

      const plaqueTexture = new THREE.CanvasTexture(plaqueCanvas);
      plaqueTexture.colorSpace = THREE.SRGBColorSpace;
      const plaqueMaterial = new THREE.MeshStandardMaterial({
        map: plaqueTexture,
        roughness: 0.7,
        metalness: 0.2,
        emissive: new THREE.Color(exhibitionColors[index + 1] || '#D4A017'),
        emissiveIntensity: 0.08
      });
      const plaque = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 0.8),
        plaqueMaterial
      );
      plaque.position.set(0, this.wallHeight - 2.5, 0.31);
      archGroup.add(plaque);

      const accentLight = new THREE.PointLight(
        new THREE.Color(exhibitionColors[index + 1] || '#FFD700'),
        1.5,
        15
      );
      accentLight.position.set(0, this.wallHeight - 2.5, 1);
      this.scene.add(accentLight);

      archGroup.position.set(0, 0, z);
      this.scene.add(archGroup);
    });
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0x4A3728, 0.3);
    this.scene.add(ambient);

    const ceilingLightPositions: Array<{ x: number; z: number }> = [];
    for (let z = 8; z < this.galleryLength; z += 8) {
      ceilingLightPositions.push({ x: 0, z });
    }

    ceilingLightPositions.forEach((pos, i) => {
      const warmLight = new THREE.PointLight(0xFFD9A3, 1.2, 14, 2);
      warmLight.position.set(pos.x, this.wallHeight - 0.3, pos.z);
      warmLight.castShadow = true;
      warmLight.shadow.mapSize.width = 512;
      warmLight.shadow.mapSize.height = 512;
      warmLight.shadow.camera.near = 0.5;
      warmLight.shadow.camera.far = 20;
      warmLight.shadow.bias = -0.0005;
      this.scene.add(warmLight);
      (warmLight as any).userData.baseIntensity = 1.2;
      (warmLight as any).userData.phaseOffset = i * 0.7;

      const fixtureGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.15, 16);
      const fixtureMat = new THREE.MeshStandardMaterial({
        color: 0x1A1008,
        metalness: 0.9,
        roughness: 0.3,
        emissive: 0xFFD9A3,
        emissiveIntensity: 0.3
      });
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.set(pos.x, this.wallHeight - 0.15, pos.z);
      this.scene.add(fixture);
    });

    const directional = new THREE.DirectionalLight(0xFFF4E0, 0.25);
    directional.position.set(0, 10, -20);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 100;
    directional.shadow.camera.left = -15;
    directional.shadow.camera.right = 15;
    directional.shadow.camera.top = 50;
    directional.shadow.camera.bottom = -5;
    directional.shadow.bias = -0.001;
    this.scene.add(directional);
  }

  private setupEventListeners() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseLeave);
    canvas.addEventListener('click', this.onClick);
    canvas.addEventListener('wheel', this.onWheel, { passive: true });

    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    this.ensureAudioContext();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseZ = e.clientY;
    this.renderer.domElement.style.cursor = 'grabbing';
    this.ensureAudioContext();
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.isDragging) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseZ;
      this.yaw -= deltaX * 0.003;
      this.pitch -= deltaY * 0.002;
      this.pitch = Math.max(-0.6, Math.min(0.6, this.pitch));
      this.lastMouseX = e.clientX;
      this.lastMouseZ = e.clientY;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.updateRaycast();
  };

  private onMouseUp = () => {
    this.isDragging = false;
    this.renderer.domElement.style.cursor = 'grab';
  };

  private onMouseLeave = () => {
    this.isDragging = false;
    this.renderer.domElement.style.cursor = 'grab';
    this.hoveredPaintingId = null;
    this.paintingRenderer.setHovered(null);
  };

  private onClick = (e: MouseEvent) => {
    if (this.isDisposed) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    for (const intersect of intersects) {
      const meshData = this.paintingRenderer.getPaintingByMesh(intersect.object);
      if (meshData && meshData.group.visible) {
        this.paintingRenderer.playOpenAnimation(meshData.id);
        this.options.onPaintingClick(meshData.painting);
        return;
      }
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
  };

  private touchStartData: { x: number; y: number; startX: number; startY: number } | null = null;

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.touchStartData = {
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY
      };
      this.ensureAudioContext();
    }
    e.preventDefault();
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1 && this.touchStartData) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.touchStartData.x;
      const deltaY = touch.clientY - this.touchStartData.y;
      this.yaw -= deltaX * 0.005;
      this.pitch -= deltaY * 0.003;
      this.pitch = Math.max(-0.6, Math.min(0.6, this.pitch));
      this.touchStartData.x = touch.clientX;
      this.touchStartData.y = touch.clientY;
    }
    e.preventDefault();
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (this.touchStartData && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const dist = Math.hypot(
        touch.clientX - this.touchStartData.startX,
        touch.clientY - this.touchStartData.startY
      );
      if (dist < 10) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        for (const intersect of intersects) {
          const meshData = this.paintingRenderer.getPaintingByMesh(intersect.object);
          if (meshData && meshData.group.visible) {
            this.paintingRenderer.playOpenAnimation(meshData.id);
            this.options.onPaintingClick(meshData.painting);
            break;
          }
        }
      }
    }
    this.touchStartData = null;
  };

  private updateRaycast() {
    if (this.isDisposed) return;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    let foundId: number | null = null;

    for (const intersect of intersects) {
      const meshData = this.paintingRenderer.getPaintingByMesh(intersect.object);
      if (meshData && meshData.group.visible) {
        foundId = meshData.id;
        break;
      }
    }

    if (foundId !== this.hoveredPaintingId) {
      this.hoveredPaintingId = foundId;
      this.paintingRenderer.setHovered(foundId);
      this.renderer.domElement.style.cursor = foundId ? 'pointer' : (this.isDragging ? 'grabbing' : 'grab');
    }
  }

  private onResize = () => {
    if (this.isDisposed) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.createBgmTracks();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  private ensureAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.startBgm('renaissance');
      });
    } else if (this.audioContext && !this.currentBgmKey) {
      this.startBgm('renaissance');
    }
  }

  private createBgmTracks() {
    if (!this.audioContext) return;

    const tracks: Record<string, number[]> = {
      renaissance: [261.63, 329.63, 392.00, 523.25],
      impressionism: [293.66, 369.99, 440.00, 587.33],
      modern: [311.13, 369.99, 466.16, 622.25]
    };

    Object.entries(tracks).forEach(([key, freqs]) => {
      const oscillators: OscillatorNode[] = [];
      const masterGain = this.audioContext!.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(this.audioContext!.destination);

      freqs.forEach((freq, i) => {
        const osc = this.audioContext!.createOscillator();
        const oscGain = this.audioContext!.createGain();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        oscGain.gain.value = 0.06 + (i === 0 ? 0.04 : 0);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start();
        oscillators.push(osc);
      });

      this.bgmOscillators.set(key, oscillators);
      this.bgmGains.set(key, masterGain);
    });
  }

  private startBgm(key: string) {
    if (!this.audioContext || this.currentBgmKey === key) return;

    const fadeTime = 1.5;
    const now = this.audioContext.currentTime;

    if (this.currentBgmKey) {
      const oldGain = this.bgmGains.get(this.currentBgmKey);
      if (oldGain) {
        oldGain.gain.cancelScheduledValues(now);
        oldGain.gain.setValueAtTime(oldGain.gain.value, now);
        oldGain.gain.linearRampToValueAtTime(0, now + fadeTime);
      }
    }

    const newGain = this.bgmGains.get(key);
    if (newGain) {
      newGain.gain.cancelScheduledValues(now);
      newGain.gain.setValueAtTime(newGain.gain.value, now);
      newGain.gain.linearRampToValueAtTime(0.08, now + fadeTime);
    }

    this.currentBgmKey = key;
  }

  private playFootstep() {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120 + Math.random() * 40, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

    filter.type = 'lowpass';
    filter.frequency.value = 300;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  private updateMovement(deltaTime: number) {
    const speed = 4.0;
    const moveDir = new THREE.Vector3();
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    ).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveDir.add(forward);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveDir.sub(forward);
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveDir.add(right);
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveDir.sub(right);

    if (moveDir.length() > 0) {
      moveDir.normalize();
      const newPos = this.camera.position.clone().addScaledVector(moveDir, speed * deltaTime);

      const halfCorridor = this.corridorWidth / 2 - 0.8;
      let collided = false;

      if (newPos.x < -halfCorridor || newPos.x > halfCorridor) {
        newPos.x = Math.max(-halfCorridor, Math.min(halfCorridor, newPos.x));
        collided = true;
      }
      if (newPos.z < 1.5 || newPos.z > this.galleryLength - 1.5) {
        newPos.z = Math.max(1.5, Math.min(this.galleryLength - 1.5, newPos.z));
        collided = true;
      }

      if (collided) {
        this.collisionFlashOpacity = 0.3;
      }

      this.camera.position.copy(newPos);

      const now = performance.now();
      if (now - this.lastFootstepTime > 380) {
        this.playFootstep();
        this.lastFootstepTime = now;
      }
    }

    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    this.checkExhibitionChange();
  }

  private checkExhibitionChange() {
    const z = this.camera.position.z;
    let newExhibitionId = this.options.exhibitions[0]?.id || '';

    for (const exh of this.options.exhibitions) {
      if (z >= exh.startZ && z < exh.endZ) {
        newExhibitionId = exh.id;
        break;
      }
    }

    if (newExhibitionId && newExhibitionId !== this.currentExhibitionId) {
      this.currentExhibitionId = newExhibitionId;
      this.options.onExhibitionChange(newExhibitionId);
      this.startBgm(newExhibitionId);
      this.ensureAudioContext();
    }
  }

  private updateLighting(time: number, deltaTime: number) {
    const cyclePeriod = 30;
    const phase = (time / 1000) % cyclePeriod;
    const wave = Math.cos((phase / cyclePeriod) * Math.PI * 2);
    const exposureVariation = 0.12 * wave + 1.0;
    this.renderer.toneMappingExposure = exposureVariation;

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.PointLight && (obj as any).userData.baseIntensity) {
        const base = (obj as any).userData.baseIntensity;
        const offset = (obj as any).userData.phaseOffset || 0;
        const localWave = Math.cos(((phase + offset) / cyclePeriod) * Math.PI * 2);
        obj.intensity = base * (0.75 + 0.25 * localWave);
      }
    });

    if (this.collisionFlashOpacity > 0) {
      this.collisionFlashOpacity = Math.max(0, this.collisionFlashOpacity - deltaTime / 0.3);
    }
  }

  private collisionFlashElement: HTMLDivElement | null = null;

  private setupCollisionFlash() {
    this.collisionFlashElement = document.createElement('div');
    this.collisionFlashElement.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      background: radial-gradient(circle, transparent 40%, rgba(255, 0, 0, 0.4) 100%);
      opacity: 0;
      transition: opacity 0.1s;
      z-index: 50;
    `;
    this.container.appendChild(this.collisionFlashElement);
  }

  private startAnimationLoop() {
    this.setupCollisionFlash();
    let lastTime = performance.now();

    const animate = () => {
      if (this.isDisposed) return;
      this.animationFrameId = requestAnimationFrame(animate);

      const currentTime = performance.now();
      const delta = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      this.frameCount++;
      if (currentTime - this.lastFpsUpdateTime >= 1000) {
        const fps = this.frameCount * 1000 / (currentTime - this.lastFpsUpdateTime);
        if (this.options.onFpsUpdate) {
          this.options.onFpsUpdate(fps);
        }
        this.frameCount = 0;
        this.lastFpsUpdateTime = currentTime;
      }

      this.updateMovement(delta);
      this.paintingRenderer.update(this.camera.position, delta);
      this.updateLighting(currentTime, delta);

      if (this.collisionFlashElement) {
        this.collisionFlashElement.style.opacity = this.collisionFlashOpacity.toString();
      }

      if (this.frameCount % 30 === 0) {
        this.paintingRenderer.loadVisiblePaintings(this.camera.position, 15);
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  setCurrentExhibition(exhibitionId: string) {
    this.currentExhibitionId = exhibitionId;
    this.startBgm(exhibitionId);
  }

  teleportToExhibition(exhibitionId: string) {
    const exh = this.options.exhibitions.find(e => e.id === exhibitionId);
    if (exh) {
      const targetZ = exh.startZ + 5;
      this.camera.position.set(0, 1.7, targetZ);
      this.yaw = 0;
      this.pitch = 0;
      this.currentExhibitionId = exhibitionId;
      this.startBgm(exhibitionId);
      this.paintingRenderer.loadVisiblePaintings(this.camera.position, 20);
    }
  }

  applyFilters(filters: { author: string; startYear: number; endYear: number }) {
    this.paintingRenderer.applyFilters(filters);
  }

  dispose() {
    this.isDisposed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('mouseleave', this.onMouseLeave);
    canvas.removeEventListener('click', this.onClick);
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('touchstart', this.onTouchStart);
    canvas.removeEventListener('touchmove', this.onTouchMove);
    canvas.removeEventListener('touchend', this.onTouchEnd);

    if (this.collisionFlashElement && this.container.contains(this.collisionFlashElement)) {
      this.container.removeChild(this.collisionFlashElement);
    }

    this.paintingRenderer.dispose();

    this.bgmOscillators.forEach(oscillators => {
      oscillators.forEach(osc => {
        try { osc.stop(); } catch {}
      });
    });
    this.bgmOscillators.clear();
    this.bgmGains.clear();

    if (this.audioContext) {
      try { this.audioContext.close(); } catch {}
    }

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });

    this.renderer.dispose();
    if (canvas.parentNode === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
