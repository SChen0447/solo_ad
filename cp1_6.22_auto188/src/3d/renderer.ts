import * as THREE from 'three';
import { Globe, type NodeMeshInfo } from './globe';
import { dataFetcher, eventBus, type NodeData, type TrafficPacket } from '@data/fetch';

export class TrafficRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private globe: Globe;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging = false;
  private previousMouse = { x: 0, y: 0 };
  private isRealTime = true;
  private playSpeed = 1;
  private animationId: number | null = null;
  private fpsCounter = {
    frames: 0,
    lastTime: performance.now(),
    currentFps: 60,
  };
  private fadeInProgress = 0;
  private loadAnimationTime = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 80, 800);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.globe = new Globe(this.scene);
    this.setupLabelCanvas();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupInputHandlers();
    this.setupEventListeners();
    this.initData();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(500, 300, 500);
    this.scene.add(directional);

    const pointLight = new THREE.PointLight(0x6699ff, 0.5, 2000);
    pointLight.position.set(-500, 200, -500);
    this.scene.add(pointLight);

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 1500 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0.8,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);
  }

  private setupLabelCanvas(): void {
    const canvas = this.globe.getLabelCanvas();
    if (canvas) {
      this.container.appendChild(canvas);
      this.globe.updateLabelCanvasSize(
        this.container.clientWidth,
        this.container.clientHeight
      );
    }
  }

  private setupInputHandlers(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouse = { x: e.clientX, y: e.clientY };
    });

    dom.addEventListener('mousemove', (e) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMouse.x;
        const deltaY = e.clientY - this.previousMouse.y;
        this.globe.rotateGlobe(deltaX);
        const rotationY = deltaY * 0.005;
        this.camera.position.applyAxisAngle(
          new THREE.Vector3(1, 0, 0),
          rotationY
        );
        this.camera.lookAt(0, 0, 0);
        this.previousMouse = { x: e.clientX, y: e.clientY };
      } else {
        this.checkHover(e);
      }
    });

    dom.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    dom.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.globe.setHoveredNode(null);
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoom = e.deltaY * 0.5;
      const direction = new THREE.Vector3()
        .subVectors(this.camera.position, new THREE.Vector3(0, 0, 0))
        .normalize();
      this.camera.position.addScaledVector(direction, zoom);
      const distance = this.camera.position.length();
      if (distance < 500) {
        this.camera.position.normalize().multiplyScalar(500);
      } else if (distance > 1500) {
        this.camera.position.normalize().multiplyScalar(1500);
      }
    }, { passive: false });

    let touchStart = { x: 0, y: 0 };
    dom.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.isDragging = true;
      }
    });
    dom.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        const deltaX = e.touches[0].clientX - touchStart.x;
        const deltaY = e.touches[0].clientY - touchStart.y;
        this.globe.rotateGlobe(deltaX);
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });
    dom.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private checkHover(event: MouseEvent): void {
    const nodes = this.globe.getNodeMeshes();
    const meshes = nodes.map((n) => n.mesh);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const nodeInfo = nodes.find((n) => n.mesh === hitMesh);
      if (nodeInfo) {
        this.globe.setHoveredNode(nodeInfo, event);
        this.renderer.domElement.style.cursor = 'pointer';
        return;
      }
    }
    this.globe.setHoveredNode(null);
    this.renderer.domElement.style.cursor = 'grab';
  }

  private setupEventListeners(): void {
    eventBus.on('nodes:init', (data) => {
      const nodes = data as NodeData[];
      this.globe.updateNodes(nodes);
    });

    eventBus.on('traffic:update', (data) => {
      if (!this.isRealTime) return;
      const { nodes, packets } = data as { nodes: NodeData[]; packets: TrafficPacket[] };
      if (nodes) {
        this.globe.updateNodes(nodes);
      }
      if (packets) {
        packets.forEach((packet) => {
          this.globe.addFlowLine(packet);
        });
      }
    });

    eventBus.on('timeline:change', (data) => {
      this.isRealTime = false;
    });

    eventBus.on('timeline:release', () => {
      this.isRealTime = true;
    });

    eventBus.on('speed:change', (data) => {
      this.playSpeed = data as number;
    });

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.globe.updateLabelCanvasSize(width, height);
  }

  private async initData(): Promise<void> {
    const nodes = await dataFetcher.fetchNodes();
    if (nodes.length > 0) {
      this.globe.updateNodes(nodes);
    }
    dataFetcher.connectWS();
  }

  private updateFPS(): void {
    this.fpsCounter.frames++;
    const now = performance.now();
    const elapsed = now - this.fpsCounter.lastTime;
    if (elapsed >= 1000) {
      this.fpsCounter.currentFps = Math.round(
        (this.fpsCounter.frames * 1000) / elapsed
      );
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastTime = now;
      this.globe.updateFPS(this.fpsCounter.currentFps);
      this.updateFPSDisplay();
    }
  }

  private updateFPSDisplay(): void {
    let display = document.getElementById('fps-counter');
    if (!display) {
      display = document.createElement('div');
      display.id = 'fps-counter';
      display.style.cssText = `
        position: absolute;
        top: 16px;
        left: 16px;
        font-family: monospace;
        font-size: 14px;
        padding: 6px 12px;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        z-index: 50;
      `;
      this.container.appendChild(display);
    }
    const fps = this.fpsCounter.currentFps;
    let color = '#22c55e';
    if (fps < 30) color = '#ef4444';
    else if (fps < 55) color = '#eab308';
    display.style.color = color;
    display.textContent = `FPS: ${fps}`;
  }

  private animate = (time: number): void => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.fadeInProgress < 1) {
      this.fadeInProgress = Math.min(1, time / 1500);
      this.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.Material) {
          obj.material.transparent = true;
          obj.material.opacity = this.fadeInProgress;
        }
      });
    }

    if (time < 3000) {
      this.loadAnimationTime = time;
    }

    if (!this.isDragging && this.isRealTime) {
      this.globe.rotateGlobe(this.playSpeed * 0.5);
    }

    this.globe.update(time);
    this.globe.drawLabels(
      this.camera,
      this.container.clientWidth,
      this.container.clientHeight
    );
    this.renderer.render(this.scene, this.camera);
    this.updateFPS();
  };

  start(): void {
    this.animationId = requestAnimationFrame(this.animate);
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    dataFetcher.disconnectWS();
    window.removeEventListener('resize', this.onResize.bind(this));
  }

  applySnapshot(nodes: NodeData[], packets: TrafficPacket[]): void {
    this.globe.updateNodes(nodes);
    eventBus.emit('time:jump', null);
    packets.forEach((packet) => {
      this.globe.addFlowLine(packet);
    });
  }
}
