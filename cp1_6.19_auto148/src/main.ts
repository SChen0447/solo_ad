import * as THREE from 'three';
import { TowerManager } from './towerManager';
import { EnemyManager } from './enemyManager';
import { UIManager } from './uiManager';

export type TowerType = 'laser' | 'missile' | 'electromagnetic';

export interface GameState {
  coins: number;
  lives: number;
  maxLives: number;
  wave: number;
  maxWaves: number;
  speed: number;
  gameOver: boolean;
  victory: boolean;
}

export class Game {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;
  orbitPath: THREE.CatmullRomCurve3;
  towerSlots: THREE.Mesh[] = [];
  energyCore: THREE.Group;
  coreLight: THREE.PointLight;

  towerManager: TowerManager;
  enemyManager: EnemyManager;
  uiManager: UIManager;

  gameState: GameState;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;

  selectedSlot: number | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a2e);
    this.scene.fog = new THREE.Fog(0x0a0a2e, 40, 80);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 28, 22);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    document.getElementById('game-container')!.prepend(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.orbitPath = this.createOrbitPath();
    this.energyCore = new THREE.Group();
    this.coreLight = new THREE.PointLight();

    this.gameState = {
      coins: 100,
      lives: 10,
      maxLives: 10,
      wave: 1,
      maxWaves: 10,
      speed: 1,
      gameOver: false,
      victory: false
    };

    this.towerManager = new TowerManager(this.scene, this);
    this.enemyManager = new EnemyManager(this.scene, this, this.orbitPath);
    this.uiManager = new UIManager(this);

    this.init();
  }

  init() {
    this.setupLights();
    this.createStars();
    this.createGroundGrid();
    this.createOrbitTrack();
    this.createEnergyCore();
    this.createTowerSlots();

    this.uiManager.init();

    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));
    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('#build-menu') &&
          !(e.target as HTMLElement).closest('.tower-slot-marker')) {
        this.uiManager.hideBuildMenu();
        this.selectedSlot = null;
        this.towerManager.hideAllRanges();
      }
    });

    this.enemyManager.startWave(1);
    this.animate();
  }

  setupLights() {
    const ambient = new THREE.AmbientLight(0x333355, 0.6);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0x8888ff, 0.8);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 60;
    dir.shadow.camera.left = -25;
    dir.shadow.camera.right = 25;
    dir.shadow.camera.top = 25;
    dir.shadow.camera.bottom = -25;
    this.scene.add(dir);

    const rimLight = new THREE.DirectionalLight(0xff66ff, 0.4);
    rimLight.position.set(-15, 10, -15);
    this.scene.add(rimLight);
  }

  createStars() {
    const starCount = 800;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xaaaaff),
      new THREE.Color(0xffaaee),
      new THREE.Color(0xaaffff)
    ];
    for (let i = 0; i < starCount; i++) {
      const radius = 40 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = radius * Math.cos(phi);
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });
    this.scene.add(new THREE.Points(geom, mat));
  }

  createGroundGrid() {
    const size = 60;
    const div = 30;
    const grid = new THREE.GridHelper(size, div, 0x221166, 0x1a1a4a);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.4;
    grid.position.y = -0.01;
    this.scene.add(grid);

    const diskGeom = new THREE.CircleGeometry(size / 2, 64);
    const diskMat = new THREE.MeshBasicMaterial({
      color: 0x0d0d33,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const disk = new THREE.Mesh(diskGeom, diskMat);
    disk.rotation.x = -Math.PI / 2;
    disk.position.y = -0.02;
    this.scene.add(disk);
  }

  createOrbitPath(): THREE.CatmullRomCurve3 {
    const radius = 11;
    const points: THREE.Vector3[] = [];
    const segments = 60;
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI * 2;
      const wobble = Math.sin(t * Math.PI * 6) * 0.8;
      const r = radius + wobble;
      points.push(new THREE.Vector3(
        Math.cos(angle) * r,
        0,
        Math.sin(angle) * r
      ));
    }
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.3);
    return curve;
  }

  createOrbitTrack() {
    const trackGeom = new THREE.TubeGeometry(this.orbitPath, 200, 1.0, 16, true);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x332266,
      emissive: 0x4422aa,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.85,
      roughness: 0.4,
      metalness: 0.6
    });
    const track = new THREE.Mesh(trackGeom, trackMat);
    track.receiveShadow = true;
    this.scene.add(track);

    const glowGeom = new THREE.TubeGeometry(this.orbitPath, 200, 1.4, 16, true);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x8866ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    this.scene.add(glow);

    const lineGeom = new THREE.BufferGeometry().setFromPoints(
      this.orbitPath.getPoints(300)
    );
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x8866ff,
      transparent: true,
      opacity: 0.6
    });
    const line = new THREE.Line(lineGeom, lineMat);
    this.scene.add(line);
  }

  createEnergyCore() {
    const coreGroup = new THREE.Group();

    const innerGeom = new THREE.IcosahedronGeometry(1.2, 3);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x66aaff,
      transparent: true,
      opacity: 0.9
    });
    const inner = new THREE.Mesh(innerGeom, innerMat);
    coreGroup.add(inner);

    const outerGeom = new THREE.IcosahedronGeometry(2.2, 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xaaaaff,
      transparent: true,
      opacity: 0.25,
      wireframe: true
    });
    const outer = new THREE.Mesh(outerGeom, outerMat);
    coreGroup.add(outer);

    const haloGeom = new THREE.RingGeometry(2.5, 3.0, 48);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x8888ff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.05;
    coreGroup.add(halo);

    const light = new THREE.PointLight(0x66aaff, 2.5, 25, 2);
    light.position.set(0, 1, 0);
    coreGroup.add(light);
    this.coreLight = light;

    this.energyCore = coreGroup;
    (this.energyCore as any).inner = inner;
    (this.energyCore as any).outer = outer;
    (this.energyCore as any).halo = halo;
    this.scene.add(coreGroup);
  }

  createTowerSlots() {
    const positions: { x: number; z: number }[] = [];
    const radius = 11;
    const slotAngles = [
      Math.PI * 0.05, Math.PI * 0.3, Math.PI * 0.55, Math.PI * 0.8,
      Math.PI * 1.05, Math.PI * 1.3, Math.PI * 1.55, Math.PI * 1.8
    ];
    slotAngles.forEach(angle => {
      const wobble = Math.sin((angle / (Math.PI * 2)) * Math.PI * 6) * 0.8;
      const r = radius + wobble;
      positions.push({
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r
      });
    });

    positions.forEach((pos, idx) => {
      const shape = new THREE.Shape();
      const hexR = 0.9;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * hexR;
        const py = Math.sin(a) * hexR;
        if (i === 0) shape.moveTo(px, py);
        else shape.lineTo(px, py);
      }
      shape.closePath();
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: 0.15,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2
      });
      geom.translate(0, 0, -0.075);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x8866ff,
        emissive: 0x8866ff,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.5
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(pos.x, 0.05, pos.z);
      mesh.userData = { slotIndex: idx, isSlot: true, occupied: false };
      mesh.name = 'towerSlot';
      this.scene.add(mesh);
      this.towerSlots.push(mesh);
    });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  onCanvasClick(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const slotMeshes = this.towerSlots.filter(s => !s.userData.occupied);
    const intersects = this.raycaster.intersectObjects(slotMeshes, false);
    if (intersects.length > 0) {
      const slot = intersects[0].object as THREE.Mesh;
      const idx = slot.userData.slotIndex;
      this.selectedSlot = idx;
      const screenPos = this.worldToScreen(slot.position);
      this.uiManager.showBuildMenu(screenPos.x, screenPos.y);
      this.towerManager.hideAllRanges();
      this.spawnMenuParticles(slot.position);
      return;
    }

    const towerMeshes = this.towerManager.getTowerMeshes();
    const towerHits = this.raycaster.intersectObjects(towerMeshes, true);
    if (towerHits.length > 0) {
      let obj: THREE.Object3D | null = towerHits[0].object;
      while (obj && obj.userData.towerIndex === undefined) {
        obj = obj.parent;
      }
      if (obj !== null) {
        this.towerManager.toggleRange(obj.userData.towerIndex);
      }
    }
  }

  worldToScreen(pos: THREE.Vector3): { x: number; y: number } {
    const v = pos.clone().project(this.camera);
    return {
      x: (v.x + 1) / 2 * window.innerWidth,
      y: (-v.y + 1) / 2 * window.innerHeight
    };
  }

  spawnMenuParticles(pos: THREE.Vector3) {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const geom = new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.7 + Math.random() * 0.1, 1, 0.7),
        transparent: true,
        opacity: 1
      });
      const p = new THREE.Mesh(geom, mat);
      p.position.copy(pos);
      p.position.y += 0.3;
      const angle = (i / count) * Math.PI * 2;
      const speed = 0.015 + Math.random() * 0.02;
      const dir = new THREE.Vector3(Math.cos(angle), Math.random() * 0.6 + 0.2, Math.sin(angle));
      dir.normalize().multiplyScalar(speed);
      (p as any).vel = dir;
      (p as any).life = 1.0;
      this.scene.add(p);
      const anim = () => {
        p.position.add((p as any).vel);
        (p as any).vel.y -= 0.0015;
        (p as any).life -= 0.03;
        mat.opacity = (p as any).life;
        p.scale.setScalar(Math.max(0.1, (p as any).life));
        if ((p as any).life > 0) {
          requestAnimationFrame(anim);
        } else {
          this.scene.remove(p);
          geom.dispose();
          mat.dispose();
        }
      };
      anim();
    }
  }

  buildTower(slotIndex: number, type: TowerType) {
    const slot = this.towerSlots[slotIndex];
    if (!slot || slot.userData.occupied) return false;
    const cost = this.towerManager.getTowerCost(type);
    if (this.gameState.coins < cost) return false;
    this.gameState.coins -= cost;
    this.uiManager.updateCoins();
    slot.userData.occupied = true;
    (slot.material as THREE.Material).visible = false;
    this.towerManager.createTower(slot.position, slotIndex, type);
    this.uiManager.hideBuildMenu();
    this.selectedSlot = null;
    return true;
  }

  addCoins(amount: number) {
    this.gameState.coins += amount;
    this.uiManager.updateCoins(true);
  }

  loseLife() {
    if (this.gameState.lives <= 0) return;
    this.gameState.lives--;
    this.uiManager.updateLives();
    if (this.gameState.lives <= 0) {
      this.gameState.gameOver = true;
    }
  }

  setSpeed(speed: number) {
    this.gameState.speed = speed;
  }

  checkWaveComplete(): boolean {
    return this.enemyManager.waveComplete() && this.towerManager.noProjectiles();
  }

  startNextWave() {
    if (this.gameState.wave >= this.gameState.maxWaves) {
      this.gameState.victory = true;
      return;
    }
    this.gameState.wave++;
    this.uiManager.updateWave();
    this.enemyManager.startWave(this.gameState.wave);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const rawDelta = this.clock.getDelta();
    const delta = Math.min(rawDelta, 0.05) * this.gameState.speed;
    const time = this.clock.getElapsedTime();

    if (!this.gameState.gameOver && !this.gameState.victory) {
      this.towerManager.update(delta, this.enemyManager.enemies);
      this.enemyManager.update(delta);

      if (this.checkWaveComplete()) {
        this.startNextWave();
      }
    }

    this.towerSlots.forEach((slot, i) => {
      if (!slot.userData.occupied) {
        slot.rotation.z = time * 0.6 + i * 0.5;
      }
    });

    this.energyCore.rotation.y = time * 0.3;
    const pulse = 0.5 + Math.sin(time * (Math.PI * 2 / 3)) * 0.5;
    const inner = (this.energyCore as any).inner as THREE.Mesh;
    const outer = (this.energyCore as any).outer as THREE.Mesh;
    const halo = (this.energyCore as any).halo as THREE.Mesh;
    inner.scale.setScalar(0.9 + pulse * 0.25);
    outer.scale.setScalar(0.9 + pulse * 0.15);
    outer.rotation.y = -time * 0.5;
    outer.rotation.x = time * 0.3;
    halo.scale.setScalar(0.95 + pulse * 0.3);
    (halo.material as THREE.MeshBasicMaterial).opacity = 0.2 + pulse * 0.4;
    this.coreLight.intensity = 1.5 + pulse * 2.0;

    this.renderer.render(this.scene, this.camera);
  }
}

new Game();
