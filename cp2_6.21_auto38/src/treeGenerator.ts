import * as THREE from 'three';

export type TreeType = 'lsystem' | 'recursive' | 'random';

export interface TreeParams {
  type: TreeType;
  crownDensity: number;
  branchLevels: number;
  randomness: number;
}

export interface TreeData {
  group: THREE.Group;
  trunkGeometry: THREE.BufferGeometry;
  branchGeometry: THREE.BufferGeometry;
  crownGeometry: THREE.BufferGeometry;
  swayOffset: number;
  swayFrequency: number;
  swayAmplitude: number;
}

interface BranchSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
}

export class TreeGenerator {
  private lsystemRules: Map<string, string>;
  private noiseCanvas: HTMLCanvasElement;
  private noiseTexture: THREE.CanvasTexture;

  constructor() {
    this.lsystemRules = new Map([
      ['F', 'FF+[+F-F-F]-[-F+F+F]']
    ]);
    this.noiseCanvas = document.createElement('canvas');
    this.noiseCanvas.width = 256;
    this.noiseCanvas.height = 256;
    this.noiseTexture = this.generateBarkTexture();
  }

  private generateBarkTexture(): THREE.CanvasTexture {
    const ctx = this.noiseCanvas.getContext('2d')!;
    const w = this.noiseCanvas.width;
    const h = this.noiseCanvas.height;
    
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const noise = this.valueNoise(x * 0.05, y * 0.05) * 0.5 + 
                      this.valueNoise(x * 0.1, y * 0.1) * 0.3 +
                      this.valueNoise(x * 0.2, y * 0.2) * 0.2;
        const base = 80 + noise * 60;
        const brown = base * 0.6;
        data[idx] = brown + 20;
        data[idx + 1] = brown + 10;
        data[idx + 2] = brown;
        data[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(this.noiseCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    return texture;
  }

  private valueNoise(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    
    const v00 = this.hash(xi, yi);
    const v10 = this.hash(xi + 1, yi);
    const v01 = this.hash(xi, yi + 1);
    const v11 = this.hash(xi + 1, yi + 1);
    
    const sx = xf * xf * (3 - 2 * xf);
    const sy = yf * yf * (3 - 2 * yf);
    
    const v0 = v00 + sx * (v10 - v00);
    const v1 = v01 + sx * (v11 - v01);
    
    return v0 + sy * (v1 - v0);
  }

  private hash(x: number, y: number): number {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  }

  generateTree(params: TreeParams): TreeData {
    const group = new THREE.Group();
    const segments: BranchSegment[] = [];
    
    switch (params.type) {
      case 'lsystem':
        this.generateLSystemTree(params, segments);
        break;
      case 'recursive':
        this.generateRecursiveTree(params, segments);
        break;
      case 'random':
        this.generateRandomTree(params, segments);
        break;
    }

    const trunkSegments = segments.filter(s => s.radius > 0.08);
    const branchSegments = segments.filter(s => s.radius <= 0.08);

    const trunkGeometry = this.createBranchGeometry(trunkSegments);
    const branchGeometry = this.createBranchGeometry(branchSegments);

    const trunkMaterial = new THREE.MeshStandardMaterial({
      map: this.noiseTexture,
      roughness: 0.9,
      metalness: 0.1
    });

    const branchMaterial = new THREE.MeshStandardMaterial({
      map: this.noiseTexture,
      roughness: 0.9,
      metalness: 0.1
    });

    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
    const branchMesh = new THREE.Mesh(branchGeometry, branchMaterial);
    
    group.add(trunkMesh);
    group.add(branchMesh);

    const crownParticles = this.createCrownParticles(params, segments);
    const crownMaterial = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });
    const crownPoints = new THREE.Points(crownParticles.geometry, crownMaterial);
    crownPoints.userData.isCrown = true;
    group.add(crownPoints);

    const swayOffset = Math.random() * Math.PI * 2;
    const swayFrequency = 0.3 + Math.random() * 0.5;
    const swayAmplitude = 0.02 + Math.random() * 0.03;

    return {
      group,
      trunkGeometry,
      branchGeometry,
      crownGeometry: crownParticles.geometry,
      swayOffset,
      swayFrequency,
      swayAmplitude
    };
  }

  private createBranchGeometry(segments: BranchSegment[]): THREE.BufferGeometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const radialSegments = 6;

    let vertexIndex = 0;

    for (const segment of segments) {
      const dir = new THREE.Vector3().subVectors(segment.end, segment.start);
      const length = dir.length();
      if (length < 0.01) continue;

      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

      for (let i = 0; i <= radialSegments; i++) {
        const angle = (i / radialSegments) * Math.PI * 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const bottomPos = new THREE.Vector3(
          cosA * segment.radius,
          0,
          sinA * segment.radius
        ).applyQuaternion(quaternion).add(segment.start);

        const topPos = new THREE.Vector3(
          cosA * segment.radius * 0.7,
          length,
          sinA * segment.radius * 0.7
        ).applyQuaternion(quaternion).add(segment.start);

        const normal = new THREE.Vector3(cosA, 0, sinA).applyQuaternion(quaternion);

        positions.push(bottomPos.x, bottomPos.y, bottomPos.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(i / radialSegments, 0);

        positions.push(topPos.x, topPos.y, topPos.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(i / radialSegments, 1);
      }

      for (let i = 0; i < radialSegments; i++) {
        const a = vertexIndex + i * 2;
        const b = vertexIndex + i * 2 + 1;
        const c = vertexIndex + (i + 1) * 2;
        const d = vertexIndex + (i + 1) * 2 + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }

      vertexIndex += (radialSegments + 1) * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  }

  private generateLSystemTree(params: TreeParams, segments: BranchSegment[]): void {
    const iterations = Math.min(params.branchLevels, 5);
    let axiom = 'F';
    
    for (let i = 0; i < iterations; i++) {
      let result = '';
      for (const char of axiom) {
        result += this.lsystemRules.get(char) || char;
      }
      axiom = result;
    }

    const stack: { pos: THREE.Vector3; dir: THREE.Vector3; radius: number }[] = [];
    let currentPos = new THREE.Vector3(0, 0, 0);
    let currentDir = new THREE.Vector3(0, 1, 0);
    let currentRadius = 0.15;
    const angle = 25 * (Math.PI / 180) * (1 + params.randomness * 0.5);
    const stepLength = 0.8 / iterations;

    for (const char of axiom) {
      switch (char) {
        case 'F':
          const length = stepLength * (0.8 + Math.random() * params.randomness * 0.4);
          const endPos = currentPos.clone().add(currentDir.clone().multiplyScalar(length));
          segments.push({
            start: currentPos.clone(),
            end: endPos,
            radius: currentRadius
          });
          currentPos = endPos;
          currentRadius *= 0.7;
          break;
        case '+':
          const rotAngle = angle * (0.8 + Math.random() * params.randomness * 0.4);
          currentDir.applyAxisAngle(new THREE.Vector3(0, 0, 1), rotAngle);
          break;
        case '-':
          const rotAngleNeg = angle * (0.8 + Math.random() * params.randomness * 0.4);
          currentDir.applyAxisAngle(new THREE.Vector3(0, 0, 1), -rotAngleNeg);
          break;
        case '[':
          stack.push({
            pos: currentPos.clone(),
            dir: currentDir.clone(),
            radius: currentRadius
          });
          const twist = (Math.random() - 0.5) * Math.PI * 2 * params.randomness;
          currentDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), twist);
          break;
        case ']':
          const state = stack.pop();
          if (state) {
            currentPos = state.pos;
            currentDir = state.dir;
            currentRadius = state.radius;
          }
          break;
      }
    }
  }

  private generateRecursiveTree(params: TreeParams, segments: BranchSegment[]): void {
    const angle = 30 * (Math.PI / 180);
    const length = 1.2;
    const radius = 0.15;
    const branchesPerLevel = 3;

    this.recursiveBranch(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      length,
      radius,
      params.branchLevels,
      angle,
      branchesPerLevel,
      params.randomness,
      segments
    );
  }

  private recursiveBranch(
    pos: THREE.Vector3,
    dir: THREE.Vector3,
    length: number,
    radius: number,
    level: number,
    angle: number,
    branches: number,
    randomness: number,
    segments: BranchSegment[]
  ): void {
    if (level <= 0) return;

    const actualLength = length * (1 + (Math.random() - 0.5) * randomness * 0.3);
    const endPos = pos.clone().add(dir.clone().multiplyScalar(actualLength));
    
    segments.push({
      start: pos.clone(),
      end: endPos,
      radius
    });

    for (let i = 0; i < branches; i++) {
      const branchAngle = angle * (1 + (Math.random() - 0.5) * randomness * 0.5);
      const rotationY = (i / branches) * Math.PI * 2 + Math.random() * randomness * 0.5;
      
      let branchDir = dir.clone();
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      if (right.lengthSq() < 0.01) {
        right.set(1, 0, 0);
      }
      
      branchDir.applyAxisAngle(right, branchAngle);
      branchDir.applyAxisAngle(dir, rotationY);
      branchDir.normalize();

      this.recursiveBranch(
        endPos,
        branchDir,
        length * 0.65,
        radius * 0.6,
        level - 1,
        angle * 0.9,
        branches,
        randomness,
        segments
      );
    }
  }

  private generateRandomTree(params: TreeParams, segments: BranchSegment[]): void {
    const length = 1.2;
    const radius = 0.15;

    this.randomBranch(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      length,
      radius,
      params.branchLevels,
      params.randomness,
      segments
    );
  }

  private randomBranch(
    pos: THREE.Vector3,
    dir: THREE.Vector3,
    length: number,
    radius: number,
    level: number,
    randomness: number,
    segments: BranchSegment[]
  ): void {
    if (level <= 0) return;

    const actualLength = length * (0.7 + Math.random() * 0.6);
    const endPos = pos.clone().add(dir.clone().multiplyScalar(actualLength));
    
    segments.push({
      start: pos.clone(),
      end: endPos,
      radius
    });

    const branchCount = Math.floor(2 + Math.random() * 3 * randomness + (1 - randomness) * 1);
    
    for (let i = 0; i < branchCount; i++) {
      const angle = (20 + Math.random() * 40 * randomness) * (Math.PI / 180);
      const rotationY = Math.random() * Math.PI * 2;
      
      let branchDir = dir.clone();
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      if (right.lengthSq() < 0.01) {
        right.set(1, 0, 0);
      }
      
      branchDir.applyAxisAngle(right, angle);
      branchDir.applyAxisAngle(dir, rotationY);
      branchDir.normalize();

      this.randomBranch(
        endPos,
        branchDir,
        length * (0.55 + Math.random() * 0.2),
        radius * (0.5 + Math.random() * 0.2),
        level - 1,
        randomness,
        segments
      );
    }
  }

  private createCrownParticles(params: TreeParams, segments: BranchSegment[]): { geometry: THREE.BufferGeometry } {
    const particleCount = Math.floor(200 + (params.crownDensity / 100) * 600);
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    const tipSegments = segments.filter(s => s.radius < 0.06);
    const lightGreen = new THREE.Color(0x8BC34A);
    const darkGreen = new THREE.Color(0x2E7D32);

    if (tipSegments.length === 0) {
      tipSegments.push(...segments.slice(-5));
    }

    for (let i = 0; i < particleCount; i++) {
      const segment = tipSegments[Math.floor(Math.random() * tipSegments.length)];
      
      const t = Math.random();
      const basePos = new THREE.Vector3().lerpVectors(segment.start, segment.end, 0.5 + t * 0.5);
      
      const spread = 0.3 + params.crownDensity * 0.003;
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.5,
        (Math.random() - 0.5) * spread
      );
      
      const pos = basePos.add(offset);
      positions.push(pos.x, pos.y, pos.z);

      const colorMix = Math.random();
      const color = lightGreen.clone().lerp(darkGreen, colorMix);
      colors.push(color.r, color.g, color.b);

      const size = 0.01 + Math.random() * 0.02;
      sizes.push(size);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return { geometry };
  }

  createMorphTargets(fromData: TreeData, toData: TreeData, t: number): void {
    const fromPositions = fromData.trunkGeometry.attributes.position as THREE.BufferAttribute;
    const toPositions = toData.trunkGeometry.attributes.position as THREE.BufferAttribute;
    const firstChild = fromData.group.children[0] as THREE.Mesh | undefined;
    const targetPositions = firstChild?.geometry.attributes.position as THREE.BufferAttribute | undefined;
    
    if (fromPositions && toPositions && targetPositions) {
      const count = Math.min(fromPositions.count, toPositions.count, targetPositions.count);
      for (let i = 0; i < count; i++) {
        const x = fromPositions.getX(i) * (1 - t) + toPositions.getX(i) * t;
        const y = fromPositions.getY(i) * (1 - t) + toPositions.getY(i) * t;
        const z = fromPositions.getZ(i) * (1 - t) + toPositions.getZ(i) * t;
        targetPositions.setXYZ(i, x, y, z);
      }
      targetPositions.needsUpdate = true;
    }
  }

  getNoiseTexture(): THREE.CanvasTexture {
    return this.noiseTexture;
  }
}
