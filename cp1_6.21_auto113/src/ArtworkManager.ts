import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { ProjectData, Artwork } from './types';

export class ArtworkManager {
  public artworks: Artwork[] = [];
  public scene: THREE.Scene;
  
  private particleSystems: Map<string, THREE.Points> = new Map();
  private particleData: Map<string, { velocities: Float32Array; lifetimes: Float32Array }> = new Map();
  private hoverDistance: number = 2;
  private rotationSpeed: number = 10 * (Math.PI / 180);
  private hoverScale: number = 1.2;
  
  private textureLoader: THREE.TextureLoader;
  private loadingManager: THREE.LoadingManager;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loadingManager = new THREE.LoadingManager();
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.textureLoader.crossOrigin = 'anonymous';
  }

  public async loadProjects(projectData: ProjectData[]): Promise<void> {
    const positions = this.calculateArtworkPositions();

    for (let i = 0; i < projectData.length && i < positions.length; i++) {
      const data = projectData[i];
      const pos = positions[i];
      const artwork = await this.createArtwork(data, pos);
      this.artworks.push(artwork);
      this.createParticleSystem(artwork);
    }
  }

  private calculateArtworkPositions(): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const yPos = 1.6;
    const wallZ = -4.5;
    
    const colSpacing = 2.5;
    const rowSpacing = 1.5;
    const startX = -colSpacing;
    const startY = yPos + rowSpacing / 2;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const x = startX + col * colSpacing;
        const y = startY - row * rowSpacing;
        positions.push(new THREE.Vector3(x, y, wallZ));
      }
    }

    return positions;
  }

  private async createArtwork(data: ProjectData, position: THREE.Vector3): Promise<Artwork> {
    const group = new THREE.Group();
    
    const frameWidth = 1.2;
    const frameHeight = 0.8;
    const frameDepth = 0.05;
    const borderWidth = 0.04;

    const frameGeometry = new THREE.BoxGeometry(frameWidth, frameHeight, frameDepth);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0xd4af37,
      emissiveIntensity: 0.15
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.castShadow = true;
    frame.receiveShadow = true;
    group.add(frame);

    const innerWidth = frameWidth - borderWidth * 2;
    const innerHeight = frameHeight - borderWidth * 2;
    
    const canvasTexture = await this.loadTexture(data.previewImageUrl, innerWidth, innerHeight);
    
    const planeGeometry = new THREE.PlaneGeometry(innerWidth, innerHeight);
    const planeMaterial = new THREE.MeshStandardMaterial({
      map: canvasTexture,
      roughness: 0.8,
      metalness: 0.0
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.z = frameDepth / 2 + 0.001;
    plane.castShadow = false;
    plane.receiveShadow = false;
    group.add(plane);

    group.position.copy(position);
    group.lookAt(position.x, position.y, position.z + 1);

    const artwork: Artwork = {
      id: data.id || uuidv4(),
      mesh: group,
      data,
      isHovered: false,
      baseScale: 1,
      baseRotation: group.rotation.clone(),
      basePosition: group.position.clone()
    };

    return artwork;
  }

  private async loadTexture(url: string, width: number, height: number): Promise<THREE.Texture> {
    return new Promise((resolve) => {
      this.textureLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          resolve(texture);
        },
        undefined,
        () => {
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(width * 512);
          canvas.height = Math.floor(height * 512);
          const ctx = canvas.getContext('2d')!;
          
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, '#4a5568');
          gradient.addColorStop(0.5, '#2d3748');
          gradient.addColorStop(1, '#1a202c');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('项目预览', canvas.width / 2, canvas.height / 2);
          
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        }
      );
    });
  }

  private createParticleSystem(artwork: Artwork): void {
    const particleCount = 30;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);

    const baseColor = new THREE.Color(0xd4af37);
    const highlightColor = new THREE.Color(0xffd700);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      positions[i3] = (Math.random() - 0.5) * 0.8;
      positions[i3 + 1] = (Math.random() - 0.5) * 0.4;
      positions[i3 + 2] = (Math.random() - 0.5) * 0.1;
      
      const colorMix = Math.random();
      const mixedColor = baseColor.clone().lerp(highlightColor, colorMix);
      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
      
      sizes[i] = 0.05 + Math.random() * 0.1;
      
      velocities[i3] = (Math.random() - 0.5) * 0.2;
      velocities[i3 + 1] = 0.3 + Math.random() * 0.4;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;
      
      lifetimes[i] = Math.random() * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    particles.position.copy(artwork.basePosition);
    particles.position.z += 0.1;
    particles.visible = false;
    
    this.scene.add(particles);
    this.particleSystems.set(artwork.id, particles);
    this.particleData.set(artwork.id, { velocities, lifetimes });
  }

  public update(playerPosition: THREE.Vector3, deltaTime: number): void {
    for (const artwork of this.artworks) {
      const distance = artwork.basePosition.distanceTo(playerPosition);
      const wasHovered = artwork.isHovered;
      artwork.isHovered = distance < this.hoverDistance;

      if (artwork.isHovered) {
        const targetScale = this.hoverScale;
        artwork.mesh.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          deltaTime * 5
        );
        
        artwork.mesh.rotation.y += this.rotationSpeed * deltaTime;
        
        if (!wasHovered) {
          const particles = this.particleSystems.get(artwork.id);
          if (particles) particles.visible = true;
        }
      } else {
        artwork.mesh.scale.lerp(
          new THREE.Vector3(1, 1, 1),
          deltaTime * 5
        );
        
        artwork.mesh.rotation.y = THREE.MathUtils.lerp(
          artwork.mesh.rotation.y,
          artwork.baseRotation.y,
          deltaTime * 3
        );
        
        if (wasHovered) {
          const particles = this.particleSystems.get(artwork.id);
          if (particles) particles.visible = false;
        }
      }

      if (artwork.isHovered) {
        this.updateParticles(artwork, deltaTime);
      }
    }
  }

  private updateParticles(artwork: Artwork, deltaTime: number): void {
    const particles = this.particleSystems.get(artwork.id);
    const particleData = this.particleData.get(artwork.id);
    
    if (!particles || !particleData) return;

    const positions = particles.geometry.attributes.position.array as Float32Array;
    const { velocities, lifetimes } = particleData;
    const particleCount = positions.length / 3;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      lifetimes[i] -= deltaTime;
      
      if (lifetimes[i] <= 0) {
        positions[i3] = (Math.random() - 0.5) * 0.8;
        positions[i3 + 1] = -0.3;
        positions[i3 + 2] = (Math.random() - 0.5) * 0.1;
        lifetimes[i] = 1.5 + Math.random() * 1;
      } else {
        positions[i3] += velocities[i3] * deltaTime;
        positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
        positions[i3 + 2] += velocities[i3 + 2] * deltaTime;
      }
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.position.copy(artwork.mesh.position);
    particles.position.z += 0.15;
  }

  public findArtworkByMesh(mesh: THREE.Object3D): Artwork | null {
    for (const artwork of this.artworks) {
      if (artwork.mesh === mesh || artwork.mesh.children.includes(mesh as THREE.Mesh)) {
        return artwork;
      }
      let parent = mesh.parent;
      while (parent) {
        if (parent === artwork.mesh) {
          return artwork;
        }
        parent = parent.parent;
      }
    }
    return null;
  }

  public getHoveredArtworks(): Artwork[] {
    return this.artworks.filter(a => a.isHovered);
  }

  public getNearestArtwork(position: THREE.Vector3): Artwork | null {
    if (this.artworks.length === 0) return null;
    
    let nearest = this.artworks[0];
    let minDist = nearest.basePosition.distanceTo(position);
    
    for (let i = 1; i < this.artworks.length; i++) {
      const dist = this.artworks[i].basePosition.distanceTo(position);
      if (dist < minDist) {
        minDist = dist;
        nearest = this.artworks[i];
      }
    }
    
    return nearest;
  }

  public onLoad(callback: () => void): void {
    this.loadingManager.onLoad = callback;
  }
}
