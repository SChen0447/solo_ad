import * as THREE from 'three';

export interface TileData {
  mesh: THREE.Mesh;
  baseColor: THREE.Color;
  gridX: number;
  gridZ: number;
}

export class GameScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public tiles: TileData[][] = [];
  public tileSize: number = 2;
  public gap: number = 0.08;
  public gridWidth: number = 11;
  public gridDepth: number = 15;
  public startPos: THREE.Vector3;
  public endPos: THREE.Vector3;
  public endMarker: THREE.Mesh;
  public pathCoords: Array<{ x: number; z: number }> = [];

  private colorStart = new THREE.Color(0x0d1a4d);
  private colorEnd = new THREE.Color(0x8800aa);

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0d2b);
    this.scene.fog = new THREE.FogExp2(0x0d0d2b, 0.035);

    this.camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 22, 18);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupStarfield();
    this.buildMazePlatform();

    const midX = Math.floor(this.gridWidth / 2);
    let startTile: TileData | null = null;
    let endTile: TileData | null = null;
    for (let z = 0; z < this.gridDepth; z++) {
      if (!startTile && this.tiles[midX]?.[z]) startTile = this.tiles[midX][z];
    }
    for (let z = this.gridDepth - 1; z >= 0; z--) {
      if (!endTile && this.tiles[midX]?.[z]) endTile = this.tiles[midX][z];
    }
    if (!startTile) startTile = this.pathCoords.length > 0 ? this.tiles[this.pathCoords[0].x][this.pathCoords[0].z] : null;
    if (!endTile) endTile = this.pathCoords.length > 0 ? this.tiles[this.pathCoords[this.pathCoords.length - 1].x][this.pathCoords[this.pathCoords.length - 1].z] : null;

    if (!startTile || !endTile) {
      const sx = (0 - this.gridWidth / 2 + 0.5) * (this.tileSize + this.gap);
      const sz = (0 - this.gridDepth / 2 + 0.5) * (this.tileSize + this.gap);
      const ex = (0 - this.gridWidth / 2 + 0.5) * (this.tileSize + this.gap);
      const ez = (this.gridDepth - 1 - this.gridDepth / 2 + 0.5) * (this.tileSize + this.gap);
      this.startPos = new THREE.Vector3(sx, this.tileSize * 0.15 + 0.4, sz);
      this.endPos = new THREE.Vector3(ex, this.tileSize * 0.15 + 0.4, ez);
    } else {
      this.startPos = new THREE.Vector3(
        startTile.mesh.position.x,
        this.tileSize * 0.15 + 0.4,
        startTile.mesh.position.z
      );
      this.endPos = new THREE.Vector3(
        endTile.mesh.position.x,
        this.tileSize * 0.15 + 0.4,
        endTile.mesh.position.z
      );
    }
    this.endMarker = this.createEndMarker();

    window.addEventListener('resize', () => this.onResize(container));
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x4040aa, 0.5);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x6688ff, 0x220044, 0.6);
    this.scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(8, 18, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    const neonBlue = new THREE.PointLight(0x00ffc8, 1.8, 40, 1.5);
    neonBlue.position.set(-10, 6, -8);
    this.scene.add(neonBlue);

    const neonPurple = new THREE.PointLight(0xff00aa, 1.5, 40, 1.5);
    neonPurple.position.set(10, 6, 8);
    this.scene.add(neonPurple);
  }

  private setupStarfield(): void {
    const starCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) * 0.6;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.25, 0.8, 0.6 + Math.random() * 0.3);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private buildMazePlatform(): void {
    const pathPattern = this.generatePathPattern();

    for (let x = 0; x < this.gridWidth; x++) {
      this.tiles[x] = [];
      for (let z = 0; z < this.gridDepth; z++) {
        if (!pathPattern[x][z]) continue;

        this.pathCoords.push({ x, z });
        const t = (x / (this.gridWidth - 1) + z / (this.gridDepth - 1)) / 2;
        const baseColor = this.colorStart.clone().lerp(this.colorEnd, t);
        const tileColor = baseColor.clone();

        const geometry = new THREE.BoxGeometry(
          this.tileSize,
          this.tileSize * 0.3,
          this.tileSize
        );
        const material = new THREE.MeshStandardMaterial({
          color: tileColor,
          transparent: true,
          opacity: 0.78,
          metalness: 0.25,
          roughness: 0.45,
          emissive: baseColor.clone().multiplyScalar(0.15),
          side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        const worldX = (x - this.gridWidth / 2 + 0.5) * (this.tileSize + this.gap);
        const worldZ = (z - this.gridDepth / 2 + 0.5) * (this.tileSize + this.gap);
        mesh.position.set(worldX, 0, worldZ);
        mesh.receiveShadow = true;
        mesh.castShadow = true;

        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMat = new THREE.LineBasicMaterial({
          color: 0x00ffc8,
          transparent: true,
          opacity: 0.55
        });
        const edgeLines = new THREE.LineSegments(edges, edgeMat);
        mesh.add(edgeLines);

        this.scene.add(mesh);
        this.tiles[x][z] = { mesh, baseColor, gridX: x, gridZ: z };
      }
    }

    this.addStartEndMarkers();
  }

  private generatePathPattern(): boolean[][] {
    const pattern: boolean[][] = [];
    for (let x = 0; x < this.gridWidth; x++) {
      pattern[x] = [];
      for (let z = 0; z < this.gridDepth; z++) {
        pattern[x][z] = false;
      }
    }

    const midX = Math.floor(this.gridWidth / 2);
    for (let z = 0; z < this.gridDepth; z++) {
      pattern[midX][z] = true;
    }

    const branches: Array<{ startZ: number; endZ: number; dir: number; length: number }> = [
      { startZ: 1, endZ: 3, dir: -1, length: 2 },
      { startZ: 4, endZ: 6, dir: 1, length: 3 },
      { startZ: 7, endZ: 9, dir: -1, length: 2 },
      { startZ: 10, endZ: 12, dir: 1, length: 3 },
      { startZ: 2, endZ: 4, dir: 1, length: 1 },
      { startZ: 8, endZ: 10, dir: -1, length: 1 },
      { startZ: 5, endZ: 7, dir: -1, length: 1 },
      { startZ: 11, endZ: 13, dir: -1, length: 2 }
    ];

    for (const b of branches) {
      for (let z = b.startZ; z <= b.endZ; z++) {
        if (z >= 0 && z < this.gridDepth) {
          for (let step = 1; step <= b.length; step++) {
            const x = midX + b.dir * step;
            if (x >= 0 && x < this.gridWidth) {
              pattern[x][z] = true;
            }
          }
        }
      }
    }

    for (let x = 0; x < this.gridWidth; x++) {
      for (let z = 0; z < this.gridDepth; z++) {
        if (pattern[x][z]) continue;
        let hasNeighbor = false;
        if (x > 0 && pattern[x - 1][z]) hasNeighbor = true;
        if (x < this.gridWidth - 1 && pattern[x + 1][z]) hasNeighbor = true;
        if (z > 0 && pattern[x][z - 1]) hasNeighbor = true;
        if (z < this.gridDepth - 1 && pattern[x][z + 1]) hasNeighbor = true;
        if (hasNeighbor && Math.random() < 0.18) {
          pattern[x][z] = true;
        }
      }
    }

    return pattern;
  }

  private addStartEndMarkers(): void {
    const startPillar = new THREE.CylinderGeometry(0.5, 0.6, 0.15, 24);
    const startMat = new THREE.MeshStandardMaterial({
      color: 0x00ffc8,
      emissive: 0x00ffc8,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.85
    });
    const startMesh = new THREE.Mesh(startPillar, startMat);
    startMesh.position.copy(this.startPos);
    startMesh.position.y = this.tileSize * 0.15 + 0.08;
    this.scene.add(startMesh);

    const startLight = new THREE.PointLight(0x00ffc8, 1.5, 8, 1.8);
    startLight.position.copy(startMesh.position);
    startLight.position.y += 0.5;
    this.scene.add(startLight);
  }

  private createEndMarker(): THREE.Mesh {
    const endGroup = new THREE.Group();

    const pillarGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.18, 24);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xff00aa,
      emissive: 0xff00aa,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.9
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    endGroup.add(pillar);

    const torusGeo = new THREE.TorusGeometry(0.8, 0.06, 16, 48);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0xffdd00,
      emissive: 0xffdd00,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.85
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.rotation.x = Math.PI / 2;
    torus.position.y = 1.0;
    endGroup.add(torus);

    const gemGeo = new THREE.OctahedronGeometry(0.35, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xff88ff,
      emissiveIntensity: 2.0,
      metalness: 0.9,
      roughness: 0.1
    });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.y = 1.0;
    gem.userData.isGem = true;
    endGroup.add(gem);

    endGroup.position.copy(this.endPos);
    endGroup.position.y = this.tileSize * 0.15;
    this.scene.add(endGroup);

    const endLight = new THREE.PointLight(0xff00aa, 2.5, 12, 1.5);
    endLight.position.copy(endGroup.position);
    endLight.position.y += 1.5;
    this.scene.add(endLight);

    return pillar;
  }

  public getTileAt(worldX: number, worldZ: number): TileData | null {
    for (let x = 0; x < this.gridWidth; x++) {
      for (let z = 0; z < this.gridDepth; z++) {
        const tile = this.tiles[x][z];
        if (!tile) continue;
        const half = this.tileSize / 2;
        if (
          worldX >= tile.mesh.position.x - half &&
          worldX <= tile.mesh.position.x + half &&
          worldZ >= tile.mesh.position.z - half &&
          worldZ <= tile.mesh.position.z + half
        ) {
          return tile;
        }
      }
    }
    return null;
  }

  public getRandomPathPositions(count: number): THREE.Vector3[] {
    const result: THREE.Vector3[] = [];
    const shuffled = [...this.pathCoords].sort(() => Math.random() - 0.5);
    const midZ = Math.floor(this.gridDepth / 2);
    const filtered = shuffled.filter(c => Math.abs(c.z - midZ) > 1);
    for (let i = 0; i < Math.min(count, filtered.length); i++) {
      const c = filtered[i];
      const tile = this.tiles[c.x][c.z];
      if (tile) {
        result.push(new THREE.Vector3(
          tile.mesh.position.x,
          this.tileSize * 0.15 + 0.7,
          tile.mesh.position.z
        ));
      }
    }
    return result;
  }

  public animate(delta: number, elapsed: number): void {
    this.endMarker.parent?.children.forEach(child => {
      if ((child as THREE.Mesh).userData?.isGem) {
        child.rotation.y += delta * 2.0;
        child.position.y = 1.0 + Math.sin(elapsed * 2.5) * 0.15;
      }
    });
    const torus = this.endMarker.parent?.children[1] as THREE.Mesh;
    if (torus) {
      torus.rotation.z += delta * 1.2;
      torus.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.08);
    }
  }

  public updateCamera(ballPos: THREE.Vector3): void {
    const targetX = ballPos.x * 0.55;
    const targetZ = ballPos.z * 0.45 + 14;
    this.camera.position.x += (targetX - this.camera.position.x) * 0.04;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.04;
    this.camera.lookAt(ballPos.x * 0.3, 0.5, ballPos.z * 0.2);
  }

  private onResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
