import * as THREE from 'three';
import type { ScalarDataset } from '../types';
import { valueToColor, TEMPERATURE_COLORMAP, gridToWorld, clamp, getGridIndex } from '../utils/interpolation';

const temperatureVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;
  void main() {
    vLocalPosition = position * 0.5 + 0.5;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const temperatureFragmentShader = `
  precision highp float;
  precision highp sampler3D;
  
  uniform sampler3D uVolume;
  uniform float uOpacity;
  uniform float uMinValue;
  uniform float uMaxValue;
  uniform vec3 uVolumeBoundsMin;
  uniform vec3 uVolumeBoundsMax;
  
  varying vec3 vLocalPosition;
  
  vec3 colormap(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c0 = vec3(0.0, 0.259, 0.616);
    vec3 c1 = vec3(0.165, 0.478, 1.0);
    vec3 c2 = vec3(0.498, 0.749, 1.0);
    vec3 c3 = vec3(1.0, 0.8, 0.4);
    vec3 c4 = vec3(1.0, 0.4, 0.2);
    vec3 c5 = vec3(0.741, 0.0, 0.149);
    
    if (t < 0.2) return mix(c0, c1, t / 0.2);
    else if (t < 0.4) return mix(c1, c2, (t - 0.2) / 0.2);
    else if (t < 0.6) return mix(c2, c3, (t - 0.4) / 0.2);
    else if (t < 0.8) return mix(c3, c4, (t - 0.6) / 0.2);
    else return mix(c4, c5, (t - 0.8) / 0.2);
  }
  
  void main() {
    float value = texture(uVolume, vLocalPosition).r;
    float normalizedValue = (value - uMinValue) / (uMaxValue - uMinValue);
    vec3 color = colormap(normalizedValue);
    float alpha = uOpacity * smoothstep(0.0, 0.3, normalizedValue);
    gl_FragColor = vec4(color, alpha);
  }
`;

export class FieldRenderer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private temperatureGroup: THREE.Group;
  private pressureGroup: THREE.Group;
  private temperatureOpacity: number = 0.6;
  private pressureOpacity: number = 0.5;
  private temperatureVisible: boolean = true;
  private pressureVisible: boolean = true;
  private temperatureData: ScalarDataset | null = null;
  private volumeTextures: Map<string, THREE.Data3DTexture> = new Map();
  private sliceMaterials: THREE.ShaderMaterial[] = [];

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.temperatureGroup = new THREE.Group();
    this.pressureGroup = new THREE.Group();
    this.scene.add(this.temperatureGroup);
    this.scene.add(this.pressureGroup);
  }

  setTemperatureOpacity(opacity: number): void {
    this.temperatureOpacity = opacity;
    for (const mat of this.sliceMaterials) {
      mat.uniforms.uOpacity.value = this.temperatureVisible ? opacity : 0;
    }
  }

  setPressureOpacity(opacity: number): void {
    this.pressureOpacity = opacity;
    this.pressureGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.Material) {
        (obj.material as THREE.MeshBasicMaterial).opacity = this.pressureVisible ? opacity : 0;
      }
    });
  }

  setTemperatureVisible(visible: boolean): void {
    this.temperatureVisible = visible;
    const targetOpacity = visible ? this.temperatureOpacity : 0;
    this.animateShaderOpacity(this.sliceMaterials, targetOpacity, 500);
  }

  setPressureVisible(visible: boolean): void {
    this.pressureVisible = visible;
    this.animateOpacity(this.pressureGroup, visible ? this.pressureOpacity : 0, 500);
  }

  private animateShaderOpacity(
    materials: THREE.ShaderMaterial[],
    targetOpacity: number,
    duration: number
  ): void {
    const startTime = performance.now();
    const startOpacities = materials.map((m) => m.uniforms.uOpacity.value);

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = clamp(elapsed / duration, 0, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      for (let i = 0; i < materials.length; i++) {
        materials[i].uniforms.uOpacity.value =
          startOpacities[i] + (targetOpacity - startOpacities[i]) * eased;
      }

      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }

  private animateOpacity(group: THREE.Group, targetOpacity: number, duration: number): void {
    const startTimes: Map<THREE.Material, number> = new Map();
    const startOpacities: Map<THREE.Material, number> = new Map();

    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.Material) {
        startTimes.set(obj.material, performance.now());
        startOpacities.set(obj.material, (obj.material as THREE.MeshBasicMaterial).opacity);
      }
    });

    const animate = () => {
      let allDone = true;
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.Material) {
          const mat = obj.material as THREE.MeshBasicMaterial;
          const startTime = startTimes.get(mat) ?? performance.now();
          const startOpacity = startOpacities.get(mat) ?? mat.opacity;
          const elapsed = performance.now() - startTime;
          const t = clamp(elapsed / duration, 0, 1);
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          mat.opacity = startOpacity + (targetOpacity - startOpacity) * eased;
          mat.transparent = true;
          if (t < 1) allDone = false;
        }
      });
      if (!allDone) requestAnimationFrame(animate);
    };
    animate();
  }

  update(): void {
    this.sortSlicesByCamera();
  }

  private sortSlicesByCamera(): void {
    if (!this.temperatureData) return;
    const center = new THREE.Vector3(
      (this.temperatureData.bounds.min[0] + this.temperatureData.bounds.max[0]) / 2,
      (this.temperatureData.bounds.min[1] + this.temperatureData.bounds.max[1]) / 2,
      (this.temperatureData.bounds.min[2] + this.temperatureData.bounds.max[2]) / 2
    );

    const cameraDir = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDir);

    const viewDir = cameraDir.clone().negate();
    const absX = Math.abs(viewDir.x);
    const absY = Math.abs(viewDir.y);
    const absZ = Math.abs(viewDir.z);

    let primaryAxis: 'x' | 'y' | 'z' = 'z';
    if (absX >= absY && absX >= absZ) primaryAxis = 'x';
    else if (absY >= absX && absY >= absZ) primaryAxis = 'y';

    const children = [...this.temperatureGroup.children];
    children.sort((a, b) => {
      const distA = a.position.clone().sub(center).dot(viewDir);
      const distB = b.position.clone().sub(center).dot(viewDir);
      return distA - distB;
    });

    for (let i = 0; i < children.length; i++) {
      this.temperatureGroup.attach(children[i]);
    }
  }

  loadTemperature(dataset: ScalarDataset): void {
    this.temperatureData = dataset;
    while (this.temperatureGroup.children.length > 0) {
      const child = this.temperatureGroup.children[0];
      this.temperatureGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    }
    this.sliceMaterials = [];

    const { nx, ny, nz } = dataset.gridSize;
    const minVal = Math.min(...dataset.values);
    const maxVal = Math.max(...dataset.values);

    const data = new Float32Array(nx * ny * nz);
    for (let i = 0; i < dataset.values.length; i++) {
      data[i] = dataset.values[i];
    }

    const volumeTexture = new THREE.Data3DTexture(data, nx, ny, nz);
    volumeTexture.format = THREE.RedFormat;
    volumeTexture.type = THREE.FloatType;
    volumeTexture.minFilter = THREE.LinearFilter;
    volumeTexture.magFilter = THREE.LinearFilter;
    volumeTexture.wrapS = THREE.ClampToEdgeWrapping;
    volumeTexture.wrapT = THREE.ClampToEdgeWrapping;
    volumeTexture.wrapR = THREE.ClampToEdgeWrapping;
    volumeTexture.needsUpdate = true;
    this.volumeTextures.set('temperature', volumeTexture);

    const width = dataset.bounds.max[0] - dataset.bounds.min[0];
    const height = dataset.bounds.max[1] - dataset.bounds.min[1];
    const depth = dataset.bounds.max[2] - dataset.bounds.min[2];
    const centerX = (dataset.bounds.min[0] + dataset.bounds.max[0]) / 2;
    const centerY = (dataset.bounds.min[1] + dataset.bounds.max[1]) / 2;
    const centerZ = (dataset.bounds.min[2] + dataset.bounds.max[2]) / 2;

    const numSlices = 32;

    for (let axis of ['x', 'y', 'z'] as const) {
      for (let i = 0; i < numSlices; i++) {
        const t = (i / (numSlices - 1) - 0.5) * 2;
        let geometry: THREE.PlaneGeometry;
        let position: [number, number, number];
        let rotation: [number, number, number];

        if (axis === 'x') {
          geometry = new THREE.PlaneGeometry(height, depth, 1, 1);
          position = [centerX + t * width * 0.5, centerY, centerZ];
          rotation = [0, Math.PI / 2, 0];
        } else if (axis === 'y') {
          geometry = new THREE.PlaneGeometry(width, depth, 1, 1);
          position = [centerX, centerY + t * height * 0.5, centerZ];
          rotation = [-Math.PI / 2, 0, 0];
        } else {
          geometry = new THREE.PlaneGeometry(width, height, 1, 1);
          position = [centerX, centerY, centerZ + t * depth * 0.5];
          rotation = [0, 0, 0];
        }

        const material = new THREE.ShaderMaterial({
          uniforms: {
            uVolume: { value: volumeTexture },
            uOpacity: { value: this.temperatureVisible ? this.temperatureOpacity : 0 },
            uMinValue: { value: minVal },
            uMaxValue: { value: maxVal },
            uVolumeBoundsMin: { value: new THREE.Vector3(...dataset.bounds.min) },
            uVolumeBoundsMax: { value: new THREE.Vector3(...dataset.bounds.max) }
          },
          vertexShader: temperatureVertexShader,
          fragmentShader: temperatureFragmentShader,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...position);
        mesh.rotation.set(...rotation);
        this.temperatureGroup.add(mesh);
        this.sliceMaterials.push(material);
      }
    }
  }

  loadPressure(dataset: ScalarDataset): void {
    while (this.pressureGroup.children.length > 0) {
      const child = this.pressureGroup.children[0];
      this.pressureGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    }

    const isovalues = dataset.isovalues ?? [0.5];

    for (const iso of isovalues) {
      const positions: number[] = [];
      this.marchingCubes(dataset, iso, positions);

      if (positions.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.computeVertexNormals();

        const material = new THREE.MeshBasicMaterial({
          color: 0xd4af37,
          transparent: true,
          opacity: this.pressureVisible ? this.pressureOpacity : 0,
          side: THREE.DoubleSide,
          depthWrite: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        this.pressureGroup.add(mesh);
      }
    }
  }

  private marchingCubes(
    dataset: ScalarDataset,
    isoValue: number,
    positions: number[]
  ): void {
    const { nx, ny, nz } = dataset.gridSize;
    const values = dataset.values;

    for (let iz = 0; iz < nz - 1; iz++) {
      for (let iy = 0; iy < ny - 1; iy++) {
        for (let ix = 0; ix < nx - 1; ix++) {
          const idx000 = getGridIndex(ix, iy, iz, dataset.gridSize);
          const idx100 = idx000 + 1;
          const idx010 = idx000 + nx;
          const idx110 = idx010 + 1;
          const idx001 = idx000 + nx * ny;
          const idx101 = idx001 + 1;
          const idx011 = idx001 + nx;
          const idx111 = idx011 + 1;

          const v = [
            values[idx000], values[idx100], values[idx110], values[idx010],
            values[idx001], values[idx101], values[idx111], values[idx011]
          ];

          let cubeIndex = 0;
          for (let i = 0; i < 8; i++) {
            if (v[i] < isoValue) cubeIndex |= 1 << i;
          }

          if (cubeIndex === 0 || cubeIndex === 255) continue;

          const [wx0, wy0, wz0] = gridToWorld(ix, iy, iz, dataset.bounds, dataset.gridSize);
          const [wx1, wy1, wz1] = gridToWorld(ix + 1, iy + 1, iz + 1, dataset.bounds, dataset.gridSize);

          const vertices: [number, number, number][] = [
            [wx0, wy0, wz0], [wx1, wy0, wz0], [wx1, wy1, wz0], [wx0, wy1, wz0],
            [wx0, wy0, wz1], [wx1, wy0, wz1], [wx1, wy1, wz1], [wx0, wy1, wz1]
          ];

          const edgeList = this.getEdgeVertices(vertices, v, isoValue);
          this.addTriangles(cubeIndex, edgeList, positions);
        }
      }
    }
  }

  private getEdgeVertices(
    vertices: [number, number, number][],
    values: number[],
    iso: number
  ): ([number, number, number] | null)[] {
    const edges: [number, number][] = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    return edges.map(([a, b]) => {
      if ((values[a] < iso) === (values[b] < iso)) return null;
      const t = (iso - values[a]) / (values[b] - values[a]);
      return [
        vertices[a][0] + t * (vertices[b][0] - vertices[a][0]),
        vertices[a][1] + t * (vertices[b][1] - vertices[a][1]),
        vertices[a][2] + t * (vertices[b][2] - vertices[a][2])
      ] as [number, number, number];
    });
  }

  private addTriangles(
    cubeIndex: number,
    edgeList: ([number, number, number] | null)[],
    positions: number[]
  ): void {
    const triTable = this.getTriangulationTable();
    const edges = triTable[cubeIndex];
    if (!edges) return;

    for (let i = 0; i < edges.length; i += 3) {
      const e0 = edges[i];
      const e1 = edges[i + 1];
      const e2 = edges[i + 2];
      if (e0 === -1) break;

      const v0 = edgeList[e0];
      const v1 = edgeList[e1];
      const v2 = edgeList[e2];
      if (v0 && v1 && v2) {
        positions.push(v0[0], v0[1], v0[2]);
        positions.push(v1[0], v1[1], v1[2]);
        positions.push(v2[0], v2[1], v2[2]);
      }
    }
  }

  private getTriangulationTable(): number[][] {
    return [
      [],
      [0, 8, 3, -1],
      [0, 1, 9, -1],
      [1, 8, 3, 9, 8, 1, -1],
      [1, 2, 10, -1],
      [0, 8, 3, 1, 2, 10, -1],
      [9, 2, 10, 0, 2, 9, -1],
      [2, 8, 3, 2, 10, 8, 10, 9, 8, -1],
      [3, 11, 2, -1],
      [0, 11, 2, 8, 11, 0, -1],
      [1, 9, 0, 2, 3, 11, -1],
      [1, 11, 2, 1, 9, 11, 9, 8, 11, -1],
      [3, 10, 1, 11, 10, 3, -1],
      [0, 10, 1, 0, 8, 10, 8, 11, 10, -1],
      [3, 9, 0, 3, 11, 9, 11, 10, 9, -1],
      [9, 8, 10, 10, 8, 11, -1],
      [4, 7, 8, -1],
      [4, 3, 0, 7, 3, 4, -1],
      [0, 1, 9, 8, 4, 7, -1],
      [4, 1, 9, 4, 7, 1, 7, 3, 1, -1],
      [1, 2, 10, 8, 4, 7, -1],
      [3, 4, 7, 3, 0, 4, 1, 2, 10, -1],
      [9, 2, 10, 9, 0, 2, 8, 4, 7, -1],
      [2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, -1],
      [8, 4, 7, 3, 11, 2, -1],
      [11, 4, 7, 11, 2, 4, 2, 0, 4, -1],
      [9, 0, 1, 8, 4, 7, 2, 3, 11, -1],
      [4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, -1],
      [3, 10, 1, 3, 11, 10, 7, 8, 4, -1],
      [1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, -1],
      [4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, -1],
      [4, 7, 11, 4, 11, 9, 9, 11, 10, -1],
      [9, 5, 4, -1],
      [9, 5, 4, 0, 8, 3, -1],
      [0, 5, 4, 1, 5, 0, -1],
      [8, 5, 4, 8, 3, 5, 3, 1, 5, -1],
      [1, 2, 10, 9, 5, 4, -1],
      [3, 0, 8, 1, 2, 10, 4, 9, 5, -1],
      [5, 2, 10, 5, 4, 2, 4, 0, 2, -1],
      [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1],
      [9, 5, 4, 2, 3, 11, -1],
      [0, 11, 2, 0, 8, 11, 4, 9, 5, -1],
      [0, 5, 4, 0, 1, 5, 2, 3, 11, -1],
      [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, -1],
      [10, 3, 11, 10, 1, 3, 9, 5, 4, -1],
      [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, -1],
      [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, -1],
      [5, 4, 8, 5, 8, 10, 10, 8, 11, -1],
      [9, 7, 8, 5, 7, 9, -1],
      [9, 3, 0, 9, 5, 3, 5, 7, 3, -1],
      [0, 7, 8, 0, 1, 7, 1, 5, 7, -1],
      [1, 5, 3, 3, 5, 7, -1],
      [9, 7, 8, 9, 5, 7, 10, 1, 2, -1],
      [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, -1],
      [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, -1],
      [2, 10, 5, 2, 5, 3, 3, 5, 7, -1],
      [7, 9, 5, 7, 8, 9, 3, 11, 2, -1],
      [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, -1],
      [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, -1],
      [11, 2, 1, 11, 1, 7, 7, 1, 5, -1],
      [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, -1],
      [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, -1],
      [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, -1],
      [11, 10, 5, 7, 11, 5, -1],
      [10, 6, 5, -1],
      [0, 8, 3, 5, 10, 6, -1],
      [9, 0, 1, 5, 10, 6, -1],
      [1, 8, 3, 1, 9, 8, 5, 10, 6, -1],
      [1, 6, 5, 2, 6, 1, -1],
      [1, 6, 5, 1, 2, 6, 3, 0, 8, -1],
      [9, 6, 5, 9, 0, 6, 0, 2, 6, -1],
      [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1],
      [2, 3, 11, 10, 6, 5, -1],
      [11, 0, 8, 11, 2, 0, 10, 6, 5, -1],
      [0, 1, 9, 2, 3, 11, 5, 10, 6, -1],
      [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, -1],
      [6, 3, 11, 6, 5, 3, 5, 1, 3, -1],
      [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, -1],
      [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1],
      [6, 5, 9, 6, 9, 11, 11, 9, 8, -1],
      [5, 10, 6, 4, 7, 8, -1],
      [4, 3, 0, 4, 7, 3, 6, 5, 10, -1],
      [1, 9, 0, 5, 10, 6, 8, 4, 7, -1],
      [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, -1],
      [6, 1, 2, 6, 5, 1, 4, 7, 8, -1],
      [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, -1],
      [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, -1],
      [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, -1],
      [3, 11, 2, 7, 8, 4, 10, 6, 5, -1],
      [5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, -1],
      [0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, -1],
      [9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, -1],
      [8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, -1],
      [5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, -1],
      [0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, -1],
      [6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, -1],
      [10, 4, 9, 6, 4, 10, -1],
      [4, 10, 6, 4, 9, 10, 0, 8, 3, -1],
      [10, 0, 1, 10, 6, 0, 6, 4, 0, -1],
      [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, -1],
      [1, 4, 9, 1, 2, 4, 2, 6, 4, -1],
      [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, -1],
      [0, 2, 4, 4, 2, 6, -1],
      [8, 3, 2, 8, 2, 4, 4, 2, 6, -1],
      [10, 4, 9, 10, 6, 4, 11, 2, 3, -1],
      [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, -1],
      [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, -1],
      [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, -1],
      [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, -1],
      [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, -1],
      [3, 11, 6, 3, 6, 0, 0, 6, 4, -1],
      [6, 4, 8, 11, 6, 8, -1],
      [7, 10, 6, 7, 8, 10, 8, 9, 10, -1],
      [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, -1],
      [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, -1],
      [10, 6, 7, 10, 7, 1, 1, 7, 3, -1],
      [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1],
      [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, -1],
      [7, 8, 0, 7, 0, 6, 6, 0, 2, -1],
      [7, 3, 2, 6, 7, 2, -1],
      [2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, -1],
      [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, -1],
      [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, -1],
      [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1],
      [8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, -1],
      [0, 9, 1, 11, 6, 7, -1],
      [7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, -1],
      [7, 11, 6, -1],
      [7, 6, 11, -1],
      [3, 0, 8, 11, 7, 6, -1],
      [0, 1, 9, 11, 7, 6, -1],
      [8, 1, 9, 8, 3, 1, 11, 7, 6, -1],
      [10, 1, 2, 6, 11, 7, -1],
      [1, 2, 10, 3, 0, 8, 6, 11, 7, -1],
      [2, 9, 0, 2, 10, 9, 6, 11, 7, -1],
      [6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, -1],
      [7, 2, 3, 6, 2, 7, -1],
      [7, 0, 8, 7, 6, 0, 6, 2, 0, -1],
      [2, 7, 6, 2, 3, 7, 0, 1, 9, -1],
      [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, -1],
      [10, 7, 6, 10, 1, 7, 1, 3, 7, -1],
      [10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, -1],
      [0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, -1],
      [7, 6, 10, 7, 10, 8, 8, 10, 9, -1],
      [6, 8, 4, 11, 8, 6, -1],
      [3, 6, 11, 3, 0, 6, 0, 4, 6, -1],
      [8, 6, 11, 8, 4, 6, 9, 0, 1, -1],
      [9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, -1],
      [6, 8, 4, 6, 11, 8, 2, 10, 1, -1],
      [1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, -1],
      [4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, -1],
      [10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, -1],
      [8, 2, 3, 8, 4, 2, 4, 6, 2, -1],
      [0, 4, 2, 4, 6, 2, -1],
      [1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, -1],
      [1, 9, 4, 1, 4, 2, 2, 4, 6, -1],
      [8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, -1],
      [10, 1, 0, 10, 0, 6, 6, 0, 4, -1],
      [4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, -1],
      [10, 9, 4, 6, 10, 4, -1],
      [4, 9, 5, 7, 6, 11, -1],
      [0, 8, 3, 4, 9, 5, 11, 7, 6, -1],
      [5, 0, 1, 5, 4, 0, 7, 6, 11, -1],
      [11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, -1],
      [9, 5, 4, 10, 1, 2, 7, 6, 11, -1],
      [6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, -1],
      [7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, -1],
      [3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, -1],
      [7, 2, 3, 7, 6, 2, 5, 4, 9, -1],
      [9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, -1],
      [3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, -1],
      [6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, -1],
      [9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, -1],
      [1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, -1],
      [4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, -1],
      [7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, -1],
      [6, 9, 5, 6, 11, 9, 11, 8, 9, -1],
      [3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, -1],
      [0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, -1],
      [6, 11, 3, 6, 3, 5, 5, 3, 1, -1],
      [1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, -1],
      [0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, -1],
      [11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, -1],
      [6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, -1],
      [5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, -1],
      [9, 5, 6, 9, 6, 0, 0, 6, 2, -1],
      [1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, -1],
      [1, 5, 6, 2, 1, 6, -1],
      [1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, -1],
      [10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, -1],
      [0, 3, 8, 5, 6, 10, -1],
      [10, 5, 6, -1],
      [11, 5, 10, 7, 5, 11, -1],
      [11, 5, 10, 11, 7, 5, 8, 3, 0, -1],
      [5, 11, 7, 5, 10, 11, 1, 9, 0, -1],
      [10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, -1],
      [11, 1, 2, 11, 7, 1, 7, 5, 1, -1],
      [0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, -1],
      [9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, -1],
      [7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, -1],
      [2, 5, 10, 2, 3, 5, 3, 7, 5, -1],
      [8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, -1],
      [9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, -1],
      [9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, -1],
      [1, 3, 5, 3, 7, 5, -1],
      [0, 8, 7, 0, 7, 1, 1, 7, 5, -1],
      [9, 0, 3, 9, 3, 5, 5, 3, 7, -1],
      [9, 8, 7, 5, 9, 7, -1],
      [5, 8, 4, 5, 10, 8, 10, 11, 8, -1],
      [5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, -1],
      [0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, -1],
      [10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, -1],
      [2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, -1],
      [0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, -1],
      [0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, -1],
      [9, 4, 5, 2, 11, 3, -1],
      [2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, -1],
      [5, 10, 2, 5, 2, 4, 4, 2, 0, -1],
      [3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, -1],
      [5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, -1],
      [8, 4, 5, 8, 5, 3, 3, 5, 1, -1],
      [0, 4, 5, 1, 0, 5, -1],
      [8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, -1],
      [9, 4, 5, -1],
      [4, 11, 7, 4, 9, 11, 9, 10, 11, -1],
      [0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, -1],
      [1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, -1],
      [3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, -1],
      [4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, -1],
      [9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, -1],
      [11, 7, 4, 11, 4, 2, 2, 4, 0, -1],
      [11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, -1],
      [2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, -1],
      [9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, -1],
      [3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, -1],
      [1, 10, 2, 8, 7, 4, -1],
      [4, 9, 1, 4, 1, 7, 7, 1, 3, -1],
      [4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, -1],
      [4, 0, 3, 7, 4, 3, -1],
      [4, 8, 7, -1],
      [9, 10, 8, 10, 11, 8, -1],
      [3, 0, 9, 3, 9, 11, 11, 9, 10, -1],
      [0, 1, 10, 0, 10, 8, 8, 10, 11, -1],
      [3, 1, 10, 11, 3, 10, -1],
      [1, 2, 11, 1, 11, 9, 9, 11, 8, -1],
      [3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, -1],
      [0, 2, 11, 8, 0, 11, -1],
      [3, 2, 11, -1],
      [2, 3, 8, 2, 8, 10, 10, 8, 9, -1],
      [9, 10, 2, 0, 9, 2, -1],
      [2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, -1],
      [1, 10, 2, -1],
      [1, 3, 8, 9, 1, 8, -1],
      [0, 9, 1, -1],
      [0, 3, 8, -1],
      []
    ];
  }
}
