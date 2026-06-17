import * as THREE from 'three';

export interface TectonicParams {
  compression: number;
  stretch: number;
  shearAngle: number;
}

const GRID_SIZE = 100;
const TERRAIN_SIZE = 50;
const TRANSITION_DURATION = 1.5;

const terrainVertexShader = /* glsl */ `
  uniform float uCompression;
  uniform float uStretch;
  uniform float uShearAngle;
  uniform float uTerrainSize;

  varying float vHeight;
  varying vec3 vWorldPosition;

  void main() {
    vec3 pos = position;
    float z = pos.z;
    float halfSize = uTerrainSize * 0.5;
    float normalizedZ = abs(z) / halfSize;

    float height = 0.0;

    if (uCompression > 0.0) {
      float peakHeight = uCompression * 0.5;
      float mountain = peakHeight * exp(-normalizedZ * normalizedZ * 4.0);
      float valley = -uCompression * 0.15 * (1.0 - exp(-normalizedZ * normalizedZ * 0.5));
      height += mountain + valley;
    }

    if (uStretch > 0.0) {
      float grabenDepth = -uStretch * 0.6 * exp(-normalizedZ * normalizedZ * 8.0);
      float shoulder = uStretch * 0.2 * exp(-pow(normalizedZ - 0.5, 2.0) * 12.0);
      height += grabenDepth + shoulder;
    }

    pos.y = height;

    if (uShearAngle > 0.0) {
      float shearRad = radians(uShearAngle);
      float shearAmount = sin(shearRad) * 2.0;
      float sideFactor = z >= 0.0 ? 1.0 : -1.0;
      pos.x += sideFactor * shearAmount * (1.0 - exp(-abs(z) * 0.1));
    }

    vHeight = height;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const terrainFragmentShader = /* glsl */ `
  uniform float uBlendWidth;

  varying float vHeight;
  varying vec3 vWorldPosition;

  vec3 valley = vec3(0.106, 0.369, 0.125);
  vec3 plain = vec3(0.4, 0.733, 0.416);
  vec3 hill = vec3(0.553, 0.431, 0.388);
  vec3 snow = vec3(0.925, 0.937, 0.945);

  vec3 getTerrainColor(float height) {
    float halfBlend = uBlendWidth * 0.5;
    vec3 color;

    if (height < -1.0 - halfBlend) {
      color = valley;
    } else if (height < -1.0 + halfBlend) {
      float t = (height + 1.0 + halfBlend) / uBlendWidth;
      color = mix(valley, plain, t);
    } else if (height < 1.0 - halfBlend) {
      color = plain;
    } else if (height < 1.0 + halfBlend) {
      float t = (height - 1.0 + halfBlend) / uBlendWidth;
      color = mix(plain, hill, t);
    } else if (height < 3.0 - halfBlend) {
      color = hill;
    } else if (height < 3.0 + halfBlend) {
      float t = (height - 3.0 + halfBlend) / uBlendWidth;
      color = mix(hill, snow, t);
    } else {
      color = snow;
    }

    return color;
  }

  void main() {
    vec3 color = getTerrainColor(vHeight);

    vec3 lightDir = normalize(vec3(0.5, 0.8, 0.5));
    vec3 dx = dFdx(vWorldPosition);
    vec3 dy = dFdy(vWorldPosition);
    vec3 normal = normalize(cross(dy, dx));
    float diffuse = max(dot(normal, lightDir), 0.0);
    float ambient = 0.55;
    vec3 finalColor = color * (ambient + diffuse * 0.45);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const wireframeVertexShader = /* glsl */ `
  uniform float uCompression;
  uniform float uStretch;
  uniform float uShearAngle;
  uniform float uTerrainSize;

  void main() {
    vec3 pos = position;
    float z = pos.z;
    float halfSize = uTerrainSize * 0.5;
    float normalizedZ = abs(z) / halfSize;

    float height = 0.0;

    if (uCompression > 0.0) {
      float peakHeight = uCompression * 0.5;
      float mountain = peakHeight * exp(-normalizedZ * normalizedZ * 4.0);
      float valley = -uCompression * 0.15 * (1.0 - exp(-normalizedZ * normalizedZ * 0.5));
      height += mountain + valley;
    }

    if (uStretch > 0.0) {
      float grabenDepth = -uStretch * 0.6 * exp(-normalizedZ * normalizedZ * 8.0);
      float shoulder = uStretch * 0.2 * exp(-pow(normalizedZ - 0.5, 2.0) * 12.0);
      height += grabenDepth + shoulder;
    }

    pos.y = height;

    if (uShearAngle > 0.0) {
      float shearRad = radians(uShearAngle);
      float shearAmount = sin(shearRad) * 2.0;
      float sideFactor = z >= 0.0 ? 1.0 : -1.0;
      pos.x += sideFactor * shearAmount * (1.0 - exp(-abs(z) * 0.1));
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const wireframeFragmentShader = /* glsl */ `
  void main() {
    gl_FragColor = vec4(0.53, 0.53, 0.53, 0.35);
  }
`;

const lineVertexShader = /* glsl */ `
  uniform float uCompression;
  uniform float uStretch;
  uniform float uShearAngle;
  uniform float uTerrainSize;

  attribute float lineType;

  void main() {
    vec3 pos = position;
    float z = pos.z;
    float halfSize = uTerrainSize * 0.5;
    float normalizedZ = abs(z) / halfSize;

    float height = 0.0;

    if (uCompression > 0.0) {
      float peakHeight = uCompression * 0.5;
      float mountain = peakHeight * exp(-normalizedZ * normalizedZ * 4.0);
      float valley = -uCompression * 0.15 * (1.0 - exp(-normalizedZ * normalizedZ * 0.5));
      height += mountain + valley;
    }

    if (uStretch > 0.0) {
      float grabenDepth = -uStretch * 0.6 * exp(-normalizedZ * normalizedZ * 8.0);
      float shoulder = uStretch * 0.2 * exp(-pow(normalizedZ - 0.5, 2.0) * 12.0);
      height += grabenDepth + shoulder;
    }

    if (lineType == 1.0) {
      height = uCompression * 0.5 * 0.98;
    } else if (lineType == 2.0) {
      float grabenDepth = -uStretch * 0.6;
      height = grabenDepth * 0.5 + 0.1;
    } else {
      height += 0.02;
    }

    pos.y = height;

    if (uShearAngle > 0.0) {
      float shearRad = radians(uShearAngle);
      float shearAmount = sin(shearRad) * 2.0;
      float sideFactor = z >= 0.0 ? 1.0 : -1.0;
      pos.x += sideFactor * shearAmount * (1.0 - exp(-abs(z) * 0.1));
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export class TerrainManager {
  public mesh: THREE.Mesh;
  public wireframe: THREE.LineSegments;
  public ridgeLine: THREE.Line;
  public faultLines: THREE.Line;
  public shearPlane: THREE.Mesh;

  private geometry: THREE.PlaneGeometry;
  private terrainMaterial: THREE.ShaderMaterial;
  private wireframeMaterial: THREE.ShaderMaterial;
  private ridgeMaterial: THREE.LineBasicMaterial;
  private faultMaterial: THREE.LineDashedMaterial;

  private currentParams: TectonicParams = { compression: 0, stretch: 0, shearAngle: 0 };
  private targetParams: TectonicParams = { compression: 0, stretch: 0, shearAngle: 0 };
  private transitionProgress: number = 1;
  private transitionStartParams: TectonicParams = { compression: 0, stretch: 0, shearAngle: 0 };

  constructor() {
    this.geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, GRID_SIZE, GRID_SIZE);
    this.geometry.rotateX(-Math.PI / 2);

    this.terrainMaterial = new THREE.ShaderMaterial({
      vertexShader: terrainVertexShader,
      fragmentShader: terrainFragmentShader,
      uniforms: {
        uCompression: { value: 0 },
        uStretch: { value: 0 },
        uShearAngle: { value: 0 },
        uTerrainSize: { value: TERRAIN_SIZE },
        uBlendWidth: { value: 0.5 }
      },
      side: THREE.DoubleSide
    });

    this.wireframeMaterial = new THREE.ShaderMaterial({
      vertexShader: wireframeVertexShader,
      fragmentShader: wireframeFragmentShader,
      uniforms: {
        uCompression: { value: 0 },
        uStretch: { value: 0 },
        uShearAngle: { value: 0 },
        uTerrainSize: { value: TERRAIN_SIZE }
      },
      transparent: true
    });

    this.mesh = new THREE.Mesh(this.geometry, this.terrainMaterial);

    const wireGeo = new THREE.WireframeGeometry(this.geometry);
    this.wireframe = new THREE.LineSegments(wireGeo, this.wireframeMaterial);

    this.ridgeLine = this.createRidgeLine();
    this.faultLines = this.createFaultLines();
    this.shearPlane = this.createShearPlane();

    this.ridgeMaterial = this.ridgeLine.material as THREE.LineBasicMaterial;
    this.faultMaterial = this.faultLines.material as THREE.LineDashedMaterial;

    this.updateDecorations();
  }

  private createRidgeLine(): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 200;
    for (let i = 0; i <= segments; i++) {
      const x = -TERRAIN_SIZE / 2 + (TERRAIN_SIZE * i) / segments;
      points.push(new THREE.Vector3(x, 0, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xE53935,
      transparent: true,
      opacity: 0.7
    });
    return new THREE.Line(geo, mat);
  }

  private createFaultLines(): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 200;
    for (let i = 0; i <= segments; i++) {
      const x = -TERRAIN_SIZE / 2 + (TERRAIN_SIZE * i) / segments;
      points.push(new THREE.Vector3(x, 0, -TERRAIN_SIZE * 0.2));
    }
    for (let i = 0; i <= segments; i++) {
      const x = -TERRAIN_SIZE / 2 + (TERRAIN_SIZE * i) / segments;
      points.push(new THREE.Vector3(x, 0, TERRAIN_SIZE * 0.2));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: 0xFDD835,
      transparent: true,
      opacity: 0.8,
      dashSize: 0.6,
      gapSize: 0.35
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }

  private createShearPlane(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, 10);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x1E88E5,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    return plane;
  }

  public setParams(params: Partial<TectonicParams>): void {
    const newTarget = { ...this.targetParams, ...params };
    if (
      newTarget.compression !== this.targetParams.compression ||
      newTarget.stretch !== this.targetParams.stretch ||
      newTarget.shearAngle !== this.targetParams.shearAngle
    ) {
      this.transitionStartParams = { ...this.currentParams };
      this.targetParams = newTarget;
      this.transitionProgress = 0;
    }
  }

  public update(deltaTime: number): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / TRANSITION_DURATION);
      const t = this.easeInOut(this.transitionProgress);

      this.currentParams.compression = this.lerp(
        this.transitionStartParams.compression,
        this.targetParams.compression,
        t
      );
      this.currentParams.stretch = this.lerp(
        this.transitionStartParams.stretch,
        this.targetParams.stretch,
        t
      );
      this.currentParams.shearAngle = this.lerp(
        this.transitionStartParams.shearAngle,
        this.targetParams.shearAngle,
        t
      );

      this.updateShaderUniforms();
      this.updateDecorations();
    }
  }

  private updateShaderUniforms(): void {
    const { compression, stretch, shearAngle } = this.currentParams;

    this.terrainMaterial.uniforms.uCompression.value = compression;
    this.terrainMaterial.uniforms.uStretch.value = stretch;
    this.terrainMaterial.uniforms.uShearAngle.value = shearAngle;

    this.wireframeMaterial.uniforms.uCompression.value = compression;
    this.wireframeMaterial.uniforms.uStretch.value = stretch;
    this.wireframeMaterial.uniforms.uShearAngle.value = shearAngle;
  }

  private updateDecorations(): void {
    const { compression, stretch, shearAngle } = this.currentParams;
    const shearRad = (shearAngle * Math.PI) / 180;
    const shearAmount = Math.sin(shearRad) * 2;

    if (compression > 0.01) {
      this.ridgeLine.visible = true;
      this.ridgeMaterial.opacity = Math.min(0.75, compression * 0.08 + 0.1);
      this.updateRidgeLine(compression, shearAngle, shearAmount);
    } else {
      this.ridgeLine.visible = false;
    }

    if (stretch > 0.01) {
      this.faultLines.visible = true;
      this.faultMaterial.opacity = Math.min(0.85, stretch * 0.15 + 0.1);
      this.updateFaultLines(compression, stretch, shearAngle, shearAmount);
    } else {
      this.faultLines.visible = false;
    }

    if (shearAngle > 0.01) {
      this.shearPlane.visible = true;
      const avgHeight = compression * 0.25 - stretch * 0.2;
      this.shearPlane.position.set(0, avgHeight, 0);
      const opacity = Math.min(0.35, shearAngle * 0.002 + 0.05);
      (this.shearPlane.material as THREE.MeshBasicMaterial).opacity = opacity;
    } else {
      this.shearPlane.visible = false;
    }
  }

  private updateRidgeLine(compression: number, shearAngle: number, shearAmount: number): void {
    const posAttr = this.ridgeLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const peakHeight = compression * 0.5 * 0.98;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] = peakHeight;
      if (shearAngle > 0) {
        const z = positions[i + 2];
        const sideFactor = z >= 0 ? 1 : -1;
        const baseX = -TERRAIN_SIZE / 2 + (TERRAIN_SIZE * (i / 3)) / 200;
        positions[i] = baseX + sideFactor * shearAmount * (1 - Math.exp(-Math.abs(z) * 0.1));
      }
    }

    posAttr.needsUpdate = true;
  }

  private updateFaultLines(compression: number, stretch: number, shearAngle: number, shearAmount: number): void {
    const posAttr = this.faultLines.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const grabenDepth = -stretch * 0.6;
    const faultY = grabenDepth * 0.5 + 0.1;

    for (let i = 0; i < positions.length; i += 3) {
      const z = positions[i + 2];
      const halfSize = TERRAIN_SIZE / 2;
      const normalizedZ = Math.abs(z) / halfSize;

      let height = 0;
      if (compression > 0) {
        const peakHeight = compression * 0.5;
        const mountain = peakHeight * Math.exp(-normalizedZ * normalizedZ * 4);
        const valley = -compression * 0.15 * (1 - Math.exp(-normalizedZ * normalizedZ * 0.5));
        height += mountain + valley;
      }
      if (stretch > 0) {
        const graben = -stretch * 0.6 * Math.exp(-normalizedZ * normalizedZ * 8);
        const shoulder = stretch * 0.2 * Math.exp(-Math.pow(normalizedZ - 0.5, 2) * 12);
        height += graben + shoulder;
      }

      positions[i + 1] = height + 0.05;

      if (shearAngle > 0) {
        const sideFactor = z >= 0 ? 1 : -1;
        const baseX = positions[i];
        positions[i] = baseX + sideFactor * shearAmount * (1 - Math.exp(-Math.abs(z) * 0.1));
      }
    }

    posAttr.needsUpdate = true;
    this.faultLines.computeLineDistances();
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public getCurrentParams(): TectonicParams {
    return { ...this.currentParams };
  }
}
