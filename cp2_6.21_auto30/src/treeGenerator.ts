import * as THREE from 'three';

export type TreeRuleType = 'l-system' | 'recursive' | 'random';

export interface TreeParams {
  ruleType: TreeRuleType;
  canopyDensity: number;
  branchLayers: number;
  variation: number;
}

export interface TreeData {
  group: THREE.Group;
  branchSegments: THREE.LineSegments[];
  foliageParticles: THREE.Points;
  params: TreeParams;
  foliagePulseData: FoliagePulseData;
}

export interface FoliagePulseData {
  baseSizes: Float32Array;
  frequencies: Float32Array;
  offsets: Float32Array;
}

export interface BranchSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
  level: number;
}

const TRUNK_COLOR = 0x5D4037;
const FOLIAGE_COLOR_LIGHT = new THREE.Color(0x8BC34A);
const FOLIAGE_COLOR_DARK = new THREE.Color(0x2E7D32);

export class TreeGenerator {
  private params: TreeParams;

  constructor(params: TreeParams) {
    this.params = { ...params };
  }

  public updateParams(params: Partial<TreeParams>): void {
    this.params = { ...this.params, ...params };
  }

  public getParams(): TreeParams {
    return { ...this.params };
  }

  public generateTree(seed: number = Math.random() * 10000): TreeData {
    const group = new THREE.Group();
    const rng = this.seededRandom(seed);

    let segments: BranchSegment[] = [];

    switch (this.params.ruleType) {
      case 'l-system':
        segments = this.generateLSystemTree(rng);
        break;
      case 'recursive':
        segments = this.generateRecursiveTree(rng);
        break;
      case 'random':
        segments = this.generateRandomTree(rng);
        break;
    }

    const trunkGeometry = this.createTrunkGeometry(segments);
    const barkTextures = this.createBarkTextures(seed);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: TRUNK_COLOR,
      map: barkTextures.diffuse,
      normalMap: barkTextures.normal,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughness: 0.9,
      metalness: 0.0
    });
    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
    group.add(trunkMesh);

    const branchLineSegments = this.createBranchLineSegments(segments);
    group.add(branchLineSegments);

    const foliageData = this.createFoliage(segments, rng, seed);
    group.add(foliageData.points);

    return {
      group,
      branchSegments: [branchLineSegments],
      foliageParticles: foliageData.points,
      params: { ...this.params },
      foliagePulseData: foliageData.pulseData
    };
  }

  private seededRandom(seed: number) {
    let s = seed;
    return () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }

  private generateLSystemTree(rng: () => number): BranchSegment[] {
    const segments: BranchSegment[] = [];
    const layers = this.params.branchLayers;
    const variation = this.params.variation;

    let axiom = 'F';
    const rules: Record<string, string> = {
      'F': 'F[+F][-F]F',
      'X': 'F-[[X]+X]+F[+FX]-X'
    };

    let current = axiom;
    for (let i = 0; i < Math.min(layers, 5); i++) {
      let next = '';
      for (const char of current) {
        next += rules[char] || char;
      }
      current = next;
    }

    const stack: { pos: THREE.Vector3; dir: THREE.Vector3; level: number; radius: number }[] = [];
    let pos = new THREE.Vector3(0, 0, 0);
    let dir = new THREE.Vector3(0, 1, 0);
    let level = 0;
    let radius = 0.15;
    const angle = 25 * Math.PI / 180 * (1 + variation * 0.5);
    const lengthScale = 0.7 + variation * 0.2;

    for (const char of current) {
      switch (char) {
        case 'F': {
          const len = (0.8 + rng() * 0.4) * lengthScale / (level * 0.3 + 1);
          const end = pos.clone().add(dir.clone().multiplyScalar(len));
          segments.push({ start: pos.clone(), end, radius: radius / (level + 1), level });
          pos = end;
          level = Math.min(level + 1, layers - 1);
          break;
        }
        case '+': {
          const rotAngle = angle * (1 + (rng() - 0.5) * variation);
          const axis = new THREE.Vector3(0, 0, 1);
          dir.applyAxisAngle(axis, rotAngle);
          const randomAxis = new THREE.Vector3(rng() - 0.5, 0, rng() - 0.5).normalize();
          dir.applyAxisAngle(randomAxis, rotAngle * 0.5 * variation);
          break;
        }
        case '-': {
          const rotAngle = angle * (1 + (rng() - 0.5) * variation);
          const axis = new THREE.Vector3(0, 0, 1);
          dir.applyAxisAngle(axis, -rotAngle);
          const randomAxis = new THREE.Vector3(rng() - 0.5, 0, rng() - 0.5).normalize();
          dir.applyAxisAngle(randomAxis, -rotAngle * 0.5 * variation);
          break;
        }
        case '[':
          stack.push({ pos: pos.clone(), dir: dir.clone(), level, radius });
          break;
        case ']': {
          const state = stack.pop();
          if (state) {
            pos = state.pos;
            dir = state.dir;
            level = state.level;
            radius = state.radius;
          }
          break;
        }
      }
    }

    return segments;
  }

  private generateRecursiveTree(rng: () => number): BranchSegment[] {
    const segments: BranchSegment[] = [];
    const layers = this.params.branchLayers;
    const variation = this.params.variation;
    const angle = 30 * Math.PI / 180;
    const lengthRatio = 0.7;

    const branch = (
      pos: THREE.Vector3,
      dir: THREE.Vector3,
      level: number,
      length: number,
      radius: number
    ) => {
      if (level >= layers) return;

      const len = length * (1 + (rng() - 0.5) * variation * 0.3);
      const end = pos.clone().add(dir.clone().multiplyScalar(len));
      segments.push({ start: pos.clone(), end, radius, level });

      const branchCount = 2 + Math.floor((rng() * variation * 2));
      for (let i = 0; i < branchCount; i++) {
        const newDir = dir.clone();
        const branchAngle = angle * (1 + (rng() - 0.5) * variation * 0.5);
        const rotAxis = new THREE.Vector3(
          Math.cos(i * Math.PI * 2 / branchCount + rng() * variation),
          0,
          Math.sin(i * Math.PI * 2 / branchCount + rng() * variation)
        ).normalize();
        newDir.applyAxisAngle(rotAxis, branchAngle);
        branch(end, newDir, level + 1, length * lengthRatio, radius * 0.7);
      }
    };

    const startDir = new THREE.Vector3(0, 1, 0);
    const startPos = new THREE.Vector3(0, 0, 0);
    branch(startPos, startDir, 0, 1.2, 0.12);

    return segments;
  }

  private generateRandomTree(rng: () => number): BranchSegment[] {
    const segments: BranchSegment[] = [];
    const layers = this.params.branchLayers;
    const variation = this.params.variation;

    const branch = (
      pos: THREE.Vector3,
      dir: THREE.Vector3,
      level: number,
      length: number,
      radius: number
    ) => {
      if (level >= layers) return;
      if (rng() < 0.1 * variation && level > 1) return;

      const len = length * (0.8 + rng() * 0.4);
      const end = pos.clone().add(dir.clone().multiplyScalar(len));
      segments.push({ start: pos.clone(), end, radius, level });

      const branchCount = 1 + Math.floor(rng() * 3 + variation * 2);
      for (let i = 0; i < branchCount; i++) {
        const newDir = dir.clone();
        const angle = (15 + rng() * 45) * Math.PI / 180 * (1 + variation * 0.5);
        const rotAxis = new THREE.Vector3(
          rng() * 2 - 1,
          rng() * 0.5,
          rng() * 2 - 1
        ).normalize();
        newDir.applyAxisAngle(rotAxis, angle);
        branch(end, newDir, level + 1, length * (0.6 + rng() * 0.25), radius * (0.6 + rng() * 0.2));
      }
    };

    const startDir = new THREE.Vector3(0, 1, 0);
    const startPos = new THREE.Vector3(0, 0, 0);
    branch(startPos, startDir, 0, 1.5, 0.15);

    return segments;
  }

  private createTrunkGeometry(segments: BranchSegment[]): THREE.BufferGeometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const radialSegments = 8;

    let vertexIndex = 0;

    for (const seg of segments) {
      if (seg.level > 2) continue;

      const dir = new THREE.Vector3().subVectors(seg.end, seg.start);
      const len = dir.length();
      dir.normalize();

      const up = new THREE.Vector3(0, 1, 0);
      let tangent = new THREE.Vector3();
      if (Math.abs(dir.y) > 0.99) {
        tangent.set(1, 0, 0);
      } else {
        tangent.crossVectors(up, dir).normalize();
      }
      const bitangent = new THREE.Vector3().crossVectors(dir, tangent).normalize();

      const startRadius = seg.radius;
      const endRadius = seg.radius * 0.8;

      for (let i = 0; i <= radialSegments; i++) {
        const angle = (i / radialSegments) * Math.PI * 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const startNormal = new THREE.Vector3()
          .addScaledVector(tangent, cosA)
          .addScaledVector(bitangent, sinA)
          .normalize();

        const startPos = new THREE.Vector3()
          .copy(seg.start)
          .addScaledVector(startNormal, startRadius);

        positions.push(startPos.x, startPos.y, startPos.z);
        normals.push(startNormal.x, startNormal.y, startNormal.z);
        uvs.push(i / radialSegments, 0);

        const endNormal = startNormal.clone();
        const endPos = new THREE.Vector3()
          .copy(seg.end)
          .addScaledVector(endNormal, endRadius);

        positions.push(endPos.x, endPos.y, endPos.z);
        normals.push(endNormal.x, endNormal.y, endNormal.z);
        uvs.push(i / radialSegments, 1);

        if (i < radialSegments) {
          const a = vertexIndex;
          const b = vertexIndex + 1;
          const c = vertexIndex + 2;
          const d = vertexIndex + 3;

          indices.push(a, c, b);
          indices.push(b, c, d);
        }

        vertexIndex += 2;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    return geometry;
  }

  private createBranchLineSegments(segments: BranchSegment[]): THREE.LineSegments {
    const positions: number[] = [];
    const colors: number[] = [];

    for (const seg of segments) {
      positions.push(seg.start.x, seg.start.y, seg.start.z);
      positions.push(seg.end.x, seg.end.y, seg.end.z);

      const t = seg.level / this.params.branchLayers;
      const color = new THREE.Color().lerpColors(
        new THREE.Color(0x8D6E63),
        new THREE.Color(0x5D4037),
        t
      );
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 1
    });

    return new THREE.LineSegments(geometry, material);
  }

  private createFoliage(
    segments: BranchSegment[],
    rng: () => number,
    seed: number
  ): { points: THREE.Points; pulseData: FoliagePulseData } {
    const densityFactor = this.params.canopyDensity / 60;
    const particleCount = Math.floor((200 + densityFactor * 600));

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const baseSizes = new Float32Array(particleCount);
    const frequencies = new Float32Array(particleCount);
    const offsets = new Float32Array(particleCount);

    const pulseRng = this.seededRandom(seed + 5000);

    const endSegments = segments.filter(s => s.level >= this.params.branchLayers - 2);
    if (endSegments.length === 0) endSegments.push(...segments);

    for (let i = 0; i < particleCount; i++) {
      const seg = endSegments[Math.floor(rng() * endSegments.length)];
      const t = rng();
      const basePos = new THREE.Vector3().lerpVectors(seg.start, seg.end, t);

      const spread = (0.5 + rng() * 0.5) * (0.3 + this.params.canopyDensity / 200);
      const offset = new THREE.Vector3(
        (rng() - 0.5) * spread,
        (rng() - 0.5) * spread * 0.5,
        (rng() - 0.5) * spread
      );

      const pos = basePos.add(offset);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const heightT = Math.max(0, Math.min(1, (pos.y + 0.5) / 3));
      const color = new THREE.Color().lerpColors(
        FOLIAGE_COLOR_DARK,
        FOLIAGE_COLOR_LIGHT,
        heightT * (0.7 + rng() * 0.3)
      );
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      baseSizes[i] = 0.01 + pulseRng() * 0.02;
      frequencies[i] = 0.2 + pulseRng() * 0.3;
      offsets[i] = pulseRng() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aBaseSize', new THREE.BufferAttribute(baseSizes, 1));
    geometry.setAttribute('aFrequency', new THREE.BufferAttribute(frequencies, 1));
    geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSizeScale: { value: 30.0 }
      },
      vertexShader: `
        attribute float aBaseSize;
        attribute float aFrequency;
        attribute float aOffset;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uTime;
        uniform float uSizeScale;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float pulse = 0.7 + 0.3 * sin(uTime * aFrequency + aOffset);
          float size = aBaseSize * pulse * uSizeScale;
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const points = new THREE.Points(geometry, material);

    return {
      points,
      pulseData: { baseSizes, frequencies, offsets }
    };
  }

  private createBarkTextures(seed: number): { diffuse: THREE.Texture; normal: THREE.Texture } {
    const size = 256;
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const diffuseCtx = diffuseCanvas.getContext('2d')!;

    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = size;
    normalCanvas.height = size;
    const normalCtx = normalCanvas.getContext('2d')!;

    const rng = this.seededRandom(seed);

    const baseColor = { r: 93, g: 64, b: 55 };

    const diffuseData = diffuseCtx.createImageData(size, size);
    const normalData = normalCtx.createImageData(size, size);

    const grooveCount = 8 + Math.floor(rng() * 8);
    const groovePositions: { pos: number; width: number; depth: number }[] = [];
    for (let i = 0; i < grooveCount; i++) {
      groovePositions.push({
        pos: rng() * size,
        width: 3 + rng() * 10,
        depth: 0.3 + rng() * 0.5
      });
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        const noise1 = this.perlin2D(x * 0.04, y * 0.015, seed);
        const noise2 = this.perlin2D(x * 0.12, y * 0.06, seed + 100);
        const noise3 = this.perlin2D(x * 0.3, y * 0.2, seed + 200);
        const val = (noise1 * 0.6 + noise2 * 0.25 + noise3 * 0.15) * 50;

        let grooveDepth = 0;
        let grooveNormalX = 0;
        for (const groove of groovePositions) {
          const dist = Math.abs(x - groove.pos);
          const wobble = Math.sin(y * 0.05 + groove.pos * 0.1) * 3;
          const adjustedDist = Math.abs(x - (groove.pos + wobble));

          if (adjustedDist < groove.width) {
            const t = adjustedDist / groove.width;
            const depth = (1 - t * t) * groove.depth * 60;
            grooveDepth += depth;

            if (adjustedDist > 0.1) {
              const dx = (x - (groove.pos + wobble)) / adjustedDist;
              grooveNormalX += dx * groove.depth * (1 - t);
            }
          }
        }

        const totalNoise = val - grooveDepth * 0.8;

        diffuseData.data[idx] = Math.min(255, Math.max(0, baseColor.r + totalNoise));
        diffuseData.data[idx + 1] = Math.min(255, Math.max(0, baseColor.g + totalNoise * 0.75));
        diffuseData.data[idx + 2] = Math.min(255, Math.max(0, baseColor.b + totalNoise * 0.55));
        diffuseData.data[idx + 3] = 255;

        const nx = noise2 * 0.3 + grooveNormalX * 2;
        const ny = noise3 * 0.2;
        const nz = 1.0;

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        normalData.data[idx] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
        normalData.data[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
        normalData.data[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
        normalData.data[idx + 3] = 255;
      }
    }

    diffuseCtx.putImageData(diffuseData, 0, 0);
    normalCtx.putImageData(normalData, 0, 0);

    for (let i = 0; i < 15; i++) {
      const startX = rng() * size;
      const width = 0.5 + rng() * 2;
      const startY = Math.floor(rng() * size);
      const length = Math.floor(rng() * size * 0.6);

      diffuseCtx.strokeStyle = `rgba(35, 20, 15, ${0.25 + rng() * 0.35})`;
      diffuseCtx.lineWidth = width;
      diffuseCtx.beginPath();
      diffuseCtx.moveTo(startX, startY);
      for (let y = 0; y < length; y += 3) {
        const wobble = Math.sin(y * 0.08 + rng() * 15) * 4;
        diffuseCtx.lineTo(startX + wobble, startY + y);
      }
      diffuseCtx.stroke();

      normalCtx.strokeStyle = `rgba(180, 128, 128, ${0.3 + rng() * 0.4})`;
      normalCtx.lineWidth = width;
      normalCtx.beginPath();
      normalCtx.moveTo(startX, startY);
      for (let y = 0; y < length; y += 3) {
        const wobble = Math.sin(y * 0.08 + rng() * 15) * 4;
        normalCtx.lineTo(startX + wobble, startY + y);
      }
      normalCtx.stroke();
    }

    const diffuseTexture = new THREE.CanvasTexture(diffuseCanvas);
    diffuseTexture.wrapS = THREE.RepeatWrapping;
    diffuseTexture.wrapT = THREE.RepeatWrapping;
    diffuseTexture.repeat.set(1, 2);

    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(1, 2);

    return { diffuse: diffuseTexture, normal: normalTexture };
  }

  private perlin2D(x: number, y: number, seed: number): number {
    const perm = this.getPermutation(seed);

    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = perm[(X + perm[Y]) & 255];
    const ab = perm[(X + perm[Y + 1]) & 255];
    const ba = perm[(X + 1 + perm[Y]) & 255];
    const bb = perm[(X + 1 + perm[Y + 1]) & 255];

    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);

    return this.lerp(x1, x2, v);
  }

  private getPermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;

    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = Math.sin(s) * 10000;
      const j = Math.floor((s - Math.floor(s)) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    return [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
}
