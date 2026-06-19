import * as THREE from 'three';
import { GhostState, CatState, DisguiseType, DISGUISE_TYPES } from '../game/PlayerManager';
import { CollisionEvent } from '../game/CollisionSystem';

export interface SceneRendererOptions {
  container: HTMLElement;
}

interface CatRenderData {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  currentDisguise: DisguiseType | null;
  disguiseMesh: THREE.Group | null;
  particles: THREE.Points | null;
  particlePhase: number;
  isTransforming: boolean;
  transformProgress: number;
  wasDisguised: boolean;
}

interface SceneProp {
  mesh: THREE.Object3D;
  type: DisguiseType;
}

export class SceneRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private ghostCamera: THREE.PerspectiveCamera;
  private catCamera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private ghostCameraRig: THREE.Object3D;
  private catRenderers: Map<string, CatRenderData> = new Map();
  private props: SceneProp[] = [];
  private isPerspectiveMode: boolean = false;
  private perspectiveTransition: number = 0;
  private floor: THREE.Mesh | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;
  private pointLights: THREE.PointLight[] = [];
  private currentView: 'ghost' | 'cat' = 'ghost';
  private boundarySize: number = 50;
  private onCatchCallback?: (catId: string) => void;
  private caughtCats: Set<string> = new Set();
  private wallMaterial: THREE.MeshStandardMaterial | null = null;

  constructor(options: SceneRendererOptions) {
    this.container = options.container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.scene.fog = new THREE.Fog(0x0a0a0a, 20, 60);

    this.ghostCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.catCamera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.catCamera.position.set(0, 35, 20);
    this.catCamera.lookAt(0, 0, 0);

    this.ghostCameraRig = new THREE.Object3D();
    this.ghostCameraRig.add(this.ghostCamera);
    this.scene.add(this.ghostCameraRig);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupFloor();
    this.setupWalls();
    this.setupProps();
    this.setupEventListeners();
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(10, 20, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -30;
    this.directionalLight.shadow.camera.right = 30;
    this.directionalLight.shadow.camera.top = 30;
    this.directionalLight.shadow.camera.bottom = -30;
    this.scene.add(this.directionalLight);

    const neonColors = [0x00ff41, 0xff00ff, 0x00ffff, 0xff4400];
    for (let i = 0; i < 8; i++) {
      const pointLight = new THREE.PointLight(
        neonColors[i % neonColors.length],
        1.5,
        15
      );
      const angle = (i / 8) * Math.PI * 2;
      pointLight.position.set(
        Math.cos(angle) * 18,
        3,
        Math.sin(angle) * 18
      );
      this.scene.add(pointLight);
      this.pointLights.push(pointLight);
    }
  }

  private setupFloor(): void {
    const floorGeometry = new THREE.PlaneGeometry(this.boundarySize, this.boundarySize, 50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.8,
      metalness: 0.2
    });
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    const gridHelper = new THREE.GridHelper(this.boundarySize, 50, 0x00ff41, 0x004411);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    const edgeGeometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(this.boundarySize, 0.1, this.boundarySize)
    );
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x00ff41 });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.y = 0.05;
    this.scene.add(edges);
  }

  private setupWalls(): void {
    const wallHeight = 6;
    this.wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8
    });

    const wallThickness = 0.5;
    const halfSize = this.boundarySize / 2;

    const wallPositions = [
      { pos: [0, wallHeight / 2, -halfSize], size: [this.boundarySize, wallHeight, wallThickness] },
      { pos: [0, wallHeight / 2, halfSize], size: [this.boundarySize, wallHeight, wallThickness] },
      { pos: [-halfSize, wallHeight / 2, 0], size: [wallThickness, wallHeight, this.boundarySize] },
      { pos: [halfSize, wallHeight / 2, 0], size: [wallThickness, wallHeight, this.boundarySize] }
    ];

    for (const wall of wallPositions) {
      const wallGeo = new THREE.BoxGeometry(...(wall.size as [number, number, number]));
      const wallMesh = new THREE.Mesh(wallGeo, this.wallMaterial);
      wallMesh.position.set(...(wall.pos as [number, number, number]));
      wallMesh.receiveShadow = true;
      wallMesh.castShadow = true;
      this.scene.add(wallMesh);

      const edgeGeo = new THREE.EdgesGeometry(wallGeo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x00ff41, transparent: true, opacity: 0.5 });
      const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
      edgeLines.position.copy(wallMesh.position);
      this.scene.add(edgeLines);
    }
  }

  private createDisguiseMesh(type: DisguiseType): THREE.Group {
    const group = new THREE.Group();
    let mesh: THREE.Mesh;
    const color = 0x444444;

    switch (type) {
      case 'box': {
        const boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        const boxMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.3 });
        mesh = new THREE.Mesh(boxGeo, boxMat);
        mesh.position.y = 0.6;
        break;
      }
      case 'chair': {
        const seatGeo = new THREE.BoxGeometry(1, 0.1, 1);
        const seatMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.4 });
        const seat = new THREE.Mesh(seatGeo, seatMat);
        seat.position.y = 0.6;
        group.add(seat);

        const backGeo = new THREE.BoxGeometry(1, 0.8, 0.1);
        const back = new THREE.Mesh(backGeo, seatMat);
        back.position.set(0, 1.05, -0.45);
        group.add(back);

        for (let i = 0; i < 4; i++) {
          const legGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);
          const leg = new THREE.Mesh(legGeo, seatMat);
          leg.position.set(
            (i % 2 === 0 ? -0.4 : 0.4),
            0.3,
            (i < 2 ? -0.4 : 0.4)
          );
          group.add(leg);
        }
        return group;
      }
      case 'trashcan': {
        const canGeo = new THREE.CylinderGeometry(0.5, 0.45, 1.2, 16);
        const canMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.5, metalness: 0.6 });
        mesh = new THREE.Mesh(canGeo, canMat);
        mesh.position.y = 0.6;
        break;
      }
      case 'plant': {
        const potGeo = new THREE.CylinderGeometry(0.4, 0.3, 0.6, 12);
        const potMat = new THREE.MeshStandardMaterial({ color: 0x663322, roughness: 0.9 });
        const pot = new THREE.Mesh(potGeo, potMat);
        pot.position.y = 0.3;
        group.add(pot);

        const plantGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const plantMat = new THREE.MeshStandardMaterial({ color: 0x226622, roughness: 1 });
        const plant = new THREE.Mesh(plantGeo, plantMat);
        plant.position.y = 0.9;
        plant.scale.y = 1.2;
        group.add(plant);
        return group;
      }
      case 'barrel': {
        const barrelGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.3, 16);
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.7, metalness: 0.2 });
        mesh = new THREE.Mesh(barrelGeo, barrelMat);
        mesh.position.y = 0.65;
        break;
      }
      case 'crate':
      default: {
        const crateGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
        const crateMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 });
        mesh = new THREE.Mesh(crateGeo, crateMat);
        mesh.position.y = 0.55;
        break;
      }
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }

  private setupProps(): void {
    const propCount = 25;
    const types: DisguiseType[] = [...DISGUISE_TYPES];

    for (let i = 0; i < propCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const prop = this.createDisguiseMesh(type);

      let x, z;
      let valid = false;
      let attempts = 0;
      while (!valid && attempts < 20) {
        x = (Math.random() - 0.5) * (this.boundarySize - 6);
        z = (Math.random() - 0.5) * (this.boundarySize - 6);
        valid = Math.sqrt(x * x + z * z) > 5;
        attempts++;
      }

      prop.position.set(x!, 0, z!);
      prop.rotation.y = Math.random() * Math.PI * 2;
      prop.castShadow = true;
      prop.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.scene.add(prop);
      this.props.push({ mesh: prop, type });
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    this.ghostCamera.aspect = window.innerWidth / window.innerHeight;
    this.ghostCamera.updateProjectionMatrix();
    this.catCamera.aspect = window.innerWidth / window.innerHeight;
    this.catCamera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setCurrentView(view: 'ghost' | 'cat'): void {
    this.currentView = view;
  }

  initCats(cats: CatState[]): void {
    for (const catData of this.catRenderers.values()) {
      this.scene.remove(catData.mesh);
      this.scene.remove(catData.glowMesh);
      if (catData.disguiseMesh) {
        this.scene.remove(catData.disguiseMesh);
      }
      if (catData.particles) {
        this.scene.remove(catData.particles);
      }
    }
    this.catRenderers.clear();
    this.caughtCats.clear();

    for (const cat of cats) {
      const catGeo = new THREE.SphereGeometry(0.5, 16, 16);
      const catMat = new THREE.MeshStandardMaterial({
        color: 0xff00ff,
        emissive: 0x440044,
        roughness: 0.3,
        metalness: 0.7
      });
      const mesh = new THREE.Mesh(catGeo, catMat);
      mesh.castShadow = true;
      mesh.position.copy(cat.position);

      const glowGeo = new THREE.SphereGeometry(0.7, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ff41,
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.copy(cat.position);
      glowMesh.visible = false;

      this.scene.add(mesh);
      this.scene.add(glowMesh);

      this.catRenderers.set(cat.id, {
        mesh,
        glowMesh,
        currentDisguise: null,
        disguiseMesh: null,
        particles: null,
        particlePhase: 0,
        isTransforming: false,
        transformProgress: 0,
        wasDisguised: false
      });
    }
  }

  updateGhost(ghost: GhostState, deltaTime: number): void {
    this.ghostCameraRig.position.copy(ghost.position);
    this.ghostCameraRig.rotation.copy(ghost.rotation);

    const targetPerspective = ghost.isPerspectiveMode ? 1 : 0;
    this.perspectiveTransition += (targetPerspective - this.perspectiveTransition) * deltaTime * 5;
    this.isPerspectiveMode = ghost.isPerspectiveMode;
  }

  updateCats(cats: CatState[], deltaTime: number): void {
    for (const cat of cats) {
      const renderData = this.catRenderers.get(cat.id);
      if (!renderData) continue;

      if (this.caughtCats.has(cat.id)) {
        renderData.mesh.visible = false;
        renderData.glowMesh.visible = false;
        if (renderData.disguiseMesh) {
          renderData.disguiseMesh.visible = false;
        }
        continue;
      }

      if (cat.isDisguised !== renderData.wasDisguised && !renderData.isTransforming) {
        renderData.isTransforming = true;
        renderData.transformProgress = 0;
        renderData.particlePhase = 0;
        this.spawnTransformParticles(renderData, cat.position);
      }

      if (renderData.isTransforming) {
        renderData.transformProgress += deltaTime * 2;
        if (renderData.transformProgress >= 1) {
          renderData.transformProgress = 1;
          renderData.isTransforming = false;
          renderData.wasDisguised = cat.isDisguised;
          this.applyDisguise(renderData, cat.disguiseType, cat.isDisguised);
        }

        const scale = cat.isDisguised
          ? 1 - renderData.transformProgress
          : renderData.transformProgress;
        renderData.mesh.scale.setScalar(Math.max(0.01, scale));

        if (renderData.disguiseMesh && cat.isDisguised) {
          const dScale = renderData.transformProgress;
          renderData.disguiseMesh.scale.setScalar(dScale);
          renderData.disguiseMesh.visible = true;
        } else if (renderData.disguiseMesh && !cat.isDisguised) {
          const dScale = 1 - renderData.transformProgress;
          renderData.disguiseMesh.scale.setScalar(Math.max(0.01, dScale));
        }
      }

      renderData.mesh.position.copy(cat.position);
      renderData.glowMesh.position.copy(cat.position);

      if (renderData.disguiseMesh) {
        renderData.disguiseMesh.position.copy(cat.position);
        renderData.disguiseMesh.position.y = 0;
      }

      if (this.isPerspectiveMode && !cat.isDisguised) {
        renderData.glowMesh.visible = true;
        const pulse = 0.4 + Math.sin(Date.now() * 0.005) * 0.2;
        (renderData.glowMesh.material as THREE.MeshBasicMaterial).opacity = pulse * this.perspectiveTransition;
      } else if (this.isPerspectiveMode && cat.isDisguised && renderData.disguiseMesh) {
        renderData.glowMesh.visible = false;
        renderData.disguiseMesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat.emissive) {
              mat.emissive.setHex(0x00ff41);
              mat.emissiveIntensity = 0.5 * this.perspectiveTransition;
            }
          }
        });
      } else {
        renderData.glowMesh.visible = false;
        if (renderData.disguiseMesh) {
          renderData.disguiseMesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const mat = child.material as THREE.MeshStandardMaterial;
              if (mat.emissive) {
                mat.emissiveIntensity = 0;
              }
            }
          });
        }
      }

      if (renderData.particles) {
        this.updateParticles(renderData, deltaTime);
      }
    }
  }

  private spawnTransformParticles(renderData: CatRenderData, position: THREE.Vector3): void {
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = position.y + Math.random() * 1;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.5;

      const speed = 2 + Math.random() * 3;
      const angle = Math.random() * Math.PI * 2;
      const upSpeed = 1 + Math.random() * 2;
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = upSpeed;
      velocities[i * 3 + 2] = Math.sin(angle) * speed;

      const isGreen = Math.random() > 0.5;
      colors[i * 3] = isGreen ? 0 : 1;
      colors[i * 3 + 1] = isGreen ? 1 : 0;
      colors[i * 3 + 2] = isGreen ? 0.25 : 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });

    if (renderData.particles) {
      this.scene.remove(renderData.particles);
    }

    const particles = new THREE.Points(geometry, material);
    (particles as any).velocities = velocities;
    renderData.particles = particles;
    renderData.particlePhase = 0;
    this.scene.add(particles);
  }

  private updateParticles(renderData: CatRenderData, deltaTime: number): void {
    if (!renderData.particles) return;

    renderData.particlePhase += deltaTime;
    const positions = renderData.particles.geometry.attributes.position.array as Float32Array;
    const velocities = (renderData.particles as any).velocities as Float32Array;

    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3] += velocities[i * 3] * deltaTime;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime;
      velocities[i * 3 + 1] -= 5 * deltaTime;
    }

    renderData.particles.geometry.attributes.position.needsUpdate = true;

    const opacity = Math.max(0, 1 - renderData.particlePhase * 1.5);
    (renderData.particles.material as THREE.PointsMaterial).opacity = opacity;

    if (renderData.particlePhase > 1) {
      this.scene.remove(renderData.particles);
      renderData.particles = null;
    }
  }

  private applyDisguise(renderData: CatRenderData, type: DisguiseType | null, isDisguised: boolean): void {
    if (isDisguised && type) {
      if (!renderData.disguiseMesh || renderData.currentDisguise !== type) {
        if (renderData.disguiseMesh) {
          this.scene.remove(renderData.disguiseMesh);
        }
        renderData.disguiseMesh = this.createDisguiseMesh(type);
        renderData.disguiseMesh.position.copy(renderData.mesh.position);
        renderData.disguiseMesh.position.y = 0;
        this.scene.add(renderData.disguiseMesh);
      }
      renderData.currentDisguise = type;
      renderData.mesh.visible = false;
      renderData.glowMesh.visible = false;
      renderData.disguiseMesh.visible = true;
      renderData.disguiseMesh.scale.setScalar(1);
    } else {
      renderData.mesh.visible = true;
      renderData.mesh.scale.setScalar(1);
      if (renderData.disguiseMesh) {
        renderData.disguiseMesh.visible = false;
      }
    }
  }

  handleCollision(events: CollisionEvent[]): void {
    for (const event of events) {
      if (!this.caughtCats.has(event.catId)) {
        this.caughtCats.add(event.catId);
        const renderData = this.catRenderers.get(event.catId);
        if (renderData) {
          renderData.mesh.visible = false;
          renderData.glowMesh.visible = false;
          if (renderData.disguiseMesh) {
            renderData.disguiseMesh.visible = false;
          }
          this.spawnCatchEffect(renderData.mesh.position.clone());
        }
        if (this.onCatchCallback) {
          this.onCatchCallback(event.catId);
        }
      }
    }
  }

  private spawnCatchEffect(position: THREE.Vector3): void {
    const particleCount = 80;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 0.3 + Math.random() * 0.5;
      positions[i * 3] = position.x + Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = position.y + Math.sin(phi) * Math.sin(theta) * radius;
      positions[i * 3 + 2] = position.z + Math.cos(phi) * radius;

      colors[i * 3] = 0;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 0.25;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    let phase = 0;
    const animate = () => {
      phase += 0.016;
      const positions = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        const dx = positions[i * 3] - position.x;
        const dy = positions[i * 3 + 1] - position.y;
        const dz = positions[i * 3 + 2] - position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const expandSpeed = 5 + dist * 0.5;
        positions[i * 3] += (dx / dist) * expandSpeed * 0.016;
        positions[i * 3 + 1] += (dy / dist) * expandSpeed * 0.016 + 0.02;
        positions[i * 3 + 2] += (dz / dist) * expandSpeed * 0.016;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      material.opacity = Math.max(0, 1 - phase * 1.5);

      if (phase < 1.5) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(particles);
        geometry.dispose();
        material.dispose();
      }
    };
    animate();
  }

  setOnCatch(callback: (catId: string) => void): void {
    this.onCatchCallback = callback;
  }

  render(): void {
    const camera = this.currentView === 'ghost' ? this.ghostCamera : this.catCamera;
    this.renderer.render(this.scene, camera);
  }

  getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  captureFrame(): ImageData | null {
    const camera = this.currentView === 'ghost' ? this.ghostCamera : this.catCamera;
    this.renderer.render(this.scene, camera);

    const gl = this.renderer.getContext();
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    const flippedPixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = ((height - 1 - y) * width + x) * 4;
        flippedPixels[dstIdx] = pixels[srcIdx];
        flippedPixels[dstIdx + 1] = pixels[srcIdx + 1];
        flippedPixels[dstIdx + 2] = pixels[srcIdx + 2];
        flippedPixels[dstIdx + 3] = pixels[srcIdx + 3];
      }
    }

    return {
      data: new Uint8ClampedArray(flippedPixels),
      width,
      height,
      colorSpace: 'srgb' as PredefinedColorSpace
    };
  }

  update(_deltaTime: number): void {
    const time = Date.now() * 0.001;
    for (let i = 0; i < this.pointLights.length; i++) {
      const light = this.pointLights[i];
      light.intensity = 1 + Math.sin(time * 2 + i) * 0.3;
    }
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
