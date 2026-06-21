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
    const trunkMaterial = new THREE.MeshLambertMaterial({
      color: TRUNK_COLOR,
      map: this.createBarkTexture(seed)
    });
    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
    group.add(trunkMesh);

    const branchLineSegments = this.createBranchLineSegments(segments);
    group.add(branchLineSegments);

    const foliage = this.createFoliage(segments, rng);
    group.add(foliage);

    return {
      group,
      branchSegments: [branchLineSegments],
      foliageParticles: foliage,
      params: { ...this.params }
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

  private createFoliage(segments: BranchSegment[], rng: () => number): THREE.Points {
    const densityFactor = this.params.canopyDensity / 60;
    const particleCount = Math.floor((200 + densityFactor * 600));

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

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

      sizes[i] = 0.01 + rng() * 0.02;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
  }

  private createBarkTexture(seed: number): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const baseColor = '#5D4037';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);

    const rng = this.seededRandom(seed);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const noise = this.perlin2D(x * 0.05, y * 0.02, seed);
        const noise2 = this.perlin2D(x * 0.15, y * 0.08, seed + 100);
        const val = (noise * 0.7 + noise2 * 0.3) * 40 + 20;

        data[idx] = Math.min(255, Math.max(0, 93 + val));
        data[idx + 1] = Math.min(255, Math.max(0, 64 + val * 0.7));
        data[idx + 2] = Math.min(255, Math.max(0, 55 + val * 0.5));
      }
    }

    for (let i = 0; i < 20; i++) {
      const x = Math.floor(rng() * size);
      const width = 1 + Math.floor(rng() * 3);
      const startY = Math.floor(rng() * size);
      const length = Math.floor(rng() * size * 0.5);

      ctx.strokeStyle = `rgba(40, 25, 20, ${0.3 + rng() * 0.3})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x, startY);
      for (let y = 0; y < length; y += 2) {
        const wobble = Math.sin(y * 0.1 + rng() * 10) * 2;
        ctx.lineTo(x + wobble, startY + y);
      }
      ctx.stroke();
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 2);

    return texture;
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
