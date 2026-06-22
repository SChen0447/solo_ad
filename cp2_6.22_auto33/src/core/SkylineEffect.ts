import * as THREE from 'three';

interface BuildingData {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

interface BuildingLight {
  light: THREE.PointLight;
  period: number;
  phase: number;
}

type ThemeType = 'sunset' | 'cyberpunk' | 'ice';

export class SkylineEffect {
  private scene: THREE.Scene;
  private skySphere: THREE.Mesh;
  private skyMaterial: THREE.ShaderMaterial;
  private theme: ThemeType;
  private buildingLights: BuildingLight[];
  private neonGrid: THREE.LineSegments | null;
  private neonMaterial: THREE.LineBasicMaterial | null;

  private static readonly SKY_VERTEX_SHADER = /* glsl */ `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  private static readonly SKY_FRAGMENT_SHADER = /* glsl */ `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float heightMin;
    uniform float heightMax;
    varying vec3 vWorldPosition;
    void main() {
      float h = vWorldPosition.y;
      float t = clamp((h - heightMin) / (heightMax - heightMin), 0.0, 1.0);
      vec3 color = mix(bottomColor, topColor, t);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  private static readonly THEMES: Record<ThemeType, { top: THREE.Color; bottom: THREE.Color }> = {
    sunset: {
      top: new THREE.Color(0.1, 0.3, 0.6),
      bottom: new THREE.Color(1.0, 0.5, 0.2),
    },
    cyberpunk: {
      top: new THREE.Color(0.15, 0.05, 0.3),
      bottom: new THREE.Color(0.0, 0.2, 0.3),
    },
    ice: {
      top: new THREE.Color(0.7, 0.85, 1.0),
      bottom: new THREE.Color(1.0, 1.0, 1.0),
    },
  };

  private static readonly NEON_COLORS = [0x00bfff, 0x9d00ff];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.theme = 'sunset';
    this.buildingLights = [];
    this.neonGrid = null;
    this.neonMaterial = null;

    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: SkylineEffect.THEMES.sunset.top.clone() },
        bottomColor: { value: SkylineEffect.THEMES.sunset.bottom.clone() },
        heightMin: { value: -50 },
        heightMax: { value: 200 },
      },
      vertexShader: SkylineEffect.SKY_VERTEX_SHADER,
      fragmentShader: SkylineEffect.SKY_FRAGMENT_SHADER,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const skyGeometry = new THREE.SphereGeometry(1000, 64, 32);
    this.skySphere = new THREE.Mesh(skyGeometry, this.skyMaterial);
    this.scene.add(this.skySphere);
  }

  public setTheme(theme: ThemeType): void {
    this.theme = theme;
    const colors = SkylineEffect.THEMES[theme];
    this.skyMaterial.uniforms.topColor.value.copy(colors.top);
    this.skyMaterial.uniforms.bottomColor.value.copy(colors.bottom);

    if (theme === 'cyberpunk') {
      this.enableBuildingLights();
      this.createNeonGrid();
    } else {
      this.disableBuildingLights();
      this.removeNeonGrid();
    }
  }

  public updateBuildings(buildings: BuildingData[]): void {
    this.clearBuildingLights();
    this.createBuildingLights(buildings);
    if (this.theme !== 'cyberpunk') {
      this.disableBuildingLights();
    }
  }

  public tick(time: number): void {
    for (const bl of this.buildingLights) {
      const intensity = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin((time / 1000) * (Math.PI * 2 / bl.period) + bl.phase));
      bl.light.intensity = intensity;
    }

    if (this.neonMaterial) {
      const opacity = 0.5 + 0.5 * Math.sin(time / 1000 * 1.5);
      this.neonMaterial.opacity = opacity;
    }
  }

  private createBuildingLights(buildings: BuildingData[]): void {
    const colorPool = [0x00bfff, 0x9d00ff, 0xff00ff, 0x00ffff];

    for (const building of buildings) {
      const color = colorPool[Math.floor(Math.random() * colorPool.length)];
      const light = new THREE.PointLight(color, 1.0, 50, 2);
      light.position.set(building.x, building.height + 2, building.z);
      this.scene.add(light);

      this.buildingLights.push({
        light,
        period: 1.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private enableBuildingLights(): void {
    for (const bl of this.buildingLights) {
      bl.light.visible = true;
    }
  }

  private disableBuildingLights(): void {
    for (const bl of this.buildingLights) {
      bl.light.visible = false;
      bl.light.intensity = 0;
    }
  }

  private clearBuildingLights(): void {
    for (const bl of this.buildingLights) {
      this.scene.remove(bl.light);
      bl.light.dispose();
    }
    this.buildingLights = [];
  }

  private createNeonGrid(): void {
    this.removeNeonGrid();

    const size = 400;
    const step = 10;
    const halfSize = size / 2;
    const positions: number[] = [];
    const colors: number[] = [];
    let colorIndex = 0;

    for (let x = -halfSize; x <= halfSize; x += step) {
      positions.push(x, 0.1, -halfSize, x, 0.1, halfSize);
      const c = new THREE.Color(SkylineEffect.NEON_COLORS[colorIndex % 2]);
      for (let i = 0; i < 2; i++) {
        colors.push(c.r, c.g, c.b);
      }
      colorIndex++;
    }

    for (let z = -halfSize; z <= halfSize; z += step) {
      positions.push(-halfSize, 0.1, z, halfSize, 0.1, z);
      const c = new THREE.Color(SkylineEffect.NEON_COLORS[colorIndex % 2]);
      for (let i = 0; i < 2; i++) {
        colors.push(c.r, c.g, c.b);
      }
      colorIndex++;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    this.neonMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    this.neonGrid = new THREE.LineSegments(geometry, this.neonMaterial);
    this.scene.add(this.neonGrid);
  }

  private removeNeonGrid(): void {
    if (this.neonGrid) {
      this.scene.remove(this.neonGrid);
      const geometry = this.neonGrid.geometry as THREE.BufferGeometry;
      geometry.dispose();
      if (this.neonMaterial) {
        this.neonMaterial.dispose();
        this.neonMaterial = null;
      }
      this.neonGrid = null;
    }
  }
}
