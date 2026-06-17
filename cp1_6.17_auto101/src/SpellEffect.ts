import * as THREE from 'three';
import { SpellType } from './GestureRecognizer';

export interface SpellEffect {
  update(delta: number): boolean;
  dispose(): void;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export class SpellEffectManager {
  private scene: THREE.Scene;
  private effects: SpellEffect[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  castSpell(
    type: SpellType,
    startPos: THREE.Vector3,
    targetPos: THREE.Vector3
  ): void {
    switch (type) {
      case 'fireball':
        this.effects.push(new FireballEffect(this.scene, startPos, targetPos));
        break;
      case 'iceSpike':
        this.effects.push(new IceSpikeEffect(this.scene, startPos, targetPos));
        break;
      case 'lightning':
        this.effects.push(new LightningEffect(this.scene, startPos, targetPos));
        break;
    }
  }

  update(delta: number): void {
    this.effects = this.effects.filter(effect => {
      const alive = effect.update(delta);
      if (!alive) effect.dispose();
      return alive;
    });
  }

  dispose(): void {
    this.effects.forEach(e => e.dispose());
    this.effects = [];
  }
}

class FireballEffect implements SpellEffect {
  private scene: THREE.Scene;
  private fireball: THREE.Mesh;
  private trailParticles: Particle[] = [];
  private trailGeometry: THREE.BufferGeometry;
  private trailMaterial: THREE.PointsMaterial;
  private trailPoints: THREE.Points;
  private explosionParticles: Particle[] = [];
  private explosionGeometry: THREE.BufferGeometry;
  private explosionMaterial: THREE.PointsMaterial;
  private explosionPoints: THREE.Points;
  private startPos: THREE.Vector3;
  private targetPos: THREE.Vector3;
  private phase: 'flying' | 'exploding' | 'done' = 'flying';
  private progress = 0;
  private flightDuration = 0.8;
  private explosionDuration = 1.5;
  private explosionTime = 0;
  private maxTrailParticles = 80;
  private maxExplosionParticles = 10;

  constructor(scene: THREE.Scene, startPos: THREE.Vector3, targetPos: THREE.Vector3) {
    this.scene = scene;
    this.startPos = startPos.clone();
    this.targetPos = targetPos.clone();

    const fireballGeometry = new THREE.SphereGeometry(0.25, 24, 24);
    const fireballMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0xff6600) },
        color2: { value: new THREE.Color(0xff3300) },
        color3: { value: new THREE.Color(0xffff00) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          float noise = sin(vPos.x * 10.0 + time * 5.0) * cos(vPos.y * 10.0 + time * 3.0);
          float intensity = (vNormal.z + 1.0) * 0.5;
          vec3 color = mix(color2, color1, intensity + noise * 0.2);
          color = mix(color, color3, pow(intensity, 3.0));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: false
    });
    this.fireball = new THREE.Mesh(fireballGeometry, fireballMaterial);
    this.fireball.position.copy(startPos);

    const light = new THREE.PointLight(0xff6600, 3, 8);
    this.fireball.add(light);
    this.scene.add(this.fireball);

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.trailPoints = new THREE.Points(this.trailGeometry, this.trailMaterial);
    this.scene.add(this.trailPoints);

    this.explosionGeometry = new THREE.BufferGeometry();
    this.explosionMaterial = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });
    this.explosionPoints = new THREE.Points(this.explosionGeometry, this.explosionMaterial);
    this.scene.add(this.explosionPoints);
  }

  update(delta: number): boolean {
    if (this.phase === 'flying') {
      this.progress += delta / this.flightDuration;
      const t = Math.min(this.progress, 1);
      const easeT = t * t * (3 - 2 * t);
      this.fireball.position.lerpVectors(this.startPos, this.targetPos, easeT);

      (this.fireball.material as THREE.ShaderMaterial).uniforms.time.value += delta;
      this.fireball.scale.setScalar(1 + Math.sin(easeT * Math.PI * 2) * 0.1);

      this.addTrailParticle();
      this.updateTrail(delta);

      if (this.progress >= 1) {
        this.phase = 'exploding';
        this.createExplosion();
        this.scene.remove(this.fireball);
      }
    } else if (this.phase === 'exploding') {
      this.explosionTime += delta;
      const alpha = 1 - this.explosionTime / this.explosionDuration;
      this.updateExplosion(delta, alpha);
      this.updateTrail(delta);

      if (this.explosionTime >= this.explosionDuration) {
        this.phase = 'done';
        return false;
      }
    }

    return true;
  }

  private addTrailParticle(): void {
    if (this.trailParticles.length >= this.maxTrailParticles) return;
    const colors = [0xff6600, 0xff3300, 0xffff00, 0xff9933];
    this.trailParticles.push({
      position: this.fireball.position.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        )
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        Math.random() * 0.5 + 0.2,
        (Math.random() - 0.5) * 0.5
      ),
      life: 0.6,
      maxLife: 0.6,
      size: 0.08 + Math.random() * 0.08,
      color: new THREE.Color(colors[Math.floor(Math.random() * colors.length)])
    });
  }

  private updateTrail(delta: number): void {
    this.trailParticles = this.trailParticles.filter(p => {
      p.life -= delta;
      p.position.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.multiplyScalar(0.96);
      return p.life > 0;
    });

    const positions = new Float32Array(this.trailParticles.length * 3);
    const colors = new Float32Array(this.trailParticles.length * 3);
    const sizes = new Float32Array(this.trailParticles.length);

    this.trailParticles.forEach((p, i) => {
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      const alpha = p.life / p.maxLife;
      colors[i * 3] = p.color.r * alpha;
      colors[i * 3 + 1] = p.color.g * alpha;
      colors[i * 3 + 2] = p.color.b * alpha;
      sizes[i] = p.size * alpha;
    });

    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.trailMaterial.size = 0.15;
  }

  private createExplosion(): void {
    for (let i = 0; i < this.maxExplosionParticles; i++) {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI - Math.PI / 2;
      const speed = 1.5 + Math.random() * 2;
      const colors = [0xff6600, 0xff3300, 0xffff00, 0xff9900];
      this.explosionParticles.push({
        position: this.targetPos.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle1) * Math.cos(angle2) * speed,
          Math.sin(angle2) * speed,
          Math.sin(angle1) * Math.cos(angle2) * speed
        ),
        life: this.explosionDuration,
        maxLife: this.explosionDuration,
        size: 0.15 + Math.random() * 0.2,
        color: new THREE.Color(colors[Math.floor(Math.random() * colors.length)])
      });
    }

    const flashLight = new THREE.PointLight(0xffff00, 8, 10);
    flashLight.position.copy(this.targetPos);
    this.scene.add(flashLight);
    setTimeout(() => this.scene.remove(flashLight), 150);
  }

  private updateExplosion(delta: number, alpha: number): void {
    this.explosionParticles.forEach(p => {
      p.position.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.multiplyScalar(0.94);
      p.velocity.y -= delta * 1.5;
    });

    const positions = new Float32Array(this.explosionParticles.length * 3);
    const colors = new Float32Array(this.explosionParticles.length * 3);

    this.explosionParticles.forEach((p, i) => {
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      colors[i * 3] = p.color.r * alpha;
      colors[i * 3 + 1] = p.color.g * alpha;
      colors[i * 3 + 2] = p.color.b * alpha;
    });

    this.explosionGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.explosionGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.explosionMaterial.size = 0.3 * (1 + (1 - alpha) * 2);
    this.explosionMaterial.opacity = alpha;
  }

  dispose(): void {
    if (this.fireball.parent) this.scene.remove(this.fireball);
    this.scene.remove(this.trailPoints);
    this.scene.remove(this.explosionPoints);
    this.fireball.geometry.dispose();
    (this.fireball.material as THREE.Material).dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    this.explosionGeometry.dispose();
    this.explosionMaterial.dispose();
  }
}

class IceSpikeEffect implements SpellEffect {
  private scene: THREE.Scene;
  private spike: THREE.Mesh;
  private shards: THREE.Mesh[] = [];
  private frostTexture: THREE.Mesh;
  private startPos: THREE.Vector3;
  private targetPos: THREE.Vector3;
  private phase: 'flying' | 'shattering' | 'done' = 'flying';
  private progress = 0;
  private flightDuration = 0.5;
  private shatterDuration = 0.8;
  private shatterTime = 0;

  constructor(scene: THREE.Scene, startPos: THREE.Vector3, targetPos: THREE.Vector3) {
    this.scene = scene;
    this.startPos = startPos.clone();
    this.targetPos = targetPos.clone();

    const spikeGeometry = new THREE.ConeGeometry(0.15, 0.8, 6);
    const spikeMaterial = new THREE.MeshPhongMaterial({
      color: 0x88ddff,
      transparent: true,
      opacity: 0.75,
      shininess: 120,
      specular: 0xffffff,
      side: THREE.DoubleSide
    });
    this.spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    this.spike.position.copy(startPos);

    const direction = new THREE.Vector3().subVectors(targetPos, startPos).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    this.spike.quaternion.copy(quaternion);

    const light = new THREE.PointLight(0x88ddff, 2, 5);
    this.spike.add(light);
    this.scene.add(this.spike);

    const frostGeometry = new THREE.PlaneGeometry(0.5, 0.5);
    const frostCanvas = this.createFrostTexture();
    const frostTextureMat = new THREE.CanvasTexture(frostCanvas);
    const frostMaterial = new THREE.MeshBasicMaterial({
      map: frostTextureMat,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.frostTexture = new THREE.Mesh(frostGeometry, frostMaterial);
    this.frostTexture.position.copy(targetPos);
    this.scene.add(this.frostTexture);
  }

  private createFrostTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 256);

    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = 10 + Math.random() * 30;
      ctx.strokeStyle = `rgba(200, 240, 255, ${0.3 + Math.random() * 0.5})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      this.drawHexagon(ctx, x, y, size);
    }

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(180, 230, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(180, 230, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    return canvas;
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  update(delta: number): boolean {
    if (this.phase === 'flying') {
      this.progress += delta / this.flightDuration;
      const t = Math.min(this.progress, 1);
      this.spike.position.lerpVectors(this.startPos, this.targetPos, t);
      this.spike.rotation.y += delta * 5;

      if (this.progress >= 1) {
        this.phase = 'shattering';
        this.createShards();
        this.scene.remove(this.spike);
      }
    } else if (this.phase === 'shattering') {
      this.shatterTime += delta;
      const alpha = 1 - this.shatterTime / this.shatterDuration;
      this.updateShards(delta, alpha);
      (this.frostTexture.material as THREE.MeshBasicMaterial).opacity = alpha * 0.8;
      this.frostTexture.lookAt(this.spike.position);

      if (this.shatterTime >= this.shatterDuration) {
        this.phase = 'done';
        return false;
      }
    }
    return true;
  }

  private createShards(): void {
    const colors = [0x88ddff, 0xaaddff, 0x66ccff, 0x99eeff];
    for (let i = 0; i < 8; i++) {
      const shardGeo = new THREE.ConeGeometry(0.03 + Math.random() * 0.03, 0.1 + Math.random() * 0.15, 4);
      const shardMat = new THREE.MeshPhongMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.85,
        shininess: 100
      });
      const shard = new THREE.Mesh(shardGeo, shardMat);
      shard.position.copy(this.targetPos);
      shard.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 2 + 0.5,
          (Math.random() - 0.5) * 3
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        )
      };
      this.shards.push(shard);
      this.scene.add(shard);
    }
  }

  private updateShards(delta: number, alpha: number): void {
    this.shards.forEach(shard => {
      const { velocity, rotationSpeed } = shard.userData;
      shard.position.add(velocity.clone().multiplyScalar(delta));
      velocity.y -= delta * 3;
      shard.rotation.x += rotationSpeed.x * delta;
      shard.rotation.y += rotationSpeed.y * delta;
      shard.rotation.z += rotationSpeed.z * delta;
      (shard.material as THREE.MeshPhongMaterial).opacity = alpha * 0.85;
    });
  }

  dispose(): void {
    if (this.spike.parent) this.scene.remove(this.spike);
    this.shards.forEach(s => {
      this.scene.remove(s);
      s.geometry.dispose();
      (s.material as THREE.Material).dispose();
    });
    this.scene.remove(this.frostTexture);
    this.spike.geometry.dispose();
    (this.spike.material as THREE.Material).dispose();
    this.frostTexture.geometry.dispose();
    (this.frostTexture.material as THREE.Material).dispose();
  }
}

class LightningEffect implements SpellEffect {
  private scene: THREE.Scene;
  private lightningSegments: THREE.Line[] = [];
  private flashLight: THREE.PointLight;
  private electricGrid: THREE.Mesh;
  private arcLines: THREE.Line[] = [];
  private startPos: THREE.Vector3;
  private targetPos: THREE.Vector3;
  private duration = 2;
  private elapsed = 0;
  private segmentCount = 12;

  constructor(scene: THREE.Scene, startPos: THREE.Vector3, targetPos: THREE.Vector3) {
    this.scene = scene;
    this.startPos = startPos.clone();
    this.targetPos = targetPos.clone();

    this.createLightning();

    this.flashLight = new THREE.PointLight(0xffff88, 10, 15);
    this.flashLight.position.copy(targetPos);
    this.scene.add(this.flashLight);

    const gridCanvas = this.createElectricGridTexture();
    const gridTexture = new THREE.CanvasTexture(gridCanvas);
    const gridMaterial = new THREE.MeshBasicMaterial({
      map: gridTexture,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const gridGeometry = new THREE.PlaneGeometry(1.5, 1.5);
    this.electricGrid = new THREE.Mesh(gridGeometry, gridMaterial);
    this.electricGrid.position.copy(targetPos);
    this.scene.add(this.electricGrid);

    this.createArcs();
  }

  private createLightning(): void {
    this.generateLightningPath();
  }

  private generateLightningPath(): void {
    this.lightningSegments.forEach(seg => this.scene.remove(seg));
    this.lightningSegments = [];

    const directions = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    const dir = new THREE.Vector3().subVectors(this.targetPos, this.startPos);
    directions.sort((a, b) =>
      Math.abs(b.dot(dir.clone().normalize())) - Math.abs(a.dot(dir.clone().normalize()))
    );
    const perpendicular1 = directions[1].clone();
    const perpendicular2 = directions[2].clone();

    let points: THREE.Vector3[] = [this.startPos.clone()];
    for (let i = 1; i < this.segmentCount - 1; i++) {
      const t = i / (this.segmentCount - 1);
      const basePoint = new THREE.Vector3().lerpVectors(this.startPos, this.targetPos, t);
      const displacement = 0.15 * (Math.random() - 0.5) * 2;
      basePoint.add(perpendicular1.clone().multiplyScalar(displacement));
      basePoint.add(perpendicular2.clone().multiplyScalar(displacement * 0.7));
      points.push(basePoint);
    }
    points.push(this.targetPos.clone());

    for (let pass = 0; pass < 2; pass++) {
      const positions = new Float32Array(points.length * 3);
      points.forEach((p, i) => {
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({
        color: pass === 0 ? 0xffffff : 0x88aaff,
        transparent: true,
        opacity: pass === 0 ? 1 : 0.6,
        linewidth: pass === 0 ? 3 : 1
      });
      const line = new THREE.Line(geometry, material);
      this.lightningSegments.push(line);
      this.scene.add(line);
    }
  }

  private createElectricGridTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(100, 180, 255, 0.8)';
    ctx.lineWidth = 2;
    const gridSize = 32;
    for (let i = 0; i <= 256; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 180, 0.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const x1 = Math.random() * 256;
      const y1 = Math.random() * 256;
      const x2 = x1 + (Math.random() - 0.5) * 80;
      const y2 = y1 + (Math.random() - 0.5) * 80;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 20;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 20;
      ctx.quadraticCurveTo(mx, my, x2, y2);
      ctx.stroke();
    }

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 180);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 0.5)');
    gradient.addColorStop(0.5, 'rgba(100, 180, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    return canvas;
  }

  private createArcs(): void {
    for (let i = 0; i < 4; i++) {
      const points: THREE.Vector3[] = [];
      const center = this.targetPos;
      const radius = 0.8 + i * 0.1;
      const segments = 24;
      const startAngle = (i / 4) * Math.PI * 2;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const angle = startAngle + t * Math.PI * 1.5 + (Math.random() - 0.5) * 0.15;
        const r = radius + (Math.random() - 0.5) * 0.08;
        const pos = new THREE.Vector3(
          center.x + Math.cos(angle) * r,
          center.y + Math.sin(angle) * r * 0.6 + 0.1,
          center.z + Math.sin(angle) * r * 0.6
        );
        points.push(pos);
      }
      const positions = new Float32Array(points.length * 3);
      points.forEach((p, idx) => {
        positions[idx * 3] = p.x;
        positions[idx * 3 + 1] = p.y;
        positions[idx * 3 + 2] = p.z;
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.8
      });
      const line = new THREE.Line(geometry, material);
      this.arcLines.push(line);
      this.scene.add(line);
    }
  }

  update(delta: number): boolean {
    this.elapsed += delta;
    const alpha = 1 - this.elapsed / this.duration;

    if (Math.random() < 0.4) {
      this.generateLightningPath();
    }

    this.lightningSegments.forEach(seg => {
      const mat = seg.material as THREE.LineBasicMaterial;
      mat.opacity = alpha * (0.6 + Math.random() * 0.4);
    });

    this.flashLight.intensity = (5 + Math.random() * 8) * alpha;
    (this.electricGrid.material as THREE.MeshBasicMaterial).opacity = alpha * 0.9;
    this.electricGrid.lookAt(new THREE.Vector3(0, 1, 5));

    this.arcLines.forEach((arc, i) => {
      const mat = arc.material as THREE.LineBasicMaterial;
      mat.opacity = alpha * (0.5 + Math.sin(this.elapsed * 15 + i) * 0.5);
      arc.rotation.y += delta * (2 + i);
    });

    if (this.elapsed >= this.duration) {
      return false;
    }
    return true;
  }

  dispose(): void {
    this.lightningSegments.forEach(seg => {
      this.scene.remove(seg);
      seg.geometry.dispose();
      (seg.material as THREE.Material).dispose();
    });
    this.arcLines.forEach(arc => {
      this.scene.remove(arc);
      arc.geometry.dispose();
      (arc.material as THREE.Material).dispose();
    });
    this.scene.remove(this.flashLight);
    this.scene.remove(this.electricGrid);
    this.electricGrid.geometry.dispose();
    (this.electricGrid.material as THREE.Material).dispose();
  }
}

export function setupArena(scene: THREE.Scene): { update: (delta: number) => void } {
  const arenaGroup = new THREE.Group();

  const floorGeometry = new THREE.CircleGeometry(8, 64);
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 1024;
  floorCanvas.height = 1024;
  const floorCtx = floorCanvas.getContext('2d')!;

  const gradient = floorCtx.createRadialGradient(512, 512, 0, 512, 512, 512);
  gradient.addColorStop(0, '#2a1f1a');
  gradient.addColorStop(0.7, '#1a1410');
  gradient.addColorStop(1, '#0d0a08');
  floorCtx.fillStyle = gradient;
  floorCtx.fillRect(0, 0, 1024, 1024);

  floorCtx.strokeStyle = 'rgba(120, 30, 20, 0.6)';
  floorCtx.lineWidth = 3;
  for (let r = 100; r < 500; r += 80) {
    floorCtx.beginPath();
    floorCtx.arc(512, 512, r, 0, Math.PI * 2);
    floorCtx.stroke();
  }

  floorCtx.strokeStyle = 'rgba(150, 40, 25, 0.5)';
  floorCtx.lineWidth = 2;
  const runes = ['⚡', '❄', '🔥', '✦', '◆', '⬡'];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const x = 512 + Math.cos(angle) * 350;
    const y = 512 + Math.sin(angle) * 350;
    floorCtx.save();
    floorCtx.translate(x, y);
    floorCtx.rotate(angle + Math.PI / 2);
    floorCtx.beginPath();
    floorCtx.moveTo(0, -25);
    floorCtx.lineTo(20, 15);
    floorCtx.lineTo(-20, 15);
    floorCtx.closePath();
    floorCtx.stroke();
    floorCtx.restore();
  }

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    floorCtx.beginPath();
    floorCtx.moveTo(512, 512);
    floorCtx.lineTo(
      512 + Math.cos(angle) * 480,
      512 + Math.sin(angle) * 480
    );
    floorCtx.stroke();
  }

  const floorTexture = new THREE.CanvasTexture(floorCanvas);
  const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 0.85,
    metalness: 0.15
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  arenaGroup.add(floor);

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const pillarGeo = new THREE.CylinderGeometry(0.25, 0.35, 4, 12);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x2a2520,
      roughness: 0.9,
      metalness: 0.1
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(Math.cos(angle) * 7, 2, Math.sin(angle) * 7);
    arenaGroup.add(pillar);

    const runeLight = new THREE.PointLight(
      i % 2 === 0 ? 0xff4422 : 0x4466ff,
      0.8,
      3
    );
    runeLight.position.copy(pillar.position);
    runeLight.userData.baseIntensity = 0.8;
    runeLight.userData.phase = i * Math.PI / 2;
    arenaGroup.add(runeLight);
  }

  const particleCount = 200;
  const haloPositions = new Float32Array(particleCount * 3);
  const haloColors = new Float32Array(particleCount * 3);
  const haloPhases: number[] = [];
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 5;
    const y = 0.05 + Math.random() * 0.3;
    haloPositions[i * 3] = Math.cos(angle) * radius;
    haloPositions[i * 3 + 1] = y;
    haloPositions[i * 3 + 2] = Math.sin(angle) * radius;
    const colorChoice = Math.random();
    if (colorChoice < 0.4) {
      haloColors[i * 3] = 1;
      haloColors[i * 3 + 1] = 0.3;
      haloColors[i * 3 + 2] = 0.1;
    } else if (colorChoice < 0.7) {
      haloColors[i * 3] = 0.3;
      haloColors[i * 3 + 1] = 0.6;
      haloColors[i * 3 + 2] = 1;
    } else {
      haloColors[i * 3] = 1;
      haloColors[i * 3 + 1] = 0.9;
      haloColors[i * 3 + 2] = 0.3;
    }
    haloPhases.push(Math.random() * Math.PI * 2);
  }
  const haloGeometry = new THREE.BufferGeometry();
  haloGeometry.setAttribute('position', new THREE.BufferAttribute(haloPositions, 3));
  haloGeometry.setAttribute('color', new THREE.BufferAttribute(haloColors, 3));
  const haloMaterial = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const haloPoints = new THREE.Points(haloGeometry, haloMaterial);
  haloPoints.userData.phases = haloPhases;
  arenaGroup.add(haloPoints);

  const ambientLight = new THREE.AmbientLight(0x332222, 0.5);
  arenaGroup.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffeedd, 0.8);
  dirLight.position.set(5, 10, 5);
  arenaGroup.add(dirLight);

  scene.add(arenaGroup);

  let time = 0;
  return {
    update(delta: number) {
      time += delta;
      haloPoints.rotation.y = time * 0.05;
      const posAttr = haloGeometry.getAttribute('position') as THREE.BufferAttribute;
      haloPhases.forEach((phase, i) => {
        const offsetY = Math.sin(time * 2 + phase) * 0.08;
        posAttr.setY(i, (haloPositions[i * 3 + 1] + offsetY));
      });
      posAttr.needsUpdate = true;

      arenaGroup.children.forEach(child => {
        if (child instanceof THREE.PointLight && child.userData.baseIntensity) {
          child.intensity = child.userData.baseIntensity * (0.7 + Math.sin(time * 1.5 + child.userData.phase) * 0.3);
        }
      });
    }
  };
}
