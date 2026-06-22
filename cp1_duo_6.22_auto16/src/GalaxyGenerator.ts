import * as THREE from 'three';

export interface StarData {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  baseSize: number;
  twinkleFrequency1: number;
  twinkleFrequency2: number;
  twinkleAmplitude1: number;
  twinkleAmplitude2: number;
  noiseOffset: number;
  phaseOffset: number;
}

export class GalaxyGenerator {
  private scene: THREE.Scene;
  private starCount: number;
  private stars: StarData[] = [];
  private galaxyRadius: number = 500;

  constructor(scene: THREE.Scene, starCount: number = 1500) {
    this.scene = scene;
    this.starCount = starCount;
  }

  private createStarTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createGlowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private getStarColor(distance: number): THREE.Color {
    const normalizedDist = Math.min(distance / this.galaxyRadius, 1);
    const color = new THREE.Color();
    
    const temp = 1 - normalizedDist;
    
    if (temp > 0.7) {
      const t = (temp - 0.7) / 0.3;
      color.setRGB(0.8 + t * 0.2, 0.9 + t * 0.1, 1.0);
    } else if (temp > 0.4) {
      const t = (temp - 0.4) / 0.3;
      color.setRGB(0.9 + t * (-0.1), 0.95 + t * (-0.05), 1.0);
    } else if (temp > 0.2) {
      const t = (temp - 0.2) / 0.2;
      color.setRGB(1.0, 0.9 + t * 0.05, 0.85 + t * (-0.1));
    } else {
      const t = temp / 0.2;
      color.setRGB(1.0, 0.5 + t * 0.4, 0.3 + t * (-0.05));
    }
    
    return color;
  }

  private getSpiralPosition(index: number, total: number): THREE.Vector3 {
    const arms = 4;
    const armOffset = (index % arms) * ((Math.PI * 2) / arms);
    const progress = index / total;
    
    const distance = Math.pow(progress, 0.6) * this.galaxyRadius + (Math.random() - 0.5) * 60;
    const angle = armOffset + progress * Math.PI * 3 + (Math.random() - 0.5) * 0.8;
    
    const x = Math.cos(angle) * distance;
    const y = (Math.random() - 0.5) * 40 * (1 - progress * 0.7);
    const z = Math.sin(angle) * distance;
    
    return new THREE.Vector3(x, y, z);
  }

  private static noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = GalaxyGenerator.fade(x);
    const v = GalaxyGenerator.fade(y);
    const w = GalaxyGenerator.fade(z);
    const A = GalaxyGenerator.p[X] + Y;
    const AA = GalaxyGenerator.p[A] + Z;
    const AB = GalaxyGenerator.p[A + 1] + Z;
    const B = GalaxyGenerator.p[X + 1] + Y;
    const BA = GalaxyGenerator.p[B] + Z;
    const BB = GalaxyGenerator.p[B + 1] + Z;
    return GalaxyGenerator.lerp(w,
      GalaxyGenerator.lerp(v,
        GalaxyGenerator.lerp(u, GalaxyGenerator.grad(GalaxyGenerator.p[AA], x, y, z),
          GalaxyGenerator.grad(GalaxyGenerator.p[BA], x - 1, y, z)),
        GalaxyGenerator.lerp(u, GalaxyGenerator.grad(GalaxyGenerator.p[AB], x, y - 1, z),
          GalaxyGenerator.grad(GalaxyGenerator.p[BB], x - 1, y - 1, z))),
      GalaxyGenerator.lerp(v,
        GalaxyGenerator.lerp(u, GalaxyGenerator.grad(GalaxyGenerator.p[AA + 1], x, y, z - 1),
          GalaxyGenerator.grad(GalaxyGenerator.p[BA + 1], x - 1, y, z - 1)),
        GalaxyGenerator.lerp(u, GalaxyGenerator.grad(GalaxyGenerator.p[AB + 1], x, y - 1, z - 1),
          GalaxyGenerator.grad(GalaxyGenerator.p[BB + 1], x - 1, y - 1, z - 1))));
  }

  private static fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private static lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private static grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private static readonly p: number[] = (() => {
    const permutation = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
      140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
      247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
      57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
      74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
      60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
      65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
      200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
      52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
      207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
      119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
      129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
      218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
      81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
      184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
      222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];
    const p = new Array(512);
    for (let i = 0; i < 256; i++) {
      p[256 + i] = p[i] = permutation[i];
    }
    return p;
  })();

  generate(): StarData[] {
    const starTexture = this.createStarTexture();
    const glowTexture = this.createGlowTexture();
    
    for (let i = 0; i < this.starCount; i++) {
      const position = this.getSpiralPosition(i, this.starCount);
      const distance = position.length();
      const color = this.getStarColor(distance);
      
      const baseSize = 0.5 + Math.random() * 2.5;
      
      const starGeometry = new THREE.PlaneGeometry(baseSize * 2, baseSize * 2);
      const starMaterial = new THREE.MeshBasicMaterial({
        color: color,
        map: starTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const star = new THREE.Mesh(starGeometry, starMaterial);
      star.position.copy(position);
      
      const glowSize = baseSize * (3 + Math.random() * 2);
      const glowGeometry = new THREE.PlaneGeometry(glowSize, glowSize);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        map: glowTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.6
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(position);
      
      this.scene.add(star);
      this.scene.add(glow);
      
      this.stars.push({
        mesh: star,
        glowMesh: glow,
        baseSize,
        twinkleFrequency1: 0.5 + Math.random() * 2.0,
        twinkleFrequency2: 1.5 + Math.random() * 3.0,
        twinkleAmplitude1: 0.08 + Math.random() * 0.12,
        twinkleAmplitude2: 0.03 + Math.random() * 0.07,
        noiseOffset: Math.random() * 1000,
        phaseOffset: Math.random() * Math.PI * 2
      });
    }
    
    this.createNebulaLayers();
    
    return this.stars;
  }

  private createNebulaLayers(): void {
    const nebulaColors = [
      new THREE.Color(0x1a0a3d),
      new THREE.Color(0x0a1a3d),
      new THREE.Color(0x2d0a3d),
      new THREE.Color(0x0a2d3d)
    ];
    
    for (let i = 0; i < 4; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      
      const imageData = ctx.createImageData(512, 512);
      for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4;
          const nx = x / 512 * 4;
          const ny = y / 512 * 4;
          const noiseVal = GalaxyGenerator.noise(nx + i * 10, ny + i * 10, i * 0.5);
          const normalized = (noiseVal + 1) / 2;
          
          const color = nebulaColors[i];
          imageData.data[idx] = Math.floor(color.r * 255 * normalized * 0.15);
          imageData.data[idx + 1] = Math.floor(color.g * 255 * normalized * 0.15);
          imageData.data[idx + 2] = Math.floor(color.b * 255 * normalized * 0.15);
          imageData.data[idx + 3] = Math.floor(normalized * 40);
        }
      }
      ctx.putImageData(imageData, 0, 0);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      
      const nebulaGeometry = new THREE.SphereGeometry(this.galaxyRadius * 1.5 + i * 20, 32, 32);
      const nebulaMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false
      });
      
      const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
      nebula.userData.rotationSpeed = 0.0001 * (i + 1);
      nebula.userData.isNebula = true;
      this.scene.add(nebula);
    }
  }

  updateStars(time: number, camera: THREE.Camera): void {
    for (const star of this.stars) {
      const sine1 = Math.sin(time * star.twinkleFrequency1 + star.phaseOffset);
      const sine2 = Math.sin(time * star.twinkleFrequency2 + star.phaseOffset * 1.5);
      const noiseVal = GalaxyGenerator.noise(
        time * 0.3 + star.noiseOffset,
        star.phaseOffset,
        0
      );
      
      const twinkle = 
        sine1 * star.twinkleAmplitude1 +
        sine2 * star.twinkleAmplitude2 +
        noiseVal * 0.05;
      
      const scale = 1 + twinkle;
      
      star.mesh.scale.setScalar(scale);
      star.glowMesh.scale.setScalar(scale);
      
      const opacity = 0.7 + twinkle * 0.5;
      (star.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, Math.max(0.3, opacity));
      (star.glowMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.8, Math.max(0.2, opacity * 0.5));
      
      star.mesh.lookAt(camera.position);
      star.glowMesh.lookAt(camera.position);
    }
    
    this.scene.children.forEach(child => {
      if (child.userData.isNebula) {
        child.rotation.y += child.userData.rotationSpeed;
        child.rotation.x += child.userData.rotationSpeed * 0.3;
      }
    });
  }

  getStarCount(): number {
    return this.starCount;
  }
}
